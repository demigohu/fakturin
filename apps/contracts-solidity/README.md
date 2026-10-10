# Fakturin contracts

Solidity contracts for Fakturin on Arbitrum Sepolia: an invoice registry keyed by the national Faktur Pajak number,
one ERC-4626 vault per verified invoice, an onchain-SVG invoice NFT, Chainlink CRE receivers, and a self-deployed
Chainlink ACE identity stack.

Solidity 0.8.28 · Foundry (`via_ir`) · OpenZeppelin 5.1 · Chainlink ACE core (`60f04505`)

## Contracts

| Contract | Job |
| --- | --- |
| [`FakturRegistry`](src/FakturRegistry.sol) | Source of truth. Invoice ID = `keccak256("FP:" + normalized number)`. Verification requests and results, NPWP match against ACE, pricing (`quote`), seller/buyer limits, status, default flag. |
| [`FakturVault`](src/FakturVault.sol) | ERC-4626 over MockIDRX, one per invoice, immutable terms. KYC-gated deposits, all-or-nothing funding, atomic 80% payout, `repay`, `markDefault`, `cancelFunding`, non-transferable shares. |
| [`FakturVaultFactory`](src/FakturVaultFactory.sol) | Deploys vaults for the registry and lists them (`vaults`, `vaultCount`). |
| [`FakturNFT`](src/FakturNFT.sol) | ERC-721 `FKTR`, token ID = invoice ID. Minted into the vault, transfers disabled, burned when the invoice closes. |
| [`FakturRenderer`](src/FakturRenderer.sol) | Onchain SVG and `tokenURI` with a status stamp (VERIFIED, FINANCED, LUNAS, DEFAULT…). Works after burn. |
| [`FakturVerifierReceiver`](src/FakturVerifierReceiver.sol) | Chainlink CRE consumer: decodes the verification report and calls `fulfillVerification`. Forwarder only. |
| [`FakturKeeper`](src/FakturKeeper.sol) | Closes overdue vaults (cancel unfilled, default unpaid) from a CRE cron report, or by anyone via `closeDue`. Fixed gas per close. |
| [`MockIDRX`](src/MockIDRX.sol) | Test copy of the IDRX rupiah stablecoin: 2 decimals, public `faucet`. Not money. |
| [`FakturPajak`](src/libraries/FakturPajak.sol) | Number normalization and invoice ID. |
| [`AceDeployer`](script/AceDeployer.sol) | Deploys and wires Chainlink ACE behind ERC1967 proxies. |

### Chainlink ACE setup

| Component | Configuration |
| --- | --- |
| `PolicyEngine` | default allow |
| `OnlyAuthorizedSenderPolicy` | on every IdentityRegistry / CredentialRegistry write; authorized sender = the credential issuer |
| `IdentityRegistry`, `CredentialRegistry` | wallet → CCID → credentials |
| Funder `CredentialRegistryIdentityValidator` | requires `common.kyc` |
| Seller `CredentialRegistryIdentityValidator` | requires `common.kyb` and `id.fakturin.pkp` (data = `abi.encode(keccak256(NPWP))`) |

ACE core contracts are BUSL-1.1: non-production use is allowed; production needs a license from Chainlink.

## Rules enforced onchain

| Rule | Where |
| --- | --- |
| One Faktur Pajak number is financed at most once | `requestVerification` reverts `AlreadyRegistered` unless the number is new, rejected, or its funding failed |
| Only the business on the invoice can finance it | `_rejectCode`: verified seller NPWP hash must equal the wallet's ACE PKP credential, else `REJECT_SELLER_MISMATCH` |
| Only verifiers write results | `fulfillVerification` is `VERIFIER_ROLE`; the receiver accepts only the Chainlink forwarder |
| Only KYC'd lenders deposit | `FakturVault.maxDeposit` returns 0 unless `registry.isFunder` |
| Seller is paid when, and only when, the vault is full | `_deposit` → `_activate` transfers the advance in the same transaction |
| Price grows with tenor, max 180 days | `quote`; `REJECT_TENOR` |
| Fee only on repayment | `repay` sends `fee` to the treasury; `markDefault` sends nothing |
| Defaulters cannot borrow again | `sellerDefaulted` set in `onDefaulted`; checked in `requestVerification` |
| Admin cannot break the advance ≤ target invariant | `setParameters` reverts `InvalidParameters` |

## Pricing (demo parameters)

```text
discount = N × 150 bps × tenor / 30 days       seller's all-in cost (1.5% per 30 days)
target   = N − discount                        what lenders fund together
advance  = N × 80%                             paid to the seller when the vault fills
holdback = target − advance                    stays in the vault until close
fee      = discount × 10%                      to the treasury, on repayment only
```

Funding window 3 days · grace period 60 s (demo) · seller limit Rp200M · buyer-NPWP limit Rp500M.

## Setup

Submodules (`lib/forge-std`, `lib/openzeppelin-contracts`, `lib/openzeppelin-contracts-upgradeable`,
`lib/chainlink-ace`) are registered in the root repo:

```bash
git submodule update --init --recursive    # from the repo root, if you cloned without --recurse-submodules
cd apps/contracts-solidity
forge build
```

## Test

```bash
forge test                 # 37 tests
forge test -vvv --match-test Default
forge test --gas-report
```

