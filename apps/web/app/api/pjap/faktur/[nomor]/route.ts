import { NextResponse } from "next/server";
import { lookupFaktur } from "../../../../../lib/pjap";

/**
 * SIMULATED PJAP endpoint: GET /api/pjap/faktur/{nomor}
 * The Chainlink CRE verification workflow calls this URL (see apps/fakturin-cre/verify).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ nomor: string }> }) {
  const { nomor } = await ctx.params;
  const faktur = lookupFaktur(decodeURIComponent(nomor));
  return NextResponse.json(faktur, {
    status: faktur.status === "TIDAK_DITEMUKAN" ? 404 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
