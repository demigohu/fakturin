import Image from "next/image";
import { ASSETS, type AssetKey } from "../../lib/assets";
import s from "./ui.module.css";

/** Renders the asset when provided, otherwise a sized placeholder naming the missing file. */
export function Illustration({
  asset,
  ratio = "4 / 3",
  background,
  priority,
}: {
  asset: AssetKey;
  ratio?: string;
  background?: string;
  priority?: boolean;
}) {
  const a = ASSETS[asset];
  return (
    <div
      className={s.slot}
      style={{ "--ratio": ratio, background } as React.CSSProperties}
    >
      {a.src ? (
        <Image src={a.src} alt={a.alt} fill sizes="(max-width: 768px) 100vw, 50vw" priority={priority} />
      ) : (
        <div className={s.slotCaption} role="img" aria-label={a.alt}>
          <span>[ asset: {asset} ]</span>
          <span>{a.brief}</span>
          <span>{a.size}</span>
        </div>
      )}
    </div>
  );
}