The suite covers every user story and functional requirement in [`docs/PRD.md`](../../docs/PRD.md): ACE KYC/KYB
gating and revocation, NPWP mismatch, the issuer policy, tenor pricing and limits, all-or-nothing funding and
atomic payout, repay with fee, default without fee, cancellation refunds, non-transferable shares and NFT,
renderer output, and keeper behaviour (including the gas reservation). Test names carry the PRD ID they prove,
for example `test_FR13_someoneElsesInvoiceIsRejected` or `test_US07_repayReturnsHoldbackAndFundersEarnTheDiscount`.

## Deploy and verify

```bash
cp .env.example .env
# PRIVATE_KEY        deployer with Arbitrum Sepolia ETH
# ARBISCAN_API_KEY   Etherscan V2 API key
# optional: ARBITRUM_SEPOLIA_RPC_URL, MOCK_IDRX (reuse a token), CRE_FORWARDER, RELAYER, TREASURY
./scripts/deploy-and-verify.sh           # add --resume if it was interrupted
```

`script/DeployFaktur.s.sol` deploys and wires everything in one broadcast: MockIDRX, NFT, factory, registry,
renderer, the ACE stack (issuer = `RELAYER`), receiver and keeper (bound to `CRE_FORWARDER`, default Chainlink's
CRE simulation forwarder `0xD41263567DdfeAd91504199b8c6c87371e83ca5d`), and all roles.

After a deploy, copy the addresses (log or `broadcast/DeployFaktur.s.sol/421614/run-latest.json`) to:

| File | Keys |
| --- | --- |
| `apps/web/.env` | `NEXT_PUBLIC_FAKTUR_*`, `NEXT_PUBLIC_MOCK_IDRX_ADDRESS`, `NEXT_PUBLIC_ACE_*`, `NEXT_PUBLIC_DEPLOY_BLOCK` |
| `apps/fakturin-cre/verify/config.json` | `registryAddress`, `receiverAddress` |
| `apps/fakturin-cre/keeper/config.json` | `keeperAddress` |
| `apps/docs/lib/deployment.ts` | address table on the docs site |
| `packages/abis` | regenerate ABIs from `out/` if interfaces changed |

> On Arbitrum, `block.number` inside a contract is the **L1** block. `NEXT_PUBLIC_DEPLOY_BLOCK` must be the **L2**
> block of the first deploy transaction (Arbiscan, or `blockNumber` in `run-latest.json`).

Vaults are created later by the factory, so `--verify` does not cover them; they share `FakturVault`'s verified
bytecode.

### Local anvil fork

```bash
anvil --fork-url https://sepolia-rollup.arbitrum.io/rpc --chain-id 421614 --block-time 1
FOUNDRY_BROADCAST=/tmp/fk-broadcast FOUNDRY_CACHE_PATH=/tmp/fk-cache \
  forge script script/DeployFaktur.s.sol:DeployFaktur --rpc-url http://127.0.0.1:8545 --broadcast
```

The fork shares chain ID 421614 with Arbitrum Sepolia, so redirect the broadcast folder or it overwrites the real
deployment record. `--block-time 1` keeps timestamps moving for deadline tests.

## Deployed (Arbitrum Sepolia)

| Contract | Address |
| --- | --- |
| FakturRegistry | `0xB0f57cbe61bB207Bcd9778f241280c28A74f2030` |
| FakturVaultFactory | `0x1e95cbab178772A8d7fE2Cb7a62760A479Dfbc53` |
| FakturNFT | `0x97fe1401dA1e167C964284344f8D8C00F60c7e66` |
| FakturRenderer | `0x713afe0eB8B09C2dEA3f0A360D9ac74348Ece8DD` |
| FakturVerifierReceiver | `0xDaE568EA803859DE11fe43a385a219174A7f7975` |
| FakturKeeper | `0xdd2785e1AB472838bD196837Dd5716372fef10a3` |
| MockIDRX | `0x11fdaa711602C6b5cE4DeF19028a56b2f07Be22E` |
| ACE PolicyEngine | `0xA159ab1D85482c51ad0856Ab73CF52C6f9006213` |
| ACE OnlyAuthorizedSenderPolicy | `0x43263Ea1eB566B17aBEfA2096AF8ff223201C3C5` |
| ACE IdentityRegistry | `0x9A1149837d01e6Afe66463531768F5FE96D38435` |
| ACE CredentialRegistry | `0x3DFBb1B4f66b718Add7a1292ACaaa6bb69DBF777` |
| ACE funder validator | `0xdE422970fA29f39dD91b64c4E74fCd3651b3897A` |
| ACE seller validator | `0xB5E087BB390B0738EBb8be78Abcf917Af6CCc4c2` |

Deploy block (L2) `317643441`. Full reference: [docs.fakturin.xyz/docs/reference/contracts](https://docs.fakturin.xyz/docs/reference/contracts).

## Security notes

- Fakturin contracts are not upgradeable; vault terms are immutable; no admin path moves vault funds.
- `ReentrancyGuard` on vault entry points; state changes before token transfers.
- The demo operator key holds `VERIFIER_ROLE`, is the ACE issuer and the treasury. Production splits these:
  CRE on the DON for verification and closing, a licensed provider as issuer.
- Not audited.
