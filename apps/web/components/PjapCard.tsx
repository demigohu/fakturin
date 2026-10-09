import type { PjapFaktur } from "../lib/pjap";
import { formatMockIdr } from "../lib/invoice";
import { KeyValue, SimTag } from "./ui/Panel";
import { Notice } from "./ui/Notice";

const STATUS_TEXT: Record<PjapFaktur["status"], string> = {
  VALID: "Valid",
  TIDAK_DITEMUKAN: "Not found",
  DIBATALKAN: "Cancelled",
  DIGANTI: "Replaced",
};

function date(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-";
}

/** What PJAP (simulated) says about a Faktur Pajak number. */
export function PjapCard({ faktur }: { faktur: PjapFaktur }) {
  if (faktur.status !== "VALID") {
    return (
      <Notice tone="error">
        <SimTag /> PJAP says: {STATUS_TEXT[faktur.status]}. This Faktur Pajak cannot be financed.
      </Notice>
    );
  }
  return (
    <KeyValue
      items={[
        ["PJAP status", <span key="s"><SimTag /> {STATUS_TEXT[faktur.status]}</span>],
        ["Buyer", faktur.pembeli?.nama ?? "-"],
        ["Seller on record", faktur.penjual?.nama ?? "-"],
        ["Invoice total", <span key="t" className="num">{formatMockIdr(BigInt(faktur.total ?? 0) * 10n ** 18n)}</span>],
        ["Issued", date(faktur.tanggalFaktur)],
        ["Due", date(faktur.jatuhTempo)],
      ]}
    />
  );
}
