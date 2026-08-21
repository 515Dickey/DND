// Reads the generated SRD 5.2 data and turns a class or species choice into
// sheet entries.
//
// Two rules shape everything here:
//   1. Applying is additive and repeatable. Entries record where they came
//      from, so re-applying a class replaces only its own rows and never
//      touches anything typed by hand.
//   2. Nothing is locked. Every value written is an ordinary editable field
//      afterwards, because homebrew has to keep working.

import {
  type AbilityKey,
  type Character,
  type FeatureEntry,
  newId,
  type Recharge,
  type SkillKey,
  SKILLS,
  type SpellEntry,
} from "./types";

export interface SrdClassLevel {
  level: number;
  proficiencyBonus: number;
  features: string[];
  columns: string[];
}

export interface SrdSubclassFeature {
  level: number;
  name: string;
  text: string;
}

export interface SrdSubclass {
  name: string;
  features: SrdSubclassFeature[];
}

export interface SrdClass {
  traits: Record<string, string> | null;
  levels: SrdClassLevel[] | null;
  /** The rules text for each feature, keyed by name. */
  descriptions?: Record<string, string>;
  /** The single subclass the SRD publishes for this class. */
  subclass?: SrdSubclass | null;
  /**
   * What this class grants when it isn't your first, from its own "As a
   * Multiclass Character" entry. Notably absent from all twelve: saving throws.
   */
  multiclass?: SrdMulticlass | null;
}

export interface SrdMulticlass {
  /** The rules text, verbatim, so a player can see what they actually get. */
  text: string;
  armor: string[];
  weapons: string[];
}

export interface SrdSpeciesTrait {
  name: string;
  text: string;
}

export interface SrdSpecies {
  creatureType: string;
  size: string;
  speed: string;
  traits: SrdSpeciesTrait[];
}

export interface SrdFeat {
  name: string;
  category: string;
  prerequisite: string;
  text: string;
}

export interface SrdCost {
  amount: number;
  coin: string;
}

export interface SrdWeapon {
  name: string;
  category: string;
  damage: string;
  properties: string;
  mastery: string;
  weight: number | null;
  cost: SrdCost | null;
}

export interface SrdArmor {
  name: string;
  category: string;
  armorClass: string;
  strength: string;
  stealth: string;
  weight: number | null;
  cost: SrdCost | null;
}

export interface SrdGear {
  name: string;
  weight: number | null;
  cost: SrdCost | null;
}

export interface SrdEquipment {
  weapons: SrdWeapon[];
  armor: SrdArmor[];
  gear: SrdGear[];
}

export interface SrdBackground {
  name: string;
  /** Three abilities, one of which takes +2 and another +1 (or +1 each).  */
  abilityScores: string;
  /** May carry a qualifier the feat list doesn't, e.g. "Magic Initiate (Cleric)". */
  feat: string;
  /** Exactly two, named rather than chosen -- so the sheet can tick them. */
  skills: string;
  tool: string;
  equipment: string;
}

export interface SrdData {
  source: string;
  license: string;
  classes: Record<string, SrdClass>;
  species: Record<string, SrdSpecies>;
  feats: SrdFeat[];
  backgrounds: SrdBackground[];
  equipment: SrdEquipment;
}

/**
 * "14 + Dex modifier (max 2)" -> { base: 14, maxDex: 2 }
 * "18" -> { base: 18, maxDex: 0 }        (heavy armour allows no Dex)
 * "11 + Dex modifier" -> { base: 11, maxDex: null }   (null = uncapped)
 * "+2" -> null, because a shield is a bonus rather than a base AC.
 */
export function parseArmorClass(
  ac: string,
): { base: number; maxDex: number | null } | null {
  if (/^\+/.test(ac.trim())) return null;
  const base = ac.match(/^(\d+)/);
  if (!base) return null;
  if (!/Dex/i.test(ac)) return { base: Number(base[1]), maxDex: 0 };
  const cap = ac.match(/max\s*(\d+)/i);
  return { base: Number(base[1]), maxDex: cap ? Number(cap[1]) : null };
}

