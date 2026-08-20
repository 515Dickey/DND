// Turns the SRD 5.2.1 PDF text into the structured data the sheet needs.
//
// Run against `pdftotext -raw` output. Raw mode keeps each table row on one
// line; -layout drifts the columns apart and silently corrupts them, which is
// far worse than failing outright for game data players will trust.
//
//   pdftotext -raw SRD_CC_v5.2.pdf srd-raw.txt
//   node scripts/extract-srd.mjs srd-raw.txt src/srd/classes.json

import fs from "node:fs";

const src = process.argv[2];
const outFile = process.argv[3];
if (!src || !outFile) {
  console.error("usage: extract-srd.mjs <srd-raw.txt> <out.json>");
  process.exit(1);
}

const lines = fs
  .readFileSync(src, "utf8")
  .split("\n")
  .map((l) => l.replace(/\r$/, ""));

const CLASSES = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
];

const TRAIT_LABELS = [
  "Primary Ability",
  "Hit Point Die",
  "Saving Throw Proficiencies",
  "Skill Proficiencies",
  "Weapon Proficiencies",
  "Tool Proficiencies",
  "Armor Training",
  "Starting Equipment",
];

/** Rejoins words the PDF hyphenated across a line break. */
function dehyphenate(text) {
  return text
    .replace(/([a-z])-\s+([a-z])/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function findLine(re, from = 0) {
  for (let i = from; i < lines.length; i++) if (re.test(lines[i])) return i;
  return -1;
}

function parseCoreTraits(className) {
  const start = findLine(new RegExp("^Core " + className + " Traits$"));
  if (start < 0) return null;
  const stop = findLine(new RegExp("^Becoming a " + className), start);
  let blob = lines.slice(start + 1, stop < 0 ? start + 40 : stop).join(" ");

  // Several labels wrap mid-phrase in the PDF; normalise before splitting.
  for (const label of TRAIT_LABELS) {
    const loose = label.replace(/ /g, "\\s+");
    blob = blob.replace(new RegExp(loose, "g"), label);
  }

  const found = TRAIT_LABELS.map((label) => ({ label, at: blob.indexOf(label) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at);

  const traits = {};
  for (let i = 0; i < found.length; i++) {
    const { label, at } = found[i];
    const end = i + 1 < found.length ? found[i + 1].at : blob.length;
    traits[label] = dehyphenate(blob.slice(at + label.length, end));
  }
  return traits;
}

function parseFeatureTable(className) {
  const start = findLine(new RegExp("^" + className + " Features$"));
  if (start < 0) return null;

  // Gather the table block, dropping page footers and their page numbers.
  const block = [];
  for (let i = start + 1; i < start + 140 && i < lines.length; i++) {
    const line = lines[i];
    if (/^System Reference Document/.test(line)) {
      if (/^\d{1,3}$/.test(lines[i + 1] || "")) i++;
      continue;
    }
    // The prose feature descriptions resume after the table; without stopping
    // here the level 20 row swallows the entire rest of the class chapter.
    if (/^Level \d+:/.test(line)) break;
    if (new RegExp("^(Core |Becoming |" + className + " Class Features)").test(line)) break;
    block.push(line);
  }

  // Rows wrap. A new row starts only at "<level> +<pb>"; anything else is a
  // continuation, including a line holding nothing but the numeric columns.
  const rows = [];
  for (const line of block) {
    const head = line.match(/^(\d{1,2}) \+(\d)\s*(.*)$/);
    const level = head ? Number(head[1]) : 0;
    if (head && level >= 1 && level <= 20) {
      rows.push({ level, proficiencyBonus: Number(head[2]), text: head[3] });
      continue;
    }
    if (!rows.length || !line.trim()) continue;
    // Once level 20 is in hand the table is over, so only accept a genuine
    // continuation: a line of column values, never a sentence.
    const columnsOnly = /^[\s\d+\-—]*(?:\d|—|-)[\s\d+\-—]*$/.test(line.trim());
    if (rows[rows.length - 1].level === 20 && !columnsOnly) break;
    rows[rows.length - 1].text += " " + line.trim();
  }

  const seen = new Set();
  return rows
    .filter((r) => (seen.has(r.level) ? false : seen.add(r.level)))
    .map((r) => {
      let rest = r.text.trim();
      // Peel trailing column values off the end. Classes use several shapes:
      // plain counts (spell slots), dice (Sneak Attack 1d6), bare dice
      // (Bard's D6), signed numbers (Barbarian's Rage Damage +2), and em-dashes
      // for "none". Miss one and it lands inside a feature's name.
      const cols = [];
      for (;;) {
        // Monk's Unarmored Movement column carries a unit ("+30 ft."), so that
        // shape has to be peeled too or it lands inside the feature name.
        const t = rest.match(/(?:\s|^)(\+\d+\s*ft\.|\d+d\d+|[Dd]\d+|\+\d+|\d+|—|-{1,2})$/);
        if (!t) break;
        cols.unshift(t[1]);
        rest = rest.slice(0, t.index);
      }
      return {
        level: r.level,
        proficiencyBonus: r.proficiencyBonus,
        features: dehyphenate(rest)
          .replace(/,\s*$/, "")
          .split(/,\s*/)
          .map((x) => x.trim())
          .filter(Boolean),
        columns: cols,
      };
    });
}

/**
 * The rules text for each class feature, keyed by feature name.
 *
 * The prose runs from "<Class> Class Features" to the first subclass heading,
 * as "Level N: Name" followed by paragraphs. Two things sit in the way: the
 * features *table* is printed in the middle of that prose, and page footers
 * interrupt it. Both are skipped explicitly, since letting the table fall into
 * a description would bury the actual rules under a wall of numbers.
 */
function parseFeatureDescriptions(className) {
  const start = findLine(new RegExp("^" + className + " Class Features$"));
  if (start < 0) return {};

  let end = findLine(new RegExp("^" + className + " Subclass: "), start);
  if (end < 0) end = findLine(/^Core [A-Z][a-z]+ Traits$/, start);
  if (end < 0) end = Math.min(start + 400, lines.length);

  // Locate the table so its rows and headings can be stepped over.
  const tableStart = findLine(new RegExp("^" + className + " Features$"), start);
  let tableEnd = -1;
  if (tableStart > start && tableStart < end) {
    for (let i = tableStart + 1; i < end; i++) {
      if (/^\d{1,2} \+\d/.test(lines[i])) tableEnd = i;
      else if (/^Level \d+:/.test(lines[i])) break;
    }
    // Trailing column-only lines belong to the last row.
    while (tableEnd + 1 < end && /^[\s\d+\-—]*(?:\d|—|-)[\s\d+\-—]*$/.test(lines[tableEnd + 1])) {
      tableEnd += 1;
    }
  }

  const out = {};
  let current = null;
  for (let i = start + 1; i < end; i++) {
    if (tableEnd > 0 && i >= tableStart && i <= tableEnd) continue;
    const line = lines[i];
    if (/^System Reference Document/.test(line)) continue;
    if (/^\d{1,3}$/.test(line)) continue;

    const head = line.match(/^Level (\d+): (.+)$/);
    if (head) {
      current = head[2].trim();
      out[current] = "";
      continue;
    }
    if (current && line.trim()) out[current] += " " + line.trim();
  }

  for (const key of Object.keys(out)) {
    out[key] = dehyphenate(out[key]);
    if (!out[key]) delete out[key];
  }
  return out;
}

/**
 * The one subclass each class gets in the SRD, and the features it grants.
 *
 * The heading is "<Class> Subclass: <Name>", but the name wraps three different
 * ways: entirely on the heading line (Champion), entirely on the next line
 * (Path of the Berserker), or split across both (Warrior of the / Open Hand).
 * A tagline follows the name, so the join has to stop before it.
 */
function parseSubclass(className) {
  // Start inside the class's own chapter. Searching from the top finds the
  // table of contents instead, whose entries carry dot leaders and page
  // numbers and no features at all.
  const chapter = findLine(new RegExp("^Core " + className + " Traits$"));
  if (chapter < 0) return null;
  const at = findLine(new RegExp("^" + className + " Subclass:"), chapter);
  if (at < 0) return null;

  const first = lines[at].replace(new RegExp("^" + className + " Subclass:"), "").trim();
  const next = (lines[at + 1] || "").trim();
  const words = (s) => s.split(/\s+/).filter(Boolean).length;

  let name = first;
  let after = at + 1;
  if (!first) {
    // Name sits entirely on the following line.
    name = next;
    after = at + 2;
  } else if (/\b(of|the|and|a|in)$/i.test(first)) {
    // Obviously unfinished phrase, so the tail is on the next line.
    name = first + " " + next;
    after = at + 2;
  } else if (words(first) === 1 && words(next) <= 2) {
    // "Draconic" + "Sorcery". A tagline would be longer than two words.
    name = first + " " + next;
    after = at + 2;
  }

  // Bound the region. Most classes are followed by the next class's Core
  // Traits, but Wizard is last -- without the chapter headings as fallbacks its
  // final feature swallows everything that follows.
  const end = findLine(
    /^(Core [A-Z][a-z]+ Traits|Character Species|Character Origins|Feats|Equipment)$/,
    at + 1,
  );
  const stop = end > at ? end : Math.min(at + 300, lines.length);

  const features = [];
  let current = null;
  for (let i = after; i < stop; i++) {
    const line = lines[i];
    if (isPageFurniture(line)) continue;
    const head = line.match(/^Level (\d+): (.+)$/);
    if (head) {
      current = { level: Number(head[1]), name: head[2].trim(), text: "" };
      features.push(current);
      continue;
    }
    if (current && line.trim()) current.text += " " + line.trim();
  }

  return {
    name: dehyphenate(name),
    features: features.map((f) => ({ ...f, text: dehyphenate(f.text) })),
  };
}

/**
 * Species entries are laid out as a bare name line, then Creature Type / Size /
 * Speed, then one paragraph per special trait beginning "Trait Name. ".
 */
function parseSpecies() {
  const marks = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^Creature Type: /.test(lines[i]) && /^[A-Z][a-z]+$/.test(lines[i - 1] || "")) {
      marks.push({ name: lines[i - 1], at: i });
    }
  }
  if (!marks.length) return {};

  // The chapter ends at the Feats heading that follows the last species.
  const endOfChapter = findLine(/^Feats$/, marks[marks.length - 1].at);

  const species = {};
  marks.forEach((mark, idx) => {
    const stop = idx + 1 < marks.length ? marks[idx + 1].at - 1 : endOfChapter;
    const block = lines.slice(mark.at, stop < 0 ? mark.at + 60 : stop);

    // Values wrap: Human's Size runs onto a second line. Keep reading until the
    // next labelled line or the sentence that introduces the traits.
    const grab = (label) => {
      const at = block.findIndex((l) => l.startsWith(label + ":"));
      if (at < 0) return "";
      let value = block[at].slice(label.length + 1).trim();
      for (let i = at + 1; i < block.length; i++) {
        const next = block[i];
        if (/^(Creature Type|Size|Speed):/.test(next) || /^As an? /.test(next)) break;
        if (!next.trim()) break;
        value += " " + next.trim();
      }
      return dehyphenate(value);
    };

    // Traits start after the "As a <Species>, you have these special traits."
    // sentence. A new trait begins on a line opening with a short Title Case
    // phrase followed by a full stop.
    const startTraits = block.findIndex((l) => /^As an? .*special traits\.$/.test(l));
    const traits = [];
    for (let i = startTraits < 0 ? 1 : startTraits + 1; i < block.length; i++) {
      const line = block[i];
      const head = line.match(/^([A-Z][A-Za-z']*(?: [A-Z][A-Za-z']*){0,3})\. (.*)$/);
      if (head) {
        traits.push({ name: head[1], text: head[2] });
      } else if (traits.length) {
        traits[traits.length - 1].text += " " + line.trim();
      }
    }

    // A trait name can appear twice when a later paragraph opens by repeating
    // it; keep the fullest description of each.
    const byName = new Map();
    for (const t of traits) {
      const text = dehyphenate(t.text);
      const existing = byName.get(t.name);
      if (!existing || text.length > existing.length) byName.set(t.name, text);
    }

    species[mark.name] = {
      creatureType: grab("Creature Type"),
      size: grab("Size"),
      speed: grab("Speed"),
      traits: [...byName].map(([name, text]) => ({ name, text })),
    };
  });
  return species;
}

/**
 * Page furniture that interrupts spell text and must never be read as content.
 * The footer is often prefixed with a form feed, so trim that first -- missing
 * it is what silently ate Hold Monster's components and duration.
 */
function isPageFurniture(line) {
  const l = line.replace(/\f/g, "").trim();
  return /^System Reference Document/.test(l) || /^\d{1,3}$/.test(l);
}

/**
 * Feats read:
 *   <Name>
 *   Origin Feat                              (category only)
 *   General Feat (Prerequisite: Level 4+)    (category and prerequisite)
 *   <benefit text>
 *
 * The prerequisite wraps often enough that the category line has to be joined
 * until its bracket closes.
 */
function parseFeats() {
  const descAt = findLine(/^Feat Descriptions$/);
  if (descAt < 0) return [];
  const startRaw = findLine(/^Origin Feats$/, descAt);
  if (startRaw < 0) return [];
  const endRaw = findLine(/^Equipment$/, startRaw);

  const text = lines
    .slice(startRaw, endRaw > startRaw ? endRaw : lines.length)
    .filter((l) => !isPageFurniture(l));

  const ANCHOR = /^(Origin|General|Fighting Style|Epic Boon) Feat\b/;
  const HEADING = /^(Origin|General|Fighting Style|Epic Boon) Feats$/;

  const marks = [];
  for (let i = 1; i < text.length; i++) {
    if (HEADING.test(text[i]) || !ANCHOR.test(text[i])) continue;
    marks.push({ nameAt: i - 1, anchorAt: i });
  }

  const feats = [];
  marks.forEach((mark, idx) => {
    const stop = idx + 1 < marks.length ? marks[idx + 1].nameAt : text.length;

    let anchor = text[mark.anchorAt];
    let cursor = mark.anchorAt;
    // Join a wrapped prerequisite until the bracket closes.
    while (anchor.includes("(") && !anchor.includes(")") && cursor + 1 < stop) {
      cursor += 1;
      anchor += " " + text[cursor].trim();
    }

    const m = anchor.match(
      /^(Origin|General|Fighting Style|Epic Boon) Feat(?:\s*\(Prerequisite:\s*([^)]*)\))?/,
    );
    if (!m) return;

    const name = dehyphenate(text[mark.nameAt]);
    if (!name || HEADING.test(name)) return;

    const body = [];
    for (let i = cursor + 1; i < stop; i++) {
      if (text[i].trim()) body.push(text[i].trim());
    }

    feats.push({
      name,
      category: m[1],
      prerequisite: m[2] ? dehyphenate(m[2]) : "",
      text: dehyphenate(body.join(" ")),
    });
  });

  return feats;
}

