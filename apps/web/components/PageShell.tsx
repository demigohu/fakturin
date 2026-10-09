import type { ReactNode } from "react";
import { roleFor } from "../lib/roles";
import s from "./shell.module.css";

/** Standard role screen: title block with the role's color, then content. */
export function PageShell({
  href,
  title,
  lead,
  children,
}: {
  href: string;
  title: string;
  lead: ReactNode;
  children: ReactNode;
}) {
  const role = roleFor(href);
  return (
    <main id="content" className={s.page}>
      <header className={s.header}>
        <div>
          <h1 className={s.title}>{title}</h1>
          <p className={s.lead}>{lead}</p>
        </div>
        {role && (
          <div className={s.role} style={{ "--tone": role.tone } as React.CSSProperties}>
            <span className={s.roleSwatch} aria-hidden />
            <span>
              For:
              <br />
              {role.who}
            </span>
          </div>
        )}
      </header>
      {children}
    </main>
  );
}

export function Split({ children }: { children: ReactNode }) {
  return <div className={s.split}>{children}</div>;
}

export function Stack({ children }: { children: ReactNode }) {
  return <div className={s.stack}>{children}</div>;
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className={s.actions}>{children}</div>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <p className={s.muted}>{children}</p>;
}
