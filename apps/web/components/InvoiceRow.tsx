"use client";

import type { ReactNode } from "react";
import { useInvoice, type Invoice } from "../hooks/useInvoice";
import { formatDate, formatMockIdr } from "../lib/invoice";
import { Address } from "./ui/Address";
import { Skeleton } from "./ui/Panel";
import { StatusBadge } from "./ui/Status";
import s from "./rows.module.css";

/** One invoice in a list. Reads its own onchain record; `actions` receives it. */
export function InvoiceRow({
  id,
  meta,
  actions,
}: {
  id: `0x${string}`;
  meta?: (inv: Invoice) => ReactNode;
  actions?: (inv: Invoice) => ReactNode;
}) {
  const { invoice, isLoading } = useInvoice(id);

  if (isLoading || !invoice) {
    return (
      <li className={s.row}>
        <div className={s.main}>
          <Skeleton width="40%" />
          <Skeleton width="70%" height="0.8em" />
        </div>
      </li>
    );
  }

  return (
    <li className={s.row}>
      <div className={s.main}>
        <div className={s.top}>
          <StatusBadge status={invoice.status} />
          <Address value={id} kind="id" />
        </div>
        <dl className={s.facts}>
          <div>
            <dt>Amount</dt>
            <dd className="num">{formatMockIdr(invoice.nominal)}</dd>
          </div>
          <div>
            <dt>Due date</dt>
            <dd>{formatDate(invoice.dueDate)}</dd>
          </div>
          {meta?.(invoice)}
        </dl>
      </div>
      {actions && <div className={s.actions}>{actions(invoice)}</div>}
    </li>
  );
}

export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function RowList({ children }: { children: ReactNode }) {
  return <ul className={s.list}>{children}</ul>;
}