/** A shield's bonus, e.g. "+2" -> 2. */
export function parseShieldBonus(ac: string): number | null {
  const m = ac.trim().match(/^\+(\d+)$/);
  return m ? Number(m[1]) : null;
}

export function featSource(name: string) {
  return `srd:feat:${name}`;
}

/** Turns a feat into a sheet entry, filed under the Feats section. */
export function toFeatEntry(feat: SrdFeat): FeatureEntry {
  return {
    id: newId(),
    name: feat.name,
    note: feat.prerequisite
      ? `${feat.category} feat · ${feat.prerequisite}`
      : `${feat.category} feat`,
    detail: feat.text,
    usesMax: inferUses(feat.text)?.uses ?? 0,
    usesSpent: 0,
    recharge: inferUses(feat.text)?.recharge ?? "none",
    group: "Feats",
    source: featSource(feat.name),
  };
}

/** The attribution CC-BY-4.0 requires us to show. */
export const SRD_ATTRIBUTION =
  'This work includes material from the System Reference Document 5.2 ("SRD 5.2") ' +
  "by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The " +
  "SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International " +
  "License, available at https://creativecommons.org/licenses/by/4.0/legalcode.";

let cache: SrdData | null = null;

/**
 * Loads the data on demand. It's 80KB of JSON that most sessions never need,
 * so it stays out of the main bundle.
 */
export async function loadSrd(): Promise<SrdData> {
  if (cache) return cache;
  const mod = await import("@/srd/classes.json");
  cache = (mod.default ?? mod) as unknown as SrdData;
  return cache;
}

export interface SrdSpell {
  name: string;
  level: number;
  school: string;
  classes: string[];
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  ritual: boolean;
  concentration: boolean;
  text: string;
}

export interface SrdSpellData {
  source: string;
  license: string;
  spells: SrdSpell[];
}

let spellCache: SrdSpellData | null = null;

/**
 * The spell list is the bulk of the data and most sessions never open it, so it
 * lives in its own chunk and loads only when asked for.
 */
export async function loadSpells(): Promise<SrdSpellData> {
  if (spellCache) return spellCache;
  const mod = await import("@/srd/spells.json");
  spellCache = (mod.default ?? mod) as unknown as SrdSpellData;
  return spellCache;
}

/**
 * Finds spells by name, school, or class, optionally narrowed to one level.
 * Name matches sort first so typing "fire" reaches Fireball before every spell
 * that merely mentions fire.
 */
export function searchSpells(
  data: SrdSpellData,
  query: string,
  opts: { level?: number | null; forClass?: string } = {},
): SrdSpell[] {
  const q = query.trim().toLowerCase();
  const { level = null, forClass } = opts;

  const matches = data.spells.filter((s) => {
    if (level !== null && s.level !== level) return false;
    if (forClass && !s.classes.includes(forClass)) return false;
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.school.toLowerCase().includes(q) ||
      s.classes.some((c) => c.toLowerCase().includes(q))
    );
  });

  if (!q) return matches.sort((a, b) => a.name.localeCompare(b.name));
  return matches.sort((a, b) => {
    const aName = a.name.toLowerCase().startsWith(q) ? 0 : a.name.toLowerCase().includes(q) ? 1 : 2;
    const bName = b.name.toLowerCase().startsWith(q) ? 0 : b.name.toLowerCase().includes(q) ? 1 : 2;
    return aName - bName || a.name.localeCompare(b.name);
  });
}

