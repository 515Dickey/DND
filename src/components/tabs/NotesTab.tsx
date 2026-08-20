"use client";

import { useState } from "react";
import {
  DEFAULT_FEATURE_GROUPS,
  type FeatureEntry,
  newId,
  type Recharge,
  RECHARGE_LABEL,
} from "@/lib/types";
import { exportCharacter } from "@/lib/storage";
import {
  ConfirmButton,
  Empty,
  Field,
  Modal,
  NumField,
  Panel,
  Select,
  TextArea,
} from "@/components/ui";
import type { SheetProps } from "./shared";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Section names to offer in the picker: the usual ones plus any already used. */
function groupSuggestions(features: FeatureEntry[]): string[] {
  const used = features.map((f) => f.group.trim()).filter(Boolean);
  return [...new Set([...DEFAULT_FEATURE_GROUPS, ...used])];
}

/**
 * Buckets features by section for display. Known sections come first in their
 * conventional order, then any custom ones alphabetically, then anything
 * ungrouped last under a blank heading.
 */
function groupFeatures(features: FeatureEntry[]): [string, FeatureEntry[]][] {
  const buckets = new Map<string, FeatureEntry[]>();
  for (const f of features) {
    const key = f.group.trim();
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(f);
  }

  const known = DEFAULT_FEATURE_GROUPS.filter((g) => buckets.has(g));
  const custom = [...buckets.keys()]
    .filter((k) => k && !DEFAULT_FEATURE_GROUPS.includes(k))
    .sort((a, b) => a.localeCompare(b));
  const order = [...known, ...custom];
  if (buckets.has("")) order.push("");

  return order.map((key) => [key, buckets.get(key)!]);
}

