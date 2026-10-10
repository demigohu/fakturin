"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import { useReadContract } from "wagmi";
import { abis, addresses } from "../lib/contracts";
import { EXPLORER, shortHex } from "../lib/invoice";
import s from "./invoicenft.module.css";

/**
 * The Faktur Pajak as an onchain token (FakturNFT, tokenId = invoice ID). It is minted into the
 * invoice's vault, cannot be transferred, and is burned when the invoice closes, so it never shows
 * up in a user's wallet; this card makes it visible. The picture is the onchain SVG drawn by
 * FakturRenderer, which keeps working after the burn (stamped LUNAS / DEFAULT).
 */
export function InvoiceNft({ invoiceId, vault, who }: { invoiceId: `0x${string}`; vault: `0x${string}`; who: "seller" | "funder" | "public" }) {
  const tokenId = BigInt(invoiceId);
  const { data: owner, isError } = useReadContract({
    address: addresses.nft,
    abi: abis.nft,
    functionName: "ownerOf",
    args: [tokenId],
    query: { enabled: Boolean(addresses.nft), retry: false, refetchInterval: 8000 },
  });
  const { data: svg } = useReadContract({
    address: addresses.renderer,
    abi: abis.renderer,
    functionName: "svg",
    args: [invoiceId],
    query: { enabled: Boolean(addresses.renderer), refetchInterval: 8000 },
  });
  const live = typeof owner === "string" && owner.toLowerCase() === vault.toLowerCase();
  const burned = isError;
  const where =
    who === "seller"
      ? "It stays in the vault, not your wallet, so the invoice can never be pledged twice."
      : who === "funder"
        ? "Funders hold vault shares instead: a claim on what this invoice repays."
        : "It can never be moved or sold.";

  return (
    <div className={s.card}>
      <span className={s.art}>
        {typeof svg === "string" && svg.startsWith("<svg") ? (
          // eslint-disable-next-line @next/next/no-img-element -- onchain SVG data URI, nothing for next/image to optimize
          <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} alt="The Faktur Pajak drawn onchain, with its status stamp" />
        ) : (
          <span className={s.artPlaceholder} aria-hidden />
        )}
      </span>
      <div className={s.text}>
        <p className={s.title}>
          Invoice NFT <span className="mono">FKTR #{shortHex(invoiceId, 8, 6)}</span>
        </p>
        <p className={s.body}>
          {burned
            ? "Burned when the invoice closed; the picture stays as an onchain record with its final stamp."
            : live
              ? `Locked in its vault. ${where}`
              : "Reading the NFT…"}{" "}
          The picture is drawn by the contract itself (onchain SVG).
        </p>
        {addresses.nft && (
          <a className={s.link} href={`${EXPLORER}/nft/${addresses.nft}/${tokenId.toString()}`} target="_blank" rel="noreferrer">
            View the NFT on Arbiscan <ArrowSquareOut size={12} />
          </a>
        )}
      </div>
    </div>
  );
}

/** Small picture of the invoice NFT (onchain SVG), for list rows. */
export function NftThumb({ invoiceId }: { invoiceId: `0x${string}` }) {
  const { data: svg } = useReadContract({
    address: addresses.renderer,
    abi: abis.renderer,
    functionName: "svg",
    args: [invoiceId],
    query: { enabled: Boolean(addresses.renderer), refetchInterval: 15000 },
  });
  if (typeof svg !== "string" || !svg.startsWith("<svg")) return <span className={s.thumb} aria-hidden />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- onchain SVG data URI
    <img className={s.thumb} src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} alt="Invoice NFT" />
  );
}
