"use client";

import { useState } from "react";
import { ABILITIES, type AbilityKey, newId, type SpellEntry } from "@/lib/types";
import { spellAttackBonus, spellSaveDc } from "@/lib/rules";
import {
  ConfirmButton,
  DerivedStat,
  Empty,
  Field,
  NumField,
  Panel,
  Select,
  TextArea,
} from "@/components/ui";
import { SpellBrowser } from "@/components/SpellBrowser";
import type { SheetProps } from "./shared";

const LEVEL_NAMES = [
  "Cantrips",
  "1st Level",
  "2nd Level",
  "3rd Level",
  "4th Level",
  "5th Level",
  "6th Level",
  "7th Level",
  "8th Level",
  "9th Level",
];

/** Row of tappable pips for spending and recovering slots. */
function SlotPips({
  total,
  used,
  onChange,
  label,
}: {
  total: number;
  used: number;
  onChange: (used: number) => void;
  label: string;
}) {
  if (total <= 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const spent = used >= n;
        return (
          <button
            key={n}
            type="button"
            aria-label={`${label} slot ${n}${spent ? " (spent)" : ""}`}
            aria-pressed={spent}
            onClick={() => onChange(spent ? n - 1 : n)}
            className="h-8 w-8 rounded-full border-2 transition-colors"
            style={{
              borderColor: spent ? "var(--ink-faint)" : "var(--accent)",
              background: spent ? "transparent" : "var(--accent)",
            }}
          />
        );
      })}
    </div>
  );
}

