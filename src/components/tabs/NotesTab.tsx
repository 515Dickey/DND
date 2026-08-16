"use client";

import { newId } from "@/lib/types";
import { exportCharacter } from "@/lib/storage";
import { ConfirmButton, Empty, Field, Panel, TextArea } from "@/components/ui";
import type { SheetProps } from "./shared";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NotesTab({ c, set, mut }: SheetProps) {
  const journal = [...c.journal].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Panel title="Features & Traits">
          <TextArea
            value={c.features}
            onChange={(v) => set({ features: v })}
            rows={10}
            placeholder={"Second Wind (1/short rest)\nAction Surge\nFighting Style: Defense (+1 AC in armor)"}
          />
          <p className="formula mt-1.5">
            Class features, racial traits, feats — anything you need to remember
            mid-fight.
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
    </div>
  );
}
