// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PolicyEngine} from "@chainlink/policy-management/core/PolicyEngine.sol";
import {Policy} from "@chainlink/policy-management/core/Policy.sol";
import {OnlyAuthorizedSenderPolicy} from "@chainlink/policy-management/policies/OnlyAuthorizedSenderPolicy.sol";
import {IdentityRegistry} from "@chainlink/cross-chain-identity/IdentityRegistry.sol";
import {CredentialRegistry} from "@chainlink/cross-chain-identity/CredentialRegistry.sol";
import {CredentialRegistryIdentityValidator} from "@chainlink/cross-chain-identity/CredentialRegistryIdentityValidator.sol";
import {ICredentialRequirements} from "@chainlink/cross-chain-identity/interfaces/ICredentialRequirements.sol";

/// @notice Self-deploys the Chainlink ACE Cross-Chain Identity stack Fakturin uses (open-source
///         ACE core contracts, BUSL-1.1, non-production use). Shared by DeployFaktur and the tests.
///
///         PolicyEngine (default allow)
///           └─ OnlyAuthorizedSenderPolicy on every IdentityRegistry / CredentialRegistry write,
///              so only the authorized credential issuer can register identities and credentials
///         funderValidator  requirement: common.kyc
///         sellerValidator  requirements: common.kyb AND id.fakturin.pkp
abstract contract AceDeployer {
    bytes32 internal constant KYC = keccak256("common.kyc");
    bytes32 internal constant KYB = keccak256("common.kyb");
    bytes32 internal constant PKP = keccak256("id.fakturin.pkp");

    struct Ace {
        PolicyEngine engine;
        OnlyAuthorizedSenderPolicy issuerPolicy;
        IdentityRegistry identityRegistry;
        CredentialRegistry credentialRegistry;
        CredentialRegistryIdentityValidator funderValidator;
        CredentialRegistryIdentityValidator sellerValidator;
    }

    /// @param owner   admin of the engine, registries and policy (must be the caller)
    /// @param issuer  credential issuer allowed to write identities and credentials (KYC/KYB provider)
    function _deployAce(address owner, address issuer) internal returns (Ace memory a) {
        a.engine = PolicyEngine(
            address(new ERC1967Proxy(address(new PolicyEngine()), abi.encodeCall(PolicyEngine.initialize, (true, owner))))
        );
        a.issuerPolicy = OnlyAuthorizedSenderPolicy(
            address(
                new ERC1967Proxy(
                    address(new OnlyAuthorizedSenderPolicy()),
                    abi.encodeCall(Policy.initialize, (address(a.engine), owner, ""))
                )
            )
        );
        a.identityRegistry = IdentityRegistry(
            address(
                new ERC1967Proxy(
                    address(new IdentityRegistry()), abi.encodeCall(IdentityRegistry.initialize, (address(a.engine), owner))
                )
            )
        );
        a.credentialRegistry = CredentialRegistry(
            address(
                new ERC1967Proxy(
                    address(new CredentialRegistry()),
                    abi.encodeCall(CredentialRegistry.initialize, (address(a.engine), owner))
                )
            )
        );

        bytes32[] memory none = new bytes32[](0);
        address idReg = address(a.identityRegistry);
        address credReg = address(a.credentialRegistry);
        a.engine.addPolicy(idReg, IdentityRegistry.registerIdentity.selector, address(a.issuerPolicy), none);
        a.engine.addPolicy(idReg, IdentityRegistry.registerIdentities.selector, address(a.issuerPolicy), none);
        a.engine.addPolicy(idReg, IdentityRegistry.removeIdentity.selector, address(a.issuerPolicy), none);
        a.engine.addPolicy(credReg, CredentialRegistry.registerCredential.selector, address(a.issuerPolicy), none);
        a.engine.addPolicy(credReg, CredentialRegistry.registerCredentials.selector, address(a.issuerPolicy), none);
        a.engine.addPolicy(credReg, CredentialRegistry.removeCredential.selector, address(a.issuerPolicy), none);
        a.engine.addPolicy(credReg, CredentialRegistry.renewCredential.selector, address(a.issuerPolicy), none);
        a.issuerPolicy.authorizeSender(issuer);

        bytes32[] memory kyc = new bytes32[](1);
        kyc[0] = KYC;
        a.funderValidator = _validator(idReg, credReg, kyc);

        bytes32[] memory seller = new bytes32[](2);
        seller[0] = KYB;
        seller[1] = PKP;
        a.sellerValidator = _validator(idReg, credReg, seller);
    }

    /// @dev One requirement per credential type, all required (AND), each from the Fakturin registries.
    function _validator(address idReg, address credReg, bytes32[] memory types)
        private
        returns (CredentialRegistryIdentityValidator)
    {
        ICredentialRequirements.CredentialSourceInput[] memory sources =
            new ICredentialRequirements.CredentialSourceInput[](types.length);
        ICredentialRequirements.CredentialRequirementInput[] memory requirements =
            new ICredentialRequirements.CredentialRequirementInput[](types.length);
        for (uint256 i; i < types.length; ++i) {
            sources[i] = ICredentialRequirements.CredentialSourceInput({
                credentialTypeId: types[i],
                identityRegistry: idReg,
                credentialRegistry: credReg,
                dataValidator: address(0)
            });
            bytes32[] memory one = new bytes32[](1);
            one[0] = types[i];
            requirements[i] = ICredentialRequirements.CredentialRequirementInput({
                requirementId: types[i],
                credentialTypeIds: one,
                minValidations: 1,
                invert: false
            });
        }
        return CredentialRegistryIdentityValidator(
            address(
                new ERC1967Proxy(
                    address(new CredentialRegistryIdentityValidator()),
                    abi.encodeCall(CredentialRegistryIdentityValidator.initialize, (sources, requirements))
                )
            )
        );
    }
}
