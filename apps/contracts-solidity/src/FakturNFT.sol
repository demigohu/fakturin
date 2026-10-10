// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IFakturRenderer {
    function tokenURI(bytes32 invoiceId) external view returns (string memory);
}

/// @notice One token per verified Faktur Pajak; tokenId = uint256(invoiceId).
/// @dev Minted straight into the invoice's vault and never transferred; the registry burns it
///      when the invoice closes (the claim it represents has ended). Only the registry holds
///      REGISTRY_ROLE. The image is an onchain SVG drawn by FakturRenderer.
contract FakturNFT is ERC721, AccessControl {
    bytes32 public constant REGISTRY_ROLE = keccak256("REGISTRY_ROLE");

    IFakturRenderer public renderer;

    error TransferDisabled();

    event RendererSet(address renderer);

    constructor(address admin) ERC721("Fakturin Faktur Pajak", "FKTR") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function mint(address vault, bytes32 invoiceId) external onlyRole(REGISTRY_ROLE) {
        _mint(vault, uint256(invoiceId));
    }

    function burn(bytes32 invoiceId) external onlyRole(REGISTRY_ROLE) {
        _burn(uint256(invoiceId));
    }

    function setRenderer(IFakturRenderer renderer_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        renderer = renderer_;
        emit RendererSet(address(renderer_));
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return address(renderer) == address(0) ? "" : renderer.tokenURI(bytes32(tokenId));
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert TransferDisabled();
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