/** Turns an SRD spell into a sheet entry, ready to drop into the list. */
export function toSpellEntry(spell: SrdSpell): SpellEntry {
  return {
    id: newId(),
    name: spell.name,
    level: spell.level,
    // Cantrips are always available; levelled spells start unprepared.
    prepared: spell.level === 0,
    alwaysPrepared: false,
    concentration: spell.concentration,
    ritual: spell.ritual,
    notes: [spell.range, spell.duration].filter(Boolean).join(" · "),
    school: spell.school,
    castingTime: spell.castingTime,
    range: spell.range,
    components: spell.components,
    duration: spell.duration,
    detail: spell.text,
    source: "srd",
  };
}

/**
 * Counts entries that came from the rules but have no rules text. This happens
 * to characters built before descriptions shipped: the entry is real, its text
 * simply never existed. Nothing else about them is wrong.
 */
export function countMissingText(c: Character): number {
  return c.features.filter(
    (f) => f.source.startsWith("srd:") && !f.detail.trim(),
  ).length;
}

/**
 * Fills in only the missing rules text, leaving names, uses, sections and
 * anything hand-edited exactly as they are. Deliberately surgical: a full
 * re-apply would reset spent uses, which mid-session would be rude.
 */
export function backfillDescriptions(
  c: Character,
  data: SrdData,
): { features: FeatureEntry[]; filled: number } {
  let filled = 0;
  const features = c.features.map((f) => {
    if (!f.source.startsWith("srd:") || f.detail.trim()) return f;

    let text = "";
    if (f.source.startsWith("srd:class:")) {
      const cls = data.classes[f.source.slice("srd:class:".length)];
      if (cls) text = describeFeature(cls, f.name);
    } else if (f.source.startsWith("srd:species:")) {
      const sp = data.species[f.source.slice("srd:species:".length)];
      text = sp?.traits.find((t) => t.name === f.name)?.text ?? "";
    } else if (f.source.startsWith("srd:feat:")) {
      text = data.feats?.find((x) => x.name === f.name)?.text ?? "";
    }

    if (!text) return f;
    filled += 1;
    // Filling the text can also settle the uses, for anything once-per-rest.
    const inferred = f.usesMax === 0 ? inferUses(text) : null;
    return inferred
      ? { ...f, detail: text, usesMax: inferred.uses, recharge: inferred.recharge }
      : { ...f, detail: text };
  });
  return { features, filled };
}

export function classSource(className: string) {
  return `srd:class:${className}`;
}

export function speciesSource(name: string) {
  return `srd:species:${name}`;
}

/** "D10 per Fighter level" -> 10 */
export function hitDieFromTrait(trait: string | undefined): number | null {
  if (!trait) return null;
  const m = trait.match(/[Dd](\d+)/);
  if (!m) return null;
  const die = Number(m[1]);
  return [6, 8, 10, 12].includes(die) ? die : null;
}

/** "Strength and Constitution" -> ["str", "con"] */
export function savesFromTrait(trait: string | undefined): AbilityKey[] {
  if (!trait) return [];
  const names: [string, AbilityKey][] = [
    ["strength", "str"],
    ["dexterity", "dex"],
    ["constitution", "con"],
    ["intelligence", "int"],
    ["wisdom", "wis"],
    ["charisma", "cha"],
  ];
  const lower = trait.toLowerCase();
  return names.filter(([word]) => lower.includes(word)).map(([, key]) => key);
}

/** "Choose 2: Acrobatics, Animal Handling, ... or Survival" -> the skill keys. */
export function skillChoicesFromTrait(trait: string | undefined): {
  choose: number;
  options: SkillKey[];
} {
  if (!trait) return { choose: 0, options: [] };
  const countMatch = trait.match(/Choose\s+(\d+)/i);
  const choose = countMatch ? Number(countMatch[1]) : 0;
  // "Choose any 3 skills" (Bard, Rogue) means every skill is on the table.
  if (/any\s+\d+\s+skills/i.test(trait)) {
    return { choose, options: SKILLS.map((s) => s.key) };
  }
  const lower = trait.toLowerCase();
  const options = SKILLS.filter((s) => lower.includes(s.name.toLowerCase())).map(
    (s) => s.key,
  );
  return { choose, options };
}

