import { createGetUrl } from "fumadocs-core/source";

export const appName = "Fakturin Docs";
export const docsRoute = "/docs";
export const docsContentRoute = "/llms.mdx/docs";

/** The dApp itself (apps/web). */
export const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const gitConfig = {
  user: "demigohu",
  repo: "fakturin",
  branch: "main",
};

const getContentUrl = createGetUrl(docsContentRoute);

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, "content.md"];

  return { segments, url: getContentUrl(segments, page.locale) };
}
