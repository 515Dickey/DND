"use client";

import { useRef, useState } from "react";
import {
  ABILITIES,
  type AbilityKey,
  newId,
  PROF_CYCLE,
  PROF_LABEL,
  type ProfLevel,
  SKILLS,
  type SkillKey,
} from "@/lib/types";

/** Placeholder examples for the categories every sheet starts with. */
const PROFICIENCY_HINTS: Record<string, string> = {
  Armor: "light, medium, shields",
  Weapons: "simple, martial",
  Tools: "thieves' tools, smith's tools",
  Languages: "Common, Elvish, Dwarvish",
};
import {
  abilityMod,
  passiveInsight,
  passiveInvestigation,
  passivePerception,
  pb,
  savingThrow,
  signed,
  skillBonus,
  type Derived,
} from "@/lib/rules";
import {
  ConfirmButton,
  Field,
  NumberInput,
  NumField,
  Panel,
  Select,
  Toggle,
} from "@/components/ui";
import { SrdPicker } from "@/components/SrdPicker";
import type { SheetProps } from "./shared";

/** A one-line derived stat that unfolds to show its math and a misc field. */
function StatRow({
  name,
  sub,
  derived,
  profLevel,
  onCycleProf,
  misc,
  onMisc,
  onOverride,
}: {
  name: string;
  sub?: string;
  derived: Derived;
  profLevel?: ProfLevel;
  onCycleProf?: () => void;
  misc: number;
  onMisc: (v: number) => void;
  onOverride: (v: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(derived.value);
  // Flags the row when something beyond the plain formula is in play.
  const adjusted = misc !== 0 || derived.overridden;

  return (
    <div className="border-b last:border-0" style={{ borderColor: "var(--rule)" }}>
      <div className="flex items-center gap-2.5 py-1.5">
        {onCycleProf && (
          <button
            type="button"
            className="prof-dot"
            data-level={profLevel}
            onClick={onCycleProf}
            aria-label={`${name}: ${PROF_LABEL[profLevel ?? "none"]}. Tap to change.`}
            title={PROF_LABEL[profLevel ?? "none"]}
          >
            {profLevel === "expertise" ? "★" : ""}
          </button>
        )}
        <span className="min-w-0 flex-1 truncate text-[0.95rem] leading-tight">
          {name}
          {sub && <span className="label ml-1.5">{sub}</span>}
        </span>
        <button
          type="button"
          onClick={() => {
            setDraft(derived.value);
            setOpen((o) => !o);
          }}
          className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5"
          style={{ background: open ? "rgba(123,45,38,0.1)" : "transparent" }}
          aria-expanded={open}
          aria-label={`${name} bonus ${signed(derived.value)}. Tap to add a modifier.`}
          title="Tap to add a misc modifier or pin a total"
        >
          <span
            className={`stat-value min-w-9 text-right text-lg ${
              derived.overridden ? "overridden-mark" : ""
            }`}
          >
            {signed(derived.value)}
          </span>
          {/* A visible affordance -- the modifier field is otherwise invisible. */}
          <span
            className="text-[0.6rem] leading-none"
            style={{
              color: adjusted ? "var(--accent)" : "var(--ink-faint)",
              opacity: adjusted ? 1 : 0.55,
            }}
            aria-hidden="true"
          >
            {open ? "▲" : "▼"}
          </span>
        </button>
      </div>

      {open && (
        <div className="pb-2.5 pl-1 pr-1">
          <p className="formula mb-2">{derived.formula}</p>
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="label mb-1 block">Misc bonus</span>
              <NumberInput value={misc} onChange={onMisc} ariaLabel={`${name} misc bonus`} />
            </label>
            <label className="flex-1">
              <span className="label mb-1 block">Pin total</span>
              <NumberInput value={draft} onChange={setDraft} ariaLabel={`${name} total`} />
            </label>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                onOverride(draft);
                setOpen(false);
              }}
            >
              Pin
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                onOverride(null);
                setOpen(false);
              }}
            >
              Auto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MainTab({ c, set, mut, setOverride }: SheetProps) {
  const profBonus = pb(c);

  const cycleSkill = (key: SkillKey) => {
    const current = c.skillProf[key];
    const idx = PROF_CYCLE.indexOf(current);
    const next = PROF_CYCLE[(idx + 1) % PROF_CYCLE.length];
    mut((d) => ({ ...d, skillProf: { ...d.skillProf, [key]: next } }));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
      <div className="space-y-4">
        <Panel title="The Character">
          <div className="grid grid-cols-2 gap-2.5">
            <Field
              label="Character name"
              value={c.name}
              onChange={(v) => set({ name: v })}
              className="col-span-2"
              placeholder="Bram Ashgrove"
            />
            <Field
              label="Class & level"
              value={c.classText}
              onChange={(v) => set({ classText: v })}
              placeholder="Fighter 3 / Rogue 2"
            />
            <NumField
              label="Total level"
              value={c.level}
              onChange={(v) => set({ level: v })}
              min={1}
              max={20}
            />
            <Field
              label="Subclass"
              value={c.subclass}
              onChange={(v) => set({ subclass: v })}
              placeholder="Battle Master"
              className="col-span-2"
            />
            {/* "Species" rather than "Race", following the 2024 rules. */}
            <Field
              label="Species"
              value={c.race}
              onChange={(v) => set({ race: v })}
              placeholder="Human"
            />
            <Field
              label="Background"
              value={c.background}
              onChange={(v) => set({ background: v })}
              placeholder="Noble"
            />
            <Field
              label="Alignment"
              value={c.alignment}
              onChange={(v) => set({ alignment: v })}
              placeholder="NG"
            />
            <Field
              label="Deity"
              value={c.deity}
              onChange={(v) => set({ deity: v })}
            />
            <NumField label="XP" value={c.xp} onChange={(v) => set({ xp: v })} min={0} />
            <Field
              label="Player"
              value={c.playerName}
              onChange={(v) => set({ playerName: v })}
            />
          </div>
        </Panel>

        <SrdPicker c={c} mut={mut} />

        <Panel title="Description">
          <div className="flex gap-3">
            <PortraitPicker
              portrait={c.portrait}
              onChange={(portrait) => set({ portrait })}
            />
            <div className="grid flex-1 grid-cols-2 gap-2.5">
              <Field
                label="Gender"
                value={c.gender}
                onChange={(v) => set({ gender: v })}
              />
              <Field label="Age" value={c.age} onChange={(v) => set({ age: v })} />
              <Field
                label="Height"
                value={c.height}
                onChange={(v) => set({ height: v })}
                placeholder="5'10&quot;"
              />
              <Field
                label="Weight"
                value={c.weight}
                onChange={(v) => set({ weight: v })}
                placeholder="180 lbs"
              />
              <Select
                label="Size"
                className="col-span-2"
                value={c.size}
                options={SIZES.map((s) => ({ value: s, label: s }))}
                onChange={(v) => set({ size: v })}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Ability Scores">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3">
            {ABILITIES.map((a) => {
              const score = c.abilities[a.key];
              const m = abilityMod(score);
              return (
                <div key={a.key} className="stat-box px-1.5 py-2">
                  <div className="label">{a.abbr}</div>
                  <div className="my-1">
                    <NumberInput
                      value={score}
                      min={1}
                      max={30}
                      ariaLabel={a.name}
                      onChange={(v) =>
                        mut((d) => ({
                          ...d,
                          abilities: { ...d.abilities, [a.key]: v },
                        }))
                      }
                    />
                  </div>
                  <div className="stat-value text-xl">{signed(m)}</div>
                </div>
              );
            })}
          </div>
          <p className="formula mt-2">
            Modifiers, saves, skills, AC, and spell DCs all follow these six numbers.
          </p>
        </Panel>

        <Panel title="Proficiency & Inspiration">
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-box">
              <div className="label">Proficiency bonus</div>
              <div className="stat-value text-3xl">{signed(profBonus.value)}</div>
              <div className="formula mt-0.5">{profBonus.formula}</div>
            </div>
            <button
              type="button"
              className="stat-box"
              onClick={() => set({ inspiration: !c.inspiration })}
              aria-pressed={c.inspiration}
            >
              <div className="label">Inspiration</div>
              <div
                className="stat-value text-3xl"
                style={{ color: c.inspiration ? "var(--accent)" : "var(--ink-faint)" }}
              >
                {c.inspiration ? "★" : "☆"}
              </div>
              <div className="formula mt-0.5">tap to toggle</div>
            </button>
          </div>
          <Toggle
            label="Jack of All Trades"
            hint="Adds half proficiency to skills you're not already trained in."
            checked={c.jackOfAllTrades}
            onChange={(v) => set({ jackOfAllTrades: v })}
          />
        </Panel>

        <Panel title="Saving Throws">
          <div>
            {ABILITIES.map((a) => (
              <StatRow
                key={a.key}
                name={a.name}
                derived={savingThrow(c, a.key)}
                profLevel={c.saveProf[a.key] ? "prof" : "none"}
                onCycleProf={() =>
                  mut((d) => ({
                    ...d,
                    saveProf: { ...d.saveProf, [a.key]: !d.saveProf[a.key] },
                  }))
                }
                misc={c.saveMisc[a.key]}
                onMisc={(v) =>
                  mut((d) => ({ ...d, saveMisc: { ...d.saveMisc, [a.key]: v } }))
                }
                onOverride={(v) => setOverride(`save.${a.key}`, v)}
              />
            ))}
          </div>
          <p className="formula mt-2">
            Tap any bonus ▼ to add a modifier, such as a cloak of protection.
          </p>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel
          title="Skills"
          action={<span className="label">tap ● to train</span>}
        >
          <div>
            {SKILLS.map((s) => (
              <StatRow
                key={s.key}
                name={s.name}
                sub={s.ability.toUpperCase()}
                derived={skillBonus(c, s.key)}
                profLevel={c.skillProf[s.key]}
                onCycleProf={() => cycleSkill(s.key)}
                misc={c.skillMisc[s.key]}
                onMisc={(v) =>
                  mut((d) => ({ ...d, skillMisc: { ...d.skillMisc, [s.key]: v } }))
                }
                onOverride={(v) => setOverride(`skill.${s.key}`, v)}
              />
            ))}
          </div>
          <p className="formula mt-2">
            ● proficient · ★ expertise · half-filled means half proficiency.
          </p>
          <p className="formula">
            Tap any bonus ▼ to add a modifier from gear, a spell, or a feat.
          </p>
        </Panel>

        <Panel title="Passive Senses">
          <div className="grid grid-cols-3 gap-2">
            <PassiveBox label="Perception" derived={passivePerception(c)} />
            <PassiveBox label="Investigation" derived={passiveInvestigation(c)} />
            <PassiveBox label="Insight" derived={passiveInsight(c)} />
          </div>
        </Panel>

        <Panel
          title="Other Proficiencies & Languages"
          action={
            <button
              className="btn btn-sm"
              onClick={() =>
                mut((d) => ({
                  ...d,
                  proficiencies: [
                    ...d.proficiencies,
                    { id: newId(), label: "", value: "" },
                  ],
                }))
              }
            >
              + Add
            </button>
          }
        >
          {/*
            Sizing lives on the wrapper divs, not the inputs: .ink-field sets
            width:100% from an unlayered rule, which outranks Tailwind's layered
            width utilities and would otherwise collapse the value field.
          */}
          <div className="space-y-2">
            {c.proficiencies.map((group) => (
              <div key={group.id} className="flex flex-wrap items-center gap-2">
                <div className="w-28 shrink-0">
                  <input
                    className="ink-field"
                    value={group.label}
                    placeholder="Category"
                    aria-label="Proficiency category"
                    onChange={(e) =>
                      mut((d) => ({
                        ...d,
                        proficiencies: d.proficiencies.map((x) =>
                          x.id === group.id ? { ...x, label: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </div>
                <div className="min-w-[8rem] flex-1">
                  <input
                    className="ink-field"
                    value={group.value}
                    placeholder={PROFICIENCY_HINTS[group.label] ?? "…"}
                    aria-label={`${group.label || "Category"} proficiencies`}
                    onChange={(e) =>
                      mut((d) => ({
                        ...d,
                        proficiencies: d.proficiencies.map((x) =>
                          x.id === group.id ? { ...x, value: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </div>
                <ConfirmButton
                  className="btn btn-sm btn-danger shrink-0"
                  confirmLabel="✓"
                  onConfirm={() =>
                    mut((d) => ({
                      ...d,
                      proficiencies: d.proficiencies.filter((x) => x.id !== group.id),
                    }))
                  }
                >
                  ✕
                </ConfirmButton>
              </div>
            ))}
          </div>
          <p className="formula mt-2">
            Rename a category or add your own — saving throws, kits, vehicles,
            whatever your table tracks.
          </p>
        </Panel>
      </div>
    </div>
  );
}

export const SIZES = [
  "Tiny",
  "Small",
  "Medium",
  "Large",
  "Huge",
  "Gargantuan",
];

/** Portraits are shrunk to this many pixels on the long edge before storing. */
const PORTRAIT_MAX_PX = 256;

/**
 * Scales an image down and re-encodes it as a JPEG data URI. Storing the
 * original would eat the whole localStorage budget in one character.
 */
function shrinkImage(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Not a readable image"));
    };
    img.src = url;
  });
}

function PortraitPicker({
  portrait,
  onChange,
}: {
  portrait: string;
  onChange: (dataUri: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    shrinkImage(file, PORTRAIT_MAX_PX)
      .then(onChange)
      .catch(() => setError("Couldn't read that image."));
  };

  return (
    <div className="w-24 shrink-0">
      <span className="label mb-1 block">Portrait</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="block w-24 overflow-hidden rounded border"
        style={{ borderColor: "var(--rule-strong)", aspectRatio: "1 / 1" }}
        aria-label={portrait ? "Replace portrait" : "Add a portrait"}
      >
        {portrait ? (
          // A user-supplied data URI; there's nothing for next/image to optimise.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={portrait}
            alt="Character portrait"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="label block px-1 py-8" style={{ color: "var(--ink-faint)" }}>
            Tap to add
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      {portrait && (
        <button className="btn btn-sm mt-1 w-full" onClick={() => onChange("")}>
          Remove
        </button>
      )}
      {error && (
        <p className="formula mt-1" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function PassiveBox({ label, derived }: { label: string; derived: Derived }) {
  return (
    <div className="stat-box">
      <div className="label">{label}</div>
      <div className="stat-value text-2xl">{derived.value}</div>
      <div className="formula mt-0.5">{derived.formula}</div>
    </div>
  );
}

export type { AbilityKey };
