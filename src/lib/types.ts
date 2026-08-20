// Core data model for a 5e character. Everything the app stores lives here.
// Derived numbers are NOT stored -- they're computed in rules.ts from these
// inputs, so changing CON ripples out to HP, saves, and concentration on its own.

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export const ABILITIES: { key: AbilityKey; name: string; abbr: string }[] = [
  { key: "str", name: "Strength", abbr: "STR" },
  { key: "dex", name: "Dexterity", abbr: "DEX" },
  { key: "con", name: "Constitution", abbr: "CON" },
  { key: "int", name: "Intelligence", abbr: "INT" },
  { key: "wis", name: "Wisdom", abbr: "WIS" },
  { key: "cha", name: "Charisma", abbr: "CHA" },
];

/** How trained the character is in a skill or save. */
export type ProfLevel = "none" | "half" | "prof" | "expertise";

export const PROF_CYCLE: ProfLevel[] = ["none", "prof", "expertise", "half"];

export const PROF_LABEL: Record<ProfLevel, string> = {
  none: "untrained",
  half: "half proficiency",
  prof: "proficient",
  expertise: "expertise",
};

export type SkillKey =
  | "acrobatics"
  | "animalHandling"
  | "arcana"
  | "athletics"
  | "deception"
  | "history"
  | "insight"
  | "intimidation"
  | "investigation"
  | "medicine"
  | "nature"
  | "perception"
  | "performance"
  | "persuasion"
  | "religion"
  | "sleightOfHand"
  | "stealth"
  | "survival";

export const SKILLS: { key: SkillKey; name: string; ability: AbilityKey }[] = [
  { key: "acrobatics", name: "Acrobatics", ability: "dex" },
  { key: "animalHandling", name: "Animal Handling", ability: "wis" },
  { key: "arcana", name: "Arcana", ability: "int" },
  { key: "athletics", name: "Athletics", ability: "str" },
  { key: "deception", name: "Deception", ability: "cha" },
  { key: "history", name: "History", ability: "int" },
  { key: "insight", name: "Insight", ability: "wis" },
  { key: "intimidation", name: "Intimidation", ability: "cha" },
  { key: "investigation", name: "Investigation", ability: "int" },
  { key: "medicine", name: "Medicine", ability: "wis" },
  { key: "nature", name: "Nature", ability: "int" },
  { key: "perception", name: "Perception", ability: "wis" },
  { key: "performance", name: "Performance", ability: "cha" },
  { key: "persuasion", name: "Persuasion", ability: "cha" },
  { key: "religion", name: "Religion", ability: "int" },
  { key: "sleightOfHand", name: "Sleight of Hand", ability: "dex" },
  { key: "stealth", name: "Stealth", ability: "dex" },
  { key: "survival", name: "Survival", ability: "wis" },
];

/** Which ability powers an attack. "finesse" takes the better of STR and DEX. */
export type AttackAbility = AbilityKey | "finesse" | "none";

export interface Attack {
  id: string;
  name: string;
  ability: AttackAbility;
  proficient: boolean;
  atkMisc: number;
  damageDice: string;
  damageAbility: AttackAbility;
  damageMisc: number;
  damageType: string;
  notes: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  qty: number;
  weight: number;
  equipped: boolean;
  notes: string;
}

export interface SpellEntry {
  id: string;
  name: string;
  level: number; // 0 = cantrip
  prepared: boolean;
  alwaysPrepared: boolean;
  concentration: boolean;
  ritual: boolean;
  notes: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  body: string;
}

/**
 * One class feature, racial trait, or feat. The name and a short note show on
 * the collapsed row; the long rules text lives in `detail` behind a tap.
 */
export interface FeatureEntry {
  id: string;
  name: string;
  note: string;
  detail: string;
}

/** A "Armor: light, medium" style line in the proficiencies panel. */
export interface ProficiencyGroup {
  id: string;
  label: string;
  value: string;
}

export const DEFAULT_PROFICIENCY_LABELS = [
  "Armor",
  "Weapons",
  "Tools",
  "Languages",
];

