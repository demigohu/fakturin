import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { pjapAccount } from "../../../../../lib/pjap";

/**
 * SIMULATED PJAP account lookup: GET /api/pjap/account/{wallet}
 * Stands in for "sign in with your PJAP / Coretax account" during KYB: returns the business, its
 * NPWP and PKP status linked to the wallet.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ wallet: string }> }) {
  const { wallet } = await ctx.params;
  if (!isAddress(wallet)) return NextResponse.json({ error: "Not a wallet address" }, { status: 400 });
  return NextResponse.json(pjapAccount(wallet), { headers: { "Cache-Control": "no-store" } });
}
