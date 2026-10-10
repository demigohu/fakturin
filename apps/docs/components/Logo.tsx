/** Fakturin mark (same drawing as apps/web/public/Logo.svg), inherits the text color. */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <rect x="4" y="4" width="56" height="56" stroke="currentColor" strokeWidth="4" strokeLinejoin="miter" />
      <path d="M 14 14 L 34 14 L 42 22 L 42 44 L 14 44 Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M 34 14 L 34 22 L 42 22" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      <line x1="20" y1="28" x2="36" y2="28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="20" y1="36" x2="28" y2="36" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <rect x="40" y="40" width="16" height="16" fill="#4da2ff" stroke="currentColor" strokeWidth="4" strokeLinejoin="miter" />
    </svg>
  );
}
