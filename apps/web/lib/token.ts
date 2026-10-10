/**
 * MockIDRX: testnet stand-in for IDRX, the rupiah stablecoin (1 token = Rp1). Like IDRX it has
 * 2 decimals, so one rupiah is 100 token units. Not money, and not affiliated with IDRX.
 */
export const TOKEN_SYMBOL = "MockIDRX";
export const TOKEN_DECIMALS = 2;
/** One rupiah in token units. */
export const UNIT = 10n ** BigInt(TOKEN_DECIMALS);
