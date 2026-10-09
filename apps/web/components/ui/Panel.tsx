import type { ReactNode } from "react";
import s from "./ui.module.css";

export function Tag({ children, sim }: { children: ReactNode; sim?: boolean }) {
  return <span className={`${s.tag} ${sim ? s.tagSim : ""}`}>{children}</span>;
}

/** Marks anything the PRD lists as simulated (section 3). */
export function SimTag() {
  return <Tag sim>Simulated</Tag>;
}

export function Panel({
  title,
  tag,
  actions,
  children,
  flush,
  id,
}: {
  title?: ReactNode;
  tag?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  id?: string;
}) {
  return (
    <section className={s.panelWrap} id={id}>
      {tag && (typeof tag === "string" ? <Tag>{tag}</Tag> : tag)}
      <div className={s.panel}>
        {(title || actions) && (
          <header className={s.panelHead}>
            {title && <h2 className={s.panelTitle}>{title}</h2>}
            {actions}
          </header>
        )}
        <div className={`${s.panelBody} ${flush ? s.flush : ""}`}>{children}</div>
      </div>
    </section>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={s.stat}>
      <span className={s.statLabel}>{label}</span>
      <span className={s.statValue}>{value}</span>
    </div>
  );
}

export function StatGrid({ children, cols = 3 }: { children: ReactNode; cols?: number }) {
  return (
    <div className={s.statGrid} data-cols={cols} style={{ "--cols": cols } as React.CSSProperties}>
      {children}
    </div>
  );
}

export function KeyValue({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className={s.kv}>
      {items.map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Skeleton({ width = "100%", height = "1em" }: { width?: string; height?: string }) {
  return <span className={s.skeleton} style={{ width, height }} aria-hidden />;
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={s.empty}>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
