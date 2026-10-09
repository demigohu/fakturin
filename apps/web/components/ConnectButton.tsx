"use client";

import { Wallet, Warning } from "@phosphor-icons/react";
import { useAppKit } from "@reown/appkit/react";
import { arbitrumSepolia } from "wagmi/chains";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { shortHex } from "../lib/invoice";
import { appKitEnabled } from "../lib/wagmi";
import s from "./shell.module.css";

/** Reown AppKit modal when a project ID is set; plain injected wallet otherwise. */
export function ConnectButton() {
  return appKitEnabled ? <AppKitButton /> : <InjectedButton />;
}

function AppKitButton() {
  const { open } = useAppKit();
  const { address, isConnected, isConnecting, chainId } = useAccount();

  if (isConnected && address && chainId !== arbitrumSepolia.id) {
    return (
      <button
        type="button"
        className={`${s.walletBtn} ${s.walletWarn}`}
        onClick={() => open({ view: "Networks" })}
      >
        <Warning size={18} aria-hidden />
        Switch to Arbitrum Sepolia
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button type="button" className={s.walletBtn} onClick={() => open({ view: "Account" })}>
        <span className={s.walletDot} aria-hidden />
        <span className={s.walletAddr}>{shortHex(address)}</span>
      </button>
    );
  }

  return (
    <button type="button" className={s.walletBtn} disabled={isConnecting} onClick={() => open()}>
      <Wallet size={18} aria-hidden />
      {isConnecting ? "Connecting…" : "Connect wallet"}
    </button>
  );
}

function InjectedButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const injected = connectors.find((c) => c.type === "injected") ?? connectors[0];

  if (isConnected && address && chainId !== arbitrumSepolia.id) {
    return (
      <button
        type="button"
        className={`${s.walletBtn} ${s.walletWarn}`}
        disabled={switching}
        onClick={() => switchChain({ chainId: arbitrumSepolia.id })}
      >
        <Warning size={18} aria-hidden />
        {switching ? "Switching network…" : "Switch to Arbitrum Sepolia"}
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button type="button" className={s.walletBtn} onClick={() => disconnect()} title="Disconnect wallet">
        <span className={s.walletDot} aria-hidden />
        <span className={s.walletAddr}>{shortHex(address)}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={s.walletBtn}
      disabled={isPending || !injected}
      onClick={() => injected && connect({ connector: injected })}
    >
      <Wallet size={18} aria-hidden />
      {isPending ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
