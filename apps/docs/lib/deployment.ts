/** Fakturin v3 on Arbitrum Sepolia (chain 421614). All contracts verified on Arbiscan. */
export const EXPLORER = "https://sepolia.arbiscan.io";
export const CHAIN_ID = 421614;
export const DEPLOY_BLOCK = 317643441;

export const contracts = [
  { name: "FakturRegistry", address: "0xB0f57cbe61bB207Bcd9778f241280c28A74f2030", role: "Invoice IDs, verification, pricing, limits, status" },
  { name: "FakturVaultFactory", address: "0x1e95cbab178772A8d7fE2Cb7a62760A479Dfbc53", role: "Creates one ERC-4626 vault per verified invoice" },
  { name: "FakturNFT", address: "0x97fe1401dA1e167C964284344f8D8C00F60c7e66", role: "Invoice token (FKTR), locked in its vault, burned on close" },
  { name: "FakturRenderer", address: "0x713afe0eB8B09C2dEA3f0A360D9ac74348Ece8DD", role: "Onchain SVG and tokenURI, works after burn" },
  { name: "FakturVerifierReceiver", address: "0xDaE568EA803859DE11fe43a385a219174A7f7975", role: "Chainlink CRE report consumer for verification" },
  { name: "FakturKeeper", address: "0xdd2785e1AB472838bD196837Dd5716372fef10a3", role: "Closes overdue vaults (CRE cron or closeDue)" },
  { name: "MockIDRX", address: "0x11fdaa711602C6b5cE4DeF19028a56b2f07Be22E", role: "Test rupiah, 2 decimals, public faucet" },
  { name: "ACE PolicyEngine", address: "0xA159ab1D85482c51ad0856Ab73CF52C6f9006213", role: "Runs policies on identity registry writes" },
  { name: "ACE OnlyAuthorizedSenderPolicy", address: "0x43263Ea1eB566B17aBEfA2096AF8ff223201C3C5", role: "Only the credential issuer may write" },
  { name: "ACE IdentityRegistry", address: "0x9A1149837d01e6Afe66463531768F5FE96D38435", role: "Wallet to CCID" },
  { name: "ACE CredentialRegistry", address: "0x3DFBb1B4f66b718Add7a1292ACaaa6bb69DBF777", role: "CCID to credentials (kyc, kyb, pkp)" },
  { name: "ACE Funder validator", address: "0xdE422970fA29f39dD91b64c4E74fCd3651b3897A", role: "Requires common.kyc" },
  { name: "ACE Seller validator", address: "0xB5E087BB390B0738EBb8be78Abcf917Af6CCc4c2", role: "Requires common.kyb + id.fakturin.pkp" },
] as const;

export const operator = "0x6c54435C36d3A83A07b264dE8b81ee04E5Ade11d";
export const creForwarder = "0xD41263567DdfeAd91504199b8c6c87371e83ca5d";
