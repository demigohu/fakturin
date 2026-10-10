// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FakturVault} from "./FakturVault.sol";
import {FakturVaultFactory} from "./FakturVaultFactory.sol";

/// @notice Closes vaults on time so nobody has to press a button (PRD v2, FR-12).
///         - Funding vault past its funding deadline  -> cancelFunding (funders get 1:1 back)
///         - Active vault past due date + grace period -> markDefault  (funders share the holdback)
///         A Chainlink CRE cron workflow reads `closable` and delivers the list through the
///         Keystone forwarder (`onReport`). `closeDue` does the same for anyone, e.g. the demo relayer.
///         Both vault functions are permissionless and enforce their own time checks, so this
///         contract needs no role and holds no funds.
contract FakturKeeper {
    address public immutable forwarder;
    FakturVaultFactory public immutable factory;

    /// @dev Gas forwarded to each close (markDefault costs ~110k). Must be reserved up front:
    ///      a try/catch swallows out-of-gas, so gas estimation would otherwise pick a limit at
    ///      which every close silently fails.
    uint256 public constant CLOSE_GAS = 250_000;

    enum Action {
        None,
        CancelFunding,
        MarkDefault
    }

    event VaultClosed(address indexed vault, Action action);
    event VaultCloseFailed(address indexed vault, Action action);

    error OnlyForwarder();
    error InsufficientGas();

    constructor(address forwarder_, FakturVaultFactory factory_) {
        forwarder = forwarder_;
        factory = factory_;
    }

    /// @notice What would close `vault` right now, if anything.
    function actionFor(address vault) public view returns (Action) {
        FakturVault v = FakturVault(vault);
        FakturVault.State s = v.state();
        if (s == FakturVault.State.Funding && block.timestamp > v.fundingDeadline()) return Action.CancelFunding;
        if (s == FakturVault.State.Active && block.timestamp >= v.defaultableAt()) return Action.MarkDefault;
        return Action.None;
    }

    /// @notice Up to `max` vaults that can be closed now. Scans every vault; fine at demo scale.
    function closable(uint256 max) public view returns (address[] memory list) {
        uint256 n = factory.vaultCount();
        list = new address[](max < n ? max : n);
        uint256 found;
        for (uint256 i; i < n && found < list.length; ++i) {
            address vault = factory.vaults(i);
            if (actionFor(vault) != Action.None) list[found++] = vault;
        }
        assembly {
            mstore(list, found)
        }
    }

    /// @param report abi.encode(address[] vaults)
    function onReport(bytes calldata, bytes calldata report) external {
        if (msg.sender != forwarder) revert OnlyForwarder();
        _close(abi.decode(report, (address[])));
    }

    /// @notice Permissionless fallback: close up to `max` due vaults in one transaction.
    function closeDue(uint256 max) external returns (uint256 closed) {
        return _close(closable(max));
    }

    /// @dev One failing vault (already closed by someone else, or not yet due) never blocks the rest.
    ///      Stops when the remaining gas cannot cover another close; reverts if it cannot cover one.
    function _close(address[] memory list) private returns (uint256 closed) {
        uint256 attempted;
        for (uint256 i; i < list.length; ++i) {
            Action action = actionFor(list[i]);
            if (action == Action.None) continue;
            if (gasleft() < (CLOSE_GAS * 64) / 63 + 20_000) {
                if (attempted == 0) revert InsufficientGas();
                break;
            }
            ++attempted;
            FakturVault v = FakturVault(list[i]);
            bool ok;
            if (action == Action.CancelFunding) {
                try v.cancelFunding{gas: CLOSE_GAS}() {
                    ok = true;
                } catch {}
            } else {
                try v.markDefault{gas: CLOSE_GAS}() {
                    ok = true;
                } catch {}
            }
            if (ok) {
                ++closed;
                emit VaultClosed(list[i], action);
            } else {
                emit VaultCloseFailed(list[i], action);
            }
        }
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        // IReceiver (onReport) and IERC165
        return interfaceId == this.onReport.selector || interfaceId == 0x01ffc9a7;
    }
}
