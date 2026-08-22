"use client";

import { useState } from "react";
import { newId } from "@/lib/types";
import {
  attunedCount,
  carryInfo,
  containedWeight,
  inventoryLocations,
  itemWeightStatus,
  MAGIC_CONTAINERS,
  matchMagicContainer,
  round2,
  stowedWeight,
  totalGp,
} from "@/lib/rules";
import {
  ConfirmButton,
  Empty,
  NumberInput,
  NumField,
  Panel,
  TextArea,
  Toggle,
} from "@/components/ui";
import { GearBrowser } from "@/components/GearBrowser";
import type { SheetProps } from "./shared";

const COINS = [
  { key: "pp", label: "Platinum" },
  { key: "gp", label: "Gold" },
  { key: "ep", label: "Electrum" },
  { key: "sp", label: "Silver" },
  { key: "cp", label: "Copper" },
] as const;

const DEFAULT_LOCATIONS = [
  "Worn",
  "Belt",
  "Backpack",
  "Pouch",
  "Mount",
  "Camp",
];

/** A small on/off badge, for the equipped / stowed / attuned states. */
function StateChip({
  label,
  active,
  onToggle,
  hint,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      title={hint}
      className="label rounded-full border px-2 py-1"
      style={{
        borderColor: active ? "var(--accent)" : "var(--rule)",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "var(--paper-hi)" : "var(--ink-faint)",
      }}
    >
      {label}
    </button>
  );
}

