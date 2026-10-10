import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/Logo";
import { appUrl, gitConfig } from "./shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="inline-flex items-center gap-2 font-medium tracking-tight">
          <Logo />
          Fakturin
          <span className="border border-fd-foreground px-1.5 py-0.5 font-mono text-[11px] leading-none tracking-normal">docs</span>
        </span>
      ),
    },
    themeSwitch: { enabled: false },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    links: [
      {
        text: "Open the app",
        url: appUrl,
        external: true,
        icon: <ArrowSquareOut />,
      },
    ],
  };
}
