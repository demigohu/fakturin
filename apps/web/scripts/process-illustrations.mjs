// Converts the source illustrations in public/ into web-ready files in public/illustrations/.
// Objects on white get their background removed (edge flood fill) and become transparent WebP.
// Scenes keep their background and are only resized. Run: node scripts/process-illustrations.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const PUBLIC = path.resolve(import.meta.dirname, "../public");
const OUT = path.join(PUBLIC, "illustrations");

const OBJECTS = {
  "Lembar Faktur.jpeg": "faktur",
  "Stempel.jpeg": "stempel",
  "Token Berbentuk Lempengan.jpeg": "token",
  "Pulpen.jpeg": "pulpen",
  "Penjepit Kertas.jpeg": "penjepit",
  "Bantalan Tinta.jpeg": "bantalan",
  "Formulir Rangkap Tiga.jpeg": "formulir",
};

const SCENES = {
  "Hero.jpeg": "hero",
  "penjual.jpeg": "penjual",
  "Pembeli.jpeg": "pembeli",
  "PemberiDana.jpeg": "pemberi-dana",
  "Mitra.jpeg": "mitra",
  "cek.jpeg": "cek",
  "empty.jpeg": "empty",
};

async function cutout(file, name) {
  const { data, info } = await sharp(path.join(PUBLIC, file))
    .resize({ width: 1100, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
  const bg = px(0);
  const dist = (i) => {
    const [r, g, b] = px(i);
    return Math.max(Math.abs(r - bg[0]), Math.abs(g - bg[1]), Math.abs(b - bg[2]));
  };

  // Flood fill background from every border pixel.
  const HARD = 28;
  const removed = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    if (removed[i] || dist(i) > HARD) continue;
    removed[i] = 1;
    const x = i % w;
    const y = (i / w) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w);
    if (y < h - 1) stack.push(i + w);
  }

  // Soft edge: pixels touching the background fade by how close they are to it.
  for (let i = 0; i < w * h; i++) {
    if (removed[i]) {
      data[i * 4 + 3] = 0;
      continue;
    }
    const x = i % w;
    const y = (i / w) | 0;
    const nearBg =
      (x > 0 && removed[i - 1]) ||
      (x < w - 1 && removed[i + 1]) ||
      (y > 0 && removed[i - w]) ||
      (y < h - 1 && removed[i + w]);
    if (nearBg) {
      const d = dist(i);
      data[i * 4 + 3] = Math.min(255, Math.round((d / 90) * 255));
    }
  }

  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .trim()
    .resize({ width: 640, height: 640, fit: "inside" })
    .webp({ quality: 88, alphaQuality: 90 })
    .toFile(path.join(OUT, `${name}.webp`));
}

async function scene(file, name) {
  await sharp(path.join(PUBLIC, file))
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(OUT, `${name}.webp`));
}

await mkdir(OUT, { recursive: true });
for (const [file, name] of Object.entries(OBJECTS)) await cutout(file, name);
for (const [file, name] of Object.entries(SCENES)) await scene(file, name);
await sharp(path.join(PUBLIC, "Gambar OG.jpeg"))
  .resize(1200, 630, { fit: "cover", position: "right" })
  .jpeg({ quality: 82 })
  .toFile(path.resolve(PUBLIC, "../app/opengraph-image.jpg"));
console.log("done");
