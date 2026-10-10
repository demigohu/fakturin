// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Faktur Pajak (Coretax DJP) number handling.
/// @dev The registry key is the nationally unique tax invoice number. Only digits count, so
///      "040.025-00000001", "04002500000001" and replacement/cancel suffixes ("...A", "...C")
///      all map to the same invoice.
library FakturPajak {
    error EmptyFakturNumber();

    function normalize(string memory raw) internal pure returns (string memory) {
        bytes memory input = bytes(raw);
        bytes memory buffer = new bytes(input.length);
        uint256 outLen;
        for (uint256 i = 0; i < input.length; i++) {
            bytes1 c = input[i];
            if (c >= "0" && c <= "9") buffer[outLen++] = c;
        }
        if (outLen == 0) revert EmptyFakturNumber();
        assembly {
            mstore(buffer, outLen)
        }
        return string(buffer);
    }

    function invoiceId(string memory raw) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("FP:", normalize(raw)));
    }
}
