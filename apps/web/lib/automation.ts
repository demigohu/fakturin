/**
 * Who runs the automatic steps (invoice check, closing overdue vaults):
 *   "cre"      Chainlink CRE workflows (`cre workflow simulate --listen` / keeper loop, e.g. under pm2).
 *              The web relayer stays silent and the UI waits for the result onchain.
 *   "relayer"  (default) the app's own server routes /api/verify and /api/keeper do it instantly.
 * The KYC/KYB issuer (/api/identity) is not part of CRE and always runs on the server.
 */
export const CRE_MODE = process.env.NEXT_PUBLIC_VERIFIER === "cre";
