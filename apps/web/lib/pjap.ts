import { keccak256, toBytes } from "viem";

/**
 * SIMULATED PJAP (tax application provider) lookup for a Faktur Pajak number.
 *
 * Real machine access to Coretax DJP goes through a PJAP host-to-host API (PER-03/PJ/2022);
 * the public Coretax QR page sits behind a CAPTCHA. Until Fakturin has PJAP staging access, this
 * module returns data shaped like a PJAP response, generated deterministically from the number,
 * so the same number always gives the same invoice. Swapping in a real PJAP means replacing
 * `lookupFaktur` with an HTTP call; the Chainlink CRE workflow reads the same JSON shape.
 *
 * Demo numbers (last four digits):
 *   ...0000  not found          ...9999  cancelled (dibatalkan)
 *   ...8888  replaced (diganti) ...7777  due in 2 minutes (to demo a default)
 */

export type PjapStatus = "VALID" | "TIDAK_DITEMUKAN" | "DIBATALKAN" | "DIGANTI";

export type PjapFaktur = {
  simulated: true;
  nomorFaktur: string;
  status: PjapStatus;
  tanggalFaktur?: string; // ISO date
  jatuhTempo?: string; // ISO date-time
  penjual?: { npwp: string; nama: string };
  pembeli?: { npwp: string; nama: string };
  dpp?: number; // rupiah
  ppn?: number; // rupiah
  total?: number; // rupiah, the invoice nominal
};

const BUYERS = [
  "PT Sinar Kemasindo Utama",
  "PT Mitra Pangan Nusantara",
  "PT Ardana Food Industries",
  "PT Tirta Sejahtera Abadi",
  "PT Kencana Plastik Jaya",
  "PT Garuda Retail Indonesia",
  "PT Samudra Logistik Prima",
  "PT Nusa Agro Lestari",
];

const SELLERS = [
  "CV Rina Kemasan Mandiri",
  "CV Bumi Cetak Sentosa",
  "UD Sumber Karton Jaya",
  "CV Mega Label Persada",
];

const TOTALS = [25, 40, 60, 75, 100, 120, 150].map((m) => m * 1_000_000);
const TERMS_DAYS = [30, 45, 60, 90];

export function normalizeFakturNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Deterministic byte stream from the number. */
function seedBytes(digits: string): Uint8Array {
  return toBytes(keccak256(toBytes(`pjap:${digits}`)));
}

function npwp(bytes: Uint8Array, offset: number): string {
  let out = "";
  for (let i = 0; i < 16; i++) out += String(bytes[(offset + i) % bytes.length]! % 10);
  return out;
}

export function lookupFaktur(raw: string, now: Date = new Date()): PjapFaktur {
  const nomorFaktur = normalizeFakturNumber(raw);
  if (nomorFaktur.length < 13 || nomorFaktur.length > 17 || nomorFaktur.endsWith("0000")) {
    return { simulated: true, nomorFaktur, status: "TIDAK_DITEMUKAN" };
  }

  const b = seedBytes(nomorFaktur);
  const total = TOTALS[b[0]! % TOTALS.length]!;
  const dpp = Math.round(total / 1.11);
  const issued = new Date(now);
  issued.setUTCHours(0, 0, 0, 0);
  issued.setUTCDate(issued.getUTCDate() - (b[1]! % 14));
  const due = new Date(issued);
  due.setUTCDate(due.getUTCDate() + TERMS_DAYS[b[2]! % TERMS_DAYS.length]!);

  const base: PjapFaktur = {
    simulated: true,
    nomorFaktur,
    status: "VALID",
    tanggalFaktur: issued.toISOString().slice(0, 10),
    jatuhTempo: due.toISOString(),
    penjual: { npwp: npwp(b, 3), nama: SELLERS[b[4]! % SELLERS.length]! },
    pembeli: { npwp: npwp(b, 11), nama: BUYERS[b[5]! % BUYERS.length]! },
    dpp,
    ppn: total - dpp,
    total,
  };

  if (nomorFaktur.endsWith("9999")) return { ...base, status: "DIBATALKAN" };
  if (nomorFaktur.endsWith("8888")) return { ...base, status: "DIGANTI" };
  if (nomorFaktur.endsWith("7777")) {
    return { ...base, jatuhTempo: new Date(now.getTime() + 2 * 60_000).toISOString() };
  }
  return base;
}

/** Registry reject codes (FakturRegistry.REJECT_*). */
export const REJECT = { NOT_FOUND: 1, CANCELLED: 2, REPLACED: 3, SELLER_MISMATCH: 4, EXPIRED: 5, LIMIT: 6 } as const;

/** Maps a PJAP response to the registry's Verification struct (amounts in 18-decimal MockIDR). */
export function toVerification(f: PjapFaktur) {
  const rejectCode =
    f.status === "VALID"
      ? 0
      : f.status === "DIBATALKAN"
        ? REJECT.CANCELLED
        : f.status === "DIGANTI"
          ? REJECT.REPLACED
          : REJECT.NOT_FOUND;
  const valid = rejectCode === 0;
  return {
    valid,
    rejectCode,
    buyerNpwpHash: valid ? keccak256(toBytes(f.pembeli!.npwp)) : (`0x${"0".repeat(64)}` as const),
    nominal: valid ? BigInt(f.total!) * 10n ** 18n : 0n,
    issuedAt: valid ? BigInt(Math.floor(new Date(f.tanggalFaktur!).getTime() / 1000)) : 0n,
    dueDate: valid ? BigInt(Math.floor(new Date(f.jatuhTempo!).getTime() / 1000)) : 0n,
  };
}

/** A few ready-made numbers for the demo console and placeholders. */
export function demoNumbers(count = 6): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    // 14 digits, Coretax-like prefix; random so each visit gets fresh, unregistered numbers.
    const n = String(Math.floor(Math.random() * 100_000_000)).padStart(8, "0");
    out.push(`040026${n}`.replace(/(0000|9999|8888|7777)$/, "1234"));
  }
  return out;
}
