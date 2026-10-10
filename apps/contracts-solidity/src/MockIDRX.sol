// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Testnet stand-in for IDRX, the rupiah stablecoin (1 token = Rp1), with a faucet for the demo.
/// @dev Mirrors IDRX's 2 decimals so amounts behave like production. Not money, and not affiliated
///      with or issued by IDRX; IDRX is not on Arbitrum yet.
contract MockIDRX is ERC20, Ownable {
    uint256 public constant FAUCET_AMOUNT = 1_000_000_000e2; // Rp1,000,000,000

    constructor(address initialOwner) ERC20("Mock IDRX (test)", "MockIDRX") Ownable(initialOwner) {}

    function decimals() public pure override returns (uint8) {
        return 2;
    }

    function faucet(address to) external {
        _mint(to, FAUCET_AMOUNT);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
