import type { Abi } from "viem";
import idrxAbi from "@repo/abis/MockIDRX";
import registryAbi from "@repo/abis/FakturRegistry";
import vaultAbi from "@repo/abis/FakturVault";
import nftAbi from "@repo/abis/FakturNFT";
import rendererAbi from "@repo/abis/FakturRenderer";

function addr(v: string | undefined): `0x${string}` | undefined {
  if (!v || v === "0x") return undefined;
  return v as `0x${string}`;
}

// Static `process.env.NEXT_PUBLIC_*` access is required: Next only inlines these
// into the client bundle when referenced literally, not via process.env[name].
export const addresses = {
  /** MockIDRX: testnet stand-in for the IDRX rupiah stablecoin (2 decimals). */
  idrx: addr(process.env.NEXT_PUBLIC_MOCK_IDRX_ADDRESS),
  registry: addr(process.env.NEXT_PUBLIC_FAKTUR_REGISTRY_ADDRESS),
  factory: addr(process.env.NEXT_PUBLIC_FAKTUR_VAULT_FACTORY_ADDRESS),
  nft: addr(process.env.NEXT_PUBLIC_FAKTUR_NFT_ADDRESS),
  /** Chainlink CRE consumer holding VERIFIER_ROLE. */
  receiver: addr(process.env.NEXT_PUBLIC_FAKTUR_RECEIVER_ADDRESS),
  /** Closes overdue vaults (Chainlink CRE cron consumer). */
  keeper: addr(process.env.NEXT_PUBLIC_FAKTUR_KEEPER_ADDRESS),
  /** Draws the invoice NFT as an onchain SVG, also for closed (burned) invoices. */
  renderer: addr(process.env.NEXT_PUBLIC_FAKTUR_RENDERER_ADDRESS),
  /** Chainlink ACE Cross-Chain Identity (self-deployed open-source core contracts). */
  aceIdentityRegistry: addr(process.env.NEXT_PUBLIC_ACE_IDENTITY_REGISTRY_ADDRESS),
  aceCredentialRegistry: addr(process.env.NEXT_PUBLIC_ACE_CREDENTIAL_REGISTRY_ADDRESS),
};

export function contractsConfigured(): boolean {
  return Boolean(addresses.idrx && addresses.registry);
}

export const abis = {
  idrx: idrxAbi as Abi,
  registry: registryAbi as Abi,
  vault: vaultAbi as Abi,
  nft: nftAbi as Abi,
  renderer: rendererAbi as Abi,
};
