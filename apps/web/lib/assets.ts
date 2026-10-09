/**
 * Illustration manifest. Files in public/illustrations/ are generated from the source
 * JPEGs by scripts/process-illustrations.mjs. A null `src` renders a labeled placeholder.
 */
export type AssetKey =
  | "hero"
  | "penjual"
  | "pembeli"
  | "pemberiDana"
  | "mitra"
  | "cek"
  | "empty";

export const ASSETS: Record<AssetKey, { src: string | null; alt: string; brief: string; size: string }> = {
  hero: {
    src: "/illustrations/hero.webp",
    alt: "A paper invoice turning into a token on graph paper",
    brief: "Isometric invoice sheet, confirmation stamp and token",
    size: "1600x1200",
  },
  penjual: {
    src: "/illustrations/penjual.webp",
    alt: "A seller shipping an invoice",
    brief: "Shipping box and invoice",
    size: "800x600",
  },
  pembeli: {
    src: "/illustrations/pembeli.webp",
    alt: "A buyer stamping a confirmation",
    brief: "Stamp and check mark",
    size: "800x600",
  },
  pemberiDana: {
    src: "/illustrations/pemberi-dana.webp",
    alt: "A stack of bills and a token",
    brief: "Bills and invoice token",
    size: "800x600",
  },
  mitra: {
    src: "/illustrations/mitra.webp",
    alt: "A bank vault",
    brief: "Vault",
    size: "800x600",
  },
  cek: {
    src: "/illustrations/cek.webp",
    alt: "A magnifying glass over an invoice",
    brief: "Magnifier and invoice",
    size: "800x600",
  },
  empty: {
    src: "/illustrations/empty.webp",
    alt: "An empty folder",
    brief: "Empty folder",
    size: "600x450",
  },
};
