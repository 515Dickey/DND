"use client";

// The SRD's weapons, armour, and adventuring gear. Adding an item fills in its
// weight and cost, which feeds straight into carrying capacity. Armour can also
// set the AC calculation, and a weapon can become an attack entry.

import { useEffect, useState } from "react";
import { type Character, type InventoryItem, newId } from "@/lib/types";
import {
  loadSrd,
  parseArmorClass,
  parseShieldBonus,
  type SrdArmor,
  type SrdEquipment,
  type SrdGear,
  SRD_ATTRIBUTION,
  type SrdWeapon,
} from "@/lib/srd";
import { Modal, Select } from "@/components/ui";

type Kind = "gear" | "weapons" | "armor";

function costLabel(cost: { amount: number; coin: string } | null) {
  return cost ? `${cost.amount} ${cost.coin}` : "varies";
}

function weightLabel(weight: number | null) {
  if (weight === null) return "varies";
  if (weight === 0) return "—";
  return `${weight} lb`;
}

export function GearBrowser({
  mut,
  onClose,
}: {
  mut: (fn: (draft: Character) => Character) => void;
  onClose: () => void;
}) {
  const [equipment, setEquipment] = useState<SrdEquipment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("gear");
  const [query, setQuery] = useState("");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSrd()
      .then((d) => {
        if (!cancelled) setEquipment(d.equipment);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the equipment tables.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addItem = (
    name: string,
    weight: number | null,
    extras: Partial<InventoryItem> = {},
  ) => {
    const item: InventoryItem = {
      id: newId(),
      name,
      qty: 1,
      // "Varies" becomes 0 rather than guessing; the field stays editable.
      weight: weight ?? 0,
      equipped: false,
      notes: "",
      location: "",
      carried: true,
      attuned: false,
      weightless: false,
      ...extras,
    };
    mut((d) => ({ ...d, inventory: [...d.inventory, item] }));
    setQuery("");
    setNote(`Added ${name}`);
  };

  /** Armour can also drive the AC calculation, which is the real win. */
  const wearArmor = (a: SrdArmor) => {
    const parsed = parseArmorClass(a.armorClass);
    const shield = parseShieldBonus(a.armorClass);
    mut((d) => {
      const next: Character = { ...d };
      if (shield !== null) {
        next.shieldBonus = shield;
      } else if (parsed) {
        next.acMode = "armor";
        next.armorBase = parsed.base;
        next.armorMaxDex = parsed.maxDex;
      }
      const item: InventoryItem = {
        id: newId(),
        name: a.name,
        qty: 1,
        weight: a.weight ?? 0,
        equipped: true,
        notes: a.stealth ? `${a.stealth} on Stealth` : "",
        location: "Worn",
        carried: true,
        attuned: false,
        weightless: false,
      };
      next.inventory = [...d.inventory, item];
      return next;
    });
    setNote(
      shield !== null
        ? `Shield worn — AC bonus +${shield}`
        : `${a.name} worn — AC ${a.armorClass}`,
    );
  };

  /** A weapon becomes both an inventory item and an attack. */
  const wieldWeapon = (w: SrdWeapon) => {
    const dice = w.damage.match(/^(\d+d\d+)\s+(\w+)$/);
    const finesse = /Finesse/i.test(w.properties);
    const ranged = /Ranged/i.test(w.category);
    mut((d) => ({
      ...d,
      inventory: [
        ...d.inventory,
        {
          id: newId(),
          name: w.name,
          qty: 1,
          weight: w.weight ?? 0,
          equipped: true,
          notes: [w.properties, w.mastery && `Mastery: ${w.mastery}`]
            .filter(Boolean)
            .join(" · "),
          location: "Worn",
          carried: true,
          attuned: false,
          weightless: false,
        },
      ],
      attacks: [
        ...d.attacks,
        {
          id: newId(),
          name: w.name,
          ability: finesse ? "finesse" : ranged ? "dex" : "str",
          proficient: true,
          atkMisc: 0,
          damageDice: dice ? dice[1] : "",
          damageAbility: finesse ? "finesse" : ranged ? "dex" : "str",
          damageMisc: 0,
          damageType: dice ? dice[2] : "",
          notes: w.properties,
        },
      ],
    }));
    setQuery("");
    setNote(`Added ${w.name} — also an attack, ${w.damage}`);
  };

  const q = query.trim().toLowerCase();
  const match = (name: string) => !q || name.toLowerCase().includes(q);

  return (
    <Modal title="Equipment from the rules" onClose={onClose}>
      {error ? (
        <p className="text-sm" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      ) : !equipment ? (
        <p className="text-sm">Loading the equipment tables…</p>
      ) : (
        <div className="space-y-2.5">
          <Select
            label="Table"
            value={kind}
            options={[
              { value: "gear" as Kind, label: "Adventuring gear" },
              { value: "weapons" as Kind, label: "Weapons" },
              { value: "armor" as Kind, label: "Armour and shields" },
            ]}
            onChange={setKind}
          />
          <input
            className="ink-field"
            value={query}
            placeholder="Search by name…"
            aria-label="Search equipment"
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />

          {note && (
            <p className="text-sm" style={{ color: "var(--good)" }}>
              {note}
            </p>
          )}

          <div className="space-y-1.5">
            {kind === "gear" &&
              equipment.gear.filter((g: SrdGear) => match(g.name)).map((g) => (
                <div
                  key={g.name}
                  className="flex items-center gap-2 rounded border px-2.5 py-2"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.95rem]">{g.name}</span>
                    <span className="formula block">
                      {weightLabel(g.weight)} · {costLabel(g.cost)}
                    </span>
                  </span>
                  <button
                    className="btn btn-sm btn-primary shrink-0"
                    onClick={() => addItem(g.name, g.weight)}
                  >
                    Add
                  </button>
                </div>
              ))}

            {kind === "weapons" &&
              equipment.weapons.filter((w) => match(w.name)).map((w) => (
                <div
                  key={w.name}
                  className="flex items-center gap-2 rounded border px-2.5 py-2"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.95rem]">{w.name}</span>
                    <span className="formula block truncate">
                      {w.damage}
                      {w.mastery && ` · ${w.mastery}`} · {weightLabel(w.weight)} ·{" "}
                      {costLabel(w.cost)}
                    </span>
                    {w.properties && (
                      <span className="formula block truncate">{w.properties}</span>
                    )}
                  </span>
                  <button
                    className="btn btn-sm btn-primary shrink-0"
                    onClick={() => wieldWeapon(w)}
                  >
                    Add
                  </button>
                </div>
              ))}

            {kind === "armor" &&
              equipment.armor.filter((a) => match(a.name)).map((a) => (
                <div
                  key={a.name}
                  className="flex items-center gap-2 rounded border px-2.5 py-2"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.95rem]">{a.name}</span>
                    <span className="formula block truncate">
                      AC {a.armorClass} · {weightLabel(a.weight)} · {costLabel(a.cost)}
                    </span>
                    {(a.strength || a.stealth) && (
                      <span className="formula block truncate">
                        {[a.strength, a.stealth].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                  <button
                    className="btn btn-sm btn-primary shrink-0"
                    onClick={() => wearArmor(a)}
                  >
                    Wear
                  </button>
                </div>
              ))}
          </div>

          <p className="formula">
            Weapons also become an attack, with the damage and ability filled in.
            Wearing armour sets how your AC is worked out — both still editable.
          </p>

          <hr className="divider" />
          <p className="formula" style={{ fontSize: "0.66rem" }}>
            {SRD_ATTRIBUTION}
          </p>
        </div>
      )}
    </Modal>
  );
}
