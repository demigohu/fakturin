import Link from "next/link";
import { addresses } from "../lib/contracts";
import { EXPLORER, shortHex } from "../lib/invoice";
import { ROLES } from "../lib/roles";
import s from "./shell.module.css";

const CONTRACTS: [string, string | undefined][] = [
  ["FakturRegistry", addresses.registry],
  ["FakturVaultFactory", addresses.factory],
  ["FakturNFT", addresses.nft],
  ["MockIDR", addresses.mockIdr],
  ["FakturVerifierReceiver", addresses.receiver],
  ["FakturKeeper", addresses.keeper],
];

export function Footer() {
  return (
    <footer className={s.footer}>
      <div className={s.footerInner}>
        <div>
          <p className={s.footerBrand}>Fakturin</p>
          <p style={{ marginTop: 16, maxWidth: "40ch", lineHeight: 1.35 }}>
            Built for Ethereum Jakarta Hackathon 2026, RWA track. Running on Arbitrum Sepolia.
          </p>
          <p className={s.footerNote}>
            &lt;demo&gt; MockIDR is not money. Not a financial product. &lt;/demo&gt;
          </p>
        </div>
        <div className={s.footerCol}>
          <h3>Screens</h3>
          {ROLES.map((r) => (
            <Link key={r.href} href={r.href}>
              {r.label}
            </Link>
          ))}
        </div>
        <div className={s.footerCol}>
          <h3>Contracts</h3>
          {CONTRACTS.map(([name, addr]) =>
            addr ? (
              <a key={name} href={`${EXPLORER}/address/${addr}`} target="_blank" rel="noreferrer">
                {name} <span className="mono">{shortHex(addr)}</span>
              </a>
            ) : (
              <span key={name}>
                {name} <span className="mono">not deployed</span>
              </span>
            ),
          )}
        </div>
      </div>
    </footer>
  );
}
