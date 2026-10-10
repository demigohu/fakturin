import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MagnifyingGlass, Storefront } from "@phosphor-icons/react/dist/ssr";
import { BottomNav } from "../components/landing/BottomNav";
import { ContractGrid } from "../components/landing/ContractGrid";
import { Faq } from "../components/landing/Faq";
import { FlowPin } from "../components/landing/FlowPin";
import { GridCanvas } from "../components/landing/GridCanvas";
import { HeroStory } from "../components/landing/HeroStory";
import { INTRO_SCRIPT, Loader } from "../components/landing/Loader";
import { Motion } from "../components/landing/Motion";
import l from "../components/landing/landing.module.css";
import { ROLES } from "../lib/roles";

// Worked example from PRD section 6 (N = Rp100M, d = 3%, r = 80%).
const MONEY = [
  { label: "Vault target", value: 97_000_000, img: "token", hl: "var(--hl-lime)", note: "Raised from funders for 60 days. The Rp3M difference is the seller's cost: Rp2.7M to funders, Rp0.3M Fakturin fee." },
  { label: "Paid to seller", value: 80_000_000, img: "formulir", hl: "var(--accent)", note: "Sent in the same transaction that fills the vault." },
  { label: "Held in vault", value: 17_000_000, img: "bantalan", hl: "var(--cat-yellow)", note: "Back to the seller on repayment, kept for funders on default." },
];

// Atradius Payment Practices Barometer Asia 2025, Indonesia (PRD section 1).
const STATS = [
  { value: 54, suffix: "%", label: "of B2B sales are made on credit", tone: "var(--cat-yellow)" },
  { value: 50, suffix: " days", label: "average payment term", tone: "var(--cat-orange)" },
  { value: 49, suffix: "%", label: "of invoices are paid late", tone: "var(--cat-lilac)" },
];

const SIMULATED = ["PJAP tax data", "KYC / KYB provider", "Rupiah (MockIDRX)", "Always-on CRE (demo relayer)"];

