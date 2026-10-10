import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { contracts, EXPLORER } from "@/lib/deployment";

/** Table of the live v3 contracts with Arbiscan links. */
export function Deployments() {
  return (
    <div className="not-prose my-6 overflow-x-auto border-2 border-fd-foreground">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="bg-[var(--surface-warm)] text-left">
            <th className="border-b-2 border-fd-foreground px-3 py-2 font-medium">Contract</th>
            <th className="border-b-2 border-fd-foreground px-3 py-2 font-medium">Address</th>
            <th className="border-b-2 border-fd-foreground px-3 py-2 font-medium">Job</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {contracts.map((c) => (
            <tr key={c.address} className="border-b border-fd-border last:border-b-0">
              <td className="px-3 py-2 font-medium whitespace-nowrap">{c.name}</td>
              <td className="px-3 py-2">
                <a
                  href={`${EXPLORER}/address/${c.address}#code`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs underline decoration-[var(--accent)] decoration-2 underline-offset-2"
                >
                  {c.address.slice(0, 8)}…{c.address.slice(-6)}
                  <ArrowSquareOut size={12} aria-hidden />
                </a>
              </td>
              <td className="px-3 py-2 text-fd-muted-foreground">{c.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
