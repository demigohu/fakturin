// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IFakturRegistryHooks {
    function isFunder(address account) external view returns (bool);
    function onFunded(bytes32 invoiceId) external;
    function onRepaid(bytes32 invoiceId) external;
    function onDefaulted(bytes32 invoiceId) external;
    function onFundingFailed(bytes32 invoiceId) external;
}

/// @notice ERC-4626 vault for exactly one Faktur Pajak (PRD v2 section 6).
/// @dev Funders choose this invoice and deposit MockIDRX until `target` is reached
///      (all or nothing). The deposit that fills the target pays `advance` to the seller in the
///      same transaction; `holdback` stays in the vault. Shares cannot be transferred and can only
///      be redeemed once the invoice is closed:
///        Repaid        vault holds `nominal - fee` -> funders earn the discount minus the
///                      platform fee, which goes to the treasury in the repay transaction
///        Defaulted     vault holds `holdback` -> funders share the loss pro rata
///        Cancelled     vault holds deposits   -> funders get 1:1 back
contract FakturVault is ERC4626, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum State {
        Funding,
        Active,
        Repaid,
        Defaulted,
        Cancelled
    }

    IFakturRegistryHooks public immutable registry;
    bytes32 public immutable invoiceId;
    address public immutable seller;
    uint256 public immutable nominal;
    uint256 public immutable target;
    uint256 public immutable advance;
    uint256 public immutable holdback;
    /// @notice Platform fee taken from the discount on repayment (PRD v3 fee model A).
    uint256 public immutable fee;
    address public immutable treasury;
    uint64 public immutable fundingDeadline;
    uint64 public immutable dueDate;
    uint64 public immutable gracePeriod;

    State public state;

    event Funded(uint256 advance, uint256 holdback);
    event Repaid(address indexed payer, uint256 amount, uint256 holdbackReturned, uint256 fee);
    event Defaulted(address indexed caller);
    event FundingCancelled(address indexed caller);

    error NotFunding();
    error NotActive();
    error FundingStillOpen();
    error NotDefaultableYet();
    error SharesNotTransferable();

    struct Terms {
        bytes32 invoiceId;
        address seller;
        uint256 nominal;
        uint256 target;
        uint256 advance;
        uint256 fee;
        address treasury;
        uint64 fundingDeadline;
        uint64 dueDate;
        uint64 gracePeriod;
    }

    constructor(IERC20 asset_, IFakturRegistryHooks registry_, Terms memory t, string memory name_, string memory symbol_)
        ERC20(name_, symbol_)
        ERC4626(asset_)
    {
        registry = registry_;
        invoiceId = t.invoiceId;
        seller = t.seller;
        nominal = t.nominal;
        target = t.target;
        advance = t.advance;
        holdback = t.target - t.advance;
        fee = t.fee;
        treasury = t.treasury;
        fundingDeadline = t.fundingDeadline;
        dueDate = t.dueDate;
        gracePeriod = t.gracePeriod;
    }

    // ---------------------------------------------------------------- funding

    /// @notice Remaining amount a registered funder may deposit right now.
    function maxDeposit(address receiver) public view override returns (uint256) {
        if (state != State.Funding || block.timestamp > fundingDeadline) return 0;
        if (!registry.isFunder(receiver)) return 0;
        uint256 held = totalAssets();
        return target > held ? target - held : 0;
    }

    function maxMint(address receiver) public view override returns (uint256) {
        return previewDeposit(maxDeposit(receiver));
    }

    function maxWithdraw(address owner) public view override returns (uint256) {
        return _redeemable() ? super.maxWithdraw(owner) : 0;
    }

    function maxRedeem(address owner) public view override returns (uint256) {
        return _redeemable() ? super.maxRedeem(owner) : 0;
    }

    function _deposit(address caller, address receiver, uint256 assets, uint256 shares)
        internal
        override
        nonReentrant
    {
        super._deposit(caller, receiver, assets, shares);
        if (totalAssets() >= target) _activate();
    }

    function _withdraw(address caller, address receiver, address owner, uint256 assets, uint256 shares)
        internal
        override
        nonReentrant
    {
        super._withdraw(caller, receiver, owner, assets, shares);
    }

    /// @dev The filling deposit pays the seller atomically (FR-06).
    function _activate() private {
        state = State.Active;
        registry.onFunded(invoiceId);
        IERC20(asset()).safeTransfer(seller, advance);
        emit Funded(advance, holdback);
    }

    /// @notice After the funding deadline an unfilled vault can be cancelled by anyone.
    function cancelFunding() external nonReentrant {
        if (state != State.Funding) revert NotFunding();
        if (block.timestamp <= fundingDeadline) revert FundingStillOpen();
        state = State.Cancelled;
        registry.onFundingFailed(invoiceId);
        emit FundingCancelled(msg.sender);
    }

    // ------------------------------------------------------------- settlement

    /// @notice Seller (or anyone) repays the full nominal. The holdback goes back to the seller and
    ///         the platform fee to the treasury; `nominal - fee` stays for the funders.
    function repay() external nonReentrant {
        if (state != State.Active) revert NotActive();
        state = State.Repaid;
        IERC20 token = IERC20(asset());
        token.safeTransferFrom(msg.sender, address(this), nominal);
        token.safeTransfer(seller, holdback);
        if (fee > 0) token.safeTransfer(treasury, fee);
        registry.onRepaid(invoiceId);
        emit Repaid(msg.sender, nominal, holdback, fee);
    }

    /// @notice After due date + grace period an unpaid invoice can be defaulted by anyone.
    function markDefault() external nonReentrant {
        if (state != State.Active) revert NotActive();
        if (block.timestamp < uint256(dueDate) + gracePeriod) revert NotDefaultableYet();
        state = State.Defaulted;
        registry.onDefaulted(invoiceId);
        emit Defaulted(msg.sender);
    }

    function defaultableAt() external view returns (uint256) {
        return uint256(dueDate) + gracePeriod;
    }

    // ------------------------------------------------------------------ shares

    function _redeemable() private view returns (bool) {
        return state == State.Repaid || state == State.Defaulted || state == State.Cancelled;
    }

    /// @dev Shares are claims of the depositor only; no secondary market (FR-10).
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) revert SharesNotTransferable();
        super._update(from, to, value);
    }
}
