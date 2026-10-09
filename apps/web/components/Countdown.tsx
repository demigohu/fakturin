"use client";

import { useNow } from "../hooks/useNow";
import s from "./rows.module.css";

export function formatSeconds(total: number): string {
  if (total >= 86400) return `${Math.floor(total / 86400)} days`;
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return m > 0 ? `${m}m ${String(sec).padStart(2, "0")}s` : `${sec}s`;
}

/** Seconds left until `endsAt` (unix), ticking. Renders nothing once elapsed. */
export function useRemaining(endsAt: number): number {
  const now = useNow(endsAt > 0);
  return endsAt > now ? endsAt - now : 0;
}

export function Countdown({ endsAt, label }: { endsAt: number; label: string }) {
  const left = useRemaining(endsAt);
  if (!left) return null;
  return (
    <span>
      {label} <span className={s.countdown}>{formatSeconds(left)}</span>
    </span>
  );
}