export interface HitDiceGroup {
  id: string;
  die: number; // 6, 8, 10, 12
  total: number;
  used: number;
}

export interface SpellSlot {
  total: number;
  used: number;
}

/** How AC gets calculated. Covers the common cases without a gear database. */
export type AcMode =
  | "manual"
  | "unarmored"
  | "armor"
  | "unarmoredCon"
  | "unarmoredWis";

export const AC_MODE_LABEL: Record<AcMode, string> = {
  unarmored: "Unarmored (10 + DEX)",
  armor: "Wearing armor",
  unarmoredCon: "Unarmored Defense (10 + DEX + CON)",
  unarmoredWis: "Unarmored Defense (10 + DEX + WIS)",
  manual: "Set by hand",
};

export interface Character {
  id: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;

  // Identity
  name: string;
  playerName: string;
  classText: string; // free text, e.g. "Fighter 3 / Rogue 2"
  level: number;
  race: string;
  background: string;
  alignment: string;
  xp: number;

  // Abilities
  abilities: Record<AbilityKey, number>;
  saveProf: Record<AbilityKey, boolean>;
  saveMisc: Record<AbilityKey, number>;

  // Skills
  skillProf: Record<SkillKey, ProfLevel>;
  skillMisc: Record<SkillKey, number>;
  jackOfAllTrades: boolean;

  // Combat
  acMode: AcMode;
  armorBase: number;
  armorMaxDex: number | null; // null = no cap (light armor)
  shieldBonus: number;
  acMisc: number;
  acManual: number;
  speed: number;
  initiativeMisc: number;

  hpMax: number;
  hpMaxMisc: number; // added on top of the entered max, e.g. Tough feat
  hpCurrent: number;
  hpTemp: number;
  hitDice: HitDiceGroup[];
  deathSuccesses: number;
  deathFailures: number;

  inspiration: boolean;
  exhaustion: number;
  conditions: string;

  attacks: Attack[];

  // Spellcasting
  casterAbility: AbilityKey | "none";
  spellAtkMisc: number;
  spellDcMisc: number;
  preparedMax: number;
  slots: Record<number, SpellSlot>; // 1..9
  pactSlotLevel: number;
  pactSlots: SpellSlot;
  spells: SpellEntry[];
  spellNotes: string;

  // Gear
  inventory: InventoryItem[];
  currency: { cp: number; sp: number; ep: number; gp: number; pp: number };
  countCoinWeight: boolean;
  useVariantEncumbrance: boolean;
  treasure: string;
  carryMisc: number; // e.g. Powerful Build doubles capacity -- add the difference

  // Text blocks
  features: FeatureEntry[];
  proficiencies: ProficiencyGroup[];
  personality: string;
  ideals: string;
  bonds: string;
  flaws: string;
  appearance: string;
  backstory: string;
  notes: string;
  journal: JournalEntry[];

  /**
   * Manual overrides for computed fields, keyed by stat id (e.g. "save.dex",
   * "skill.stealth", "ac", "initiative"). A number wins over the calculation;
   * absent or null means "let the sheet do the math".
   */
  overrides: Record<string, number | null>;
}

export const SCHEMA_VERSION = 1;

let idCounter = 0;
export function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  idCounter += 1;
  return `id-${Date.now()}-${idCounter}`;
}

function zeroAbilities<T>(value: T): Record<AbilityKey, T> {
  return ABILITIES.reduce(
    (acc, a) => ({ ...acc, [a.key]: value }),
    {} as Record<AbilityKey, T>,
  );
}

function zeroSkills<T>(value: T): Record<SkillKey, T> {
  return SKILLS.reduce(
    (acc, s) => ({ ...acc, [s.key]: value }),
    {} as Record<SkillKey, T>,
  );
}

export function emptySlots(): Record<number, SpellSlot> {
  const out: Record<number, SpellSlot> = {};
  for (let i = 1; i <= 9; i++) out[i] = { total: 0, used: 0 };
  return out;
}

