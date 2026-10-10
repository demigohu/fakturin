"use client";

import { useEffect, useId, useRef, useState } from "react";

/** Wide diagrams shrink to fit, but never below this; past it they scroll sideways instead. */
const MIN_SCALE = 0.85;

/**
 * Renders a Mermaid diagram on the client, themed with the Overflow Grid tokens
 * (paper, navy ink, Sui blue, square corners). Shows the source until it has rendered.
 */
export function Mermaid({ chart, caption }: { chart: string; caption?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState<string>();
  const [error, setError] = useState<string>();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { default: mermaid } = await import("mermaid");
      const fontFamily = getComputedStyle(document.body).fontFamily;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        fontFamily,
        themeVariables: {
          fontFamily,
          fontSize: "14px",
          background: "#ffffff",
          primaryColor: "#f2eee4",
          primaryBorderColor: "#000f1d",
          primaryTextColor: "#000f1d",
          secondaryColor: "#dbeafe",
          secondaryBorderColor: "#000f1d",
          tertiaryColor: "#ffffff",
          tertiaryBorderColor: "#bbbec0",
          lineColor: "#000f1d",
          textColor: "#000f1d",
          noteBkgColor: "#fffc4d",
          noteBorderColor: "#000f1d",
          noteTextColor: "#000f1d",
          actorBkg: "#f2eee4",
          actorBorder: "#000f1d",
          actorTextColor: "#000f1d",
          signalColor: "#000f1d",
          signalTextColor: "#000f1d",
          labelBoxBkgColor: "#4da2ff",
          labelBoxBorderColor: "#000f1d",
          activationBkgColor: "#4da2ff",
          activationBorderColor: "#000f1d",
          clusterBkg: "#f7f7f7",
          clusterBorder: "#bbbec0",
          edgeLabelBackground: "#f7f7f7",
          mainBkg: "#f2eee4",
          nodeBorder: "#000f1d",
          stateBkg: "#f2eee4",
          altBackground: "#f7f7f7",
        },
        flowchart: { curve: "linear", padding: 12 },
        sequence: { mirrorActors: false, actorMargin: 40 },
        sankey: { linkColor: "#4da2ff", showValues: true },
        themeCSS: "rect, polygon, .node rect, .actor { rx: 0 !important; ry: 0 !important; } .cluster-label { font-weight: 500; }",
      });
      try {
        const { svg } = await mermaid.render(`mmd${id}`, chart.trim());
        if (!cancelled) setSvg(svg);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  // Size the SVG from its viewBox: fit the column, or keep MIN_SCALE and scroll.
  useEffect(() => {
    const el = box.current;
    const svgEl = el?.querySelector("svg");
    if (!el || !svgEl) return;
    const fit = () => {
      const natural = svgEl.viewBox.baseVal?.width || svgEl.getBoundingClientRect().width;
      const available = el.clientWidth;
      const width = Math.min(natural, Math.max(available, natural * MIN_SCALE));
      svgEl.style.maxWidth = "none";
      svgEl.style.width = `${width}px`;
      svgEl.style.height = "auto";
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [svg]);

  return (
    <figure className="not-prose my-6">
      <div className="overflow-x-auto border-2 border-fd-foreground bg-white p-4">
        {svg ? (
          <div ref={box} className="flex w-full [&>svg]:mx-auto [&>svg]:shrink-0" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-xs text-fd-muted-foreground" aria-busy={!error}>
            {error ? `Diagram failed to render: ${error}\n\n${chart.trim()}` : chart.trim()}
          </pre>
        )}
      </div>
      {caption && <figcaption className="mt-2 font-mono text-xs text-fd-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}
