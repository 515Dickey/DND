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

## Deity symbols (shipped)

Forgotten Realms holy symbols, used two ways: two on the theme toggle, the rest
as faint pane watermarks. Same specs as the Deneir set -- PNG, square, 1024px+,
transparent background, pure black art, **no caption text**.

Style reference is `deities (2).png`: bold strokes, solid fills, circular
medallion framing. Consistency across the set matters more than any single
symbol; `deities (1).png` is a thinner, more delicate style that does not mix
with it and dissolves at small sizes.

| File | Where it goes | Needs |
| --- | --- | --- |
| `deity-lathander.png` | Theme toggle, daylight | Legible at **20px** -- bold, simple |
| `deity-selune.png` | Theme toggle, candlelight | Legible at **20px** -- bold, simple |
| `deity-waukeen.png` | Small mark beside the coinage | Legible at ~24px |
| `deity-gond.png` | Gear pane watermark | Large and faint; detail welcome |
| `deity-mystra.png` | Spells pane watermark | Large and faint; detail welcome |
| `deity-ilmater.png` | Behind the HP tracker | Large and faint; detail welcome |

Deliberately **not** used: Kelemvor on the death saves. He is the right god and a
dignified one, but the agreed rule is that death and dying stay untouched.

Gond rather than Moradin for gear: Moradin is specifically the dwarven
All-Father, which reads oddly behind an elf's backpack. Gond is the Faerunian
god of craft and invention generally, and his cog reads at any size.

Caption text on the source sheets is unreliable -- sheet 2 misspells Tempus and
Bhaal, and sheet 1 includes Pelor, who is Greyhawk rather than Forgotten Realms.
Crop the symbol, never the caption, and type any displayed name by hand.

### As shipped

Tempus was dropped: the generated art was a sunburst, not his flaming sword, and
a second sun would have collided with Lathander. **Helm** the Watcher took the
guardian role instead.

| Symbol | Where |
| --- | --- |
| Selune / Lathander | Theme toggle, at **32px** -- below that both are grey smudges |
| Helm | Abilities watermark (saves and skills) |
| Ilmater | Combat watermark (hit points, conditions, death) |
| Mystra | Spells watermark |
| Gond | Gear watermark |
| Waukeen | Beside the Money panel, 24px at 40% -- meant to be seen |

Notes has none on purpose: writing belongs to Deneir, who is already the title
page mark, and one bare page keeps the rest from reading as wallpaper.

Lathander and Selune arrived as black-on-white PNGs rather than transparent.
That keys exactly -- alpha is the inverse of luminance when the art is pure
black on pure white -- so it is handled in `export-art.mjs` rather than being
sent back for a redo.