/**
 * Spell entries run:
 *   <Name>
 *   Level 3 Evocation (Sorcerer, Wizard)   |   Evocation Cantrip (Wizard)
 *   Casting Time: / Range: / Components: / Duration:
 *   <description>
 *
 * The class list wraps onto a second line often enough that the header has to
 * be joined until its bracket closes, and page footers land mid-description.
 */
function parseSpells() {
  const startRaw = findLine(/^Spell Descriptions$/);
  if (startRaw < 0) return [];

  // Bound the chapter. Without this the final spell's description runs to the
  // end of the document and swallows the glossary, traps and all -- the same
  // way an unbounded table row swallowed the rest of a class chapter.
  const endRaw = findLine(/^Rules Glossary$/, startRaw);

  // Strip page furniture once, up front. Leaving it in place means every later
  // step has to dodge it, and one missed check silently swallows a field --
  // that is exactly how Hold Monster lost its Duration.
  const text = lines
    .slice(startRaw + 1, endRaw > startRaw ? endRaw : lines.length)
    .filter((l) => !isPageFurniture(l));

  const HEADER = /^(?:Level (\d) ([A-Za-z]+)|([A-Za-z]+) Cantrip)\s*\(/;
  // "Component:" singular appears a dozen times in the document.
  const FIELD = /^(Casting Time|Range|Components?|Duration):\s*(.*)$/;

  const marks = [];
  for (let i = 0; i < text.length; i++) {
    if (!HEADER.test(text[i])) continue;
    const n = i - 1;
    if (n < 0) continue;
    if (FIELD.test(text[n])) continue;
    marks.push({ headerAt: i, nameAt: n });
  }

  const spells = [];
  marks.forEach((mark, idx) => {
    const stop = idx + 1 < marks.length ? marks[idx + 1].nameAt : text.length;

    // Join the header until the bracket closes.
    let header = text[mark.headerAt];
    let cursor = mark.headerAt;
    while (!header.includes(")") && cursor + 1 < stop) {
      cursor += 1;
      header += " " + text[cursor].trim();
    }

    const m = header.match(
      /^(?:Level (\d) ([A-Za-z]+)|([A-Za-z]+) Cantrip)\s*\(([^)]*)\)/,
    );
    if (!m) return;
    const level = m[1] !== undefined ? Number(m[1]) : 0;
    const school = m[2] ?? m[3] ?? "";
    const classes = m[4]
      .split(/,\s*/)
      .map((s) => dehyphenate(s))
      .filter(Boolean);

    const fields = {};
    let i = cursor + 1;
    for (; i < stop; i++) {
      const f = text[i].match(FIELD);
      if (!f) break;
      // Normalise the singular label so consumers see one key.
      const label = f[1] === "Component" ? "Components" : f[1];
      let value = f[2];
      // Every spell lists Casting Time, Range, Components and Duration in that
      // order, and the description only begins after Duration. So for the first
      // three, any line that isn't a field label must be a continuation --
      // Counterspell's Casting Time runs to three lines, the last starting with
      // a capital, which no cleverer heuristic would catch.
      const joinFreely = label !== "Duration";
      while (i + 1 < stop && !FIELD.test(text[i + 1]) && text[i + 1].trim()) {
        const peek = text[i + 1].trim();
        const bracketOpen =
          (value.match(/\(/g) || []).length > (value.match(/\)/g) || []).length;
        if (joinFreely || /^[a-z(]/.test(peek) || /,$/.test(value) || bracketOpen) {
          value += " " + peek;
          i++;
        } else break;
      }
      fields[label] = dehyphenate(value);
    }

    const body = [];
    for (; i < stop; i++) {
      if (text[i].trim()) body.push(text[i].trim());
    }

    spells.push({
      name: dehyphenate(text[mark.nameAt]),
      level,
      school,
      classes,
      castingTime: fields["Casting Time"] ?? "",
      range: fields["Range"] ?? "",
      components: fields["Components"] ?? "",
      duration: fields["Duration"] ?? "",
      ritual: /\bRitual\b/.test(fields["Casting Time"] ?? ""),
      concentration: /^Concentration/i.test(fields["Duration"] ?? ""),
      text: dehyphenate(body.join(" ")),
    });
  });

  return spells;
}

const out = {
  source: "System Reference Document 5.2 (SRD 5.2), Wizards of the Coast LLC",
  license: "CC-BY-4.0",
  classes: {},
  species: parseSpecies(),
  feats: parseFeats(),
};

const spellData = {
  source: out.source,
  license: out.license,
  spells: parseSpells(),
};

for (const name of CLASSES) {
  out.classes[name] = {
    traits: parseCoreTraits(name),
    levels: parseFeatureTable(name),
    descriptions: parseFeatureDescriptions(name),
    subclass: parseSubclass(name),
  };
}

fs.writeFileSync(outFile, JSON.stringify(out, null, 2));



// Report loudly, so a bad parse is visible instead of silently shipping.
let problems = 0;
for (const name of CLASSES) {
  const c = out.classes[name];
  const levels = c.levels ? c.levels.length : 0;
  const traits = c.traits ? Object.keys(c.traits).length : 0;
  // Empty rows are legitimate: caster levels that grant only spell slots show
  // "--" in the features column. Counted for information, not treated as error.
  const emptyFeatures = (c.levels || []).filter((l) => l.features.length === 0).length;
  // A feature name should never end in something that looks like a table
  // column; if it does, a column bled into the text and the data is wrong.
  const strayDice = (c.levels || []).filter((l) =>
    l.features.some((f) => /(\d+d\d+|[Dd]\d+|\+\d+|\s\d+|ft\.)$/.test(f)),
  ).length;
  // The SRD gives every class exactly one subclass, with features that all
  // carry text. A name with a dot leader means the table of contents was
  // parsed instead of the chapter.
  const sub = c.subclass;
  const subBad =
    !sub ||
    !sub.name ||
    /\.{3}|\d$/.test(sub.name) ||
    !sub.features.length ||
    sub.features.some((f) => !f.text) ||
    // A feature far longer than any real one means the parse ran past the end
    // of the subclass and started eating the next chapter.
    sub.features.some((f) => f.text.length > 4000);
  const okay = levels === 20 && traits >= 6 && strayDice === 0 && !subBad;
  if (!okay) problems++;
  console.log(
    (okay ? "ok    " : "CHECK ") +
      name.padEnd(10) +
      " traits:" + traits +
      " levels:" + levels +
      (emptyFeatures ? " (" + emptyFeatures + " levels grant no feature)" : "") +
      (strayDice ? " strayDice:" + strayDice : "") +
      (subBad ? " SUBCLASS BAD" : " sub:" + sub.name),
  );
}
console.log(problems === 0 ? "\nall classes parsed cleanly" : "\n" + problems + " need checking");
// Set the code rather than exiting: the spell checks below still have to run,
// and a spell problem must be able to fail the script too.
if (problems > 0) process.exitCode = 1;

// Spells go in their own file: they're the bulk of the data and most sessions
// never open them, so they load separately.
const spellFile = outFile.replace(/classes\.json$/, "spells.json");
fs.writeFileSync(spellFile, JSON.stringify(spellData, null, 2));

const spellProblems = [];
for (const s of spellData.spells) {
  const missing = !s.name || !s.school || !s.classes.length || !s.castingTime ||
    !s.range || !s.components || !s.duration || !s.text;
  if (missing) spellProblems.push(s.name + ": missing a field");
  // A description far longer than any real spell means the parse ran past the
  // end of the entry and started eating the next section.
  if (s.text.length > 8000) spellProblems.push(s.name + ": text ran away (" + s.text.length + " chars)");
  if (/(Casting Time|Range|Components?|Duration):/.test(s.text)) {
    spellProblems.push(s.name + ": a field label leaked into the description");
  }
}
console.log("\nspells: " + spellData.spells.length + " parsed");
if (spellProblems.length) {
  console.log(spellProblems.length + " problems:");
  for (const p of spellProblems.slice(0, 12)) console.log("  " + p);
  process.exitCode = 1;
} else {
  console.log("all spells parsed cleanly");
}
