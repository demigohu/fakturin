"use client";

import { useState } from "react";

/** Same math as FakturRegistry.quote and FakturVault.repay (demo parameters). */
const RATE_PER_30D_BPS = 150;
const PLATFORM_FEE_BPS = 1000;
const ADVANCE_BPS = 8000;
const MAX_TENOR_DAYS = 180;
const OJK_CAP_PER_DAY = 0.00067;

const rp = (n: number) => `Rp${Math.round(n).toLocaleString("en-US")}`;
const pct = (n: number, digits = 2) => `${(n * 100).toFixed(digits)}%`;

export function PricingCalculator() {
  const [nominal, setNominal] = useState(100_000_000);
  const [days, setDays] = useState(60);

  const discount = (nominal * RATE_PER_30D_BPS * days) / (30 * 10_000);
  const target = nominal - discount;
  const advance = (nominal * ADVANCE_BPS) / 10_000;
  const holdback = target - advance;
  const fee = (discount * PLATFORM_FEE_BPS) / 10_000;
  const fundersGet = nominal - fee;
  const fundersReturn = fundersGet - target;
  const periodReturn = target > 0 ? fundersReturn / target : 0;
  const yearly = days > 0 ? (periodReturn * 365) / days : 0;
  const costPerDay = days > 0 ? discount / nominal / days : 0;

  const rows: [string, string, string][] = [
    ["Seller's cost (discount)", rp(discount), `1.5% per 30 days × ${days} days`],
    ["Funding target", rp(target), "What funders put in together"],
    ["Paid to the seller when full", rp(advance), "80% of the invoice"],
    ["Held back in the vault", rp(holdback), "Returned to the seller on repayment"],
    ["Seller repays", rp(nominal), "The full invoice amount"],
    ["Platform fee (on repayment only)", rp(fee), "10% of the seller's cost"],
    ["Funders receive", rp(fundersGet), `+${rp(fundersReturn)} on ${rp(target)}`],
    ["Funder return for the period", pct(periodReturn), `≈ ${pct(yearly, 1)} a year, simple`],
    ["Seller cost per day", pct(costPerDay, 3), `OJK productive cap 0.067% per day`],
  ];

  return (
    <div className="not-prose my-6 border-2 border-fd-foreground bg-white">
      <div className="grid gap-4 border-b-2 border-fd-foreground bg-[var(--surface-warm)] p-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Invoice amount (rupiah)</span>
          <input
            type="number"
            inputMode="numeric"
            min={1_000_000}
            step={1_000_000}
            value={nominal}
            onChange={(e) => setNominal(Math.max(0, Number(e.target.value) || 0))}
            className="border-2 border-fd-foreground bg-white px-3 py-2 font-mono tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">
            Days until due: <span className="font-mono tabular-nums">{days}</span>
          </span>
          <input
            type="range"
            min={1}
            max={MAX_TENOR_DAYS}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="mt-2 accent-[var(--accent)]"
          />
          <span className="font-mono text-xs text-fd-muted-foreground">Max tenor {MAX_TENOR_DAYS} days</span>
        </label>
      </div>
      <dl className="divide-y divide-fd-border">
        {rows.map(([label, value, note]) => (
          <div key={label} className="grid grid-cols-[1fr_auto] gap-x-4 px-4 py-2.5 sm:grid-cols-[1.2fr_auto_1.3fr]">
            <dt className="text-sm">{label}</dt>
            <dd className="text-right font-mono text-sm tabular-nums">{value}</dd>
            <dd className="col-span-2 text-xs text-fd-muted-foreground sm:col-span-1 sm:text-sm">{note}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t-2 border-fd-foreground px-4 py-2.5 text-xs text-fd-muted-foreground">
        {costPerDay <= OJK_CAP_PER_DAY ? "Within" : "Above"} the OJK cap. The contract prices by the second from verification
        until the due date, so live numbers differ slightly. If the seller defaults, funders share only the held-back
        amount and the platform takes no fee.
      </p>
    </div>
  );
}
