"use client";

import { useState } from "react";
import { newId } from "@/lib/types";
import { carryInfo, round2, totalGp } from "@/lib/rules";
import {
  ConfirmButton,
  Empty,
  NumberInput,
  NumField,
  Panel,
  TextArea,
  Toggle,
} from "@/components/ui";
import type { SheetProps } from "./shared";

const COINS = [
  { key: "pp", label: "Platinum" },
  { key: "gp", label: "Gold" },
  { key: "ep", label: "Electrum" },
  { key: "sp", label: "Silver" },
  { key: "cp", label: "Copper" },
] as const;

export function GearTab({ c, set, mut }: SheetProps) {
  const [filter, setFilter] = useState("");
  const carry = carryInfo(c);

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
        { id: newId(), name: "", qty: 1, weight: 0, equipped: false, notes: "" },
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

      <Panel title="Money">
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
          <button className="btn btn-sm" onClick={addItem}>
            + Add
          </button>
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
                    value={item.name}
                    placeholder="Item name"
                    onChange={(e) =>
                      mut((d) => ({
                        ...d,
                        inventory: d.inventory.map((x) =>
                          x.id === item.id ? { ...x, name: e.target.value } : x,
                        ),
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
                <div className="w-20">
                  <span className="label mb-1 block">Total</span>
                  <div className="stat-box py-2">
                    <span className="stat-value text-sm">
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
              </div>
            ))}
          </div>
        )}
      </Panel>

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
