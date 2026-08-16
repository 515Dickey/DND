"use client";

import { useState } from "react";
import {
  AC_MODE_LABEL,
  ABILITIES,
  type AcMode,
  type AttackAbility,
  type Character,
  type HitDiceGroup,
  newId,
} from "@/lib/types";
import {
  armorClass,
  attackBonus,
  damageString,
  effectiveSpeed,
  EXHAUSTION_EFFECTS,
  healthState,
  initiative,
  maxHp,
  signed,
} from "@/lib/rules";
import {
  ConfirmButton,
  DerivedStat,
  Empty,
  Field,
  NumField,
  Panel,
  Select,
  Stepper,
} from "@/components/ui";
import type { SheetProps } from "./shared";

const ATTACK_ABILITY_OPTIONS: { value: AttackAbility; label: string }[] = [
  { value: "str", label: "STR" },
  { value: "dex", label: "DEX" },
  { value: "finesse", label: "Finesse (best of STR/DEX)" },
  { value: "con", label: "CON" },
  { value: "int", label: "INT" },
  { value: "wis", label: "WIS" },
  { value: "cha", label: "CHA" },
  { value: "none", label: "No ability" },
];

/** Restores hit dice the way a long rest does: up to half your total, rounded down. */
function recoverHitDice(groups: HitDiceGroup[]): HitDiceGroup[] {
  const total = groups.reduce((s, g) => s + g.total, 0);
  let pool = Math.max(1, Math.floor(total / 2));
  return groups.map((g) => {
    if (pool <= 0) return g;
    const give = Math.min(g.used, pool);
    pool -= give;
    return { ...g, used: g.used - give };
  });
}

