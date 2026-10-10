import {
  CheckCircle,
  CircleNotch,
  Info,
  WarningOctagon,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
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
