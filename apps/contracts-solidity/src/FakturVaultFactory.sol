// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {FakturVault, IFakturRegistryHooks} from "./FakturVault.sol";

/// @notice Deploys one FakturVault per verified invoice. Only the registry may call `create`;
///         keeping the vault bytecode here keeps the registry under the contract size limit.
contract FakturVaultFactory {
    IERC20 public immutable asset;
    address public immutable deployer;
    address public registry;
    uint256 public vaultCount;
    /// @notice Every vault ever created, in order; FakturKeeper scans it for vaults to close.
    address[] public vaults;

    error OnlyRegistry();
    error RegistryAlreadySet();

    constructor(IERC20 asset_) {
        asset = asset_;
        deployer = msg.sender;
    }

    function setRegistry(address registry_) external {
        if (msg.sender != deployer || registry != address(0)) revert RegistryAlreadySet();
        registry = registry_;
    }

    function create(FakturVault.Terms calldata terms) external returns (address vault) {
        if (msg.sender != registry) revert OnlyRegistry();
        uint256 n = ++vaultCount;
        vault = address(
            new FakturVault(
                asset,
                IFakturRegistryHooks(registry),
                terms,
                string.concat("Fakturin Vault #", Strings.toString(n)),
                string.concat("fvFKTR-", Strings.toString(n))
            )
        );
        vaults.push(vault);
    }
}
