/** Fakturin mark (public/Logo.svg), inlined so it follows the text color. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <rect x="4" y="4" width="56" height="56" stroke="currentColor" strokeWidth="4" />
      <path d="M14 14H34L42 22V44H14Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <path d="M34 14V22H42" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M20 28H36M20 36H28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <rect x="40" y="40" width="16" height="16" fill="#4da2ff" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}
