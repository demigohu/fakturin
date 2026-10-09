import type { Address } from "viem";

/** FakturRegistry.Invoice as returned by getInvoice (viem decodes the struct to an object). */
export type InvoiceStruct = {
  seller: Address;
  vault: Address;
  buyerNpwpHash: `0x${string}`;
  nominal: bigint;
  issuedAt: bigint;
  dueDate: bigint;
  requestedAt: bigint;
  status: number;
  rejectCode: number;
};
