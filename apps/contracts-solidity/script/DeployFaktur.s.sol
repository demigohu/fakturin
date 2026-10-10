// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IIdentityRegistry} from "@chainlink/cross-chain-identity/interfaces/IIdentityRegistry.sol";
import {ICredentialRegistry} from "@chainlink/cross-chain-identity/interfaces/ICredentialRegistry.sol";
import {IIdentityValidator} from "@chainlink/cross-chain-identity/interfaces/IIdentityValidator.sol";
import {MockIDRX} from "../src/MockIDRX.sol";
import {FakturNFT, IFakturRenderer} from "../src/FakturNFT.sol";
import {FakturRegistry} from "../src/FakturRegistry.sol";
import {FakturRenderer} from "../src/FakturRenderer.sol";
import {FakturVaultFactory} from "../src/FakturVaultFactory.sol";
import {FakturVerifierReceiver} from "../src/FakturVerifierReceiver.sol";
import {FakturKeeper} from "../src/FakturKeeper.sol";
import {AceDeployer} from "./AceDeployer.sol";

/// @notice Deploys Fakturin v3 (PRD v3): Chainlink ACE identity stack, NFT + onchain renderer,
///         vault factory, registry, CRE verifier receiver, keeper.
/// Env:
///   PRIVATE_KEY      deployer (admin)
///   MOCK_IDRX        optional: reuse an existing MockIDRX (otherwise a new one is deployed)
///   CRE_FORWARDER    optional: Keystone forwarder (default: Arbitrum Sepolia simulation forwarder)
///   RELAYER          optional: demo verifier relayer and ACE credential issuer (default: deployer)
///   TREASURY         optional: platform fee recipient (default: deployer)
contract DeployFaktur is Script, AceDeployer {
    address constant ARB_SEPOLIA_CRE_SIM_FORWARDER = 0xD41263567DdfeAd91504199b8c6c87371e83ca5d;

    function run() external {
        uint256 key = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(key);
        address forwarder = vm.envOr("CRE_FORWARDER", ARB_SEPOLIA_CRE_SIM_FORWARDER);
        address relayer = vm.envOr("RELAYER", deployer);
        address treasury = vm.envOr("TREASURY", deployer);
        address existingIdr = vm.envOr("MOCK_IDRX", address(0));

        vm.startBroadcast(key);

        IERC20 idr = existingIdr == address(0) ? IERC20(address(new MockIDRX(deployer))) : IERC20(existingIdr);
        FakturNFT nft = new FakturNFT(deployer);
        FakturVaultFactory factory = new FakturVaultFactory(idr);
        FakturRegistry registry = new FakturRegistry(deployer, nft, factory, treasury);
        factory.setRegistry(address(registry));
        nft.grantRole(nft.REGISTRY_ROLE(), address(registry));
        FakturRenderer renderer = new FakturRenderer(registry);
        nft.setRenderer(IFakturRenderer(address(renderer)));

        Ace memory ace = _deployAce(deployer, relayer);
        registry.setIdentity(
            IIdentityRegistry(address(ace.identityRegistry)),
            ICredentialRegistry(address(ace.credentialRegistry)),
            IIdentityValidator(address(ace.funderValidator)),
            IIdentityValidator(address(ace.sellerValidator))
        );

        FakturVerifierReceiver receiver = new FakturVerifierReceiver(forwarder, registry);
        registry.grantRole(registry.VERIFIER_ROLE(), address(receiver));
        registry.grantRole(registry.VERIFIER_ROLE(), relayer);

        FakturKeeper keeper = new FakturKeeper(forwarder, factory);

        vm.stopBroadcast();

        console2.log("MockIDRX", address(idr));
        console2.log("FakturNFT", address(nft));
        console2.log("FakturRenderer", address(renderer));
        console2.log("FakturVaultFactory", address(factory));
        console2.log("FakturRegistry", address(registry));
        console2.log("FakturVerifierReceiver", address(receiver));
        console2.log("FakturKeeper", address(keeper));
        console2.log("AcePolicyEngine", address(ace.engine));
        console2.log("AceIssuerPolicy", address(ace.issuerPolicy));
        console2.log("AceIdentityRegistry", address(ace.identityRegistry));
        console2.log("AceCredentialRegistry", address(ace.credentialRegistry));
        console2.log("AceFunderValidator", address(ace.funderValidator));
        console2.log("AceSellerValidator", address(ace.sellerValidator));
        console2.log("CreForwarder", forwarder);
        console2.log("Relayer (verifier + ACE issuer)", relayer);
        console2.log("Treasury", treasury);
    }
}
