import { encodePacked, keccak256 } from "viem";

/** Mirrors FakturPajak.normalize: only digits count (formatting and A/C suffixes ignored). */
export function normalizeFakturNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Mirrors FakturPajak.invoiceId: keccak256("FP:" || digits). */
export function computeFakturId(raw: string): `0x${string}` | undefined {
  const digits = normalizeFakturNumber(raw);
  if (!digits) return undefined;
  return keccak256(encodePacked(["string", "string"], ["FP:", digits]));
}

/** FakturRegistry.Status */
export const STATUS = {
  None: 0,
  Pending: 1,
  Rejected: 2,
  Funding: 3,
  Financed: 4,
  Repaid: 5,
  Defaulted: 6,
  FundingFailed: 7,
} as const;

export const INVOICE_STATUS: Record<number, string> = {
  0: "Not registered",
  1: "Verifying",
  2: "Rejected",
  3: "Funding",
  4: "Financed",
  5: "Repaid",
  6: "Defaulted",
  7: "Funding failed",
};

export type StatusTone = "none" | "lilac" | "accent" | "yellow" | "cyan" | "green" | "settled" | "orange";

/** One color per status, used app-wide (DESIGN.md section 8). */
export const STATUS_TONE: Record<number, StatusTone> = {
  0: "none",
  1: "lilac",
  2: "yellow",
  3: "accent",
  4: "green",
  5: "settled",
  6: "orange",
  7: "none",
};

/** What moves an invoice into each status (PRD v2 section 5). */
export const STATUS_ACTOR: Record<number, string> = {
  1: "Seller submits the Faktur Pajak",
  2: "PJAP check failed",
  3: "Chainlink CRE verifies with PJAP",
  4: "Funders fill the vault",
  5: "Seller repays",
  6: "Not repaid after due date",
  7: "Target not reached in time",
};

/** FakturRegistry.REJECT_* */
export const REJECT_REASON: Record<number, string> = {
  1: "Faktur Pajak not found",
  2: "Faktur Pajak was cancelled",
  3: "Faktur Pajak was replaced; use the replacement number",
  4: "Seller does not match the Faktur Pajak",
  5: "Due date has already passed",
  6: "Over the seller or buyer limit",
};

/** FakturVault.State */
export const VAULT_STATE = { Funding: 0, Active: 1, Repaid: 2, Defaulted: 3, Cancelled: 4 } as const;

const NUM = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function formatIdrShort(amount: bigint): string {
  const whole = Number(amount / 10n ** 18n);
  if (whole >= 1_000_000_000) return `Rp${NUM.format(whole / 1_000_000_000)}B`;
  if (whole >= 1_000_000) return `Rp${NUM.format(whole / 1_000_000)}M`;
  return `Rp${NUM.format(whole)}`;
}

export function formatDate(unixSeconds: bigint | number): string {
  const n = Number(unixSeconds);
  if (!n) return "-";
  return new Date(n * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function shortHex(hex: string, head = 6, tail = 4): string {
  if (hex.length <= head + tail + 2) return hex;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

export const EXPLORER = "https://sepolia.arbiscan.io";

/** MockIDR uses 18 decimals; UI shows whole rupiah-style units. */
export function formatMockIdr(amount: bigint): string {
  const whole = amount / 10n ** 18n;
  return `Rp${whole.toLocaleString("en-US")}`;
}

export function parseMockIdr(input: string): bigint {
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return 0n;
  return BigInt(digits) * 10n ** 18n;
}

export function decodeContractError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("AlreadyRegistered")) return "This Faktur Pajak is already registered or financed";
  if (msg.includes("SellerIsDefaulted")) return "This seller defaulted before and cannot submit";
  if (msg.includes("EmptyFakturNumber")) return "Enter a Faktur Pajak number";
  if (msg.includes("ERC4626ExceededMaxDeposit")) {
    return "Deposit not allowed: register as a funder, or the amount is above what the vault still needs";
  }
  if (msg.includes("ERC4626ExceededMaxRedeem") || msg.includes("ERC4626ExceededMaxWithdraw")) {
    return "Nothing to withdraw yet; the invoice is still open";
  }
  if (msg.includes("NotDefaultableYet")) return "Not past due date and grace period yet";
  if (msg.includes("FundingStillOpen")) return "Funding is still open";
  if (msg.includes("NotActive")) return "The vault is not active";
  if (msg.includes("NotFunding")) return "The vault is no longer funding";
  if (msg.includes("SharesNotTransferable")) return "Vault shares cannot be transferred";
  if (msg.includes("KycClosed")) return "Funder registration is closed";
  if (msg.includes("ERC20InsufficientBalance")) return "Not enough MockIDR";
  if (msg.includes("ERC20InsufficientAllowance")) return "MockIDR approval is too low";
  if (msg.includes("User rejected") || msg.includes("User denied")) return "Transaction rejected in the wallet";
  return msg.slice(0, 200);
}
