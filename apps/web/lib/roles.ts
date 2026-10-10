import type { AssetKey } from "./assets";

export type Role = {
  href: string;
  label: string;
  /** Who the screen is for (PRD v2 section 8). */
  who: string;
  tone: string;
  asset: AssetKey;
  summary: string;
};

export const ROLES: Role[] = [
  {
    href: "/borrow",
    label: "Borrow",
    who: "Seller (PKP)",
    tone: "var(--cat-lilac)",
    asset: "penjual",
    summary: "Borrow against a Faktur Pajak. 80% of it lands in your wallet as soon as funders fill it; repay when your customer pays you.",
  },
  {
    href: "/lend",
    label: "Lend",
    who: "Funder",
    tone: "var(--cat-green)",
    asset: "pemberiDana",
    summary: "Lend to small businesses against tax invoices checked with the tax office. Earn about 16% a year: 1.5% per 30 days, minus a 10% platform fee.",
  },
  {
    href: "/check",
    label: "Check invoice",
    who: "Anyone",
    tone: "var(--cat-cyan)",
    asset: "cek",
    summary: "Look up any Faktur Pajak number: verified or not, funded or not, and by whom.",
  },
];

export function roleFor(href: string): Role | undefined {
  return ROLES.find((r) => r.href === href);
}
