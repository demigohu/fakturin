import type { PjapFaktur } from "../lib/pjap";
import { formatIdrx } from "../lib/invoice";
import { KeyValue, SimTag } from "./ui/Panel";
import { Notice } from "./ui/Notice";
import { UNIT } from "../lib/token";

const STATUS_TEXT: Record<PjapFaktur["status"], string> = {
  VALID: "Valid",
  TIDAK_DITEMUKAN: "Not found",
  DIBATALKAN: "Cancelled",
  DIGANTI: "Replaced",
};

function date(iso?: string) {
  return iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";
}

/**
 * What PJAP (simulated) says about a Faktur Pajak number. `parties` shows only the status and
 * the names (for screens that already show amounts and dates from the onchain record).
 */
export function PjapCard({
  faktur,
  parties,
}: {
  faktur: PjapFaktur;
  parties?: boolean;
}) {
  if (faktur.status !== "VALID") {
    return (
      <Notice tone="error">
        <SimTag /> PJAP says: {STATUS_TEXT[faktur.status]}. This Faktur Pajak
        cannot be financed.
      </Notice>
    );
  }
  const items: [string, React.ReactNode][] = [
    [
      "Tax office (PJAP)",
      <span key="s">
        <SimTag /> {STATUS_TEXT[faktur.status]}
      </span>,
    ],
    ["Seller", faktur.penjual?.nama ?? "-"],
    ["Buyer", faktur.pembeli?.nama ?? "-"],
  ];
  if (!parties) {
    items.push(
      [
        "Invoice total",
        <span key="t" className="num">
          {formatIdrx(BigInt(faktur.total ?? 0) * UNIT)}
        </span>,
      ],
      ["Issued", date(faktur.tanggalFaktur)],
      ["Due", date(faktur.jatuhTempo)],
    );
  }
  return <KeyValue items={items} />;
}
