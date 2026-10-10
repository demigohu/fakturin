import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

const entries = [
  {
    href: "/docs/guides/borrower",
    title: "Borrower guide",
    body: "Verify your business, submit a Faktur Pajak, get 80% today, repay on the due date.",
    tile: "bg-[var(--cat-lilac)]",
    art: "/illustrations/penjual.webp",
    scene: true,
  },
  {
    href: "/docs/guides/lender",
    title: "Lender guide",
    body: "Pass KYC, pick a verified invoice, lend any amount, withdraw with your return.",
    tile: "bg-[var(--cat-green)]",
    art: "/illustrations/pemberi-dana.webp",
    scene: true,
  },
  {
    href: "/docs/architecture",
    title: "Architecture",
    body: "System overview, sequence diagrams, money flow, deployment topology and trust model.",
    tile: "bg-[var(--cat-cyan)]",
    art: "/illustrations/formulir.webp",
    scene: false,
  },
  {
    href: "/docs/reference/contracts",
    title: "Contract reference",
    body: "Every contract, function, event, reject code and the live addresses on Arbitrum Sepolia.",
    tile: "bg-[var(--cat-yellow)]",
    art: "/illustrations/token.webp",
    scene: false,
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="graph-paper border-b-2 border-fd-foreground">
        <div className="mx-auto grid w-full max-w-[1280px] items-center gap-8 px-4 py-14 sm:px-8 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div>
            <p className="mb-5 inline-block bg-fd-foreground px-2 py-1 font-mono text-xs text-fd-background">
              Arbitrum Sepolia · Chainlink CRE · Chainlink ACE · ERC-4626
            </p>
            <h1 className="text-[clamp(2.5rem,5.5vw,4.75rem)] leading-[0.92] font-medium tracking-[-0.05em]">
              Fakturin documentation
            </h1>
            <p className="mt-5 max-w-[56ch] text-lg leading-snug text-fd-muted-foreground">
              Invoice financing for Indonesian small businesses. A verified Faktur Pajak becomes a vault that verified
              funders fill together; the seller gets paid today and repays when the buyer pays.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/docs"
                className="group inline-flex items-center gap-3 border-2 border-fd-foreground bg-fd-foreground py-3 pr-3 pl-5 font-medium text-fd-background transition-transform duration-300 active:translate-y-px"
              >
                Start reading
                <span className="grid size-7 place-items-center bg-[var(--accent)] text-fd-foreground transition-transform duration-300 group-hover:translate-x-0.5">
                  <ArrowRight size={16} weight="bold" aria-hidden />
                </span>
              </Link>
              <Link
                href="/docs/getting-started"
                className="inline-flex items-center border-2 border-fd-foreground bg-fd-background px-5 py-3 font-medium transition-colors duration-300 hover:bg-[var(--surface-warm)]"
              >
                Try the demo in 5 minutes
              </Link>
            </div>
          </div>
          <div className="relative aspect-[1400/781] w-full overflow-hidden border-2 border-fd-foreground bg-[var(--surface)]">
            <Image
              src="/illustrations/hero.webp"
              alt="A Faktur Pajak, a stamp and a token: an invoice becoming an onchain claim"
              fill
              sizes="(max-width: 768px) 100vw, 45vw"
              priority
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-4 py-14 sm:px-8">
        <h2 className="mb-6 text-3xl font-medium tracking-[-0.04em]">Where to go</h2>
        <div className="grid gap-0 border-2 border-fd-foreground sm:grid-cols-2 lg:grid-cols-4">
          {entries.map((e, i) => (
            <Link
              key={e.href}
              href={e.href}
              className={`group flex flex-col border-fd-foreground bg-white transition-colors duration-300 hover:bg-[var(--surface-warm)] ${
                i > 0 ? "max-sm:border-t-2 sm:max-lg:[&:nth-child(2n)]:border-l-2 sm:max-lg:[&:nth-child(n+3)]:border-t-2 lg:border-l-2" : ""
              }`}
            >
              <span className={`relative flex aspect-[1400/781] items-center justify-center overflow-hidden border-b-2 border-fd-foreground ${e.tile}`}>
                {e.scene ? (
                  <Image src={e.art} alt="" fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <Image src={e.art} alt="" width={240} height={240} className="h-3/4 w-auto object-contain transition-transform duration-500 group-hover:-translate-y-1" />
                )}
              </span>
              <span className="flex flex-1 flex-col gap-2 p-4">
                <span className="flex items-center justify-between text-lg font-medium tracking-tight">
                  {e.title}
                  <ArrowRight size={18} aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
                <span className="text-sm leading-snug text-fd-muted-foreground">{e.body}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
