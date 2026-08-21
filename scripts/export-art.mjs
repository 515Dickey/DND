// Exports the shipped image sizes from the full-resolution originals in art/.
//
// Run with `node scripts/export-art.mjs`. Nothing in art/ is served; only what
// this writes into public/ is deployed and pulled into the offline cache, so
// the exports are kept as small as the job allows.
//
// The source discs are ovals, not circles -- 10% taller than wide -- and are
// placed as drawn rather than stretched to fit a square.

import { existsSync } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ART = "art";
const OUT = "public";

/** The parchment the discs are set on, matching the manifest background. */
const PAPER = "#e9dbb8";

/**
 * How much of the source canvas the artwork actually covers vertically. Both
 * discs measure 958px of content on a 1024px canvas, so the transparent margin
 * has to be accounted for when a target wants the art at a given size.
 */
const SOURCE_CONTENT = 958 / 1024;

/**
 * Places `src` centred on an opaque square of `size`, scaled so the artwork
 * itself covers `contentFraction` of the canvas height.
 *
 * Maskable icons are the reason this is a fraction and not just a resize:
 * Android may crop an icon to any shape inside the outer 10%, so the art has
 * to sit within a centred circle of 80% diameter or the gold ring loses its top
 * and bottom. iOS rounds the corners of apple-touch-icon, which is gentler but
 * still wants a margin.
 */
async function seal(src, size, contentFraction, dest) {
  const inner = Math.round((size * contentFraction) / SOURCE_CONTENT);
  const disc = await sharp(src)
    .resize(inner, inner, { fit: "inside" })
    .toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: PAPER,
    },
  })
    .composite([{ input: disc, gravity: "centre" }])
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(OUT, dest));
  return dest;
}

/**
 * The title-page marks keep their transparency and their square canvas. The
 * square matters: both discs sit at the same offset within it, so swapping one
 * for the other on a theme change moves nothing on the page.
 */
async function mark(src, size, dest) {
  await sharp(src)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, quality: 90 })
    .toFile(path.join(OUT, dest));
  return dest;
}

/**
 * The traced line art is used as a CSS mask so it can take the current ink
 * colour, which means only its alpha is read and its own fill never shows.
 *
 * The trace arrives on a square canvas, but the emblem is tall and narrow --
 * 633 by 940 of 1024 -- so a square box with `contain` sizing wastes a third of
 * its width and draws the art smaller than the box implies. The viewBox is
 * cropped to the ink instead, measured here rather than hardcoded so that
 * replacing the art doesn't silently reintroduce the margin.
 */
async function lineMark(src, dest) {
  const svg = await readFile(src, "utf8");
  const cleaned = svg.replace(/^<\?xml[^>]*\?>\s*/, "");
  if (!/^<svg/.test(cleaned)) throw new Error(`${src}: expected an <svg> root`);

  const box = cleaned.match(/viewBox="([\d.\s-]+)"/);
  if (!box) throw new Error(`${src}: no viewBox to crop`);
  const [, , vw, vh] = box[1].trim().split(/\s+/).map(Number);

  const { data, info } = await sharp(src, { density: 150 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let maxX = -1;
  let minY = info.height;
  let maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] > 40) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error(`${src}: traced to nothing`);

  // Back into viewBox units, with a hair of padding so no stroke clips.
  const pad = 8;
  const sx = vw / info.width;
  const sy = vh / info.height;
  const x = Math.max(0, minX * sx - pad);
  const y = Math.max(0, minY * sy - pad);
  const w = Math.min(vw - x, (maxX - minX + 1) * sx + pad * 2);
  const h = Math.min(vh - y, (maxY - minY + 1) * sy + pad * 2);
  const round = (n) => Math.round(n * 10) / 10;

  const cropped = cleaned
    .replace(/viewBox="[^"]*"/, `viewBox="${round(x)} ${round(y)} ${round(w)} ${round(h)}"`)
    .replace(/\swidth="[^"]*"/, ` width="${round(w)}"`)
    .replace(/\sheight="[^"]*"/, ` height="${round(h)}"`);

  await writeFile(path.join(OUT, dest), cropped);
  console.log(`  (line art aspect ratio ${round(w)} / ${round(h)} = ${(w / h).toFixed(3)})`);
  return dest;
}

const night = path.join(ART, "deneir-night.png");
const day = path.join(ART, "deneir-day.png");
const line = path.join(ART, "deneir-line.svg");

for (const f of [night, day, line]) {
  if (!existsSync(f)) {
    console.error(`Missing source art: ${f}\nSee art/README.md for the specs.`);
    process.exit(1);
  }
}

const written = [
  // App icons. The night disc is the only one that belongs here: a home screen
  // is the one place the dark opaque disc is right rather than a compromise,
  // since it never sits on the app's own parchment.
  await seal(night, 192, 0.9, "icon-192.png"),
  await seal(night, 512, 0.9, "icon-512.png"),
  await seal(night, 180, 0.88, "apple-touch-icon.png"),
  await seal(night, 512, 0.78, "icon-maskable-512.png"),

  // Title-page marks, at 3x the size they are drawn at so they stay crisp on a
  // tablet.
  await mark(day, 312, "deneir-day.png"),
  await mark(night, 312, "deneir-night.png"),

  // The themeable mark, used at a size where its detail survives.
  await lineMark(line, "deneir-line.svg"),
];

console.log("Wrote:");
for (const f of written) {
  const { size } = await stat(path.join(OUT, f));
  console.log(`  ${f.padEnd(26)} ${(size / 1024).toFixed(0)} KB`);
}
