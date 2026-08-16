# D&D&D — Derrick and Dungeons and Dragons

A D&D 5e character sheet for playing in person. Built for tablets and phones,
styled after the 3rd-edition books, and stored entirely on the device that's
using it.

No accounts, no server, no database. Nothing a character contains ever leaves
the tablet unless you export it yourself.

## What it does

**Everything is connected.** Change Strength and the modifier, Athletics,
your Strength save, carrying capacity, and encumbrance status all move with it.
Every calculated number shows the math behind it — tap it to see the breakdown.

**Every calculated field can be pinned.** Some feat or magic item will
eventually break the formula. Tap any derived number, type the real value, and
it stays put until you tap *Auto* again. Pinned numbers are shown in red so you
know the sheet isn't driving them.

### The five tabs

| Tab | Holds |
| --- | --- |
| **Abilities** | Identity, the six scores, proficiency, saves, all 18 skills, passive senses |
| **Combat** | HP with damage/healing, temp HP, death saves, rests, hit dice, AC, initiative, speed, exhaustion, attacks |
| **Spells** | Save DC and attack bonus, slots per level, pact magic, prepared-spell list by level |
| **Gear** | Inventory with weights, carrying capacity and encumbrance, coins |
| **Notes** | Features and traits, personality, backstory, scratch pad, session journal |

### Rules it applies for you

- Ability modifiers, proficiency bonus by total level
- Saves and skills, including expertise, half proficiency, and Jack of All Trades
- AC from unarmored, armor (with the medium/heavy DEX cap), or either Unarmored Defense
- Damage spends temporary HP first, and HP floors at 0 rather than going negative
- Healing above 0 clears the death-save track
- **Long rest** restores HP and spell slots, returns half your hit dice, and removes one level of exhaustion
- **Short rest** restores pact slots
- Exhaustion and encumbrance both reduce your speed
- Carrying capacity `STR × 15`, push/drag/lift `STR × 30`, optional variant encumbrance
- Spell save DC and spell attack bonus from your casting ability

There's deliberately **no dice roller** — you're rolling real dice at the table.
Spend a hit die in the app, roll it in your hand, then type the healing in.

## Using it

Open the site on the tablet and add it to the home screen ("Add to Home Screen"
on iPad, "Install app" in Chrome). It then opens full-screen like a native app
and keeps working with no signal once it's been loaded once.

The moon/sun button switches between **daylight** and **candlelight**. Candlelight
is a dimmed, warm version of the same parchment — much easier on everyone at a
night session.

### Backups matter

Characters live in this browser's local storage. That means:

- Clearing site data, or "clear cookies and site data" on the tablet, **erases them**
- A different browser or device is a completely separate set of characters
- Private/incognito windows won't keep anything

So use **Export** (one character) or **Back up all** now and then, and keep the
file somewhere safe. **Import** reads either kind of file back, and always
assigns fresh IDs so importing can't overwrite a character you already have.
Export is also how you hand a character to another player.

One caveat: don't keep the same character open in two tabs at once and edit
both. The last tab to write wins.

## Running it locally

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

Other commands:

```bash
npm run build
```

```bash
npm run lint
```

## Deploying

The whole app is statically prerendered — there are no server routes, no
environment variables, and no secrets to configure. Push to GitHub, import the
repo at [vercel.com/new](https://vercel.com/new), and accept the detected
Next.js defaults.

## Built with

Next.js 16 (App Router, all static), React 19, TypeScript, Tailwind CSS 4.
Fonts are Cinzel and EB Garamond, self-hosted through `next/font`. The parchment
texture is generated in CSS with layered gradients and SVG turbulence, so there
are no image assets to load.

## Adding SRD content later

This version is a *smart sheet*: it does all the math but you type in your own
class names, features, and spells, which means it works with homebrew and any
sourcebook. A future version could add dropdowns backed by the 5e SRD 5.1
(available under CC-BY-4.0) to auto-fill hit dice, skill lists, and spell
descriptions. The data model in `src/lib/types.ts` was written with that in
mind — nothing would need to be thrown away.
