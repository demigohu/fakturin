import { NextResponse } from "next/server";
import { CRE_MODE } from "../../../lib/automation";
import { createPublicClient, createWalletClient, http, parseEventLogs, type Abi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import keeperAbi from "@repo/abis/FakturKeeper";

/**
 * Demo keeper relayer: POST /api/keeper
 *
 * Does what the Chainlink CRE keeper workflow does on its cron (apps/fakturin-cre/keeper):
 * ask FakturKeeper which vaults are overdue and close them (cancel unfilled funding, default
 * unpaid invoices). The app calls it as soon as a vault it shows passes its deadline, so nobody
 * has to press "Mark default" or "Cancel funding". Closing is permissionless and FakturKeeper
 * re-checks every deadline onchain, so this needs no role; the key only pays gas.
 */

const MAX_PER_CALL = 20n;

export async function POST() {
  // Chainlink CRE does this job; the relayer stays out of the way.
  if (CRE_MODE) return NextResponse.json({ mode: "cre" }, { status: 202 });

  const key = process.env.VERIFIER_PRIVATE_KEY;
  const keeper = process.env.NEXT_PUBLIC_FAKTUR_KEEPER_ADDRESS as Hex | undefined;
  if (!key || !keeper) {
    return NextResponse.json({ error: "Keeper relayer not configured" }, { status: 503 });
  }

  const transport = http(process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL);
  const chain = arbitrumSepolia;
  const publicClient = createPublicClient({ chain, transport });
  const wallet = createWalletClient({ chain, transport, account: privateKeyToAccount(key as Hex) });
  const abi = keeperAbi as Abi;

  const due = (await publicClient.readContract({
    address: keeper,
    abi,
    functionName: "closable",
    args: [MAX_PER_CALL],
  })) as readonly Hex[];
  if (due.length === 0) return NextResponse.json({ closed: 0 });

  // Explicit gas: FakturKeeper reserves CLOSE_GAS (250k) per vault, and estimation would only cover one.
  const gas = 150_000n + 300_000n * BigInt(due.length);
  const hash = await wallet.writeContract({ address: keeper, abi, functionName: "closeDue", args: [MAX_PER_CALL], gas });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const closed = parseEventLogs({ abi, logs: receipt.logs, eventName: "VaultClosed" }).length;
  return NextResponse.json({ closed, due: due.length, hash, status: receipt.status });
}
