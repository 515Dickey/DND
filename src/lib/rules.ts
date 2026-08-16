// The 5e math. Every function here is pure: it takes a Character and returns a
// derived number plus a plain-English formula, so the sheet can always show you
// *why* a number is what it is.

import {
  ABILITIES,
  type AbilityKey,
  type AttackAbility,
  type Character,
  type InventoryItem,
  type ProfLevel,
  SKILLS,
  type SkillKey,
} from "./types";

export interface Derived {
  value: number;
  formula: string;
  overridden: boolean;
}

export function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonus(level: number): number {
  const lvl = clamp(level, 1, 20);
  return 2 + Math.floor((lvl - 1) / 4);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function profMultiplier(level: ProfLevel): number {
  switch (level) {
    case "prof":
      return 1;
    case "expertise":
      return 2;
    case "half":
      return 0.5;
    default:
      return 0;
  }
}

/** Applies a manual override if the character has one set for this stat id. */
function withOverride(c: Character, key: string, auto: Derived): Derived {
  const o = c.overrides[key];
  if (typeof o === "number") {
    return { value: o, formula: `set by hand (auto would be ${auto.value})`, overridden: true };
  }
  return auto;
}

export function mod(c: Character, key: AbilityKey): number {
  return abilityMod(c.abilities[key]);
}

/** Resolves an attack's governing ability, handling finesse. */
export function resolveAttackAbility(
  c: Character,
  ability: AttackAbility,
): { key: AbilityKey | null; mod: number; label: string } {
  if (ability === "none") return { key: null, mod: 0, label: "no ability" };
  if (ability === "finesse") {
    const useDex = mod(c, "dex") >= mod(c, "str");
    const key: AbilityKey = useDex ? "dex" : "str";
    return { key, mod: mod(c, key), label: `${useDex ? "DEX" : "STR"} (finesse)` };
  }
  return {
    key: ability,
    mod: mod(c, ability),
    label: ability.toUpperCase(),
  };
}

export function pb(c: Character): Derived {
  const auto: Derived = {
    value: proficiencyBonus(c.level),
    formula: `level ${c.level}`,
    overridden: false,
  };
  return withOverride(c, "pb", auto);
}

export function savingThrow(c: Character, key: AbilityKey): Derived {
  const abbr = key.toUpperCase();
  const m = mod(c, key);
  const bonus = c.saveProf[key] ? pb(c).value : 0;
  const misc = c.saveMisc[key] || 0;
  const parts = [`${abbr} ${signed(m)}`];
  if (bonus) parts.push(`proficiency +${bonus}`);
  if (misc) parts.push(`misc ${signed(misc)}`);
  const auto: Derived = {
    value: m + bonus + misc,
    formula: parts.join("  ·  "),
    overridden: false,
  };
  return withOverride(c, `save.${key}`, auto);
}

export function skillBonus(c: Character, key: SkillKey): Derived {
  const skill = SKILLS.find((s) => s.key === key)!;
  const m = mod(c, skill.ability);
  const level = c.skillProf[key];
  const p = pb(c).value;

  let profPart = Math.floor(profMultiplier(level) * p);
  let profLabel = "";
  if (level === "prof") profLabel = `proficiency +${p}`;
  else if (level === "expertise") profLabel = `expertise +${p * 2}`;
  else if (level === "half") profLabel = `half proficiency +${profPart}`;

  // Jack of All Trades applies half proficiency to skills you aren't already
  // proficient in -- it never stacks with proficiency or expertise.
  if (c.jackOfAllTrades && level === "none") {
    profPart = Math.floor(p / 2);
    profLabel = `jack of all trades +${profPart}`;
  }

  const misc = c.skillMisc[key] || 0;
  const parts = [`${skill.ability.toUpperCase()} ${signed(m)}`];
  if (profLabel) parts.push(profLabel);
  if (misc) parts.push(`misc ${signed(misc)}`);

  const auto: Derived = {
    value: m + profPart + misc,
    formula: parts.join("  ·  "),
    overridden: false,
  };
  return withOverride(c, `skill.${key}`, auto);
}

export function passivePerception(c: Character): Derived {
  const perc = skillBonus(c, "perception");
  const auto: Derived = {
    value: 10 + perc.value,
    formula: `10 + Perception ${signed(perc.value)}`,
    overridden: false,
  };
  return withOverride(c, "passivePerception", auto);
}

export function passiveInvestigation(c: Character): Derived {
  const s = skillBonus(c, "investigation");
  const auto: Derived = {
    value: 10 + s.value,
    formula: `10 + Investigation ${signed(s.value)}`,
    overridden: false,
  };
  return withOverride(c, "passiveInvestigation", auto);
}

export function passiveInsight(c: Character): Derived {
  const s = skillBonus(c, "insight");
  const auto: Derived = {
    value: 10 + s.value,
    formula: `10 + Insight ${signed(s.value)}`,
    overridden: false,
  };
  return withOverride(c, "passiveInsight", auto);
}

export function initiative(c: Character): Derived {
  const d = mod(c, "dex");
  const misc = c.initiativeMisc || 0;
  const parts = [`DEX ${signed(d)}`];
  if (misc) parts.push(`misc ${signed(misc)}`);
  const auto: Derived = { value: d + misc, formula: parts.join("  ·  "), overridden: false };
  return withOverride(c, "initiative", auto);
}

export function armorClass(c: Character): Derived {
  const dex = mod(c, "dex");
  let base = 10;
  let parts: string[] = [];

  switch (c.acMode) {
    case "manual":
      return {
        value: c.acManual + c.shieldBonus + c.acMisc,
        formula: [
          `${c.acManual} entered`,
          c.shieldBonus ? `shield +${c.shieldBonus}` : "",
          c.acMisc ? `misc ${signed(c.acMisc)}` : "",
        ]
          .filter(Boolean)
          .join("  ·  "),
        overridden: false,
      };
    case "armor": {
      const cappedDex =
        c.armorMaxDex === null ? dex : Math.min(dex, c.armorMaxDex);
      base = c.armorBase + cappedDex;
      parts = [`armor ${c.armorBase}`];
      if (c.armorMaxDex === null) parts.push(`DEX ${signed(dex)}`);
      else if (c.armorMaxDex === 0) parts.push("no DEX");
      else parts.push(`DEX ${signed(cappedDex)} (max +${c.armorMaxDex})`);
      break;
    }
    case "unarmoredCon":
      base = 10 + dex + mod(c, "con");
      parts = [`10`, `DEX ${signed(dex)}`, `CON ${signed(mod(c, "con"))}`];
      break;
    case "unarmoredWis":
      base = 10 + dex + mod(c, "wis");
      parts = [`10`, `DEX ${signed(dex)}`, `WIS ${signed(mod(c, "wis"))}`];
      break;
    default:
      base = 10 + dex;
      parts = [`10`, `DEX ${signed(dex)}`];
  }

  if (c.shieldBonus) parts.push(`shield +${c.shieldBonus}`);
  if (c.acMisc) parts.push(`misc ${signed(c.acMisc)}`);

  const auto: Derived = {
    value: base + c.shieldBonus + c.acMisc,
    formula: parts.join("  ·  "),
    overridden: false,
  };
  return withOverride(c, "ac", auto);
}

export function maxHp(c: Character): Derived {
  const conBonus = 0; // The entered max already includes CON per level in 5e.
  const auto: Derived = {
    value: c.hpMax + c.hpMaxMisc + conBonus,
    formula: c.hpMaxMisc
      ? `${c.hpMax} rolled/fixed  ·  bonus ${signed(c.hpMaxMisc)}`
      : `${c.hpMax} entered`,
    overridden: false,
  };
  return withOverride(c, "hpMax", auto);
}

export function spellAttackBonus(c: Character): Derived {
  if (c.casterAbility === "none") {
    return { value: 0, formula: "no spellcasting ability set", overridden: false };
  }
  const m = mod(c, c.casterAbility);
  const p = pb(c).value;
  const parts = [`${c.casterAbility.toUpperCase()} ${signed(m)}`, `proficiency +${p}`];
  if (c.spellAtkMisc) parts.push(`misc ${signed(c.spellAtkMisc)}`);
  const auto: Derived = {
    value: m + p + c.spellAtkMisc,
    formula: parts.join("  ·  "),
    overridden: false,
  };
  return withOverride(c, "spellAtk", auto);
}

export function spellSaveDc(c: Character): Derived {
  if (c.casterAbility === "none") {
    return { value: 0, formula: "no spellcasting ability set", overridden: false };
  }
  const m = mod(c, c.casterAbility);
  const p = pb(c).value;
  const parts = ["8", `${c.casterAbility.toUpperCase()} ${signed(m)}`, `proficiency +${p}`];
  if (c.spellDcMisc) parts.push(`misc ${signed(c.spellDcMisc)}`);
  const auto: Derived = {
    value: 8 + m + p + c.spellDcMisc,
    formula: parts.join("  ·  "),
    overridden: false,
  };
  return withOverride(c, "spellDc", auto);
}

export function attackBonus(c: Character, attackId: string): Derived {
  const atk = c.attacks.find((a) => a.id === attackId);
  if (!atk) return { value: 0, formula: "", overridden: false };
  const res = resolveAttackAbility(c, atk.ability);
  const p = atk.proficient ? pb(c).value : 0;
  const parts: string[] = [];
  if (res.key) parts.push(`${res.label} ${signed(res.mod)}`);
  if (p) parts.push(`proficiency +${p}`);
  if (atk.atkMisc) parts.push(`misc ${signed(atk.atkMisc)}`);
  return {
    value: res.mod + p + atk.atkMisc,
    formula: parts.join("  ·  ") || "no modifiers",
    overridden: false,
  };
}

export function damageString(c: Character, attackId: string): string {
  const atk = c.attacks.find((a) => a.id === attackId);
  if (!atk) return "";
  const res = resolveAttackAbility(c, atk.damageAbility);
  const bonus = res.mod + atk.damageMisc;
  const dice = atk.damageDice.trim();
  let out = dice || "—";
  if (bonus !== 0) out += ` ${signed(bonus)}`;
  if (atk.damageType.trim()) out += ` ${atk.damageType.trim()}`;
  return out;
}

// --- Carrying capacity ---------------------------------------------------

export const COINS_PER_POUND = 50;

export function inventoryWeight(c: Character): number {
  const gear = c.inventory.reduce(
    (sum: number, i: InventoryItem) => sum + (i.weight || 0) * (i.qty || 0),
    0,
  );
  if (!c.countCoinWeight) return round2(gear);
  const coins =
    c.currency.cp + c.currency.sp + c.currency.ep + c.currency.gp + c.currency.pp;
  return round2(gear + coins / COINS_PER_POUND);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface CarryInfo {
  weight: number;
  capacity: number;
  pushDragLift: number;
  encumberedAt: number;
  heavilyEncumberedAt: number;
  /** "none" | "encumbered" | "heavy" | "overloaded" */
  status: "none" | "encumbered" | "heavy" | "overloaded";
  statusLabel: string;
  effect: string;
  percent: number;
}

export function carryInfo(c: Character): CarryInfo {
  const str = c.abilities.str;
  const capacity = str * 15 + c.carryMisc;
  const weight = inventoryWeight(c);
  const encumberedAt = str * 5;
  const heavilyEncumberedAt = str * 10;

  let status: CarryInfo["status"] = "none";
  let statusLabel = "Unencumbered";
  let effect = "";

  if (weight > capacity) {
    status = "overloaded";
    statusLabel = "Over capacity";
    effect = "You cannot carry this much — drop something or drag it.";
  } else if (c.useVariantEncumbrance && weight > heavilyEncumberedAt) {
    status = "heavy";
    statusLabel = "Heavily encumbered";
    effect =
      "Speed −20 ft, and disadvantage on attacks, ability checks, and saves using STR, DEX, or CON.";
  } else if (c.useVariantEncumbrance && weight > encumberedAt) {
    status = "encumbered";
    statusLabel = "Encumbered";
    effect = "Speed −10 ft.";
  }

  return {
    weight,
    capacity,
    pushDragLift: str * 30 + c.carryMisc * 2,
    encumberedAt,
    heavilyEncumberedAt,
    status,
    statusLabel,
    effect,
    percent: capacity > 0 ? Math.min(100, (weight / capacity) * 100) : 0,
  };
}

/** Speed after encumbrance and exhaustion. */
export function effectiveSpeed(c: Character): Derived {
  const carry = carryInfo(c);
  let speed = c.speed;
  const parts = [`base ${c.speed} ft`];

  if (carry.status === "heavy") {
    speed -= 20;
    parts.push("heavily encumbered −20");
  } else if (carry.status === "encumbered") {
    speed -= 10;
    parts.push("encumbered −10");
  }

  if (c.exhaustion >= 5) {
    speed = 0;
    parts.push("exhaustion 5: speed 0");
  } else if (c.exhaustion >= 2) {
    speed = Math.floor(speed / 2);
    parts.push("exhaustion 2: speed halved");
  }

  const auto: Derived = {
    value: Math.max(0, speed),
    formula: parts.join("  ·  "),
    overridden: false,
  };
  return withOverride(c, "speed", auto);
}

// --- Money ---------------------------------------------------------------

/** Total wealth expressed in gold pieces. */
export function totalGp(c: Character): number {
  const { cp, sp, ep, gp, pp } = c.currency;
  return round2(cp / 100 + sp / 10 + ep / 2 + gp + pp * 10);
}

// --- Health state --------------------------------------------------------

export type HealthState = "healthy" | "bloodied" | "down" | "dead";

export function healthState(c: Character): { state: HealthState; label: string } {
  const max = maxHp(c).value;
  if (c.deathFailures >= 3) return { state: "dead", label: "Dead" };
  if (c.hpCurrent <= 0) return { state: "down", label: "Unconscious & dying" };
  if (max > 0 && c.hpCurrent <= max / 2) return { state: "bloodied", label: "Bloodied" };
  return { state: "healthy", label: "Steady" };
}

export const EXHAUSTION_EFFECTS = [
  "No effect.",
  "Disadvantage on ability checks.",
  "Speed halved.",
  "Disadvantage on attack rolls and saving throws.",
  "Hit point maximum halved.",
  "Speed reduced to 0.",
  "Death.",
];

/** A quick sanity summary shown on the character list. */
export function characterSummary(c: Character): string {
  const bits = [c.race, c.classText].filter(Boolean);
  const label = bits.length ? bits.join(" · ") : "Unfinished character";
  return `Level ${c.level} — ${label}`;
}

export function abilityLine(c: Character): string {
  return ABILITIES.map((a) => `${a.abbr} ${c.abilities[a.key]}`).join("  ");
}
