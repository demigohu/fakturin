# Fakturin: Chainlink CRE workflows

Two workflows run Fakturin's automatic steps on Arbitrum Sepolia. Chainlink lets anyone **simulate**
workflows locally; with `--broadcast` the simulation sends real transactions through Chainlink's
forwarder (`0xD41263567DdfeAd91504199b8c6c87371e83ca5d`), which `FakturVerifierReceiver` and
`FakturKeeper` accept. Deploying to Chainlink's DON (testnet/mainnet) is a commercial agreement and is
not needed for the demo.

| Workflow | Trigger | What it does | Runs as |
| --- | --- | --- | --- |
| `verify/` | EVM log `FakturRegistry.VerificationRequested` | Asks PJAP (mock: `apps/web /api/pjap`) about the Faktur Pajak, writes the result (incl. seller NPWP hash) to `FakturVerifierReceiver` | `scripts/verify-listen.sh` (`simulate --listen`, always on) |
| `keeper/` | Cron | Reads `FakturKeeper.closable()`, writes a report that cancels unfilled vaults and defaults unpaid ones | `scripts/keeper-loop.sh` (one simulation every `KEEPER_INTERVAL` s; cron triggers cannot `--listen`) |

`nav/`, `por/`, `settlement/`, `contracts/` and `scripts/run-simulate.sh` are templates / v1 leftovers,
not used by Fakturin v3.

## Run on a VPS with pm2

```bash
# once
# CRE CLI v1.38+: follow https://docs.chain.link/cre (Getting started → install the CLI)
curl -fsSL https://bun.sh/install | bash             # bun, used to compile the TS workflows
npm i -g pm2
cre login                                            # or CRE_API_KEY in .env

cd apps/fakturin-cre
(cd verify && bun install) && (cd keeper && bun install)
cp .env.example .env                                 # CRE_ETH_PRIVATE_KEY, CRE_TARGET=staging-settings
```

Set `verify/config.json` → `pjapBaseUrl` to the **public URL of the web app** (the mock PJAP lives
there), e.g. `https://fakturin.example.com/api/pjap/faktur`. `localhost:3000` only works when the web
app runs on the same machine. Contract addresses in `verify/config.json` and `keeper/config.json`
already point at the v3 deployment.

```bash
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup          # survive reboots
pm2 logs fakturin-cre-verify     # "VerificationRequested … / PJAP result … / Verification written: 0x…"
pm2 logs fakturin-cre-keeper     # "No overdue vaults" or "Closing 1 vault(s) … / Keeper report written"
```

Then switch the web app to CRE mode: `NEXT_PUBLIC_VERIFIER=cre` in `apps/web/.env` (rebuild /
restart). The app stops calling its own relayer for these two jobs and waits for the CRE result.

Notes:
- The listener starts at the current block. If it was down while an invoice was submitted, process
  that one by hand: `cre workflow simulate verify --broadcast --non-interactive --trigger-index 0
  --evm-tx-hash 0x<submit tx> --evm-event-index 0`.
- The KYC/KYB issuer is not a CRE job; it stays in the web app (`/api/identity`).

## Local test against an anvil fork

```bash
anvil --fork-url https://sepolia-rollup.arbitrum.io/rpc --chain-id 421614 --block-time 1
# deploy with apps/contracts-solidity/script/DeployFaktur.s.sol, then put the local addresses in
# verify/config.local.json and keeper/config.local.json (gitignored), and use an env file with
# CRE_TARGET=local-settings and an anvil key:
CRE_ENV_FILE=.env.local-fork CRE_TARGET=local-settings ./scripts/verify-listen.sh
CRE_ENV_FILE=.env.local-fork CRE_TARGET=local-settings KEEPER_INTERVAL=30 ./scripts/keeper-loop.sh
```