export default function Home() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      <Loader />
      <Motion>
        <main id="content" className={l.main}>
          {/* Attention + how it works: chapters on the left drive the pinned art. */}
          <HeroStory />

          {/* Interest: why, on ink. */}
          <section id="why" className={l.ink} data-theme-section="dark">
            <div className={l.wrap}>
              <div className={l.manifesto}>
                <h2 className={l.display} data-split="words">
                  Checked first, then funded.
                </h2>
                <p data-ghost="dark">
                  Small suppliers wait weeks for their customers to pay. Invoice financing pays them now,
                  but lenders hold back because one invoice can be pitched to many of them at once.
                  Fakturin settles both problems in the contract.
                </p>
              </div>
              <ul className={l.steps}>
                {STATS.map((st) => (
                  <li key={st.label} className={l.step} style={{ "--tone": st.tone } as React.CSSProperties}>
                    <span className={l.stepChip} aria-hidden />
                    <div className={l.rail}>
                      <div className={l.railInner}>
                        <div className={l.statCell}>
                          <strong data-count={st.value} data-suffix={st.suffix}>
                            {st.value}
                            {st.suffix}
                          </strong>
                          <span>{st.label}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className={l.source}>
                Source: Atradius Payment Practices Barometer, Indonesia 2025 (240 companies).
              </p>
              <div className={l.guards} data-reveal-row>
                <div className={l.guard} data-reveal-item>
                  <h3>One Faktur Pajak, one financing</h3>
                  <p>
                    The invoice ID is the hash of the national Faktur Pajak number. Once financed, the
                    registry refuses it forever, in any format it is typed.
                  </p>
                  <span className={l.reject} data-scramble>
                    Already registered
                  </span>
                </div>
                <div className={l.guard} data-reveal-item>
                  <h3>Verified at the source</h3>
                  <p>
                    Chainlink CRE checks every invoice with PJAP before a vault opens. Cancelled or
                    replaced invoices never reach funders.
                  </p>
                  <span className={l.reject} data-scramble>
                    Faktur Pajak was cancelled
                  </span>
                </div>
                <div className={l.guard} data-reveal-item>
                  <h3>Only the invoice&apos;s own seller</h3>
                  <p>
                    Businesses verify once and get a Chainlink ACE credential holding a hash of their NPWP. An
                    invoice issued under another NPWP is refused, so nobody can finance someone else&apos;s sale.
                  </p>
                  <span className={l.reject} data-scramble>
                    NPWP does not match
                  </span>
                </div>
                <div className={l.guard} data-reveal-item>
                  <h3>We earn only when funders do</h3>
                  <p>
                    Sellers pay 1.5% per 30 days, all-in, inside the OJK cap. Fakturin keeps 10% of it, taken
                    only when the invoice is repaid. On a default the platform earns nothing.
                  </p>
                  <span className={l.reject} data-scramble>
                    No fee on default
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Interest: roles, staggered columns with parallax. */}
          <section id="roles" className={l.warm} data-theme-section="light">
            <div className={l.wrap}>
              <h2 className={l.h2Display} data-split="words">
                Borrow or lend. The customer stays out of it.
              </h2>
              <p className={l.sub}>
                Businesses borrow against their invoices; funders lend and earn a return. The business&apos;s
                customer just pays the business as usual and never uses the app.
              </p>
              <div className={l.roles}>
                {ROLES.map((r, i) => (
                  <div
                    key={r.href}
                    className={l.roleCol}
                    data-parallax={i % 2 === 1 ? "30,-15" : "0,0"}
                  >
                    <Link href={r.href} className={l.roleCard} style={{ "--tone": r.tone } as React.CSSProperties}>
                      <span className={l.roleTag}>{r.who}</span>
                      <span className={l.rail}>
                        <span className={l.railInner}>
                          <span className={l.roleIcon}>
                            <ArrowUpRight size={22} />
                          </span>
                          <span className={l.roleName}>{r.label}</span>
                        </span>
                      </span>
                      <span className={l.roleMedia}>
                        <Image
                          src={`/illustrations/${r.asset === "pemberiDana" ? "pemberi-dana" : r.asset}.webp`}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 100vw, 45vw"
                          className={l.roleImg}
                        />
                      </span>
                      <span className={l.roleBody}>{r.summary}</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Interest: money split, prize-card style. */}
          <section id="split" className={l.section} data-theme-section="light">
            <div className={l.wrap}>
              <div className={l.ruleHead}>
                <h2 className={l.title}>A Rp100M invoice, step by step.</h2>
                <p className={l.subGrey}>Funders lend Rp97M. The business gets Rp80M today; Rp17M is held as a safety buffer.</p>
              </div>
              <div className={l.prizes} data-reveal-row>
                {MONEY.map((m) => (
                  <div key={m.label} className={l.prize} data-reveal-item>
                    <div className={l.prizeMedia}>
                      <span className={l.ribbon} style={{ "--hl": m.hl } as React.CSSProperties}>
                        <span className={l.ribbonHash}>#</span>
                        <span className={l.ribbonText}>{m.label}</span>
                        <span className={l.ribbonCap}>{"}"}</span>
                      </span>
                      <span className={l.prizeArt} data-wiggle="4">
                        <Image src={`/illustrations/${m.img}.webp`} alt="" width={320} height={320} />
                      </span>
                    </div>
                    <div className={l.prizeBody}>
                      <strong data-count={m.value} data-prefix="Rp">
                        Rp{m.value.toLocaleString("en-US")}
                      </strong>
                      <span>{m.note}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className={l.bar} data-grow aria-hidden>
                <span style={{ flex: 80, background: "var(--accent)" }} />
                <span style={{ flex: 17, background: "var(--cat-yellow)" }} />
                <span style={{ flex: 3, background: "var(--hl-lime)" }} />
              </div>

              <div className={l.ruleHead}>
                <h2 className={l.title}>At the due date</h2>
                <p className={l.subGrey}>The customer pays the business, the business repays Rp100M. The contract does the rest.</p>
              </div>
              <div className={l.outcomes} data-reveal-row>
                <div className={l.prize} data-reveal-item>
                  <div className={l.prizeMedia}>
                    <span className={l.ribbon} style={{ "--hl": "var(--cat-green)" } as React.CSSProperties}>
                      <span className={l.ribbonHash}>#</span>
                      <span className={l.ribbonText}>Repaid</span>
                      <span className={l.ribbonCap}>{"}"}</span>
                    </span>
                    <span className={l.prizeArt} data-wiggle="4">
                      <Image src="/illustrations/stempel.webp" alt="" width={320} height={320} />
                    </span>
                  </div>
                  <dl className={l.outcomeRows}>
                    <dt>Funders withdraw</dt>
                    <dd>Rp99,700,000</dd>
                    <dt>Seller gets the held amount back</dt>
                    <dd>Rp17,000,000</dd>
                  </dl>
                </div>
                <div className={l.prize} data-reveal-item>
                  <div className={l.prizeMedia}>
                    <span className={l.ribbon} style={{ "--hl": "var(--cat-orange)" } as React.CSSProperties}>
                      <span className={l.ribbonHash}>#</span>
                      <span className={l.ribbonText}>Default</span>
                      <span className={l.ribbonCap}>{"}"}</span>
                    </span>
                    <span className={l.prizeArt} data-wiggle="4">
                      <Image src="/illustrations/penjepit.webp" alt="" width={320} height={320} />
                    </span>
                  </div>
                  <dl className={l.outcomeRows}>
                    <dt>Funders withdraw the held amount</dt>
                    <dd>Rp17,000,000</dd>
                    <dt>Seller</dt>
                    <dd>Flagged in registry</dd>
                  </dl>
                </div>
              </div>
            </div>
          </section>

          {/* Desire: pinned horizontal walkthrough. */}
          <section id="demo" className={l.inkFlow} data-theme-section="dark">
            <FlowPin />
          </section>

          {/* Interactive grid band with the two secondary CTAs. */}
          <section className={l.gridBand} data-theme-section="light">
            <GridCanvas />
            <div className={l.gridBandInner}>
              <h2 className={l.display} data-split="words">
                One registry, open to everyone.
              </h2>
              <p className={l.gridBandSub}>
                Anyone can look up a Faktur Pajak number: verified, funding or already financed. No
                wallet needed.
              </p>
              <div className={l.ctaRow}>
                <Link href="/check" className={l.cta} data-magnetic="20">
                  <span className={l.ctaLabel}>Check an invoice</span>
                  <span className={l.ctaIcon}>
                    <MagnifyingGlass size={22} />
                  </span>
                </Link>
                <Link href="/lend" className={l.cta} data-magnetic="20">
                  <span className={l.ctaLabel}>Lend to invoices</span>
                  <span className={l.ctaIcon}>
                    <Storefront size={22} />
                  </span>
                </Link>
              </div>
            </div>
          </section>

          {/* Contracts on Arbitrum Sepolia, Flip hover grid. */}
          <section className={l.inkSection} data-theme-section="dark">
            <div className={l.wrapWide}>
              <h2 className={l.h2Display} data-split="words">
                Open contracts.
              </h2>
              <p className={l.subInk}>
                Every rule on this page runs in these contracts, identity included. Verify them yourself on Arbiscan.
              </p>
              <ContractGrid />
              <div className={l.simBar}>
                <span className={l.simTag}>Simulated</span>
                <span>Played by the demo:</span>
                {SIMULATED.map((s) => (
                  <span key={s} className={l.simItem}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section id="faq" className={l.section} data-theme-section="light">
            <div className={l.wrap}>
              <h2 className={l.h2Display} data-split="words">
                FAQ
              </h2>
              <Faq />
              <p className={l.faqNote}>
                Full details live in the PRD and the repo README. All test data is fictional.
              </p>
            </div>
          </section>

          {/* Action: closing band. */}
          <section className={l.closing} data-theme-section="light" data-scroll-end>
            <h2 className={l.closingTitle} data-split="words">
              Try it yourself in two minutes.
            </h2>
            <Link href="/borrow" className={l.closingBar}>
              <span>Borrow against an invoice</span>
              <span className={l.closingIcon}>
                <ArrowUpRight size={26} />
              </span>
            </Link>
          </section>
        </main>
        <BottomNav />
      </Motion>
    </>
  );
}
