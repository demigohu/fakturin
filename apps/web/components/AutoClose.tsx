"use client";

import { useAutoClose } from "../hooks/useAutoClose";
import { Muted } from "./PageShell";
import { Button } from "./ui/Button";

const COPY = {
  default: {
    closing: "Past due and not repaid. Closing automatically; the held amount then becomes withdrawable.",
    cre: "Past due and not repaid. The Chainlink CRE keeper checks every minute and closes it; the held amount then becomes withdrawable. No action needed.",
    manual: "Past due and not repaid. Close the vault to release the held amount to funders.",
    button: "Close as defaulted",
  },
  cancel: {
    closing: "The funding window ended before the target was reached. Closing automatically; every deposit comes back 1:1.",
    cre: "The funding window ended before the target was reached. The Chainlink CRE keeper checks every minute and closes it; every deposit comes back 1:1. No action needed.",
    manual: "The funding window ended before the target was reached. Close the vault to refund every deposit 1:1.",
    button: "Close and refund",
  },
} as const;

/**
 * Shown on an overdue vault instead of a "Mark default" / "Cancel funding" button.
 * The keeper closes it on its own; the button appears only when no keeper relayer is configured.
 */
export function AutoClose({ kind, onManual, busy }: { kind: keyof typeof COPY; onManual: () => void; busy?: boolean }) {
  const state = useAutoClose(true);
  const copy = COPY[kind];
  if (state === "closing") return <Muted>{copy.closing}</Muted>;
  if (state === "cre") return <Muted>{copy.cre}</Muted>;
  return (
    <>
      <Muted>{copy.manual}</Muted>
      <div>
        <Button size="sm" variant={kind === "default" ? "danger" : "plain"} disabled={busy} onClick={onManual}>
          {copy.button}
        </Button>
      </div>
    </>
  );
}
