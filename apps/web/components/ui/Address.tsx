"use client";

import { ArrowSquareOut, Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import { EXPLORER, shortHex } from "../../lib/invoice";
import s from "./ui.module.css";

export function Address({
  value,
  kind = "address",
  full,
}: {
  value: string;
  kind?: "address" | "id";
  full?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked; nothing to do */
    }
  }

  return (
    <span className={s.addr}>
      <span title={value}>{full ? value : shortHex(value, kind === "id" ? 10 : 6, kind === "id" ? 8 : 4)}</span>
      <button type="button" className={s.iconBtn} onClick={copy} aria-label="Copy">
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      {kind === "address" && (
        <a
          className={s.iconBtn}
          href={`${EXPLORER}/address/${value}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Open in explorer"
        >
          <ArrowSquareOut size={14} />
        </a>
      )}
    </span>
  );
}