export function CombatTab({ c, set, mut, setOverride }: SheetProps) {
  const [delta, setDelta] = useState(0);
  const [restNote, setRestNote] = useState<string | null>(null);

  const hpMaxValue = maxHp(c).value;
  const health = healthState(c);

  const applyDamage = () => {
    if (delta <= 0) return;
    mut((d) => {
      let remaining = delta;
      let temp = d.hpTemp;
      if (temp > 0) {
        const absorbed = Math.min(temp, remaining);
        temp -= absorbed;
        remaining -= absorbed;
      }
      // 5e floors you at 0 rather than tracking negatives.
      const next = Math.max(0, d.hpCurrent - remaining);
      return { ...d, hpTemp: temp, hpCurrent: next };
    });
    setDelta(0);
  };

  const applyHeal = () => {
    if (delta <= 0) return;
    mut((d) => ({
      ...d,
      hpCurrent: Math.min(maxHp(d).value, d.hpCurrent + delta),
      // Healing above 0 stops the dying clock.
      deathSuccesses: d.hpCurrent + delta > 0 ? 0 : d.deathSuccesses,
      deathFailures: d.hpCurrent + delta > 0 ? 0 : d.deathFailures,
    }));
    setDelta(0);
  };

  const longRest = () => {
    mut((d) => {
      const slots = { ...d.slots };
      for (const lvl of Object.keys(slots)) {
        slots[Number(lvl)] = { ...slots[Number(lvl)], used: 0 };
      }
      return {
        ...d,
        hpCurrent: maxHp(d).value,
        hpTemp: 0,
        deathSuccesses: 0,
        deathFailures: 0,
        exhaustion: Math.max(0, d.exhaustion - 1),
        slots,
        pactSlots: { ...d.pactSlots, used: 0 },
        hitDice: recoverHitDice(d.hitDice),
      };
    });
    setRestNote(
      "Long rest: HP full, spell slots back, half your hit dice recovered, one level of exhaustion gone.",
    );
  };

  const shortRest = () => {
    mut((d) => ({ ...d, pactSlots: { ...d.pactSlots, used: 0 } }));
    setRestNote(
      "Short rest: pact slots restored. Spend hit dice below as you roll them.",
    );
  };

  const healthColor =
    health.state === "dead" || health.state === "down"
      ? "var(--bad)"
      : health.state === "bloodied"
        ? "var(--warn)"
        : "var(--ink)";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ---- Hit points ---- */}
      <Panel title="Hit Points" className="lg:col-span-2">
        <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
          <div className="stat-box min-w-40 px-4 py-3">
            <div className="label">Current</div>
            <div className="stat-value text-5xl" style={{ color: healthColor }}>
              {c.hpCurrent}
            </div>
            <div className="formula mt-0.5 not-italic">of {hpMaxValue} max</div>
            {c.hpTemp > 0 && (
              <div className="mt-1 text-sm" style={{ color: "var(--good)" }}>
                +{c.hpTemp} temporary
              </div>
            )}
            <div
              className="label mt-1.5"
              style={{ color: healthColor, letterSpacing: "0.1em" }}
            >
              {health.label}
            </div>
          </div>

          <div className="space-y-2.5">
            <div>
              <span className="label mb-1 block">Damage or healing</span>
              <Stepper value={delta} onChange={setDelta} min={0} label="amount" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="btn"
                style={{ borderColor: "var(--bad)", color: "var(--bad)" }}
                onClick={applyDamage}
              >
                − Damage
              </button>
              <button
                className="btn"
                style={{ borderColor: "var(--good)", color: "var(--good)" }}
                onClick={applyHeal}
              >
                + Heal
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <NumField
                label="Max HP"
                value={c.hpMax}
                onChange={(v) => set({ hpMax: v })}
                min={0}
              />
              <NumField
                label="Max bonus"
                value={c.hpMaxMisc}
                onChange={(v) => set({ hpMaxMisc: v })}
              />
              <NumField
                label="Temp HP"
                value={c.hpTemp}
                onChange={(v) => set({ hpTemp: v })}
                min={0}
              />
            </div>
          </div>
        </div>

        {/* Death saves */}
        <div className="mt-3 rounded border p-2.5" style={{ borderColor: "var(--rule)" }}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="label">Death saves</span>
            <DeathTrack
              label="Successes"
              count={c.deathSuccesses}
              color="var(--good)"
              onSet={(n) => set({ deathSuccesses: n })}
            />
            <DeathTrack
              label="Failures"
              count={c.deathFailures}
              color="var(--bad)"
              onSet={(n) => set({ deathFailures: n })}
            />
            {(c.deathSuccesses > 0 || c.deathFailures > 0) && (
              <button
                className="btn btn-sm"
                onClick={() => set({ deathSuccesses: 0, deathFailures: 0 })}
              >
                Clear
              </button>
            )}
          </div>
          {c.deathSuccesses >= 3 && (
            <p className="formula mt-1.5" style={{ color: "var(--good)" }}>
              Stable — unconscious but no longer dying.
            </p>
          )}
        </div>

        {/* Rests + hit dice */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn" onClick={shortRest}>
            Short rest
          </button>
          <button className="btn btn-primary" onClick={longRest}>
            Long rest
          </button>
          <button
            className="btn btn-sm"
            onClick={() =>
              mut((d) => ({
                ...d,
                hitDice: [...d.hitDice, { id: newId(), die: 8, total: 1, used: 0 }],
              }))
            }
          >
            + Hit die pool
          </button>
        </div>
        {restNote && (
          <p className="formula mt-2" style={{ color: "var(--accent)" }}>
            {restNote}
          </p>
        )}

        <div className="mt-3 space-y-2">
          {c.hitDice.map((g) => {
            const left = Math.max(0, g.total - g.used);
            return (
              <div
                key={g.id}
                className="flex flex-wrap items-end gap-2 rounded border p-2"
                style={{ borderColor: "var(--rule)" }}
              >
                <Select
                  label="Die"
                  className="w-24"
                  value={g.die}
                  options={[6, 8, 10, 12].map((d) => ({ value: d, label: `d${d}` }))}
                  onChange={(v) =>
                    mut((d) => ({
                      ...d,
                      hitDice: d.hitDice.map((x) =>
                        x.id === g.id ? { ...x, die: Number(v) } : x,
                      ),
                    }))
                  }
                />
                <NumField
                  label="Total"
                  className="w-20"
                  value={g.total}
                  min={0}
                  onChange={(v) =>
                    mut((d) => ({
                      ...d,
                      hitDice: d.hitDice.map((x) =>
                        x.id === g.id ? { ...x, total: v, used: Math.min(x.used, v) } : x,
                      ),
                    }))
                  }
                />
                <div className="min-w-24 flex-1">
                  <span className="label mb-1 block">Remaining</span>
                  <div className="stat-box py-1.5">
                    <span className="stat-value text-lg">
                      {left} <span className="text-sm font-normal">/ {g.total}</span>
                    </span>
                  </div>
                </div>
                <button
                  className="btn btn-sm"
                  disabled={left <= 0}
                  onClick={() =>
                    mut((d) => ({
                      ...d,
                      hitDice: d.hitDice.map((x) =>
                        x.id === g.id
                          ? { ...x, used: Math.min(x.total, x.used + 1) }
                          : x,
                      ),
                    }))
                  }
                >
                  Spend
                </button>
                <ConfirmButton
                  onConfirm={() =>
                    mut((d) => ({
                      ...d,
                      hitDice: d.hitDice.filter((x) => x.id !== g.id),
                    }))
                  }
                >
                  ✕
                </ConfirmButton>
              </div>
            );
          })}
          <p className="formula">
            Roll the die at the table, then type the healing into the box above and tap
            Heal.
          </p>
        </div>
      </Panel>

      {/* ---- Defense ---- */}
      <Panel title="Defense & Movement">
        <div className="grid grid-cols-3 gap-2">
          <DerivedStat
            label="Armor Class"
            derived={armorClass(c)}
            onOverride={(v) => setOverride("ac", v)}
          />
          <DerivedStat
            label="Initiative"
            derived={initiative(c)}
            asModifier
            onOverride={(v) => setOverride("initiative", v)}
          />
          <DerivedStat
            label="Speed"
            derived={effectiveSpeed(c)}
            suffix="ft"
            onOverride={(v) => setOverride("speed", v)}
          />
        </div>

        <hr className="divider my-3" />

        <Select
          label="How is your AC worked out?"
          value={c.acMode}
          options={(Object.keys(AC_MODE_LABEL) as AcMode[]).map((m) => ({
            value: m,
            label: AC_MODE_LABEL[m],
          }))}
          onChange={(v) => set({ acMode: v })}
        />

        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          {c.acMode === "armor" && (
            <>
              <NumField
                label="Armor base AC"
                value={c.armorBase}
                onChange={(v) => set({ armorBase: v })}
                min={0}
              />
              <Select
                label="DEX allowed"
                value={c.armorMaxDex === null ? "any" : String(c.armorMaxDex)}
                options={[
                  { value: "any", label: "Full DEX (light)" },
                  { value: "2", label: "Max +2 (medium)" },
                  { value: "0", label: "None (heavy)" },
                ]}
                onChange={(v) =>
                  set({ armorMaxDex: v === "any" ? null : Number(v) })
                }
              />
            </>
          )}
          {c.acMode === "manual" && (
            <NumField
              label="AC before shield"
              value={c.acManual}
              onChange={(v) => set({ acManual: v })}
              min={0}
            />
          )}
          <NumField
            label="Shield bonus"
            value={c.shieldBonus}
            onChange={(v) => set({ shieldBonus: v })}
            min={0}
          />
          <NumField
            label="Other AC bonus"
            value={c.acMisc}
            onChange={(v) => set({ acMisc: v })}
          />
          <NumField
            label="Base speed (ft)"
            value={c.speed}
            onChange={(v) => set({ speed: v })}
            min={0}
          />
          <NumField
            label="Initiative bonus"
            value={c.initiativeMisc}
            onChange={(v) => set({ initiativeMisc: v })}
          />
        </div>
      </Panel>

      {/* ---- Conditions ---- */}
      <Panel title="Conditions">
        <span className="label mb-1 block">Exhaustion</span>
        <Stepper
          value={c.exhaustion}
          onChange={(v) => set({ exhaustion: v })}
          min={0}
          max={6}
          label="exhaustion level"
        />
        <p className="formula mt-1.5">
          Level {c.exhaustion}: {EXHAUSTION_EFFECTS[Math.min(6, Math.max(0, c.exhaustion))]}
          {c.exhaustion >= 1 && " Effects at lower levels still apply."}
        </p>

        <hr className="divider my-3" />

        <Field
          label="Active conditions & effects"
          value={c.conditions}
          onChange={(v) => set({ conditions: v })}
          placeholder="Poisoned until dawn, bless (conc.)"
        />
        <p className="formula mt-1.5">
          Exhaustion feeds into your speed automatically. Everything else here is a
          reminder for you and the DM.
        </p>
      </Panel>

      {/* ---- Attacks ---- */}
      <Panel
        title="Attacks"
        className="lg:col-span-2"
        action={
          <button
            className="btn btn-sm"
            onClick={() =>
              mut((d) => ({
                ...d,
                attacks: [
                  ...d.attacks,
                  {
                    id: newId(),
                    name: "",
                    ability: "str",
                    proficient: true,
                    atkMisc: 0,
                    damageDice: "1d8",
                    damageAbility: "str",
                    damageMisc: 0,
                    damageType: "",
                    notes: "",
                  },
                ],
              }))
            }
          >
            + Add
          </button>
        }
      >
        {c.attacks.length === 0 ? (
          <Empty>No attacks yet. Add your weapons and cantrips here.</Empty>
        ) : (
          <div className="space-y-3">
            {c.attacks.map((a) => (
              <AttackRow
                key={a.id}
                c={c}
                id={a.id}
                mut={mut}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function DeathTrack({
  label,
  count,
  color,
  onSet,
}: {
  label: string;
  count: number;
  color: string;
  onSet: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="formula not-italic">{label}</span>
      {[1, 2, 3].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${label} ${n}`}
          aria-pressed={count >= n}
          onClick={() => onSet(count >= n ? n - 1 : n)}
          className="h-7 w-7 rounded-full border-2 transition-colors"
          style={{
            borderColor: color,
            background: count >= n ? color : "transparent",
          }}
        />
      ))}
    </div>
  );
}

function AttackRow({
  c,
  id,
  mut,
}: {
  c: Character;
  id: string;
  mut: (fn: (draft: Character) => Character) => void;
}) {
  const [open, setOpen] = useState(false);
  const atk = c.attacks.find((a) => a.id === id)!;
  const bonus = attackBonus(c, id);

  const patch = (p: Partial<typeof atk>) =>
    mut((d) => ({
      ...d,
      attacks: d.attacks.map((x) => (x.id === id ? { ...x, ...p } : x)),
    }));

  return (
    <div className="rounded border p-2.5" style={{ borderColor: "var(--rule)" }}>
      <div className="flex items-center gap-2">
        <input
          className="ink-field flex-1"
          value={atk.name}
          placeholder="Longsword"
          onChange={(e) => patch({ name: e.target.value })}
        />
        <div className="stat-box min-w-16 px-2 py-1">
          <div className="label">Hit</div>
          <div className="stat-value text-xl">{signed(bonus.value)}</div>
        </div>
        <div className="stat-box min-w-24 px-2 py-1">
          <div className="label">Damage</div>
          <div className="stat-value text-base">{damageString(c, id)}</div>
        </div>
        <button className="btn btn-icon" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "▴" : "▾"}
        </button>
      </div>

      {open && (
        <div className="mt-2.5 space-y-2.5">
          <p className="formula">{bonus.formula}</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Select
              label="Attack uses"
              value={atk.ability}
              options={ATTACK_ABILITY_OPTIONS}
              onChange={(v) => patch({ ability: v })}
            />
            <Select
              label="Proficient?"
              value={atk.proficient ? "yes" : "no"}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              onChange={(v) => patch({ proficient: v === "yes" })}
            />
            <NumField
              label="Hit bonus"
              value={atk.atkMisc}
              onChange={(v) => patch({ atkMisc: v })}
            />
            <Field
              label="Damage dice"
              value={atk.damageDice}
              onChange={(v) => patch({ damageDice: v })}
              placeholder="1d8"
            />
            <Select
              label="Damage uses"
              value={atk.damageAbility}
              options={ATTACK_ABILITY_OPTIONS}
              onChange={(v) => patch({ damageAbility: v })}
            />
            <NumField
              label="Damage bonus"
              value={atk.damageMisc}
              onChange={(v) => patch({ damageMisc: v })}
            />
            <Field
              label="Damage type"
              value={atk.damageType}
              onChange={(v) => patch({ damageType: v })}
              placeholder="slashing"
            />
          </div>
          <Field
            label="Notes"
            value={atk.notes}
            onChange={(v) => patch({ notes: v })}
            placeholder="Versatile (1d10), reach…"
          />
          <ConfirmButton
            onConfirm={() =>
              mut((d) => ({ ...d, attacks: d.attacks.filter((x) => x.id !== id) }))
            }
          >
            Delete attack
          </ConfirmButton>
        </div>
      )}
      {!open && atk.notes && <p className="formula mt-1.5">{atk.notes}</p>}
    </div>
  );
}

export { ABILITIES };
