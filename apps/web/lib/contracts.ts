import type { Abi } from "viem";
import mockIdrAbi from "@repo/abis/MockIDR";
import registryAbi from "@repo/abis/FakturRegistry";
import vaultAbi from "@repo/abis/FakturVault";

function addr(v: string | undefined): `0x${string}` | undefined {
  if (!v || v === "0x") return undefined;
  return v as `0x${string}`;
}

// Static `process.env.NEXT_PUBLIC_*` access is required: Next only inlines these
// into the client bundle when referenced literally, not via process.env[name].
export const addresses = {
  mockIdr: addr(process.env.NEXT_PUBLIC_MOCK_IDR_ADDRESS),
  registry: addr(process.env.NEXT_PUBLIC_FAKTUR_REGISTRY_ADDRESS),
  factory: addr(process.env.NEXT_PUBLIC_FAKTUR_VAULT_FACTORY_ADDRESS),
  nft: addr(process.env.NEXT_PUBLIC_FAKTUR_NFT_ADDRESS),
  /** Chainlink CRE consumer holding VERIFIER_ROLE. */
  receiver: addr(process.env.NEXT_PUBLIC_FAKTUR_RECEIVER_ADDRESS),
  /** Closes overdue vaults (Chainlink CRE cron consumer). */
  keeper: addr(process.env.NEXT_PUBLIC_FAKTUR_KEEPER_ADDRESS),
};

export function contractsConfigured(): boolean {
  return Boolean(addresses.mockIdr && addresses.registry);
}

export const abis = {
  mockIdr: mockIdrAbi as Abi,
  registry: registryAbi as Abi,
  vault: vaultAbi as Abi,
};
