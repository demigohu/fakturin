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
    href: "/penjual",
    label: "Seller",
    who: "Seller (PKP)",
    tone: "var(--cat-lilac)",
    asset: "penjual",
    summary: "Enter a Faktur Pajak number. Chainlink CRE checks it with the tax system and opens a funding vault.",
  },
  {
    href: "/pasar",
    label: "Market",
    who: "Funder",
    tone: "var(--cat-green)",
    asset: "pemberiDana",
    summary: "Pick a verified invoice and fund any part of it. Withdraw with the return when it is repaid.",
  },
  {
    href: "/cek",
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
