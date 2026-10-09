import { INVOICE_STATUS, STATUS, STATUS_ACTOR, STATUS_TONE } from "../../lib/invoice";
import s from "./ui.module.css";

export function StatusBadge({ status }: { status: number }) {
  return (
    <span className={`${s.badge} ${s[`tone-${STATUS_TONE[status] ?? "none"}`]}`}>
      {INVOICE_STATUS[status] ?? "Unknown"}
    </span>
  );
}

/**
 * Forward-only lifecycle (PRD v2 section 5): Verifying -> Funding -> Financed -> Repaid.
 * Rejected replaces Funding, Funding failed replaces Financed, Defaulted replaces Repaid.
 */
export function StatusTrack({ status }: { status: number }) {
  const steps = [
    STATUS.Pending,
    status === STATUS.Rejected ? STATUS.Rejected : STATUS.Funding,
    status === STATUS.FundingFailed ? STATUS.FundingFailed : STATUS.Financed,
    status === STATUS.Defaulted ? STATUS.Defaulted : STATUS.Repaid,
  ];
  const order: Record<number, number> = {
    [STATUS.Pending]: 0,
    [STATUS.Rejected]: 1,
    [STATUS.Funding]: 1,
    [STATUS.Financed]: 2,
    [STATUS.FundingFailed]: 2,
    [STATUS.Repaid]: 3,
    [STATUS.Defaulted]: 3,
  };
  const current = order[status] ?? -1;

  return (
    <ol className={`${s.track} ${s.track4}`} aria-label="Invoice status">
      {steps.map((code, i) => {
        const done = i <= current;
        const tone = done ? s[`tone-${STATUS_TONE[code]}`] : "";
        return (
          <li
            key={`${i}-${code}`}
            className={`${s.trackCell} ${done ? `${s.trackDone} ${tone}` : ""} ${i === current ? s.trackCurrent : ""}`}
            aria-current={i === current ? "step" : undefined}
          >
            <strong>{INVOICE_STATUS[code]}</strong>
            <span className={s.trackNote}>{STATUS_ACTOR[code]}</span>
          </li>
        );
      })}
    </ol>
  );
}
