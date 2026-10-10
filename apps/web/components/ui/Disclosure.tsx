import type { ReactNode } from "react";
import s from "./ui.module.css";

/** Secondary detail kept one click away, so screens lead with what needs a decision. */
export function Disclosure({
  summary,
  children,
  defaultOpen,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className={s.disclosure} open={defaultOpen}>
      <summary>{summary}</summary>
      <div className={s.disclosureBody}>{children}</div>
    </details>
  );
}
