# Fakturin docs

The documentation site at **[docs.fakturin.xyz](https://docs.fakturin.xyz)**: user guides for borrowers and lenders,
how pricing, identity, verification and vaults work, architecture and system design with diagrams, and a full
contract and API reference.

[Fumadocs](https://fumadocs.dev) 16 · Next.js 16 · Tailwind 4 · Mermaid. Styled with the same Overflow Grid tokens
as the app ([`DESIGN.md`](DESIGN.md)): paper and navy ink, blue accent, Geist, square corners, light only.

## Contents

| Section | Pages |
| --- | --- |
| Start here | What is Fakturin, Try the demo |
| User guides | Borrower, Lender, Check an invoice, Reading a transaction |
| Concepts | Invoice lifecycle, Pricing and fees (live calculator), Identity (Chainlink ACE), Verification (Chainlink CRE), Vaults (ERC-4626), Invoice NFT, Automatic closing |
| Architecture | System overview, Sequence diagrams, Money flow, System design, Deployment topology, Security and trust model |
| Reference | Contracts, Parameters and codes, Events and errors, Deployed addresses, HTTP API |
| Developers | Local setup, Test and deploy contracts, Run Chainlink CRE, Web app configuration |
| More | Regulation and compliance, Limitations and roadmap, FAQ, Glossary |

Built in: full-text search (Orama), "Copy Markdown" per page, `/llms.txt`, `/llms-full.txt` and
`/docs/<page>.md` for AI tools.

## Run

```bash
# from the repo root
npm install
npm run dev -w docs        # http://localhost:3001
npm run build -w docs
npm run lint -w docs && npm run check-types -w docs
```

## Writing pages

- Pages are MDX in [`content/docs`](content/docs); order and sidebar sections come from each folder's `meta.json`.
- Every page needs `title` and `description` frontmatter.
- Components available in MDX (registered in [`components/mdx.tsx`](components/mdx.tsx)):

| Component | Use |
| --- | --- |
| `<Mermaid chart={`...`} caption="..." />` | Diagrams, rendered client-side with the site theme. Wide diagrams scale down to 85%, then scroll. |
| `<PricingCalculator />` | Live version of `FakturRegistry.quote` and the repay split |
| `<Deployments />` | Contract table with Arbiscan links, from [`lib/deployment.ts`](lib/deployment.ts) |
| `<Figure src alt caption scene? />` | An app illustration beside a caption (`scene` for full-background images) |
| `Callout`, `Cards`, `Steps`, `Tabs`, `Accordions`, `TypeTable`, `Files` | Fumadocs UI |

After a redeploy of the contracts, update [`lib/deployment.ts`](lib/deployment.ts) and the addresses quoted in
`content/docs/reference`.

## Environment (optional)

| Variable | Default |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://fakturin.xyz` ("Open the app" link) |
| `NEXT_PUBLIC_DOCS_URL` | `https://docs.fakturin.xyz` (metadata base) |

## Deploy on Vercel

Project root directory `apps/docs`, framework Next.js, default commands. No environment variables are required.

## Layout

```
app/(home)/              landing page of the docs
app/docs/[[...slug]]/    docs pages
app/api/search/          search index
app/llms*.txt, llms.mdx/ machine-readable exports
components/              Mermaid, PricingCalculator, Deployments, Figure, Logo
content/docs/            the MDX pages
lib/                     source loader, layout options, deployment data
public/illustrations/    copied from apps/web/public/illustrations
```
