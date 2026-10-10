# Fakturin web app

The dApp at **[fakturin.xyz](https://www.fakturin.xyz)**. Borrowers finance a Faktur Pajak, lenders fund verified
invoices, and anyone can check whether an invoice was ever financed. It talks to the contracts directly from the
browser; a few server routes stand in for outside providers (tax office, KYC/KYB issuer) and, optionally, for the
Chainlink CRE jobs.

Next.js 16 · React 19 · wagmi + viem · Reown AppKit · GSAP · Arbitrum Sepolia

## Screens

| Route | Who | What happens |
| --- | --- | --- |
| `/` | Everyone | Landing: the problem, how it works, the guards, live contract addresses |
| `/borrow` | Seller (PKP) | Verify the business once (KYB, Chainlink ACE) → pick a Faktur Pajak → see the price for its tenor → submit → track funding, the invoice NFT and the repay date → repay |
| `/lend` | Lender | KYC checklist (wallet, ACE credential, MockIDRX balance) → open invoices with return after fee → lend any amount → My loans → withdraw |
| `/check` | Anyone, no wallet | Look up any Faktur Pajak number: verdict per status, funding progress, the onchain NFT image, tax-office data, seller default record |

Old Indonesian paths (`/penjual`, `/pasar`, `/cek`, `/pembeli`, `/mitra`) redirect to the new ones.

### Transactions people can read

Every onchain action goes through one review dialog ([`TxDialog`](components/TxDialog.tsx) +
[`useTxFlow`](hooks/useTxFlow.ts), plans in [`lib/txPlans.tsx`](lib/txPlans.tsx)): numbered steps in plain
language, exact approval amounts (never unlimited), the target contract and function, decoded arguments and the
raw calldata. Free signatures (KYC/KYB) and automatic steps (Chainlink, issuer) are labelled as such.

## Server routes

| Route | Simulates | Purpose |
| --- | --- | --- |
| `GET /api/pjap/faktur/[nomor]` | PJAP (tax application provider) | Deterministic Faktur Pajak lookup in PJAP's JSON shape. Called by the CRE verify workflow. |
| `GET /api/pjap/account/[wallet]` | Coretax account | Business, NPWP and PKP status linked to a wallet (for KYB) |
| `POST /api/identity` | Licensed KYC/KYB provider | Verifies the user's signature, then writes the CCID and credentials to Chainlink ACE as the authorized issuer |
| `POST /api/verify` | Chainlink CRE verify (relayer mode) | Same mapping as the CRE workflow; returns `202` in CRE mode |
| `POST /api/keeper` | Chainlink CRE keeper (relayer mode) | Calls `FakturKeeper.closeDue`; returns `202` in CRE mode |

`NEXT_PUBLIC_VERIFIER` picks who verifies invoices and closes overdue vaults: `relayer` (these routes, instant) or
`cre` (the workflows in [`apps/fakturin-cre`](../fakturin-cre)).

## Run

```bash
# from the repo root
npm install
cp apps/web/.env.example apps/web/.env      # fill it in (below)
npm run dev -w web                          # http://localhost:3000
```

```bash
npm run build -w web && npm run start -w web
npm run lint -w web
npm run check-types -w web
```

## Environment

`apps/web/.env` (gitignored; Next.js loads `.env`, not `.env.local`). Addresses are in
[`apps/contracts-solidity/README.md`](../contracts-solidity/README.md#deployed-arbitrum-sepolia).

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_REOWN_PROJECT_ID` | yes | Reown (WalletConnect) project; add your domain to its allow list |
| `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL` | recommended | Defaults to the public Arbitrum Sepolia RPC |
| `NEXT_PUBLIC_MOCK_IDRX_ADDRESS`, `NEXT_PUBLIC_FAKTUR_*_ADDRESS` (NFT, VAULT_FACTORY, REGISTRY, RECEIVER, KEEPER, RENDERER) | yes | Contract addresses |
| `NEXT_PUBLIC_ACE_IDENTITY_REGISTRY_ADDRESS`, `NEXT_PUBLIC_ACE_CREDENTIAL_REGISTRY_ADDRESS` | yes | Chainlink ACE |
| `NEXT_PUBLIC_DEPLOY_BLOCK` | yes | **L2** block of the first deploy tx; event scans start here |
| `NEXT_PUBLIC_VERIFIER` | no | `relayer` (default) or `cre` |
| `NEXT_PUBLIC_SITE_URL` | prod | e.g. `https://fakturin.xyz` (Open Graph) |
| `NEXT_PUBLIC_DOCS_URL` | no | Footer link, default `https://docs.fakturin.xyz` |
| `VERIFIER_PRIVATE_KEY` | relayer mode, KYC/KYB | **Server only.** Holds `VERIFIER_ROLE` and is the ACE issuer. Never prefix with `NEXT_PUBLIC_`. |

`NEXT_PUBLIC_*` values are inlined at build time: rebuild (or redeploy) after changing them.

### Deploy on Vercel

Project root directory `apps/web`, framework Next.js, default install/build commands (Turborepo is detected).
Add the variables above in the Vercel dashboard, marking `VERIFIER_PRIVATE_KEY` as sensitive.

## Code map

```
app/
  page.tsx                 landing
  borrow/ lend/ check/     the three screens
  api/                     pjap, identity, verify, keeper
components/
  TxDialog.tsx             transaction review dialog
  InvoiceNft.tsx           onchain SVG of the invoice NFT
  landing/                 hero story, flow, contract grid
  ui/                      panels, fields, status track, notices
hooks/
  useInvoice, useVault     registry and vault reads, pricing
  useIdentity              ACE credentials, PJAP account, issuer call
  useTxFlow                step runner behind TxDialog
  useEvents, useAutoClose  event scans; asks the keeper when a vault is overdue
lib/
  contracts.ts             addresses and ABIs (@repo/abis)
  pjap.ts                  PJAP simulation (shared mapping with the CRE workflow)
  identity.ts              ACE credential types, CCID, signed message
  txPlans.tsx              every transaction, explained
  invoice.ts, token.ts     formatting, statuses, reject reasons, 2-decimal MockIDRX
```

Design system: [`DESIGN.md`](DESIGN.md) (paper, navy ink, Fakturin blue, square corners; visual language adapted from the Sui Overflow 2026 site).
Product spec: [`docs/PRD.md`](../../docs/PRD.md). End-to-end test guide: [`docs/TESTING.md`](../../docs/TESTING.md).
