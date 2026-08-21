# Source art

Full-resolution originals. **Nothing here is deployed.** Files in `public/` are
served and pulled into the offline cache, so the big sources stay out here and
only the exported sizes ship.

Kept in git so the icon set can be re-exported later without hunting for the
originals.

## Expected files

| File | What it is | Background |
| --- | --- | --- |
| `deneir-night.png` | Gold-on-navy disc, starfield | Transparent outside the gold ring, disc opaque |
| `deneir-day.png` | Sepia linework on parchment | Transparent outside the outermost ring, cream interior kept |
| `deneir-line.png` | Black line art, no disc | Fully transparent |

PNG, square, centred, 1024x1024 or larger. An SVG for the line art is better
than any PNG and will be used directly.

## Provenance

The Deneir holy symbols (a candle above an open eye) are AI-generated art made
for this project. They are not SRD content -- see `NOTICE.md` for the separate
CC-BY attribution the rules text carries.

## Exporting

`node scripts/export-art.mjs` writes every shipped size into `public/`:

| Output | From | Notes |
| --- | --- | --- |
| `icon-seal-192/512.png`, `apple-touch-icon.png` | night | Disc set on parchment, like a wax seal. Opaque -- iOS paints transparency black. |
| `icon-seal-maskable-512.png` | night | Art held inside the centred 80% safe circle so Android's mask can't crop the ring. |
| `deneir-day/night.png` | day, night | 312px, alpha kept, square canvas so the theme swap moves nothing. |
| `deneir-line.svg` | line | viewBox cropped to the ink, measured at export time. Used as a CSS mask. |

The source discs are ovals, 10% taller than wide. They are placed as drawn --
stretching them to fit a square would distort the candle and the eye.

Icon filenames name the artwork on purpose. A browser re-downloads an installed
app's icons when the **manifest** changes, not when the bytes behind an
unchanged URL do -- so replacing an icon in place leaves every existing install
showing the old one forever. New art gets a new name, and `public/sw.js` gets a
version bump so the old bytes are evicted from the offline cache.
