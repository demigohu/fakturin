"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DotsNine, X } from "@phosphor-icons/react";
import { ROLES } from "../lib/roles";
import { ConnectButton } from "./ConnectButton";
import { Logo } from "./Logo";
import s from "./shell.module.css";

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const links = ROLES.map((r) => (
    <Link
      key={r.href}
      href={r.href}
      aria-current={pathname === r.href ? "page" : undefined}
      style={{ "--tone": r.tone } as React.CSSProperties}
    >
      {r.label}
    </Link>
  ));

  return (
    <nav className={s.nav} aria-label="Main">
      <Link href="/" className={s.brand}>
        <Logo size={32} />
        Fakturin
      </Link>
      <div className={s.links}>{links}</div>
      <div className={s.wallet}>
        <ConnectButton />
      </div>
      <button
        type="button"
        className={s.menuBtn}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={26} /> : <DotsNine size={26} />}
      </button>
      <div id="mobile-menu" className={s.mobileMenu} data-open={open}>
        {links}
        <div className={s.mobileWallet}>
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
}
