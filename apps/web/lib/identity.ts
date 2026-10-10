import { encodeAbiParameters, keccak256, toBytes } from "viem";

/** Chainlink ACE credential types Fakturin uses (keccak256 of the namespaced string). */
export const CREDENTIAL = {
  kyc: keccak256(toBytes("common.kyc")),
  kyb: keccak256(toBytes("common.kyb")),
  pkp: keccak256(toBytes("id.fakturin.pkp")),
} as const;

export type IdentityKind = "kyc" | "kyb";

/** The cross-chain identity (CCID) the demo issuer assigns to a wallet. Public; never secret, never PII. */
export function ccidFor(wallet: string): `0x${string}` {
  return keccak256(encodeAbiParameters([{ type: "string" }, { type: "address" }], ["fakturin", wallet as `0x${string}`]));
}

/** What the user signs to prove they control the wallet. Free: a signature, not a transaction. */
export function identityMessage(kind: IdentityKind, wallet: string, issuedAt: string): string {
  return [
    `Fakturin ${kind === "kyc" ? "funder identity check (KYC)" : "business verification (KYB)"}`,
    `Wallet: ${wallet}`,
    `Issued at: ${issuedAt}`,
    "This signature is free and does not send a transaction.",
  ].join("\n");
}
