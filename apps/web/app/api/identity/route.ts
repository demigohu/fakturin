import { NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  http,
  isAddress,
  verifyMessage,
  type Abi,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import identityAbi from "@repo/abis/AceIdentityRegistry";
import credentialAbi from "@repo/abis/AceCredentialRegistry";
import { ccidFor, CREDENTIAL, identityMessage, type IdentityKind } from "../../../lib/identity";
import { npwpHash, pjapAccount } from "../../../lib/pjap";

/**
 * SIMULATED credential issuer: POST /api/identity { kind, address, issuedAt, signature }
 *
 * Plays the KYC/KYB provider. After the user proves wallet control with a free signature, it
 * writes Chainlink ACE Cross-Chain Identity records: a CCID for the wallet in IdentityRegistry and
 * credentials in CredentialRegistry (`common.kyc` for funders; `common.kyb` + `id.fakturin.pkp`
 * carrying the NPWP hash for sellers). Only the authorized issuer can write them: ACE's
 * PolicyEngine runs OnlyAuthorizedSenderPolicy on every registry write. A real deployment swaps
 * this route for a licensed e-KYC/KYB provider; nothing else changes.
 */

const MAX_AGE_MS = 15 * 60_000;

export async function POST(req: Request) {
  const key = process.env.VERIFIER_PRIVATE_KEY;
  const identityRegistry = process.env.NEXT_PUBLIC_ACE_IDENTITY_REGISTRY_ADDRESS as Hex | undefined;
  const credentialRegistry = process.env.NEXT_PUBLIC_ACE_CREDENTIAL_REGISTRY_ADDRESS as Hex | undefined;
  if (!key || !identityRegistry || !credentialRegistry) {
    return NextResponse.json({ error: "Identity issuer not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    kind?: IdentityKind;
    address?: string;
    issuedAt?: string;
    signature?: Hex;
  };
  const { kind, address, issuedAt, signature } = body;
  if ((kind !== "kyc" && kind !== "kyb") || !address || !isAddress(address) || !issuedAt || !signature) {
    return NextResponse.json({ error: "kind, address, issuedAt and signature are required" }, { status: 400 });
  }
  const age = Date.now() - Date.parse(issuedAt);
  if (!(age >= -60_000 && age < MAX_AGE_MS)) {
    return NextResponse.json({ error: "Signature expired, please sign again" }, { status: 400 });
  }
  const valid = await verifyMessage({ address, message: identityMessage(kind, address, issuedAt), signature }).catch(
    () => false,
  );
  if (!valid) return NextResponse.json({ error: "The signature does not match this wallet" }, { status: 401 });

  const transport = http(process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL);
  const chain = arbitrumSepolia;
  const publicClient = createPublicClient({ chain, transport });
  const wallet = createWalletClient({ chain, transport, account: privateKeyToAccount(key as Hex) });
  const idAbi = identityAbi as Abi;
  const credAbi = credentialAbi as Abi;

  // KYB: the simulated PJAP account linked to the wallet must be an active PKP.
  const account = kind === "kyb" ? pjapAccount(address) : null;
  if (account && !account.pkp) {
    return NextResponse.json({ error: "This business is not a registered PKP" }, { status: 422 });
  }

  const hashes: Hex[] = [];
  const send = async (params: Parameters<typeof wallet.writeContract>[0]) => {
    const hash = await wallet.writeContract(params);
    await publicClient.waitForTransactionReceipt({ hash });
    hashes.push(hash);
  };

  let ccid = (await publicClient.readContract({
    address: identityRegistry,
    abi: idAbi,
    functionName: "getIdentity",
    args: [address],
  })) as Hex;
  if (/^0x0+$/.test(ccid)) {
    ccid = ccidFor(address);
    await send({ address: identityRegistry, abi: idAbi, functionName: "registerIdentity", args: [ccid, address, "0x"], chain, account: wallet.account });
  }

  const wanted: [Hex, Hex][] =
    kind === "kyc"
      ? [[CREDENTIAL.kyc, "0x"]]
      : [
          [CREDENTIAL.kyb, "0x"],
          [CREDENTIAL.pkp, encodeAbiParameters([{ type: "bytes32" }], [npwpHash(account!.npwp)])],
        ];
  for (const [type, data] of wanted) {
    const has = (await publicClient.readContract({
      address: credentialRegistry,
      abi: credAbi,
      functionName: "validate",
      args: [ccid, type, "0x"],
    })) as boolean;
    if (!has) {
      await send({ address: credentialRegistry, abi: credAbi, functionName: "registerCredential", args: [ccid, type, 0, data, "0x"], chain, account: wallet.account });
    }
  }

  return NextResponse.json({
    ok: true,
    ccid,
    hashes,
    business: account ? { nama: account.nama, npwpMasked: `${account.npwp.slice(0, 2)}.***.***.*-${account.npwp.slice(-6, -3)}.${account.npwp.slice(-3)}` } : undefined,
  });
}
