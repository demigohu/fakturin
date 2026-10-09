"use client";

import { useAutoClose } from "../hooks/useAutoClose";
import { Muted } from "./PageShell";
import { Button } from "./ui/Button";

const COPY = {
  default: {
    closing: "Past due and not repaid. Chainlink CRE is closing this vault automatically; the held amount then becomes withdrawable.",
    manual: "Past due and not repaid. Close the vault to release the held amount to funders.",
    button: "Close as defaulted",
  },
  cancel: {
    closing: "The funding window ended before the target was reached. Closing automatically; every deposit comes back 1:1.",
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