/** "Action Surge (one use)" -> { name: "Action Surge", uses: 1 } */
const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
};

export function splitUses(feature: string): { name: string; uses: number } {
  const m = feature.match(/^(.*?)\s*\((one|two|three|four|five)\s+uses?\)$/i);
  if (!m) return { name: feature, uses: 0 };
  return { name: m[1].trim(), uses: WORD_NUMBERS[m[2].toLowerCase()] ?? 0 };
}

/**
 * Features that recharge on a rest, keyed by name. The SRD states this in each
 * feature's prose rather than its table, so this is a small curated map instead
 * of a parse -- and anything absent simply defaults to no automatic reset,
 * which the player can change on the entry itself.
 */
const RECHARGE_BY_FEATURE: Record<string, Recharge> = {
  "Second Wind": "short",
  "Action Surge": "short",
  "Tactical Mind": "short",
  Rage: "long",
  "Bardic Inspiration": "short",
  "Channel Divinity": "short",
  "Wild Shape": "short",
  "Lay On Hands": "long",
  Indomitable: "long",
  "Arcane Recovery": "long",
  "Innate Sorcery": "long",
  "Breath Weapon": "long",
  "Relentless Endurance": "long",
  "Adrenaline Rush": "short",
  "Giant Ancestry": "long",
  Luck: "long",
  Trance: "long",
};

/** Names that describe a choice rather than a feature worth its own row. */
const SKIP_FEATURES = [/^Ability Score Improvement$/i, /^Subclass feature$/i];

/**
 * Some features are once-per-rest and say so only in their prose, never in a
 * table column -- Arcane Recovery, Indomitable, Relentless Endurance. Without
 * this they arrive with a recharge but no uses, so the recharge does nothing
 * and there is no box to tick when you spend them.
 *
 * Both standard phrasings are matched: "can't use it again until you finish a
 * Long Rest" and "can't do so again until...".
 */
const SINGLE_USE =
  /can.?t (?:use (?:it|this [a-z]+)|do so) again until you finish a (Short|Long) Rest/i;

function inferUses(text: string): { uses: number; recharge: Recharge } | null {
  const m = text.match(SINGLE_USE);
  if (!m) return null;
  return { uses: 1, recharge: m[1].toLowerCase() === "short" ? "short" : "long" };
}

/**
 * Some features count their uses in a numbered column of the class table
 * rather than in their own name, and the count grows with level -- Fighter's
 * Second Wind is 2 uses at level 1 and 3 at level 4.
 *
 * Only columns that are genuinely a number of uses are listed. The others are
 * deliberately absent: Fighter's Weapon Mastery column counts weapons, not
 * uses, and Barbarian's Rage Damage is a damage bonus. Getting that wrong would
 * draw use boxes for something that isn't spent.
 *
 * Column indexes verified against the SRD table headers:
 *   Fighter   [Second Wind, Weapon Mastery]
 *   Barbarian [Rages, Rage Damage, Weapon Mastery]
 *   Monk      [Martial Arts, Focus Points, Unarmored Movement]
 */
const USES_COLUMN: Record<string, Record<string, number>> = {
  Fighter: { "Second Wind": 0 },
  Barbarian: { Rage: 0 },
  Monk: { "Monk's Focus": 1 },
};

/**
 * The rules text for a feature. Some table entries carry a qualifier the prose
 * heading doesn't — Warlock's "Mystic Arcanum (level 6 spell)" is described
 * under plain "Mystic Arcanum" — so fall back to the unqualified name.
 */
function describeFeature(cls: SrdClass, name: string): string {
  const byName = cls.descriptions ?? {};
  if (byName[name]) return byName[name];
  const withoutQualifier = name.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return byName[withoutQualifier] ?? "";
}

