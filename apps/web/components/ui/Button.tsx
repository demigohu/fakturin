import Link from "next/link";
import { ArrowUpRight, CircleNotch } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
import s from "./ui.module.css";

type Variant = "primary" | "ghost" | "danger" | "plain";

type Common = {
  children: ReactNode;
  variant?: Variant;
  size?: "md" | "sm";
  block?: boolean;
  /** Icon in the right cell; defaults to the arrow. Ignored for `plain`. */
  icon?: ReactNode;
};

type AsButton = Common & {
  href?: undefined;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
};

type AsLink = Common & { href: string };

function classes({ variant = "primary", size = "md", block }: Common) {
  return [s.btn, s[variant], size === "sm" && s.sm, block && s.block].filter(Boolean).join(" ");
}

/** The split CTA from DESIGN.md: label cell + square accent icon cell. */
export function Button(props: AsButton | AsLink) {
  const showIcon = props.variant !== "plain";
  const iconSize = props.size === "sm" ? 18 : 22;

  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={classes(props)}>
        <span className={s.btnLabel}>{props.children}</span>
        {showIcon && <span className={s.btnIcon}>{props.icon ?? <ArrowUpRight size={iconSize} />}</span>}
      </Link>
    );
  }

  const { onClick, type = "button", disabled, loading } = props;
  return (
    <button
      type={type}
      className={classes(props)}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      <span className={s.btnLabel}>{loading ? "Processing…" : props.children}</span>
      {showIcon && (
        <span className={s.btnIcon}>
          {loading ? (
            <CircleNotch size={iconSize} className={s.spin} />
          ) : (
            (props.icon ?? <ArrowUpRight size={iconSize} />)
          )}
        </span>
      )}
    </button>
  );
}
