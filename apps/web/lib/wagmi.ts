import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { baseAccount, injected } from "wagmi/connectors";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { arbitrumSepolia } from "@reown/appkit/networks";

/** Reown Cloud project (https://cloud.reown.com). Required for the AppKit wallet modal. */
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "";

/** Without a project ID the app still works with browser wallets (injected) through wagmi. */
export const appKitEnabled = projectId.length > 0;

const rpc =
  process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";

export const networks = [arbitrumSepolia] as [typeof arbitrumSepolia];

const shared = {
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: { [arbitrumSepolia.id]: http(rpc) },
};

/**
 * Reown AppKit adapter; only created when AppKit is in use. AppKit adds a Base Account
 * connector unless one exists, so we register it ourselves with telemetry off.
 */
export const wagmiAdapter = appKitEnabled
  ? new WagmiAdapter({
      networks,
      projectId,
      ...shared,
      connectors: [baseAccount({ appName: "Fakturin", preference: { telemetry: false } })],
    })
  : null;

/**
 * The config behind every wagmi/viem hook. Without AppKit it is plain wagmi with the
 * browser wallet, so no third-party connectors (and their telemetry) are loaded.
 */
export const wagmiConfig =
  wagmiAdapter?.wagmiConfig ?? createConfig({ chains: networks, connectors: [injected()], ...shared });