/**
 * The categories each proficiency row can hold as a bare list, in the order the
 * rules print them. Anything the rules qualify in prose -- the Monk's "Martial
 * weapons that have the Light property" -- is deliberately absent, and left
 * exactly as the book puts it.
 */
const PROF_ORDER: Record<string, string[]> = {
  Weapons: ["Simple", "Martial"],
  Armor: ["Light", "Medium", "Heavy", "Shields", "None"],
};

/**
 * Reads a row's value as a set of known categories, in canonical order, or
 * returns null if it is prose that shouldn't be taken apart.
 */
function asCategories(value: string, label: string): string[] | null {
  const order = PROF_ORDER[label];
  if (!order) return null;
  const parts = value
    .replace(/\b(weapons?|armor|armour)\b/gi, "")
    .split(/,|\band\b/i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  const canon = parts.map((part) =>
    order.find((known) => known.toLowerCase() === part.toLowerCase()),
  );
  if (canon.some((x) => !x)) return null;
  return order.filter((known) => canon.includes(known));
}

/**
 * "Light, Medium, and Heavy armor and Shields" belongs in the Armor row as
 * "Light, Medium, Heavy, Shields" -- the row already says what it holds, so
 * repeating the noun and spelling out the conjunction only costs space.
 * Anything that isn't a plain list of categories comes back untouched.
 */
function tidyProficiency(raw: string, label: string): string {
  const value = raw.trim();
  const cats = asCategories(value, label);
  return cats ? cats.join(", ") : value;
}

/**
 * Merges a grant into a row without ever taking away what's already there.
 *
 * Replacing is right for a first class and wrong for every one after it: a
 * Fighter who picks up a level of Rogue keeps Martial weapons, and overwriting
 * the row with the Rogue's narrower list would quietly disarm them.
 */
function addProficiency(existing: string, addition: string, label: string): string {
  const have = existing.trim();
  const gain = addition.trim();
  if (!gain) return have;
  if (!have) return tidyProficiency(gain, label);

  const a = asCategories(have, label);
  const b = asCategories(gain, label);
  if (a && b) {
    const order = PROF_ORDER[label];
    // "None" is the absence of a proficiency, so anything real displaces it.
    const merged = order.filter(
      (known) => known !== "None" && (a.includes(known) || b.includes(known)),
    );
    return merged.length ? merged.join(", ") : "None";
  }

  // Prose on either side: keep both rather than guess which one wins.
  //
  // Deliberately not a substring test. The Rogue's "Martial weapons that have
  // the Finesse or Light property" contains the word "Martial" while granting
  // far less than it, so asking whether the addition already appears would drop
  // a genuine grant of full Martial weapons on the floor.
  const tidy = tidyProficiency(gain, label);
  return have === tidy ? have : `${have}; ${tidy}`;
}

export interface ApplyResult {
  patch: Partial<Character>;
  summary: string[];
}

/**
 * Works out what choosing this class at this level should write to the sheet.
 * Returns a patch rather than mutating, so the caller stays in control.
 */
export function applyClass(
  c: Character,
  data: SrdData,
  className: string,
  level: number,
  /**
   * True when this is not the character's first class. An additional class
   * grants markedly less: no saving throws at all, and only the handful of
   * proficiencies its own "As a Multiclass Character" entry lists.
   */
  multiclass = false,
): ApplyResult {
  const cls = data.classes[className];
  if (!cls?.traits || !cls.levels) return { patch: {}, summary: [] };

  const summary: string[] = [];
  const src = classSource(className);
  const patch: Partial<Character> = {};

  // Hit dice: one pool at this class's die, sized to the level. Pools for other
  // dice survive so multiclassing isn't wiped, except an untouched starter pool
  // -- otherwise every new character keeps a stray 1d8 next to its real dice.
  const die = hitDieFromTrait(cls.traits["Hit Point Die"]);
  if (die) {
    const others = c.hitDice.filter(
      (g) =>
        g.die !== die &&
        // Discarding an untouched single die clears the starter pool a new
        // character begins with -- but only for a first class. Once another
        // class is on the sheet every pool is one somebody earned, including a
        // level 1 Fighter's lone d10, and dropping it steals a hit die.
        (multiclass || !(g.total <= 1 && g.used === 0)),
    );
    patch.hitDice = [...others, { id: newId(), die, total: level, used: 0 }];
    summary.push(`Hit dice ${level}d${die}`);
  }

  // Saving throws come from your first class and no other. Every one of the
  // twelve says so: not one "As a Multiclass Character" entry grants a save.
  if (multiclass) {
    summary.push("No saves (only a first class grants them)");
  } else {
    const saves = savesFromTrait(cls.traits["Saving Throw Proficiencies"]);
    if (saves.length) {
      const saveProf = { ...c.saveProf };
      for (const key of saves) saveProf[key] = true;
      patch.saveProf = saveProf;
      summary.push(`Saves ${saves.map((s) => s.toUpperCase()).join(", ")}`);
    }
  }

  // Proficiencies go into the rows the sheet already has -- Armor, Weapons,
  // Tools -- rather than adding class-prefixed rows beside them. Legacy rows
  // from when it did that are dropped on the way through.
  const profRows = c.proficiencies.filter(
    (p) => !p.label.toLowerCase().startsWith(className.toLowerCase() + " "),
  );
  const filled: string[] = [];
  const putProf = (label: string, raw: string) => {
    if (!raw.trim()) return;
    // Tolerate a label the player has punctuated themselves, e.g. "Armor:".
    const key = (s: string) => s.trim().replace(/:$/, "").toLowerCase();
    const idx = profRows.findIndex((p) => key(p.label) === key(label));
    const before = idx >= 0 ? profRows[idx].value : "";
    // A first class sets the row; every class after it can only add to it.
    const value = multiclass
      ? addProficiency(before, raw, label)
      : tidyProficiency(raw, label);
    if (!value || value === before) return;
    if (idx >= 0) profRows[idx] = { ...profRows[idx], value };
    else profRows.push({ id: newId(), label, value });
    filled.push(label);
  };

  if (multiclass) {
    // Only what the multiclass entry grants, which is a good deal less than the
    // core traits table. Its skills and tools are "one of your choice", so they
    // stay in the note for the player to pick rather than being filled in.
    putProf("Weapons", (cls.multiclass?.weapons ?? []).join(", "));
    putProf("Armor", (cls.multiclass?.armor ?? []).join(", "));
  } else {
    putProf("Weapons", cls.traits["Weapon Proficiencies"] ?? "");
    putProf("Armor", cls.traits["Armor Training"] ?? "");
    putProf("Tools", cls.traits["Tool Proficiencies"] ?? "");
  }
  if (filled.length) summary.push(`${filled.join(", ")} proficiencies`);
  patch.proficiencies = profRows;

  // Features up to this level, replacing any previously generated for it.
  const kept = c.features.filter((f) => f.source !== src);
  const added: FeatureEntry[] = [];
  for (const row of cls.levels.filter((l) => l.level <= level)) {
    for (const raw of row.features) {
      if (SKIP_FEATURES.some((re) => re.test(raw))) continue;
      const { name, uses } = splitUses(raw);
      // A later level restating a feature (Action Surge two uses) updates it.
      const existing = added.find((f) => f.name === name);
      if (existing) {
        if (uses) existing.usesMax = uses;
        existing.note = `${className} ${row.level}`;
        continue;
      }
      added.push({
        id: newId(),
        name,
        note: `${className} ${row.level}`,
        detail: describeFeature(cls, name),
        usesMax: uses,
        usesSpent: 0,
        recharge: RECHARGE_BY_FEATURE[name] ?? "none",
        group: name.endsWith("Subclass") ? "Subclass" : "Class",
        source: src,
      });
    }
  }
  // Fill in uses that the table counts in a column, read at the actual level.
  const columnMap = USES_COLUMN[className];
  const rowAtLevel = cls.levels.find((l) => l.level === level);
  if (columnMap && rowAtLevel) {
    for (const entry of added) {
      const idx = columnMap[entry.name];
      if (idx === undefined) continue;
      const raw = rowAtLevel.columns[idx];
      const count = Number(raw);
      if (Number.isFinite(count) && count > 0) entry.usesMax = count;
    }
  }

  // Anything still showing no uses may say "once per rest" in its own text.
  for (const entry of added) {
    if (entry.usesMax > 0) continue;
    const inferred = inferUses(entry.detail);
    if (!inferred) continue;
    entry.usesMax = inferred.uses;
    entry.recharge = inferred.recharge;
  }

  patch.features = [...kept, ...added];
  if (added.length) summary.push(`${added.length} class features`);

  // Features from other classes are deliberately left in place, so applying a
  // second class multiclasses rather than wiping the first. That does mean the
  // sheet can no longer describe the character in one line, so rather than
  // overwrite "Class & level" with a half-truth it says so and leaves it alone.
  const otherClasses = new Set(
    c.features
      .filter((f) => f.source.startsWith("srd:class:") && f.source !== src)
      .map((f) => f.source.slice("srd:class:".length)),
  );
  if (otherClasses.size === 0) {
    patch.classText = `${className} ${level}`;
    patch.level = level;
  } else {
    summary.push(
      `kept ${[...otherClasses].join(" and ")} — set Class & level yourself`,
    );
  }

  return { patch, summary };
}

export function subclassSource(name: string) {
  return `srd:subclass:${name}`;
}

/**
 * Adds the subclass features earned by this level. Kept separate from
 * applyClass because the choice is separate: you pick a subclass at level 3,
 * and the SRD only publishes one per class, so this is opt-in rather than
 * something a class application should assume.
 */
export function applySubclass(
  c: Character,
  data: SrdData,
  className: string,
  level: number,
): ApplyResult {
  const sub = data.classes[className]?.subclass;
  if (!sub) return { patch: {}, summary: [] };

  const src = subclassSource(sub.name);
  const kept = c.features.filter((f) => f.source !== src);
  const earned = sub.features.filter((f) => f.level <= level);

  const added: FeatureEntry[] = earned.map((f) => {
    const inferred = inferUses(f.text);
    return {
      id: newId(),
      name: f.name,
      note: `${sub.name} ${f.level}`,
      detail: f.text,
      usesMax: inferred?.uses ?? 0,
      usesSpent: 0,
      recharge: inferred?.recharge ?? RECHARGE_BY_FEATURE[f.name] ?? "none",
      group: "Subclass",
      source: src,
    };
  });

  const summary = [
    `${added.length} of ${sub.features.length} ${sub.name} features`,
  ];
  if (earned.length < sub.features.length) {
    const next = sub.features.find((f) => f.level > level);
    if (next) summary.push(`next at level ${next.level}`);
  }

  return { patch: { features: [...kept, ...added], subclass: sub.name }, summary };
}

/** "30 feet" -> 30 */
export function backgroundSource(name: string) {
  return `srd:background:${name}`;
}

/**
 * A background's two skills are *named*, not chosen from a list, so unlike a
 * class's skills these can be ticked outright. Everything the rules leave as a
 * choice -- which ability gets the +2, which equipment package -- is reported
 * instead, for the player to settle.
 */
export function applyBackground(
  c: Character,
  data: SrdData,
  name: string,
): ApplyResult {
  const bg = data.backgrounds?.find((b) => b.name === name);
  if (!bg) return { patch: {}, summary: [] };

  const summary: string[] = [];
  const src = backgroundSource(name);
  const patch: Partial<Character> = { background: name };

  // "Sleight of Hand and Stealth" -> the two skill keys.
  const named = bg.skills
    .split(/\band\b|,/i)
    .map((s) => s.trim())
    .filter(Boolean);
  const keys = named
    .map((n) => SKILLS.find((s) => s.name.toLowerCase() === n.toLowerCase())?.key)
    .filter((k): k is SkillKey => Boolean(k));
  if (keys.length) {
    const skillProf = { ...c.skillProf };
    for (const key of keys) {
      // Never demote: expertise from elsewhere outranks a background's
      // proficiency, and re-applying must not undo it.
      if (skillProf[key] !== "expertise") skillProf[key] = "prof";
    }
    patch.skillProf = skillProf;
    summary.push(`${named.join(", ")} proficient`);
  }
  if (keys.length !== named.length) {
    summary.push(`couldn't match ${named.length - keys.length} skill name`);
  }

  // The tool is named too, so it goes in the Tools row alongside anything a
  // class put there.
  if (bg.tool) {
    const rows = [...c.proficiencies];
    const idx = rows.findIndex(
      (p) => p.label.trim().replace(/:$/, "").toLowerCase() === "tools",
    );
    const value = idx >= 0 ? addProficiency(rows[idx].value, bg.tool, "Tools") : bg.tool;
    if (idx >= 0) rows[idx] = { ...rows[idx], value };
    else rows.push({ id: newId(), label: "Tools", value });
    patch.proficiencies = rows;
  }

  // The origin feat. Its full name may carry a qualifier the feat list doesn't
  // ("Magic Initiate (Cleric)"), so match on the base name and keep the
  // qualifier in the note where the player can see which one they took.
  const base = bg.feat.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const feat = data.feats.find((f) => f.name === base);
  const kept = c.features.filter((f) => f.source !== src);
  if (feat) {
    kept.push({
      ...toFeatEntry(feat),
      name: bg.feat,
      note: `${name} background`,
      source: src,
    });
    summary.push(bg.feat);
  } else if (bg.feat) {
    kept.push({
      id: newId(),
      name: bg.feat,
      note: `${name} background`,
      detail: "",
      usesMax: 0,
      usesSpent: 0,
      recharge: "none",
      group: "Feats",
      source: src,
    });
    summary.push(`${bg.feat} (no rules text in the SRD)`);
  }
  patch.features = kept;

  return { patch, summary };
}

export function speedFromTrait(speed: string | undefined): number | null {
  if (!speed) return null;
  const m = speed.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/** "Medium (about 5-7 feet tall)" -> "Medium" */
export function sizeFromTrait(size: string | undefined): string {
  if (!size) return "";
  const m = size.match(/^(Tiny|Small|Medium|Large|Huge|Gargantuan)/);
  return m ? m[1] : "";
}

export function applySpecies(
  c: Character,
  data: SrdData,
  name: string,
): ApplyResult {
  const sp = data.species[name];
  if (!sp) return { patch: {}, summary: [] };

  const summary: string[] = [];
  const src = speciesSource(name);
  const patch: Partial<Character> = { race: name };

  const speed = speedFromTrait(sp.speed);
  if (speed) {
    patch.speed = speed;
    summary.push(`Speed ${speed} ft`);
  }
  const size = sizeFromTrait(sp.size);
  if (size) {
    patch.size = size;
    summary.push(`Size ${size}`);
  }

  const kept = c.features.filter((f) => f.source !== src);
  const added: FeatureEntry[] = sp.traits.map((t) => ({
    id: newId(),
    name: t.name,
    note: name,
    detail: t.text,
    usesMax: inferUses(t.text)?.uses ?? 0,
    usesSpent: 0,
    recharge:
      inferUses(t.text)?.recharge ?? RECHARGE_BY_FEATURE[t.name] ?? "none",
    group: "Species",
    source: src,
  }));
  patch.features = [...kept, ...added];
  if (added.length) summary.push(`${added.length} species traits`);

  return { patch, summary };
}
