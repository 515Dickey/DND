# Vellum

*vellum, n. — fine parchment, made to outlast its scribe. Yours only has to
outlast the campaign.*

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

**Features and traits are a list, not a wall of text.** Each one shows its name
and a short note on the Notes tab; tap it to open a card holding the full rules
text. Keeps the sheet readable when a character has a dozen features. Sheets
saved before this change are converted automatically, one entry per line.

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
- Gear marked stowed stays listed but stops counting against capacity
- **Magic containers**: tick "contents weightless" on an item and anything whose
  location names it stops counting. Typing a Bag of Holding, Handy Haversack,
  Portable Hole, or Efficient Quiver ticks it and fills in the container's own
  weight for you — which still counts, as the rules intend
- Spell save DC and spell attack bonus from your casting ability

### Filling the sheet from the rules

On the Abilities tab, **Fill from the rules** offers all twelve classes and nine
species from the SRD 5.2. Choose Fighter at level 4 and the sheet writes in the
d10 hit dice, Strength and Constitution saves, weapon and armour training, and
the six class features — with Second Wind already set to 3 uses on a short rest
and Action Surge to 1. Choose a species and you get its speed, size, and traits.

Nothing is locked. Every value written is an ordinary editable field afterwards,
so homebrew keeps working. Entries record where they came from, so applying
again replaces only what a previous apply created and never touches anything you
typed. Applying a second class multiclasses rather than overwriting — and when it
can no longer describe you in one line, it says so instead of guessing.

On the Spells tab, **Search the rules for a spell** browses all 339 SRD
spells. Filter by level or by class list, tap a name to read it before
committing, then Add — the spell arrives with its casting time, range,
components, duration, and full rules text, already flagged for concentration
and ritual. Cantrips arrive prepared, since they always are.

Each class also offers the one **subclass** the SRD publishes — Champion,
Evoker, Life Domain, Thief and so on. It only becomes available at level 3, and
applying it adds the features earned by your level, telling you when the next
one arrives.

On the Notes tab, **Feats** lists the SRD's seventeen feats by category with
their prerequisites and full text. Added feats land in a Feats section of your
features list.

On the Gear tab, **From the rules** browses the weapons, armour, and adventuring
gear tables. Adding an item fills in its weight and cost, so carrying capacity
updates itself. A weapon also becomes an attack, with its damage and ability
worked out. Wearing armour sets how your AC is calculated — Chain Mail gives
base 16 with no Dexterity, a Shield adds its +2 as a bonus instead.

The sheet won't pick your skills for you. It tells you how many to choose and
from which list, and leaves the ticking to you.

There's deliberately **no dice roller** — you're rolling real dice at the table.
Spend a hit die in the app, roll it in your hand, then type the healing in.

## Using it

Open the site on the tablet and add it to the home screen ("Add to Home Screen"
on iPad, "Install app" in Chrome). It then opens full-screen like a native app
and keeps working with no signal once it's been loaded once.

The moon/sun button switches between **daylight** and **candlelight**. Candlelight
is a dimmed, warm version of the same parchment — much easier on everyone at a
night session.

### Add it to the home screen — this one matters

On iPad and iPhone, Safari deletes a site's localStorage after **seven days of
Safari use without visiting that site**. For a group that plays every other
weekend, that is inside the danger window, and it would take every character
with it.

Web apps launched from the **home screen are exempt** from that deletion, so
"Add to Home Screen" is not a nicety here — it is the thing that protects the
data. The app also calls `navigator.storage.persist()` on load, and warns you on
the character list if the browser declined to mark the data permanent.

Windows, Android, and desktop Chrome have no such timer. There, data is only
evicted when the disk is genuinely under pressure, least-recently-used origin
first, and origins granted persistence are skipped entirely.

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

## SRD content

Classes, species, and spells come from the **SRD 5.2**, which covers the 2024
rules and is published under CC-BY-4.0. See [NOTICE.md](NOTICE.md) for the
attribution and for how to regenerate the data from the source PDF.

Feats and equipment aren't in yet. Everything remains free text underneath, so
homebrew and anything outside the SRD works exactly as it always did — the rules
data fills fields in, it never restricts them.