export function SpellsTab({ c, set, mut, setOverride }: SheetProps) {
  const [editSlots, setEditSlots] = useState(false);
  const [newSpellLevel, setNewSpellLevel] = useState(1);
  const [browsing, setBrowsing] = useState(false);

  const preparedCount = c.spells.filter(
    (s) => s.level > 0 && (s.prepared || s.alwaysPrepared),
  ).length;

  const addSpell = (level: number) => {
    mut((d) => ({
      ...d,
      spells: [
        ...d.spells,
        {
          id: newId(),
          name: "",
          level,
          prepared: level === 0,
          alwaysPrepared: false,
          concentration: false,
          ritual: false,
          notes: "",
          school: "",
          castingTime: "",
          range: "",
          components: "",
          duration: "",
          detail: "",
          source: "",
        },
      ],
    }));
  };

  const patchSpell = (id: string, p: Partial<SpellEntry>) =>
    mut((d) => ({
      ...d,
      spells: d.spells.map((s) => (s.id === id ? { ...s, ...p } : s)),
    }));

  const usedLevels = Array.from({ length: 9 }, (_, i) => i + 1).filter(
    (lvl) => c.slots[lvl]?.total > 0,
  );

  if (c.casterAbility === "none" && c.spells.length === 0 && usedLevels.length === 0) {
    return (
      <Panel title="Spellcasting">
        <Empty>
          This character doesn&apos;t cast yet. Pick a spellcasting ability below to
          switch it on.
        </Empty>
        <Select
          label="Spellcasting ability"
          value={c.casterAbility}
          options={[
            { value: "none", label: "Not a spellcaster" },
            ...ABILITIES.map((a) => ({ value: a.key, label: a.name })),
          ]}
          onChange={(v) => set({ casterAbility: v as AbilityKey | "none" })}
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Panel title="Spellcasting">
        <div className="grid gap-2.5 sm:grid-cols-[1fr_auto_auto]">
          <Select
            label="Spellcasting ability"
            value={c.casterAbility}
            options={[
              { value: "none", label: "Not a spellcaster" },
              ...ABILITIES.map((a) => ({ value: a.key, label: a.name })),
            ]}
            onChange={(v) => set({ casterAbility: v as AbilityKey | "none" })}
          />
          <DerivedStat
            label="Spell save DC"
            derived={spellSaveDc(c)}
            onOverride={(v) => setOverride("spellDc", v)}
          />
          <DerivedStat
            label="Spell attack"
            derived={spellAttackBonus(c)}
            asModifier
            onOverride={(v) => setOverride("spellAtk", v)}
          />
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <NumField
            label="DC bonus"
            value={c.spellDcMisc}
            onChange={(v) => set({ spellDcMisc: v })}
          />
          <NumField
            label="Attack bonus"
            value={c.spellAtkMisc}
            onChange={(v) => set({ spellAtkMisc: v })}
          />
          <NumField
            label="Can prepare"
            value={c.preparedMax}
            onChange={(v) => set({ preparedMax: v })}
            min={0}
          />
          <div className="stat-box">
            <div className="label">Prepared</div>
            <div
              className="stat-value text-2xl"
              style={{
                color:
                  c.preparedMax > 0 && preparedCount > c.preparedMax
                    ? "var(--bad)"
                    : "var(--ink)",
              }}
            >
              {preparedCount}
              {c.preparedMax > 0 && (
                <span className="text-sm font-normal">/{c.preparedMax}</span>
              )}
            </div>
            <div className="formula mt-0.5">cantrips not counted</div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Spell Slots"
        action={
          <button className="btn btn-sm" onClick={() => setEditSlots((e) => !e)}>
            {editSlots ? "Done" : "Set totals"}
          </button>
        }
      >
        {editSlots ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {Array.from({ length: 9 }, (_, i) => i + 1).map((lvl) => (
              <NumField
                key={lvl}
                label={`Level ${lvl}`}
                value={c.slots[lvl]?.total ?? 0}
                min={0}
                max={9}
                onChange={(v) =>
                  mut((d) => ({
                    ...d,
                    slots: {
                      ...d.slots,
                      [lvl]: {
                        total: v,
                        used: Math.min(d.slots[lvl]?.used ?? 0, v),
                      },
                    },
                  }))
                }
              />
            ))}
          </div>
        ) : usedLevels.length === 0 ? (
          <Empty>
            No slots set. Tap <strong>Set totals</strong> to enter how many you get at
            each level.
          </Empty>
        ) : (
          <div className="space-y-2.5">
            {usedLevels.map((lvl) => {
              const slot = c.slots[lvl];
              const left = slot.total - slot.used;
              return (
                <div key={lvl} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="label w-16 shrink-0">Level {lvl}</span>
                  <SlotPips
                    total={slot.total}
                    used={slot.used}
                    label={`Level ${lvl}`}
                    onChange={(used) =>
                      mut((d) => ({
                        ...d,
                        slots: { ...d.slots, [lvl]: { ...d.slots[lvl], used } },
                      }))
                    }
                  />
                  <span className="formula ml-auto not-italic">
                    {left} of {slot.total} left
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <hr className="divider my-3" />

        <div className="grid gap-2.5 sm:grid-cols-[auto_auto_1fr]">
          <NumField
            label="Pact slots"
            className="w-28"
            value={c.pactSlots.total}
            min={0}
            max={9}
            onChange={(v) =>
              set({ pactSlots: { total: v, used: Math.min(c.pactSlots.used, v) } })
            }
          />
          <NumField
            label="Pact level"
            className="w-28"
            value={c.pactSlotLevel}
            min={0}
            max={9}
            onChange={(v) => set({ pactSlotLevel: v })}
          />
          <div>
            <span className="label mb-1 block">Pact magic (back on a short rest)</span>
            {c.pactSlots.total > 0 ? (
              <SlotPips
                total={c.pactSlots.total}
                used={c.pactSlots.used}
                label="Pact"
                onChange={(used) => set({ pactSlots: { ...c.pactSlots, used } })}
              />
            ) : (
              <p className="formula">Warlocks only — leave at 0 otherwise.</p>
            )}
          </div>
        </div>
      </Panel>

      {LEVEL_NAMES.map((levelName, lvl) => {
        const spells = c.spells
          .filter((s) => s.level === lvl)
          .sort((a, b) => a.name.localeCompare(b.name));
        if (spells.length === 0) return null;
        return (
          <Panel
            key={lvl}
            title={levelName}
            action={
              <button className="btn btn-sm" onClick={() => addSpell(lvl)}>
                + Add
              </button>
            }
          >
            <div className="space-y-1.5">
              {spells.map((s) => (
                <SpellRow
                  key={s.id}
                  spell={s}
                  onPatch={(p) => patchSpell(s.id, p)}
                  onDelete={() =>
                    mut((d) => ({ ...d, spells: d.spells.filter((x) => x.id !== s.id) }))
                  }
                />
              ))}
            </div>
          </Panel>
        );
      })}

      <Panel title="Add a Spell">
        <button className="btn btn-primary w-full" onClick={() => setBrowsing(true)}>
          Search the rules for a spell
        </button>
        <p className="formula mb-3 mt-2">
          Adds the spell with its casting time, range, components, duration, and
          full text — all editable afterwards.
        </p>
        <hr className="divider mb-3" />
        <div className="flex flex-wrap items-end gap-2">
          <Select
            label="Level"
            className="w-40"
            value={newSpellLevel}
            options={LEVEL_NAMES.map((n, i) => ({ value: i, label: n }))}
            onChange={(v) => setNewSpellLevel(Number(v))}
          />
          <button className="btn btn-primary" onClick={() => addSpell(newSpellLevel)}>
            + Add spell
          </button>
        </div>
        <p className="formula mt-2">
          Or add a blank entry and write it in yourself — for homebrew, or anything
          outside the SRD.
        </p>
      </Panel>

      {browsing && (
        <SpellBrowser c={c} mut={mut} onClose={() => setBrowsing(false)} />
      )}

      <Panel title="Spell Notes">
        <TextArea
          value={c.spellNotes}
          onChange={(v) => set({ spellNotes: v })}
          rows={4}
          placeholder="Rituals, spell components you're short on, scroll and wand charges…"
        />
      </Panel>
    </div>
  );
}

function SpellRow({
  spell,
  onPatch,
  onDelete,
}: {
  spell: SpellEntry;
  onPatch: (p: Partial<SpellEntry>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isCantrip = spell.level === 0;
  const active = spell.prepared || spell.alwaysPrepared;

  return (
    <div
      className="rounded border px-2 py-1.5"
      style={{
        borderColor: "var(--rule)",
        opacity: isCantrip || active ? 1 : 0.55,
      }}
    >
      <div className="flex items-center gap-2">
        {!isCantrip && (
          <button
            type="button"
            className="prof-dot"
            data-level={spell.alwaysPrepared ? "expertise" : active ? "prof" : "none"}
            onClick={() => onPatch({ prepared: !spell.prepared })}
            aria-pressed={active}
            aria-label={`${spell.name || "Spell"} prepared`}
            title={spell.alwaysPrepared ? "Always prepared" : "Tap to prepare"}
          >
            {spell.alwaysPrepared ? "★" : ""}
          </button>
        )}
        <input
          className="ink-field flex-1"
          value={spell.name}
          placeholder="Spell name"
          onChange={(e) => onPatch({ name: e.target.value })}
        />
        {spell.concentration && <span className="label shrink-0">Conc</span>}
        {spell.ritual && <span className="label shrink-0">Rit</span>}
        <button className="btn btn-icon" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "▴" : "▾"}
        </button>
      </div>

      {open && (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-2">
            {!isCantrip && (
              <button
                className="btn btn-sm"
                onClick={() => onPatch({ alwaysPrepared: !spell.alwaysPrepared })}
              >
                {spell.alwaysPrepared ? "★ Always prepared" : "Mark always prepared"}
              </button>
            )}
            <button
              className="btn btn-sm"
              onClick={() => onPatch({ concentration: !spell.concentration })}
            >
              {spell.concentration ? "✓ Concentration" : "Concentration"}
            </button>
            <button className="btn btn-sm" onClick={() => onPatch({ ritual: !spell.ritual })}>
              {spell.ritual ? "✓ Ritual" : "Ritual"}
            </button>
          </div>
          {/* The stat block, for spells that came from the rules. */}
          {(spell.castingTime || spell.range || spell.components || spell.duration) && (
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Casting time"
                value={spell.castingTime}
                onChange={(v) => onPatch({ castingTime: v })}
              />
              <Field
                label="Range"
                value={spell.range}
                onChange={(v) => onPatch({ range: v })}
              />
              <Field
                label="Components"
                value={spell.components}
                onChange={(v) => onPatch({ components: v })}
              />
              <Field
                label="Duration"
                value={spell.duration}
                onChange={(v) => onPatch({ duration: v })}
              />
            </div>
          )}
          <Field
            label="Notes"
            value={spell.notes}
            onChange={(v) => onPatch({ notes: v })}
            placeholder="Range 60 ft, 3d6 fire, DEX save for half"
          />
          <TextArea
            label="Rules text"
            value={spell.detail}
            rows={spell.detail ? 8 : 3}
            placeholder="What the spell does — filled in for you when added from the rules."
            onChange={(v) => onPatch({ detail: v })}
          />
          <ConfirmButton onConfirm={onDelete}>Delete spell</ConfirmButton>
        </div>
      )}
      {!open && spell.notes && <p className="formula mt-1 pl-1">{spell.notes}</p>}
    </div>
  );
}
