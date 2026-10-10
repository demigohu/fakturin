import Image from "next/image";

/**
 * One of the app's illustrations (copied from apps/web/public/illustrations) beside a caption.
 * `scene` images are full 1400×781 scenes with their own background; the rest are cut-out objects.
 */
export function Figure({ src, alt, caption, scene = false }: { src: string; alt: string; caption?: string; scene?: boolean }) {
  return (
    <figure className="not-prose my-6 grid items-center gap-4 border border-fd-border bg-[var(--surface-warm)] p-4 sm:grid-cols-[200px_1fr]">
      <span className="relative block aspect-[1400/781] w-full overflow-hidden border-2 border-fd-foreground bg-fd-background sm:w-[200px]">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, 200px"
          className={scene ? "object-cover" : "object-contain p-2"}
        />
      </span>
      {caption && <figcaption className="text-sm leading-snug text-fd-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}
