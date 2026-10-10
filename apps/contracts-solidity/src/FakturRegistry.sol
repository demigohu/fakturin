// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IIdentityRegistry} from "@chainlink/cross-chain-identity/interfaces/IIdentityRegistry.sol";
import {ICredentialRegistry} from "@chainlink/cross-chain-identity/interfaces/ICredentialRegistry.sol";
import {IIdentityValidator} from "@chainlink/cross-chain-identity/interfaces/IIdentityValidator.sol";
import {FakturPajak} from "./libraries/FakturPajak.sol";
import {FakturNFT} from "./FakturNFT.sol";
import {FakturVault} from "./FakturVault.sol";
import {FakturVaultFactory} from "./FakturVaultFactory.sol";

/// @notice Registry of Faktur Pajak numbers (PRD v3).
/// @dev Flow: a KYB-verified seller requests -> verifier (Chainlink CRE receiver or demo relayer)
///      writes the PJAP result -> the seller's NPWP is matched against their Chainlink ACE
///      credential -> a per-invoice ERC-4626 vault opens -> the vault reports funding, repayment,
///      default or failed funding back here.
///
///      Identity lives in Chainlink ACE Cross-Chain Identity (IdentityRegistry + CredentialRegistry).
///      Two CredentialRegistryIdentityValidators decide who may act:
///        funderValidator  requires `common.kyc`
///        sellerValidator  requires `common.kyb` and `id.fakturin.pkp` (credential data = NPWP hash)
contract FakturRegistry is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    /// @notice ACE credential type for a VAT-registered business (PKP). Data: abi.encode(bytes32 npwpHash).
    bytes32 public constant PKP_CREDENTIAL = keccak256("id.fakturin.pkp");

    enum Status {
        None,
        Pending,
        Rejected,
        Funding,
        Financed,
        Repaid,
        Defaulted,
        FundingFailed
    }

    /// @dev Reject codes written by the verifier (mirrors the PJAP mock and CRE workflow).
    uint8 public constant REJECT_NOT_FOUND = 1;
    uint8 public constant REJECT_CANCELLED = 2;
    uint8 public constant REJECT_REPLACED = 3;
    uint8 public constant REJECT_SELLER_MISMATCH = 4;
    uint8 public constant REJECT_EXPIRED = 5;
    uint8 public constant REJECT_LIMIT = 6;
    uint8 public constant REJECT_TENOR = 7;

    struct Invoice {
        address seller;
        address vault;
        bytes32 buyerNpwpHash;
        uint256 nominal;
        uint64 issuedAt;
        uint64 dueDate;
        uint64 requestedAt;
        Status status;
        uint8 rejectCode;
    }

    /// @dev Verified Faktur Pajak data, as returned by PJAP.
    struct Verification {
        bool valid;
        uint8 rejectCode;
        bytes32 sellerNpwpHash;
        bytes32 buyerNpwpHash;
        uint256 nominal;
        uint64 issuedAt;
        uint64 dueDate;
    }

    /// @dev Pricing of one invoice: what funders pay, what the seller gets now, and the platform fee.
    struct Quote {
        uint256 target;
        uint256 advance;
        uint256 discount;
        uint256 fee;
    }

    FakturNFT public immutable nft;
    FakturVaultFactory public immutable factory;

    IIdentityRegistry public identityRegistry;
    ICredentialRegistry public credentialRegistry;
    IIdentityValidator public funderValidator;
    IIdentityValidator public sellerValidator;

    mapping(bytes32 invoiceId => Invoice) private _invoices;
    mapping(bytes32 invoiceId => string) public fakturNumberOf;
    mapping(address vault => bytes32 invoiceId) public invoiceOfVault;

    mapping(address => bool) public sellerDefaulted;
    mapping(address => uint256) public sellerOutstanding;
    mapping(bytes32 buyerNpwpHash => uint256) public buyerOutstanding;

    /// @notice Seller's total cost per 30 days of tenor, all-in (OJK productive cap 2026: 0.067%/day).
    uint256 public ratePer30dBps = 150;
    /// @notice Share of the seller's cost kept by the platform, taken on repayment.
    uint256 public platformFeeBps = 1000;
    uint256 public advanceBps = 8000;
    uint64 public maxTenor = 180 days;
    uint64 public fundingWindow = 3 days;
    uint64 public gracePeriod = 60;
    /// @dev Token units: MockIDRX / IDRX have 2 decimals (1e2 = Rp1).
    uint256 public sellerLimit = 200_000_000e2;
    uint256 public buyerLimit = 500_000_000e2;
    address public treasury;

    event VerificationRequested(bytes32 indexed invoiceId, address indexed seller, string fakturNumber);
    event InvoiceVerified(bytes32 indexed invoiceId, address indexed vault, uint256 nominal, uint256 target, uint64 dueDate);
    event InvoiceRejected(bytes32 indexed invoiceId, uint8 code);
    event InvoiceStatusChanged(bytes32 indexed invoiceId, Status status, address actor);
    event SellerFlagged(address indexed seller, bytes32 indexed invoiceId);
    event IdentityConfigured(address identityRegistry, address credentialRegistry, address funderValidator, address sellerValidator);
    event ParametersUpdated(address actor);

    error AlreadyRegistered(Status status);
    error SellerIsDefaulted();
    error SellerNotVerified();
    error NotPending();
    error OnlyVault();
    error InvalidParameters();

    constructor(address admin, FakturNFT nft_, FakturVaultFactory factory_, address treasury_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        nft = nft_;
        factory = factory_;
        treasury = treasury_;
    }

    // ---------------------------------------------------------------- identity

    /// @notice Registered funder: holds a valid `common.kyc` credential in Chainlink ACE (US-03).
    function isFunder(address account) public view returns (bool) {
        return address(funderValidator) != address(0) && funderValidator.validate(account, "");
    }

    /// @notice Verified seller: KYB passed and a PKP credential for their NPWP (US-00).
    function isSeller(address account) public view returns (bool) {
        return address(sellerValidator) != address(0) && sellerValidator.validate(account, "");
    }

    /// @notice NPWP hash on the seller's ACE PKP credential, or zero if none.
    function sellerNpwpHash(address account) public view returns (bytes32) {
        if (address(identityRegistry) == address(0)) return bytes32(0);
        bytes32 ccid = identityRegistry.getIdentity(account);
        if (ccid == bytes32(0)) return bytes32(0);
        try credentialRegistry.getCredential(ccid, PKP_CREDENTIAL) returns (ICredentialRegistry.Credential memory c) {
            if (c.credentialData.length != 32) return bytes32(0);
            if (c.expiresAt != 0 && c.expiresAt <= block.timestamp) return bytes32(0);
            return abi.decode(c.credentialData, (bytes32));
        } catch {
            return bytes32(0);
        }
    }

    // ------------------------------------------------------------------- views

    function getInvoice(bytes32 invoiceId) external view returns (Invoice memory) {
        return _invoices[invoiceId];
    }

    function computeInvoiceId(string calldata fakturNumber) external pure returns (bytes32) {
        return FakturPajak.invoiceId(fakturNumber);
    }

    /// @notice Prices an invoice verified now: cost grows per day of tenor until `dueDate`.
    function quote(uint256 nominal, uint64 dueDate) public view returns (Quote memory q) {
        uint256 tenor = dueDate > block.timestamp ? dueDate - block.timestamp : 0;
        q.discount = (nominal * ratePer30dBps * tenor) / (30 days * 10_000);
        q.target = nominal - q.discount;
        q.advance = (nominal * advanceBps) / 10_000;
        q.fee = (q.discount * platformFeeBps) / 10_000;
    }

    // ------------------------------------------------------------------ seller

    /// @notice A verified seller asks for verification of a Faktur Pajak number (US-01, FR-02).
    function requestVerification(string calldata fakturNumber) external returns (bytes32 invoiceId) {
        if (sellerDefaulted[msg.sender]) revert SellerIsDefaulted();
        if (!isSeller(msg.sender)) revert SellerNotVerified();
        invoiceId = FakturPajak.invoiceId(fakturNumber);
        Invoice storage inv = _invoices[invoiceId];
        // Only rejected or unfunded invoices may be submitted again; anything once financed never.
        if (inv.status != Status.None && inv.status != Status.Rejected && inv.status != Status.FundingFailed) {
            revert AlreadyRegistered(inv.status);
        }
        delete _invoices[invoiceId];
        inv.seller = msg.sender;
        inv.requestedAt = uint64(block.timestamp);
        inv.status = Status.Pending;
        fakturNumberOf[invoiceId] = FakturPajak.normalize(fakturNumber);
        emit VerificationRequested(invoiceId, msg.sender, fakturNumberOf[invoiceId]);
        emit InvoiceStatusChanged(invoiceId, Status.Pending, msg.sender);
    }

    // ---------------------------------------------------------------- verifier

    /// @notice Writes the PJAP result (US-02, FR-03, FR-04, FR-13).
    function fulfillVerification(bytes32 invoiceId, Verification calldata v) external onlyRole(VERIFIER_ROLE) {
        Invoice storage inv = _invoices[invoiceId];
        if (inv.status != Status.Pending) revert NotPending();

        uint8 code = _rejectCode(inv.seller, v);
        if (code != 0) {
            inv.status = Status.Rejected;
            inv.rejectCode = code;
            emit InvoiceRejected(invoiceId, code);
            emit InvoiceStatusChanged(invoiceId, Status.Rejected, msg.sender);
            return;
        }

        Quote memory q = quote(v.nominal, v.dueDate);
        inv.buyerNpwpHash = v.buyerNpwpHash;
        inv.nominal = v.nominal;
        inv.issuedAt = v.issuedAt;
        inv.dueDate = v.dueDate;
        inv.status = Status.Funding;

        // Reserve the limits while funding is open; released when the invoice closes.
        sellerOutstanding[inv.seller] += v.nominal;
        buyerOutstanding[v.buyerNpwpHash] += v.nominal;

        address vault = factory.create(
            FakturVault.Terms({
                invoiceId: invoiceId,
                seller: inv.seller,
                nominal: v.nominal,
                target: q.target,
                advance: q.advance,
                fee: q.fee,
                treasury: treasury,
                fundingDeadline: uint64(block.timestamp) + fundingWindow,
                dueDate: v.dueDate,
                gracePeriod: gracePeriod
            })
        );
        inv.vault = vault;
        invoiceOfVault[vault] = invoiceId;
        nft.mint(vault, invoiceId);

        emit InvoiceVerified(invoiceId, vault, v.nominal, q.target, v.dueDate);
        emit InvoiceStatusChanged(invoiceId, Status.Funding, msg.sender);
    }

    function _rejectCode(address seller, Verification calldata v) private view returns (uint8) {
        if (!v.valid) return v.rejectCode == 0 ? REJECT_NOT_FOUND : v.rejectCode;
        // The Faktur Pajak must name the NPWP this wallet proved through KYB (no financing of
        // somebody else's invoice).
        bytes32 npwp = sellerNpwpHash(seller);
        if (npwp == bytes32(0) || npwp != v.sellerNpwpHash) return REJECT_SELLER_MISMATCH;
        if (v.dueDate <= block.timestamp) return REJECT_EXPIRED;
        if (v.dueDate - block.timestamp > maxTenor) return REJECT_TENOR;
        if (
            sellerOutstanding[seller] + v.nominal > sellerLimit
                || buyerOutstanding[v.buyerNpwpHash] + v.nominal > buyerLimit
        ) return REJECT_LIMIT;
        return 0;
    }

    // ------------------------------------------------------------- vault hooks

    modifier onlyVaultOf(bytes32 invoiceId) {
        if (invoiceOfVault[msg.sender] != invoiceId || invoiceId == bytes32(0)) revert OnlyVault();
        _;
    }

    function onFunded(bytes32 invoiceId) external onlyVaultOf(invoiceId) {
        _setStatus(invoiceId, Status.Financed);
    }

    function onRepaid(bytes32 invoiceId) external onlyVaultOf(invoiceId) {
        _close(invoiceId, Status.Repaid);
    }

    function onDefaulted(bytes32 invoiceId) external onlyVaultOf(invoiceId) {
        address seller = _invoices[invoiceId].seller;
        sellerDefaulted[seller] = true;
        emit SellerFlagged(seller, invoiceId);
        _close(invoiceId, Status.Defaulted);
    }

    function onFundingFailed(bytes32 invoiceId) external onlyVaultOf(invoiceId) {
        _close(invoiceId, Status.FundingFailed);
    }

    /// @dev The invoice NFT is a live claim; it is burned when the claim ends. The stamped image
    ///      stays available through FakturRenderer, which reads this registry.
    function _close(bytes32 invoiceId, Status status) private {
        Invoice storage inv = _invoices[invoiceId];
        sellerOutstanding[inv.seller] -= inv.nominal;
        buyerOutstanding[inv.buyerNpwpHash] -= inv.nominal;
        nft.burn(invoiceId);
        _setStatus(invoiceId, status);
    }

    function _setStatus(bytes32 invoiceId, Status status) private {
        _invoices[invoiceId].status = status;
        emit InvoiceStatusChanged(invoiceId, status, msg.sender);
    }

    // -------------------------------------------------------------------- admin

    function setIdentity(
        IIdentityRegistry identityRegistry_,
        ICredentialRegistry credentialRegistry_,
        IIdentityValidator funderValidator_,
        IIdentityValidator sellerValidator_
    ) external onlyRole(ADMIN_ROLE) {
        identityRegistry = identityRegistry_;
        credentialRegistry = credentialRegistry_;
        funderValidator = funderValidator_;
        sellerValidator = sellerValidator_;
        emit IdentityConfigured(
            address(identityRegistry_), address(credentialRegistry_), address(funderValidator_), address(sellerValidator_)
        );
    }

    function setParameters(
        uint256 ratePer30dBps_,
        uint256 platformFeeBps_,
        uint256 advanceBps_,
        uint64 maxTenor_,
        uint64 fundingWindow_,
        uint64 gracePeriod_,
        uint256 sellerLimit_,
        uint256 buyerLimit_
    ) external onlyRole(ADMIN_ROLE) {
        // The longest allowed tenor must still leave the advance inside the vault target.
        if (
            platformFeeBps_ > 10_000
                || advanceBps_ * 30 days + ratePer30dBps_ * uint256(maxTenor_) > 10_000 * uint256(30 days)
        ) revert InvalidParameters();
        ratePer30dBps = ratePer30dBps_;
        platformFeeBps = platformFeeBps_;
        advanceBps = advanceBps_;
        maxTenor = maxTenor_;
        fundingWindow = fundingWindow_;
        gracePeriod = gracePeriod_;
        sellerLimit = sellerLimit_;
        buyerLimit = buyerLimit_;
        emit ParametersUpdated(msg.sender);
    }

    function setTreasury(address treasury_) external onlyRole(ADMIN_ROLE) {
        if (treasury_ == address(0)) revert InvalidParameters();
        treasury = treasury_;
        emit ParametersUpdated(msg.sender);
    }
}
