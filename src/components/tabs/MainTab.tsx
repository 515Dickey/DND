"use client";

import { useState } from "react";
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
  Toggle,
} from "@/components/ui";
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
          className={`stat-value min-w-11 rounded px-1.5 py-0.5 text-lg ${
            derived.overridden ? "overridden-mark" : ""
          }`}
          style={{ background: open ? "rgba(123,45,38,0.1)" : "transparent" }}
          aria-expanded={open}
        >
          {signed(derived.value)}
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
            <Field label="Race" value={c.race} onChange={(v) => set({ race: v })} />
            <Field
              label="Background"
              value={c.background}
              onChange={(v) => set({ background: v })}
            />
            <Field
              label="Alignment"
              value={c.alignment}
              onChange={(v) => set({ alignment: v })}
              placeholder="NG"
            />
            <NumField label="XP" value={c.xp} onChange={(v) => set({ xp: v })} min={0} />
            <Field
              label="Player"
              value={c.playerName}
              onChange={(v) => set({ playerName: v })}
              className="col-span-2"
            />
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
          <div className="space-y-2">
            {c.proficiencies.map((group) => (
              <div key={group.id} className="flex items-center gap-2">
                <input
                  className="ink-field w-28 shrink-0"
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
                <input
                  className="ink-field min-w-0 flex-1"
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