export function GearTab({ c, set, mut }: SheetProps) {
  const [filter, setFilter] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const carry = carryInfo(c);
  const stowed = stowedWeight(c);
  const contained = containedWeight(c);
  const attuned = attunedCount(c);

  const barColor =
    carry.status === "overloaded" || carry.status === "heavy"
      ? "var(--bad)"
      : carry.status === "encumbered"
        ? "var(--warn)"
        : "var(--good)";

  const items = c.inventory.filter((i) =>
    filter.trim()
      ? i.name.toLowerCase().includes(filter.trim().toLowerCase())
      : true,
  );

  const addItem = () =>
    mut((d) => ({
      ...d,
      inventory: [
        ...d.inventory,
        {
          id: newId(),
          name: "",
          qty: 1,
          weight: 0,
          equipped: false,
          notes: "",
          location: "",
          carried: true,
          attuned: false,
          weightless: false,
        },
      ],
    }));

  return (
    <div className="space-y-4">
      <Panel title="Carrying Capacity">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="stat-box">
            <div className="label">Carried</div>
            <div className="stat-value text-2xl">{carry.weight}</div>
            <div className="formula mt-0.5">lb</div>
          </div>
          <div className="stat-box">
            <div className="label">Capacity</div>
            <div className="stat-value text-2xl">{carry.capacity}</div>
            <div className="formula mt-0.5">STR × 15</div>
          </div>
          <div className="stat-box">
            <div className="label">Push / drag / lift</div>
            <div className="stat-value text-2xl">{carry.pushDragLift}</div>
            <div className="formula mt-0.5">lb</div>
          </div>
          <div className="stat-box">
            <div className="label">Status</div>
            <div className="stat-value text-base" style={{ color: barColor }}>
              {carry.statusLabel}
            </div>
            <div className="formula mt-0.5">
              {Math.round(carry.percent)}% of capacity
            </div>
          </div>
        </div>

        <div
          className="mt-3 h-3 w-full overflow-hidden rounded-full border"
          style={{ borderColor: "var(--rule-strong)", background: "rgba(0,0,0,0.08)" }}
        >
          <div
            className="h-full transition-all"
            style={{ width: `${carry.percent}%`, background: barColor }}
          />
        </div>

        {carry.effect && (
          <p className="mt-2 text-sm" style={{ color: barColor }}>
            {carry.effect}
          </p>
        )}

        {stowed > 0 && (
          <p className="formula mt-2">
            A further {stowed} lb is marked stowed — on a mount or back at camp —
            so it isn&apos;t counted against you.
          </p>
        )}

        {contained > 0 && (
          <p className="formula mt-1" style={{ color: "var(--good)" }}>
            {contained} lb sits inside magic containers and weighs nothing. The
            container&apos;s own weight still counts, as it should.
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="stat-box min-w-28">
            <div className="label">Attuned items</div>
            <div
              className="stat-value text-2xl"
              style={{
                color: attuned > c.attunementMax ? "var(--bad)" : "var(--ink)",
              }}
            >
              {attuned}
              <span className="text-sm font-normal">/{c.attunementMax}</span>
            </div>
            <div className="formula mt-0.5">
              {attuned > c.attunementMax ? "over the limit" : "magic items"}
            </div>
          </div>
          <NumField
            label="Attunement limit"
            className="w-28"
            value={c.attunementMax}
            min={0}
            max={10}
            onChange={(v) => set({ attunementMax: v })}
          />
        </div>

        <hr className="divider my-3" />

        <Toggle
          label="Use the variant encumbrance rule"
          hint={`Slows you down past ${carry.encumberedAt} lb and again past ${carry.heavilyEncumberedAt} lb. Off by default, matching the basic rules.`}
          checked={c.useVariantEncumbrance}
          onChange={(v) => set({ useVariantEncumbrance: v })}
        />
        <Toggle
          label="Count coin weight"
          hint="50 coins weigh a pound."
          checked={c.countCoinWeight}
          onChange={(v) => set({ countCoinWeight: v })}
        />
        <NumField
          label="Capacity bonus (Powerful Build, etc.)"
          className="mt-2 max-w-56"
          value={c.carryMisc}
          onChange={(v) => set({ carryMisc: v })}
        />
      </Panel>

      {/*
        Waukeen, goddess of trade and coin, minding the purse. Small and at full
        strength rather than a watermark -- this one is meant to be seen.
      */}
      <Panel
        title="Money"
        action={
          <span
            className="deity deity-waukeen block size-6 opacity-40"
            aria-hidden="true"
          />
        }
      >
        <div className="grid grid-cols-5 gap-1.5">
          {COINS.map((coin) => (
            <label key={coin.key} className="block">
              <span className="label mb-1 block">{coin.key.toUpperCase()}</span>
              <NumberInput
                value={c.currency[coin.key]}
                min={0}
                ariaLabel={coin.label}
                onChange={(v) =>
                  mut((d) => ({ ...d, currency: { ...d.currency, [coin.key]: v } }))
                }
              />
            </label>
          ))}
        </div>
        <p className="formula mt-2">
          Worth {totalGp(c)} gp in total
          {c.countCoinWeight &&
            ` · coins weigh ${round2(
              (c.currency.cp +
                c.currency.sp +
                c.currency.ep +
                c.currency.gp +
                c.currency.pp) /
                50,
            )} lb`}
          .
        </p>
      </Panel>

      <Panel
        title="Equipment"
        action={
          <span className="flex gap-1.5">
            <button className="btn btn-sm" onClick={() => setBrowsing(true)}>
              From the rules
            </button>
            <button className="btn btn-sm" onClick={addItem}>
              + Add
            </button>
          </span>
        }
      >
        {c.inventory.length > 3 && (
          <input
            className="ink-field mb-2.5"
            value={filter}
            placeholder="Search your pack…"
            onChange={(e) => setFilter(e.target.value)}
          />
        )}

        {c.inventory.length === 0 ? (
          <Empty>Your pack is empty. Add rope, rations, and regrets.</Empty>
        ) : items.length === 0 ? (
          <Empty>Nothing matches “{filter}”.</Empty>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-end gap-2 border-b pb-2.5 last:border-0"
                style={{ borderColor: "var(--rule)" }}
              >
                {/* Name takes the whole first line on a phone, shares it on a tablet. */}
                <label className="min-w-[10rem] flex-1">
                  <span className="label mb-1 block">Item</span>
                  <input
                    className="ink-field"
                    list="gear-known-items"
                    value={item.name}
                    placeholder="Item name"
                    onChange={(e) =>
                      mut((d) => ({
                        ...d,
                        inventory: d.inventory.map((x) => {
                          if (x.id !== item.id) return x;
                          const name = e.target.value;
                          const wasKnown = matchMagicContainer(x.name);
                          const known = matchMagicContainer(name);
                          // Recognise the name and tick the flag for them, but
                          // only on the edit that newly matches, so unticking
                          // it by hand isn't undone on the next keystroke.
                          if (known && !wasKnown) {
                            return {
                              ...x,
                              name,
                              weightless: true,
                              weight: x.weight === 0 ? known.weight : x.weight,
                            };
                          }
                          return { ...x, name };
                        }),
                      }))
                    }
                  />
                </label>
                <label className="w-16">
                  <span className="label mb-1 block">Qty</span>
                  <NumberInput
                    value={item.qty}
                    min={0}
                    ariaLabel={`${item.name || "item"} quantity`}
                    onChange={(v) =>
                      mut((d) => ({
                        ...d,
                        inventory: d.inventory.map((x) =>
                          x.id === item.id ? { ...x, qty: v } : x,
                        ),
                      }))
                    }
                  />
                </label>
                <label className="w-20">
                  <span className="label mb-1 block">Wt ea</span>
                  <NumberInput
                    value={item.weight}
                    min={0}
                    allowDecimal
                    ariaLabel={`${item.name || "item"} weight`}
                    onChange={(v) =>
                      mut((d) => ({
                        ...d,
                        inventory: d.inventory.map((x) =>
                          x.id === item.id ? { ...x, weight: v } : x,
                        ),
                      }))
                    }
                  />
                </label>
                <label className="min-w-[7rem] flex-1">
                  <span className="label mb-1 block">Where</span>
                  <input
                    className="ink-field"
                    list="gear-locations"
                    value={item.location}
                    placeholder="Backpack"
                    aria-label={`${item.name || "item"} location`}
                    onChange={(e) =>
                      mut((d) => ({
                        ...d,
                        inventory: d.inventory.map((x) =>
                          x.id === item.id ? { ...x, location: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </label>
                <div className="w-20">
                  <span className="label mb-1 block">Total</span>
                  <div className="stat-box py-2">
                    <span
                      className="stat-value text-sm"
                      style={{
                        color:
                          itemWeightStatus(c, item) === "counted"
                            ? "var(--ink)"
                            : "var(--ink-faint)",
                      }}
                    >
                      {round2(item.qty * item.weight)}
                    </span>
                  </div>
                </div>
                <ConfirmButton
                  className="btn btn-danger"
                  confirmLabel="✓"
                  onConfirm={() =>
                    mut((d) => ({
                      ...d,
                      inventory: d.inventory.filter((x) => x.id !== item.id),
                    }))
                  }
                >
                  ✕
                </ConfirmButton>

                {/* State badges. Each is a toggle, so no menus to hunt through. */}
                <div className="flex w-full flex-wrap gap-1.5">
                  <StateChip
                    label="Equipped"
                    active={item.equipped}
                    onToggle={() =>
                      mut((d) => ({
                        ...d,
                        inventory: d.inventory.map((x) =>
                          x.id === item.id ? { ...x, equipped: !x.equipped } : x,
                        ),
                      }))
                    }
                  />
                  <StateChip
                    label={item.carried ? "On me" : "Stowed"}
                    active={item.carried}
                    onToggle={() =>
                      mut((d) => ({
                        ...d,
                        inventory: d.inventory.map((x) =>
                          x.id === item.id ? { ...x, carried: !x.carried } : x,
                        ),
                      }))
                    }
                    hint={
                      item.carried
                        ? "Counts against your carrying capacity"
                        : "Left behind — not counted"
                    }
                  />
                  <StateChip
                    label="Attuned"
                    active={item.attuned}
                    onToggle={() =>
                      mut((d) => ({
                        ...d,
                        inventory: d.inventory.map((x) =>
                          x.id === item.id ? { ...x, attuned: !x.attuned } : x,
                        ),
                      }))
                    }
                  />
                  <StateChip
                    label="Contents weightless"
                    active={item.weightless}
                    hint="Anything whose Where names this item stops counting against capacity"
                    onToggle={() =>
                      mut((d) => ({
                        ...d,
                        inventory: d.inventory.map((x) =>
                          x.id === item.id ? { ...x, weightless: !x.weightless } : x,
                        ),
                      }))
                    }
                  />
                  {itemWeightStatus(c, item) === "inContainer" && (
                    // Not .label here: that uppercases, which shouts and mangles
                    // the container's own capitalisation.
                    <span
                      className="self-center text-xs"
                      style={{ color: "var(--good)" }}
                    >
                      weighs nothing — inside {item.location}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <datalist id="gear-known-items">
          {MAGIC_CONTAINERS.map((cont) => (
            <option
              key={cont.match}
              value={cont.label}
            />
          ))}
        </datalist>
        <datalist id="gear-locations">
          {[
            ...new Set([
              ...DEFAULT_LOCATIONS,
              ...c.inventory.filter((i) => i.weightless && i.name.trim()).map((i) => i.name.trim()),
              ...inventoryLocations(c),
            ]),
          ].map((loc) => (
            <option key={loc} value={loc} />
          ))}
        </datalist>
      </Panel>

      {browsing && (
        <GearBrowser mut={mut} onClose={() => setBrowsing(false)} />
      )}

      <Panel title="Treasure & Notes">
        <TextArea
          value={c.treasure}
          onChange={(v) => set({ treasure: v })}
          rows={4}
          placeholder="Gems, art objects, the deed to a haunted mill…"
        />
      </Panel>
    </div>
  );
}
