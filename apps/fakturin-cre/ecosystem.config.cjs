/**
 * pm2 processes for the Chainlink CRE workflows (run on a VPS):
 *   pm2 start ecosystem.config.cjs && pm2 save
 * Needs: cre CLI logged in (`cre login`, or CRE_API_KEY in .env), bun, and ./.env with
 * CRE_ETH_PRIVATE_KEY + CRE_TARGET. verify/config.json `pjapBaseUrl` must point at the deployed web app.
 */
module.exports = {
  apps: [
    {
      name: "fakturin-cre-verify",
      cwd: __dirname,
      script: "scripts/verify-listen.sh",
      interpreter: "bash",
      autorestart: true,
      restart_delay: 5000,
      time: true,
    },
    {
      name: "fakturin-cre-keeper",
      cwd: __dirname,
      script: "scripts/keeper-loop.sh",
      interpreter: "bash",
      autorestart: true,
      restart_delay: 5000,
      time: true,
    },
  ],
};
