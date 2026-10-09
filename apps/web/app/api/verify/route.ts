import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, isHex, type Abi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import registryAbi from "@repo/abis/FakturRegistry";
import { lookupFaktur, toVerification } from "../../../lib/pjap";

/**
 * Demo verifier relayer: POST /api/verify { invoiceId }
 *
 * Does exactly what the Chainlink CRE verification workflow does (apps/fakturin-cre/verify):
 * read the pending request, ask PJAP about the Faktur Pajak, write the result to the registry.
 * It exists so the demo verifies instantly while CRE cannot yet be deployed permanently.
 * Holds VERIFIER_ROLE through VERIFIER_PRIVATE_KEY (server-only env).
 */

const STATUS_PENDING = 1;

export async function POST(req: Request) {
  const key = process.env.VERIFIER_PRIVATE_KEY;
  const registry = process.env.NEXT_PUBLIC_FAKTUR_REGISTRY_ADDRESS as Hex | undefined;
  if (!key || !registry) {
    return NextResponse.json({ error: "Relayer not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { invoiceId?: string };
  if (!body.invoiceId || !isHex(body.invoiceId) || body.invoiceId.length !== 66) {
    return NextResponse.json({ error: "invoiceId must be a bytes32 hex string" }, { status: 400 });
  }
  const invoiceId = body.invoiceId as Hex;

  const transport = http(process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL);
  const chain = arbitrumSepolia;
  const publicClient = createPublicClient({ chain, transport });
  const account = privateKeyToAccount(key as Hex);
  const wallet = createWalletClient({ chain, transport, account });
  const abi = registryAbi as Abi;

  const invoice = (await publicClient.readContract({
    address: registry,
    abi,
    functionName: "getInvoice",
    args: [invoiceId],
  })) as { status: number };
  if (Number(invoice.status) !== STATUS_PENDING) {
    return NextResponse.json({ skipped: true, reason: "not pending" });
  }

  const number = (await publicClient.readContract({
    address: registry,
    abi,
    functionName: "fakturNumberOf",
    args: [invoiceId],
  })) as string;

  const faktur = lookupFaktur(number);
  const verification = toVerification(faktur);

  const hash = await wallet.writeContract({
    address: registry,
    abi,
    functionName: "fulfillVerification",
    args: [invoiceId, verification],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const after = (await publicClient.readContract({
    address: registry,
    abi,
    functionName: "getInvoice",
    args: [invoiceId],
  })) as { status: number; rejectCode: number };

  return NextResponse.json({
    hash,
    status: receipt.status,
    invoiceStatus: Number(after.status),
    rejectCode: Number(after.rejectCode),
    pjap: { status: faktur.status, simulated: true },
  });
}