export function createCharacter(name = "New Character"): Character {
  const now = new Date().toISOString();
  return {
    id: newId(),
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,

    name,
    playerName: "",
    classText: "",
    level: 1,
    race: "",
    background: "",
    alignment: "",
    xp: 0,

    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saveProf: zeroAbilities(false),
    saveMisc: zeroAbilities(0),

    skillProf: zeroSkills<ProfLevel>("none"),
    skillMisc: zeroSkills(0),
    jackOfAllTrades: false,

    acMode: "unarmored",
    armorBase: 10,
    armorMaxDex: 2,
    shieldBonus: 0,
    acMisc: 0,
    acManual: 10,
    speed: 30,
    initiativeMisc: 0,

    hpMax: 8,
    hpMaxMisc: 0,
    hpCurrent: 8,
    hpTemp: 0,
    hitDice: [{ id: newId(), die: 8, total: 1, used: 0 }],
    deathSuccesses: 0,
    deathFailures: 0,

    inspiration: false,
    exhaustion: 0,
    conditions: "",

    attacks: [],

    casterAbility: "none",
    spellAtkMisc: 0,
    spellDcMisc: 0,
    preparedMax: 0,
    slots: emptySlots(),
    pactSlotLevel: 0,
    pactSlots: { total: 0, used: 0 },
    spells: [],
    spellNotes: "",

    inventory: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    countCoinWeight: false,
    useVariantEncumbrance: false,
    treasure: "",
    carryMisc: 0,

    features: [],
    proficiencies: DEFAULT_PROFICIENCY_LABELS.map((label) => ({
      id: newId(),
      label,
      value: "",
    })),
    personality: "",
    ideals: "",
    bonds: "",
    flaws: "",
    appearance: "",
    backstory: "",
    notes: "",
    journal: [],

    overrides: {},
  };
}

/**
 * Fills in anything missing from an imported or older-format character so a
 * file saved by a previous version never crashes the sheet.
 */
export function migrateCharacter(raw: unknown): Character {
  const base = createCharacter();
  if (!raw || typeof raw !== "object") return base;
  const input = raw as Partial<Character>;

  const merged: Character = {
    ...base,
    ...input,
    id: input.id || base.id,
    schemaVersion: SCHEMA_VERSION,
    abilities: { ...base.abilities, ...(input.abilities || {}) },
    saveProf: { ...base.saveProf, ...(input.saveProf || {}) },
    saveMisc: { ...base.saveMisc, ...(input.saveMisc || {}) },
    skillProf: { ...base.skillProf, ...(input.skillProf || {}) },
    skillMisc: { ...base.skillMisc, ...(input.skillMisc || {}) },
    slots: { ...base.slots, ...(input.slots || {}) },
    pactSlots: { ...base.pactSlots, ...(input.pactSlots || {}) },
    currency: { ...base.currency, ...(input.currency || {}) },
    overrides: { ...(input.overrides || {}) },
    hitDice: Array.isArray(input.hitDice) && input.hitDice.length
      ? input.hitDice
      : base.hitDice,
    attacks: Array.isArray(input.attacks) ? input.attacks : [],
    spells: Array.isArray(input.spells) ? input.spells : [],
    inventory: Array.isArray(input.inventory) ? input.inventory : [],
    journal: Array.isArray(input.journal) ? input.journal : [],
    proficiencies: Array.isArray(input.proficiencies) && input.proficiencies.length
      ? input.proficiencies
      : base.proficiencies,
  };

  // The features field used to be one textarea. Each non-empty line becomes its
  // own entry so nothing is lost and the text stays where the player put it.
  const legacyFeatures = (raw as { features?: unknown }).features;
  if (typeof legacyFeatures === "string") {
    merged.features = legacyFeatures
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ id: newId(), name: line, note: "", detail: "" }));
  } else if (!Array.isArray(input.features)) {
    merged.features = [];
  }

  // Sheets saved before proficiencies became rows kept one free-text blob.
  const legacyText = (raw as { proficienciesText?: unknown }).proficienciesText;
  if (typeof legacyText === "string" && legacyText.trim() && !input.proficiencies) {
    merged.proficiencies = [
      ...base.proficiencies,
      { id: newId(), label: "Other", value: legacyText },
    ];
  }

  return merged;
}