/** Tappable use boxes, mirroring the spell-slot pips. */
function UsePips({
  feature,
  onSpend,
}: {
  feature: FeatureEntry;
  onSpend: (usesSpent: number) => void;
}) {
  const left = feature.usesMax - feature.usesSpent;

  // Past a handful of uses, boxes stop being readable on a phone.
  if (feature.usesMax > 8) {
    return (
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="stat-value text-sm">
          {left}
          <span className="font-normal text-ink-faint">/{feature.usesMax}</span>
        </span>
        <button
          type="button"
          className="btn btn-sm"
          disabled={left <= 0}
          onClick={() => onSpend(feature.usesSpent + 1)}
        >
          Use
        </button>
      </span>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-1">
      {Array.from({ length: feature.usesMax }, (_, i) => {
        const spent = i < feature.usesSpent;
        return (
          <button
            key={i}
            type="button"
            aria-label={`${feature.name || "Feature"} use ${i + 1}${spent ? " (spent)" : ""}`}
            aria-pressed={spent}
            onClick={() => onSpend(spent ? i : i + 1)}
            className="h-5 w-5 rounded-sm border-2 transition-colors"
            style={{
              borderColor: spent ? "var(--ink-faint)" : "var(--accent)",
              background: spent ? "transparent" : "var(--accent)",
            }}
          />
        );
      })}
    </span>
  );
}

function FeatureRow({
  feature,
  onOpen,
  onSpend,
}: {
  feature: FeatureEntry;
  onOpen: () => void;
  onSpend: (usesSpent: number) => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded border px-2.5 py-1.5"
      style={{ borderColor: "var(--rule)" }}
    >
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[0.95rem] leading-tight">
          {feature.name || <em className="text-ink-faint">Untitled</em>}
        </span>
        {feature.note && (
          <span className="formula block truncate">{feature.note}</span>
        )}
      </button>
      {feature.usesMax > 0 && <UsePips feature={feature} onSpend={onSpend} />}
      {feature.detail.trim() && (
        <span className="label shrink-0" aria-hidden="true">
          details
        </span>
      )}
      <button
        type="button"
        onClick={onOpen}
        className="shrink-0 text-xs"
        style={{ color: "var(--ink-faint)" }}
        aria-label={`Open ${feature.name || "feature"}`}
      >
        ▶
      </button>
    </div>
  );
}

export function NotesTab({ c, set, mut }: SheetProps) {
  const journal = [...c.journal].sort((a, b) => b.date.localeCompare(a.date));
  const [openFeature, setOpenFeature] = useState<string | null>(null);
  const active = c.features.find((f) => f.id === openFeature) ?? null;

  const patchFeature = (id: string, patch: Partial<FeatureEntry>) =>
    mut((d) => ({
      ...d,
      features: d.features.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Panel
          title="Features & Traits"
          action={
            <button
              className="btn btn-sm"
              onClick={() => {
                const entry: FeatureEntry = {
                  id: newId(),
                  name: "",
                  note: "",
                  detail: "",
                  usesMax: 0,
                  usesSpent: 0,
                  recharge: "none",
                  group: "",
                  source: "",
                };
                mut((d) => ({ ...d, features: [...d.features, entry] }));
                // Open it straight away -- a blank row is no use on its own.
                setOpenFeature(entry.id);
              }}
            >
              + Add
            </button>
          }
        >
          {c.features.length === 0 ? (
            <Empty>
              Nothing yet. Add Second Wind, Darkvision, your Fighting Style —
              anything you want to remember mid-fight.
            </Empty>
          ) : (
            <div className="space-y-3">
              {groupFeatures(c.features).map(([groupName, entries]) => (
                <div key={groupName || "__ungrouped"}>
                  {groupName && (
                    <div
                      className="label mb-1 border-b pb-0.5"
                      style={{ borderColor: "var(--rule)", color: "var(--accent)" }}
                    >
                      {groupName}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {entries.map((f) => (
                      <FeatureRow
                        key={f.id}
                        feature={f}
                        onOpen={() => setOpenFeature(f.id)}
                        onSpend={(usesSpent) => patchFeature(f.id, { usesSpent })}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="formula mt-2">
            Tap a name to read or edit it · tap a box to spend a use.
          </p>
        </Panel>

        <Panel title="Personality">
          <div className="space-y-2.5">
            <TextArea
              label="Personality traits"
              value={c.personality}
              onChange={(v) => set({ personality: v })}
              rows={2}
            />
            <TextArea
              label="Ideals"
              value={c.ideals}
              onChange={(v) => set({ ideals: v })}
              rows={2}
            />
            <TextArea
              label="Bonds"
              value={c.bonds}
              onChange={(v) => set({ bonds: v })}
              rows={2}
            />
            <TextArea
              label="Flaws"
              value={c.flaws}
              onChange={(v) => set({ flaws: v })}
              rows={2}
            />
          </div>
        </Panel>

        <Panel title="Appearance & Backstory">
          <TextArea
            label="Appearance"
            value={c.appearance}
            onChange={(v) => set({ appearance: v })}
            rows={3}
          />
          <TextArea
            label="Backstory"
            className="mt-2.5"
            value={c.backstory}
            onChange={(v) => set({ backstory: v })}
            rows={6}
          />
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Scratch Pad">
          <TextArea
            value={c.notes}
            onChange={(v) => set({ notes: v })}
            rows={8}
            placeholder="NPC names, the innkeeper's suspicious cousin, that door you couldn't open…"
          />
        </Panel>

        <Panel
          title="Session Journal"
          action={
            <button
              className="btn btn-sm"
              onClick={() =>
                mut((d) => ({
                  ...d,
                  journal: [
                    {
                      id: newId(),
                      date: todayISO(),
                      title: "",
                      body: "",
                    },
                    ...d.journal,
                  ],
                }))
              }
            >
              + Entry
            </button>
          }
        >
          {journal.length === 0 ? (
            <Empty>No sessions logged yet.</Empty>
          ) : (
            <div className="space-y-3">
              {journal.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded border p-2.5"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <div className="flex gap-2">
                    <Field
                      label="Date"
                      className="w-36 shrink-0"
                      type="date"
                      value={entry.date}
                      onChange={(v) =>
                        mut((d) => ({
                          ...d,
                          journal: d.journal.map((x) =>
                            x.id === entry.id ? { ...x, date: v } : x,
                          ),
                        }))
                      }
                    />
                    <Field
                      label="Title"
                      className="flex-1"
                      value={entry.title}
                      placeholder="The bridge at Kelder's Ford"
                      onChange={(v) =>
                        mut((d) => ({
                          ...d,
                          journal: d.journal.map((x) =>
                            x.id === entry.id ? { ...x, title: v } : x,
                          ),
                        }))
                      }
                    />
                  </div>
                  <TextArea
                    className="mt-2"
                    value={entry.body}
                    rows={4}
                    placeholder="What happened, what we're owed, who we annoyed."
                    onChange={(v) =>
                      mut((d) => ({
                        ...d,
                        journal: d.journal.map((x) =>
                          x.id === entry.id ? { ...x, body: v } : x,
                        ),
                      }))
                    }
                  />
                  <div className="mt-2">
                    <ConfirmButton
                      onConfirm={() =>
                        mut((d) => ({
                          ...d,
                          journal: d.journal.filter((x) => x.id !== entry.id),
                        }))
                      }
                    >
                      Delete entry
                    </ConfirmButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="This Character's File">
          <p className="text-sm">
            Saved on this device only. Export a copy before clearing your browser data,
            switching tablets, or handing the character to someone else.
          </p>
          <button className="btn mt-2.5" onClick={() => exportCharacter(c)}>
            Export {c.name || "character"}
          </button>
          <p className="formula mt-2">
            Last edited {new Date(c.updatedAt).toLocaleString()}.
          </p>
        </Panel>
      </div>

      {active && (
        <Modal
          title={active.name || "New feature"}
          onClose={() => setOpenFeature(null)}
          footer={
            <>
              <button className="btn flex-1" onClick={() => setOpenFeature(null)}>
                Done
              </button>
              <ConfirmButton
                className="btn btn-danger"
                onConfirm={() => {
                  const id = active.id;
                  setOpenFeature(null);
                  mut((d) => ({
                    ...d,
                    features: d.features.filter((f) => f.id !== id),
                  }));
                }}
              >
                Delete
              </ConfirmButton>
            </>
          }
        >
          <div className="space-y-2.5">
            <Field
              label="Name"
              value={active.name}
              placeholder="Action Surge"
              onChange={(v) => patchFeature(active.id, { name: v })}
            />
            <Field
              label="Short note (shown on the list)"
              value={active.note}
              placeholder="1/short rest · Fighter 2"
              onChange={(v) => patchFeature(active.id, { note: v })}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="label mb-1 block">Section</span>
                <input
                  className="ink-field"
                  list="feature-groups"
                  value={active.group}
                  placeholder="Class"
                  onChange={(e) => patchFeature(active.id, { group: e.target.value })}
                />
                <datalist id="feature-groups">
                  {groupSuggestions(c.features).map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </label>
              <NumField
                label="Uses (0 = unlimited)"
                value={active.usesMax}
                min={0}
                max={20}
                onChange={(v) =>
                  patchFeature(active.id, {
                    usesMax: v,
                    usesSpent: Math.min(active.usesSpent, v),
                  })
                }
              />
            </div>
            {active.usesMax > 0 && (
              <div className="grid grid-cols-2 items-end gap-2.5">
                <Select
                  label="Uses come back on"
                  value={active.recharge}
                  options={(Object.keys(RECHARGE_LABEL) as Recharge[]).map((r) => ({
                    value: r,
                    label: RECHARGE_LABEL[r],
                  }))}
                  onChange={(v) => patchFeature(active.id, { recharge: v })}
                />
                <button
                  className="btn"
                  onClick={() => patchFeature(active.id, { usesSpent: 0 })}
                  disabled={active.usesSpent === 0}
                >
                  Reset uses
                </button>
              </div>
            )}
            <TextArea
              label="Details"
              value={active.detail}
              rows={9}
              placeholder="On your turn, you can take one additional action."
              onChange={(v) => patchFeature(active.id, { detail: v })}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
