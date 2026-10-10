# Fakturin Docs

Documentation site for Fakturin, built with [Fumadocs](https://fumadocs.dev) (Next.js 16, Tailwind 4) and themed with the
same Overflow Grid tokens as `apps/web` (see `DESIGN.md`).

```bash
npm run dev -w docs      # http://localhost:3001
npm run build -w docs
```

| Path | What |
| --- | --- |
| `content/docs/**.mdx` | Pages. Order and sections live in `meta.json` files. |
| `components/Mermaid.tsx` | `<Mermaid chart={`...`} caption="..." />`, client-rendered and themed |
| `components/PricingCalculator.tsx` | Live version of `FakturRegistry.quote` |
| `components/Deployments.tsx`, `lib/deployment.ts` | Live contract addresses (update after a redeploy) |
| `public/illustrations` | Copied from `apps/web/public/illustrations` |

Env (optional): `NEXT_PUBLIC_APP_URL` (link to the dApp, default `http://localhost:3000`), `NEXT_PUBLIC_DOCS_URL`.
Also serves `/llms.txt`, `/llms-full.txt` and `/docs/<page>.md` for AI tools.
