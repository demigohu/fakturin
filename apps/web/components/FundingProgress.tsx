import { formatIdrShort } from "../lib/invoice";
import s from "./ui/ui.module.css";

/** Vault funding bar: how much of the target funders have put in. */
export function FundingProgress({ raised, target, note }: { raised: bigint; target: bigint; note?: React.ReactNode }) {
  const ratio = target > 0n ? Number((raised * 10_000n) / target) / 10_000 : 0;
  const pct = Math.min(100, Math.round(ratio * 100));
  return (
    <div className={s.progress}>
      <div
        className={s.progressBar}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Funding progress"
      >
        <span className={s.progressFill} style={{ transform: `scaleX(${Math.min(1, ratio)})` }} />
      </div>
      <div className={s.progressMeta}>
        <span>
          <strong className="num">{formatIdrShort(raised)}</strong> of {formatIdrShort(target)} ({pct}%)
        </span>
        {note}
      </div>
    </div>
  );
}
