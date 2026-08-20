"use client";

import { useState } from "react";
import { type FeatureEntry, newId } from "@/lib/types";
import { exportCharacter } from "@/lib/storage";
import {
  ConfirmButton,
  Empty,
  Field,
  Modal,
  Panel,
  TextArea,
} from "@/components/ui";
import type { SheetProps } from "./shared";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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
            <div className="space-y-1.5">
              {c.features.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOpenFeature(f.id)}
                  className="flex w-full items-center gap-2 rounded border px-2.5 py-2 text-left"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.95rem] leading-tight">
                      {f.name || <em className="text-ink-faint">Untitled</em>}
                    </span>
                    {f.note && <span className="formula block truncate">{f.note}</span>}
                  </span>
                  {f.detail.trim() && (
                    <span className="label shrink-0">details</span>
                  )}
                  <span
                    className="shrink-0 text-xs"
                    style={{ color: "var(--ink-faint)" }}
                    aria-hidden="true"
                  >
                    ▶
                  </span>
                </button>
              ))}
            </div>
          )}
          <p className="formula mt-2">
            Tap any entry to read or edit its full text.
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
            <TextArea
              label="Details"
              value={active.detail}
              rows={10}
              placeholder="On your turn, you can take one additional action."
              onChange={(v) => patchFeature(active.id, { detail: v })}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
