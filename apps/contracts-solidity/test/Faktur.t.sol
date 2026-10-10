// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IIdentityRegistry} from "@chainlink/cross-chain-identity/interfaces/IIdentityRegistry.sol";
import {ICredentialRegistry} from "@chainlink/cross-chain-identity/interfaces/ICredentialRegistry.sol";
import {IIdentityValidator} from "@chainlink/cross-chain-identity/interfaces/IIdentityValidator.sol";
import {MockIDRX} from "../src/MockIDRX.sol";
import {FakturNFT, IFakturRenderer} from "../src/FakturNFT.sol";
import {FakturRegistry} from "../src/FakturRegistry.sol";
import {FakturRenderer} from "../src/FakturRenderer.sol";
import {FakturVault} from "../src/FakturVault.sol";
import {FakturVaultFactory} from "../src/FakturVaultFactory.sol";
import {FakturVerifierReceiver} from "../src/FakturVerifierReceiver.sol";
import {FakturKeeper} from "../src/FakturKeeper.sol";
import {AceDeployer} from "../script/AceDeployer.sol";

/// @dev One test per PRD v3 user story / functional rule (docs/PRD.md sections 4 and 6).
contract FakturTest is Test, AceDeployer {
    MockIDRX idr;
    FakturNFT nft;
    FakturVaultFactory factory;
    FakturRegistry registry;
    FakturRenderer renderer;
    FakturVerifierReceiver receiver;
    FakturKeeper keeper;
    Ace ace;

    address admin = address(this);
    address verifier = makeAddr("verifier");
    address issuer = makeAddr("issuer");
    address treasury = makeAddr("treasury");
    address forwarder = makeAddr("forwarder");
    address seller = makeAddr("seller");
    address seller2 = makeAddr("seller2");
    address funderA = makeAddr("funderA");
    address funderB = makeAddr("funderB");
    address stranger = makeAddr("stranger");

    // 60-day tenor at 1.5% per 30 days: discount 3%, platform keeps 10% of it.
    uint256 constant N = 100_000_000e2;
    uint256 constant TARGET = 97_000_000e2;
    uint256 constant ADVANCE = 80_000_000e2;
    uint256 constant HOLDBACK = 17_000_000e2;
    uint256 constant FEE = 300_000e2;
    string constant FP = "040.025-00000001";
    bytes32 constant BUYER = keccak256("01.234.567.8-901.000");
    bytes32 constant NPWP_SELLER = keccak256("0010000000000001");
    bytes32 constant NPWP_SELLER2 = keccak256("0020000000000002");

    function setUp() public {
        vm.warp(1_790_000_000);
        idr = new MockIDRX(admin);
        nft = new FakturNFT(admin);
        factory = new FakturVaultFactory(idr);
        registry = new FakturRegistry(admin, nft, factory, treasury);
        factory.setRegistry(address(registry));
        nft.grantRole(nft.REGISTRY_ROLE(), address(registry));
        renderer = new FakturRenderer(registry);
        nft.setRenderer(IFakturRenderer(address(renderer)));

        ace = _deployAce(admin, issuer);
        registry.setIdentity(
            IIdentityRegistry(address(ace.identityRegistry)),
            ICredentialRegistry(address(ace.credentialRegistry)),
            IIdentityValidator(address(ace.funderValidator)),
            IIdentityValidator(address(ace.sellerValidator))
        );

        receiver = new FakturVerifierReceiver(forwarder, registry);
        registry.grantRole(registry.VERIFIER_ROLE(), verifier);
        registry.grantRole(registry.VERIFIER_ROLE(), address(receiver));
        keeper = new FakturKeeper(forwarder, factory);

        address[4] memory users = [funderA, funderB, seller, seller2];
        for (uint256 i; i < users.length; i++) {
            idr.faucet(users[i]);
        }
        _kyc(funderA);
        _kyc(funderB);
        _kyb(seller, NPWP_SELLER);
        _kyb(seller2, NPWP_SELLER2);
    }

    // ---------------------------------------------------------------- helpers

    function _ccid(address who) internal pure returns (bytes32) {
        return keccak256(abi.encode("fakturin", who));
    }

    /// @dev The KYC provider (ACE credential issuer) verifies a funder.
    function _kyc(address who) internal {
        vm.startPrank(issuer);
        ace.identityRegistry.registerIdentity(_ccid(who), who, "");
        ace.credentialRegistry.registerCredential(_ccid(who), KYC, 0, "", "");
        vm.stopPrank();
    }

    /// @dev The KYB provider verifies a business and its NPWP (PKP).
    function _kyb(address who, bytes32 npwpHash) internal {
        vm.startPrank(issuer);
        ace.identityRegistry.registerIdentity(_ccid(who), who, "");
        ace.credentialRegistry.registerCredential(_ccid(who), KYB, 0, "", "");
        ace.credentialRegistry.registerCredential(_ccid(who), PKP, 0, abi.encode(npwpHash), "");
        vm.stopPrank();
    }

    function _npwpOf(address who) internal view returns (bytes32) {
        return who == seller2 ? NPWP_SELLER2 : NPWP_SELLER;
    }

    function _valid(uint256 nominal, uint256 dueIn) internal view returns (FakturRegistry.Verification memory) {
        return _validFor(seller, nominal, dueIn);
    }

    function _validFor(address who, uint256 nominal, uint256 dueIn)
        internal
        view
        returns (FakturRegistry.Verification memory)
    {
        return FakturRegistry.Verification({
            valid: true,
            rejectCode: 0,
            sellerNpwpHash: _npwpOf(who),
            buyerNpwpHash: BUYER,
            nominal: nominal,
            issuedAt: uint64(block.timestamp),
            dueDate: uint64(block.timestamp + dueIn)
        });
    }

    function _request(address who, string memory number) internal returns (bytes32 id) {
        vm.prank(who);
        id = registry.requestVerification(number);
    }

    function _verified(address who, string memory number) internal returns (bytes32 id, FakturVault vault) {
        id = _request(who, number);
        vm.prank(verifier);
        registry.fulfillVerification(id, _validFor(who, N, 60 days));
        vault = FakturVault(registry.getInvoice(id).vault);
    }

    function _deposit(FakturVault vault, address funder, uint256 amount) internal returns (uint256 shares) {
        vm.startPrank(funder);
        idr.approve(address(vault), amount);
        shares = vault.deposit(amount, funder);
        vm.stopPrank();
    }

    function _funded() internal returns (bytes32 id, FakturVault vault) {
        (id, vault) = _verified(seller, FP);
        _deposit(vault, funderA, 50_000_000e2);
        _deposit(vault, funderB, 47_000_000e2);
    }

    // ------------------------------------------------------------- US-01 / FR-01

    function test_FR01_sameNumberAnyFormatSameId() public view {
        bytes32 a = registry.computeInvoiceId("040.025-00000001");
        assertEq(a, registry.computeInvoiceId("04002500000001"));
        assertEq(a, registry.computeInvoiceId("040.025-00000001A")); // replacement suffix
        assertTrue(a != registry.computeInvoiceId("040.025-00000002"));
    }

    function test_US01_requestIsPending() public {
        bytes32 id = _request(seller, FP);
        FakturRegistry.Invoice memory inv = registry.getInvoice(id);
        assertEq(uint8(inv.status), uint8(FakturRegistry.Status.Pending));
        assertEq(inv.seller, seller);
        assertEq(registry.fakturNumberOf(id), "04002500000001");
    }

    // ------------------------------------------------------------------- FR-02

    function test_FR02_pendingNumberCannotBeRequestedAgain() public {
        _request(seller, FP);
        vm.prank(seller2);
        vm.expectRevert(abi.encodeWithSelector(FakturRegistry.AlreadyRegistered.selector, FakturRegistry.Status.Pending));
        registry.requestVerification("04002500000001");
    }

    function test_FR02_financedNumberNeverAgain() public {
        (bytes32 id, FakturVault vault) = _funded();
        vm.startPrank(seller);
        idr.approve(address(vault), N);
        vault.repay();
        vm.stopPrank();
        assertEq(uint8(registry.getInvoice(id).status), uint8(FakturRegistry.Status.Repaid));
        vm.prank(seller2);
        vm.expectRevert(abi.encodeWithSelector(FakturRegistry.AlreadyRegistered.selector, FakturRegistry.Status.Repaid));
        registry.requestVerification(FP);
    }

    function test_FR02_rejectedNumberCanBeRequestedAgain() public {
        bytes32 id = _request(seller, FP);
        FakturRegistry.Verification memory v = _valid(N, 60 days);
        v.valid = false;
        v.rejectCode = registry.REJECT_NOT_FOUND();
        vm.prank(verifier);
        registry.fulfillVerification(id, v);
        assertEq(uint8(registry.getInvoice(id).status), uint8(FakturRegistry.Status.Rejected));
        _request(seller, FP); // allowed
        assertEq(uint8(registry.getInvoice(id).status), uint8(FakturRegistry.Status.Pending));
    }

    // ---------------------------------------------------------- US-02 / FR-03/04

    function test_FR03_onlyVerifierCanFulfill() public {
        bytes32 id = _request(seller, FP);
        vm.prank(stranger);
        vm.expectRevert();
        registry.fulfillVerification(id, _valid(N, 60 days));
    }

    function test_US02_validOpensVaultAndMintsTokenIntoIt() public {
        (bytes32 id, FakturVault vault) = _verified(seller, FP);
        FakturRegistry.Invoice memory inv = registry.getInvoice(id);
        assertEq(uint8(inv.status), uint8(FakturRegistry.Status.Funding));
        assertEq(nft.ownerOf(uint256(id)), address(vault));
        assertEq(vault.target(), TARGET);
        assertEq(vault.advance(), ADVANCE);
        assertEq(vault.holdback(), HOLDBACK);
        assertEq(vault.fee(), FEE);
        assertEq(vault.treasury(), treasury);
        assertEq(vault.asset(), address(idr));
    }

    function test_US02_expiredDueDateIsRejected() public {
        bytes32 id = _request(seller, FP);
        FakturRegistry.Verification memory v = _valid(N, 0);
        vm.prank(verifier);
        registry.fulfillVerification(id, v);
        FakturRegistry.Invoice memory inv = registry.getInvoice(id);
        assertEq(uint8(inv.status), uint8(FakturRegistry.Status.Rejected));
        assertEq(inv.rejectCode, registry.REJECT_EXPIRED());
    }

    function test_US02_overSellerLimitIsRejected() public {
        bytes32 id = _request(seller, FP);
        vm.prank(verifier);
        registry.fulfillVerification(id, _valid(250_000_000e2, 60 days));
        assertEq(registry.getInvoice(id).rejectCode, registry.REJECT_LIMIT());
    }

    function test_FR04_tokenCannotLeaveVault() public {
        (bytes32 id, FakturVault vault) = _verified(seller, FP);
        vm.prank(address(vault));
        vm.expectRevert(FakturNFT.TransferDisabled.selector);
        nft.transferFrom(address(vault), stranger, uint256(id));
    }

    function test_creReceiverDeliversVerification() public {
        bytes32 id = _request(seller, FP);
        bytes memory report = abi.encode(id, _valid(N, 60 days));
        vm.prank(stranger);
        vm.expectRevert(FakturVerifierReceiver.OnlyForwarder.selector);
        receiver.onReport("", report);
        vm.prank(forwarder);
        receiver.onReport("", report);
        assertEq(uint8(registry.getInvoice(id).status), uint8(FakturRegistry.Status.Funding));
    }

    // ------------------------------------------------------------ US-03 / FR-05

    function test_FR05_unregisteredFunderCannotDeposit() public {
        (, FakturVault vault) = _verified(seller, FP);
        assertEq(vault.maxDeposit(stranger), 0);
        idr.faucet(stranger);
        vm.startPrank(stranger);
        idr.approve(address(vault), 1e2);
        vm.expectRevert();
        vault.deposit(1e2, stranger);
        vm.stopPrank();
    }

    function test_FR05_depositCappedAtRemainingTarget() public {
        (, FakturVault vault) = _verified(seller, FP);
        _deposit(vault, funderA, 90_000_000e2);
        assertEq(vault.maxDeposit(funderB), 7_000_000e2);
        vm.startPrank(funderB);
        idr.approve(address(vault), 8_000_000e2);
        vm.expectRevert();
        vault.deposit(8_000_000e2, funderB);
        vm.stopPrank();
    }

    // ------------------------------------------------------------ US-04/05 FR-06

    function test_US05_fillingDepositPaysSellerAtomically() public {
        uint256 before = idr.balanceOf(seller);
        (bytes32 id, FakturVault vault) = _funded();
        assertEq(idr.balanceOf(seller) - before, ADVANCE);
        assertEq(idr.balanceOf(address(vault)), HOLDBACK);
        assertEq(uint8(vault.state()), uint8(FakturVault.State.Active));
        assertEq(uint8(registry.getInvoice(id).status), uint8(FakturRegistry.Status.Financed));
        assertEq(vault.maxDeposit(funderA), 0);
    }

    function test_US04_sharesProportionalToDeposits() public {
        (, FakturVault vault) = _funded();
        assertEq(vault.balanceOf(funderA), 50_000_000e2);
        assertEq(vault.balanceOf(funderB), 47_000_000e2);
    }

    // ------------------------------------------------------------------- FR-07

    function test_FR07_noRedeemWhileFundingOrActive() public {
        (, FakturVault vault) = _verified(seller, FP);
        _deposit(vault, funderA, 10_000_000e2);
        assertEq(vault.maxRedeem(funderA), 0);
        vm.prank(funderA);
        vm.expectRevert();
        vault.redeem(1e2, funderA, funderA);
        _deposit(vault, funderB, 87_000_000e2);
        assertEq(vault.maxRedeem(funderA), 0);
    }

    // ------------------------------------------------------------ US-07/08 FR-08

    function test_US07_repayReturnsHoldbackAndFundersEarnTheDiscount() public {
        (bytes32 id, FakturVault vault) = _funded();
        uint256 sellerBefore = idr.balanceOf(seller);
        vm.startPrank(seller);
        idr.approve(address(vault), N);
        vault.repay();
        vm.stopPrank();
        assertEq(sellerBefore - idr.balanceOf(seller), N - HOLDBACK); // net 83M out, 80M came in: 3% cost
        assertEq(idr.balanceOf(treasury), FEE); // platform keeps 10% of the 3M
        assertEq(idr.balanceOf(address(vault)), N - FEE);
        assertEq(uint8(registry.getInvoice(id).status), uint8(FakturRegistry.Status.Repaid));
        vm.expectRevert();
        nft.ownerOf(uint256(id)); // burned

        uint256 aBefore = idr.balanceOf(funderA);
        uint256 shares = vault.balanceOf(funderA);
        vm.prank(funderA);
        vault.redeem(shares, funderA, funderA);
        // 50M of 97M target -> 50/97 of the 99.7M left after the fee (~51.39M)
        assertApproxEqAbs(idr.balanceOf(funderA) - aBefore, ((N - FEE) * 50) / 97, 100);
        assertEq(registry.sellerOutstanding(seller), 0);
    }

    // ------------------------------------------------------------ US-09 / FR-09

    function test_FR09_defaultOnlyAfterDueDatePlusGrace() public {
        (, FakturVault vault) = _funded();
        vm.expectRevert(FakturVault.NotDefaultableYet.selector);
        vault.markDefault();
        vm.warp(vault.defaultableAt());
        vm.prank(stranger);
        vault.markDefault();
        assertEq(uint8(vault.state()), uint8(FakturVault.State.Defaulted));
    }

    function test_US09_defaultSharesHoldbackAndFlagsSeller() public {
        (bytes32 id, FakturVault vault) = _funded();
        vm.warp(vault.defaultableAt());
        vault.markDefault();
        assertTrue(registry.sellerDefaulted(seller));
        assertEq(uint8(registry.getInvoice(id).status), uint8(FakturRegistry.Status.Defaulted));

        uint256 bBefore = idr.balanceOf(funderB);
        uint256 shares = vault.balanceOf(funderB);
        vm.prank(funderB);
        vault.redeem(shares, funderB, funderB);
        assertApproxEqAbs(idr.balanceOf(funderB) - bBefore, (HOLDBACK * 47) / 97, 100);

        vm.prank(seller);
        vm.expectRevert(FakturRegistry.SellerIsDefaulted.selector);
        registry.requestVerification("040.025-00000099");
    }

    // ------------------------------------------------------------------- US-06

    function test_US06_unfilledVaultRefundsOneToOneAndCanRelist() public {
        (bytes32 id, FakturVault vault) = _verified(seller, FP);
        _deposit(vault, funderA, 30_000_000e2);
        vm.expectRevert(FakturVault.FundingStillOpen.selector);
        vault.cancelFunding();
        vm.warp(vault.fundingDeadline() + 1);
        assertEq(vault.maxDeposit(funderB), 0);
        vault.cancelFunding();
        assertEq(uint8(registry.getInvoice(id).status), uint8(FakturRegistry.Status.FundingFailed));

        uint256 before = idr.balanceOf(funderA);
        uint256 shares = vault.balanceOf(funderA);
        vm.prank(funderA);
        vault.redeem(shares, funderA, funderA);
        assertEq(idr.balanceOf(funderA) - before, 30_000_000e2);

        _request(seller, FP); // may be submitted again
    }

    // ------------------------------------------------------------------- FR-10

    function test_FR10_sharesNotTransferable() public {
        (, FakturVault vault) = _verified(seller, FP);
        _deposit(vault, funderA, 1_000_000e2);
        vm.prank(funderA);
        vm.expectRevert(FakturVault.SharesNotTransferable.selector);
        vault.transfer(funderB, 1e2);
    }

    // ------------------------------------------------------------------ guards

    function test_onlyVaultCanReportBack() public {
        (bytes32 id,) = _verified(seller, FP);
        vm.prank(stranger);
        vm.expectRevert(FakturRegistry.OnlyVault.selector);
        registry.onFunded(id);
    }

    function test_US11_onlyAdminSetsParameters() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.setParameters(150, 1000, 8000, 180 days, 3 days, 60, 1, 1);
        registry.setParameters(200, 500, 7000, 90 days, 1 days, 120, 1e30, 1e30);
        assertEq(registry.ratePer30dBps(), 200);
        assertEq(registry.platformFeeBps(), 500);
        // A tenor that would push the discount into the advance is refused.
        vm.expectRevert(FakturRegistry.InvalidParameters.selector);
        registry.setParameters(1000, 1000, 8000, 180 days, 3 days, 60, 1, 1);
    }

    // ------------------------------------------------------------- FR-12 keeper

    function test_FR12_nothingClosableBeforeDeadlines() public {
        (, FakturVault open) = _verified(seller, FP);
        _funded2();
        assertEq(keeper.closable(10).length, 0);
        assertEq(uint8(keeper.actionFor(address(open))), uint8(FakturKeeper.Action.None));
        assertEq(keeper.closeDue(10), 0);
    }

    function test_FR12_keeperDefaultsOverdueVaultWithoutAnyFunderAction() public {
        (bytes32 id, FakturVault vault) = _funded();
        vm.warp(vault.defaultableAt());
        address[] memory due = keeper.closable(10);
        assertEq(due.length, 1);
        assertEq(due[0], address(vault));

        vm.prank(forwarder);
        keeper.onReport("", abi.encode(due));
        assertEq(uint8(vault.state()), uint8(FakturVault.State.Defaulted));
        assertEq(uint8(registry.getInvoice(id).status), uint8(FakturRegistry.Status.Defaulted));
        assertTrue(registry.sellerDefaulted(seller));
        assertGt(vault.maxRedeem(funderA), 0);
    }

    function test_FR12_keeperCancelsExpiredFundingSoFundersGetRefund() public {
        (bytes32 id, FakturVault vault) = _verified(seller, FP);
        _deposit(vault, funderA, 10_000_000e2);
        vm.warp(vault.fundingDeadline() + 1);
        assertEq(keeper.closeDue(10), 1);
        assertEq(uint8(vault.state()), uint8(FakturVault.State.Cancelled));
        assertEq(uint8(registry.getInvoice(id).status), uint8(FakturRegistry.Status.FundingFailed));
        assertEq(vault.maxWithdraw(funderA), 10_000_000e2);
    }

    function test_FR12_closedVaultIsSkippedNotReverted() public {
        (, FakturVault vault) = _funded();
        vm.warp(vault.defaultableAt());
        address[] memory due = keeper.closable(10);
        vault.markDefault(); // someone closes it first
        vm.prank(forwarder);
        keeper.onReport("", abi.encode(due)); // must not revert
        assertEq(keeper.closable(10).length, 0);
    }

    function test_FR12_lowGasRevertsInsteadOfSilentlyFailing() public {
        (, FakturVault vault) = _funded();
        vm.warp(vault.defaultableAt());
        vm.expectRevert(FakturKeeper.InsufficientGas.selector);
        keeper.closeDue{gas: 200_000}(10);
        assertEq(uint8(vault.state()), uint8(FakturVault.State.Active));
        keeper.closeDue(10);
        assertEq(uint8(vault.state()), uint8(FakturVault.State.Defaulted));
    }

    function test_FR12_onlyForwarderCanReport() public {
        vm.prank(stranger);
        vm.expectRevert(FakturKeeper.OnlyForwarder.selector);
        keeper.onReport("", abi.encode(new address[](0)));
    }

    // ------------------------------------------------------ US-00 / FR-13 identity

    function test_US00_unverifiedSellerCannotSubmit() public {
        vm.prank(stranger);
        vm.expectRevert(FakturRegistry.SellerNotVerified.selector);
        registry.requestVerification(FP);
        assertTrue(registry.isSeller(seller));
        assertEq(registry.sellerNpwpHash(seller), NPWP_SELLER);
        assertFalse(registry.isSeller(funderA)); // KYC alone is not KYB
    }

    function test_FR13_someoneElsesInvoiceIsRejected() public {
        // seller2 submits a Faktur Pajak that PJAP says was issued by `seller`'s NPWP.
        bytes32 id = _request(seller2, FP);
        vm.prank(verifier);
        registry.fulfillVerification(id, _validFor(seller, N, 60 days));
        FakturRegistry.Invoice memory inv = registry.getInvoice(id);
        assertEq(uint8(inv.status), uint8(FakturRegistry.Status.Rejected));
        assertEq(inv.rejectCode, registry.REJECT_SELLER_MISMATCH());
    }

    function test_US03_onlyKycFundersAndRevocationBlocks() public {
        (, FakturVault vault) = _verified(seller, FP);
        assertTrue(registry.isFunder(funderA));
        assertGt(vault.maxDeposit(funderA), 0);
        // The issuer revokes funderA's KYC: deposits stop immediately.
        vm.prank(issuer);
        ace.credentialRegistry.removeCredential(_ccid(funderA), KYC, "");
        assertFalse(registry.isFunder(funderA));
        assertEq(vault.maxDeposit(funderA), 0);
    }

    function test_ACE_onlyAuthorizedIssuerWritesIdentity() public {
        vm.startPrank(stranger);
        vm.expectRevert();
        ace.identityRegistry.registerIdentity(_ccid(stranger), stranger, "");
        vm.expectRevert();
        ace.credentialRegistry.registerCredential(_ccid(seller), KYC, 0, "", "");
        vm.stopPrank();
        assertFalse(registry.isFunder(stranger));
    }

    // ----------------------------------------------------------- FR-14 pricing

    function test_FR14_costGrowsWithTenorAndFeeIsTenPercent() public view {
        FakturRegistry.Quote memory q30 = registry.quote(N, uint64(block.timestamp + 30 days));
        FakturRegistry.Quote memory q90 = registry.quote(N, uint64(block.timestamp + 90 days));
        assertEq(q30.discount, 1_500_000e2);
        assertEq(q30.fee, 150_000e2);
        assertEq(q90.discount, 4_500_000e2);
        assertEq(q90.target, N - 4_500_000e2);
        assertEq(q90.advance, ADVANCE);
    }

    function test_FR14_tenorAboveMaximumIsRejected() public {
        bytes32 id = _request(seller, FP);
        vm.prank(verifier);
        registry.fulfillVerification(id, _valid(N, 181 days));
        assertEq(registry.getInvoice(id).rejectCode, registry.REJECT_TENOR());
    }

    function test_FR14_noFeeOnDefault() public {
        (, FakturVault vault) = _funded();
        vm.warp(vault.defaultableAt());
        vault.markDefault();
        assertEq(idr.balanceOf(treasury), 0);
        assertEq(idr.balanceOf(address(vault)), HOLDBACK);
    }

    // ---------------------------------------------------------- FR-15 renderer

    function test_FR15_nftHasOnchainImageThatSurvivesTheBurn() public {
        (bytes32 id, FakturVault vault) = _funded();
        string memory uri = nft.tokenURI(uint256(id));
        assertEq(_prefix(uri, 29), "data:application/json;base64,");
        assertTrue(_contains(renderer.svg(id), "FINANCED"));
        assertTrue(_contains(renderer.svg(id), "Rp100,000,000"));

        vm.startPrank(seller);
        idr.approve(address(vault), N);
        vault.repay();
        vm.stopPrank();
        vm.expectRevert();
        nft.tokenURI(uint256(id)); // burned: the claim has ended
        assertTrue(_contains(renderer.svg(id), "LUNAS")); // the stamped record stays readable
    }

    function _prefix(string memory s, uint256 n) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        bytes memory out = new bytes(n);
        for (uint256 i; i < n; ++i) out[i] = b[i];
        return string(out);
    }

    function _contains(string memory hay, string memory needle) internal pure returns (bool) {
        bytes memory h = bytes(hay);
        bytes memory n = bytes(needle);
        if (n.length > h.length) return false;
        for (uint256 i; i <= h.length - n.length; ++i) {
            bool ok = true;
            for (uint256 j; j < n.length; ++j) {
                if (h[i + j] != n[j]) {
                    ok = false;
                    break;
                }
            }
            if (ok) return true;
        }
        return false;
    }

    /// @dev Second seller's vault, funded and active, used to check closable ignores healthy vaults.
    function _funded2() internal returns (FakturVault vault) {
        (, vault) = _verified(seller2, "040.025-00000002");
        _deposit(vault, funderA, 50_000_000e2);
        _deposit(vault, funderB, 47_000_000e2);
    }
}
