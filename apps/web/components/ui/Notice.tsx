import {
  CheckCircle,
  CircleNotch,
  Info,
  WarningOctagon,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
import { EXPLORER, shortHex } from "../../lib/invoice";
import s from "./ui.module.css";

type Tone = "info" | "success" | "error" | "pending";

const ICON = {
  info: <Info size={20} />,
  success: <CheckCircle size={20} />,
  error: <WarningOctagon size={20} />,
  pending: <CircleNotch size={20} className={s.spin} />,
};

export function Notice({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div className={`${s.notice} ${s[`notice-${tone}`]}`} role={tone === "error" ? "alert" : "status"}>
      {ICON[tone]}
      <div>{children}</div>
    </div>
  );
}

/** Standard feedback block for a write: pending, success with explorer link, or decoded error. */
export function TxFeedback({
  pending,
  success,
  hash,
  error,
  message,
}: {
  pending: boolean;
  success: boolean;
  hash?: `0x${string}`;
  error: string | null;
  message?: string;
}) {
  const link = hash && (
    <a href={`${EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer" className="mono">
      {shortHex(hash, 8, 6)}
    </a>
  );
  if (error) return <Notice tone="error">{error}</Notice>;
  if (pending)
    return (
      <Notice tone="pending">
        Waiting for the network{hash ? <>: {link}</> : "…"}
      </Notice>
    );
  if (success && message)
    return (
      <Notice tone="success">
        {message} {link && <>Transaction {link}.</>}
      </Notice>
    );
  return null;
}
