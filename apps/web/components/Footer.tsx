import Link from "next/link";
import { addresses } from "../lib/contracts";
import { EXPLORER, shortHex } from "../lib/invoice";
import { ROLES } from "../lib/roles";
import s from "./shell.module.css";

const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.fakturin.xyz";

const CONTRACTS: [string, string | undefined][] = [
  ["FakturRegistry", addresses.registry],
  ["FakturVaultFactory", addresses.factory],
  ["FakturNFT", addresses.nft],
  ["MockIDRX", addresses.idrx],
  ["FakturVerifierReceiver", addresses.receiver],
  ["FakturKeeper", addresses.keeper],
  ["FakturRenderer", addresses.renderer],
  ["ACE IdentityRegistry", addresses.aceIdentityRegistry],
  ["ACE CredentialRegistry", addresses.aceCredentialRegistry],
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
            &lt;demo&gt; MockIDRX is a test copy of the IDRX rupiah stablecoin: not money, not affiliated with IDRX. Not a financial product. &lt;/demo&gt;
          </p>
        </div>
        <div className={s.footerCol}>
          <h3>Screens</h3>
          {ROLES.map((r) => (
            <Link key={r.href} href={r.href}>
              {r.label}
            </Link>
          ))}
          <a href={DOCS_URL} target="_blank" rel="noreferrer">
            Docs
          </a>
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
