// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FakturRegistry} from "./FakturRegistry.sol";

/// @notice Chainlink CRE consumer. The verification workflow reads a VerificationRequested
///         event, asks PJAP about the Faktur Pajak, and delivers the result through the
///         Keystone forwarder. This contract holds VERIFIER_ROLE on the registry.
contract FakturVerifierReceiver {
    address public immutable forwarder;
    FakturRegistry public immutable registry;

    error OnlyForwarder();

    event VerificationDelivered(bytes32 indexed invoiceId, bool valid, uint8 rejectCode);

    constructor(address forwarder_, FakturRegistry registry_) {
        forwarder = forwarder_;
        registry = registry_;
    }

    /// @param report abi.encode(bytes32 invoiceId, FakturRegistry.Verification)
    function onReport(bytes calldata, bytes calldata report) external {
        if (msg.sender != forwarder) revert OnlyForwarder();
        (bytes32 invoiceId, FakturRegistry.Verification memory v) =
            abi.decode(report, (bytes32, FakturRegistry.Verification));
        registry.fulfillVerification(invoiceId, v);
        emit VerificationDelivered(invoiceId, v.valid, v.rejectCode);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        // IReceiver (onReport) and IERC165
        return interfaceId == this.onReport.selector || interfaceId == 0x01ffc9a7;
    }
}
