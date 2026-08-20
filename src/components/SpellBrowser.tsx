"use client";

// Search the SRD spell list and add spells to the sheet, complete with their
// stat block and full rules text. Nothing is locked afterwards: an added spell
// is an ordinary entry you can rename, re-level, or rewrite.

import { useEffect, useState } from "react";
import type { Character, SpellEntry } from "@/lib/types";
import {
  loadSpells,
  searchSpells,
  SRD_ATTRIBUTION,
  type SrdSpell,
  type SrdSpellData,
  toSpellEntry,
} from "@/lib/srd";
import { Modal, Select } from "@/components/ui";

const LEVEL_LABELS = [
  "Cantrip",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
];

/** A compact one-line summary for a search result. */
function summarise(s: SrdSpell): string {
  const bits = [
    s.level === 0 ? `${s.school} cantrip` : `${LEVEL_LABELS[s.level]}-level ${s.school}`,
    s.castingTime,
    s.range,
  ];
  if (s.concentration) bits.push("concentration");
  if (s.ritual) bits.push("ritual");
  return bits.filter(Boolean).join(" · ");
}

export function SpellBrowser({
  c,
  mut,
  onClose,
}: {
  c: Character;
  mut: (fn: (draft: Character) => Character) => void;
  onClose: () => void;
}) {
  const [data, setData] = useState<SrdSpellData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<string>("any");
  const [forClass, setForClass] = useState<string>("any");
  const [added, setAdded] = useState<string[]>([]);
  const [preview, setPreview] = useState<SrdSpell | null>(null);

  // The browser is only mounted when asked for, so fetch on mount.
  useEffect(() => {
    let cancelled = false;
    loadSpells()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the spell list.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const classOptions = data
    ? [...new Set(data.spells.flatMap((s) => s.classes))].sort()
    : [];

  const results = data
    ? searchSpells(data, query, {
        level: level === "any" ? null : Number(level),
        forClass: forClass === "any" ? undefined : forClass,
      })
    : [];

  // Already on the sheet? Then offer nothing but a reminder.
  const onSheet = new Set(c.spells.map((s) => s.name.trim().toLowerCase()));

  const add = (spell: SrdSpell) => {
    const entry: SpellEntry = toSpellEntry(spell);
    mut((d) => ({ ...d, spells: [...d.spells, entry] }));
    setAdded((prev) => [...prev, spell.name]);
  };

  return (
    <Modal title="Spells from the rules" onClose={onClose}>
      {error ? (
        <p className="text-sm" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      ) : !data ? (
        <p className="text-sm">Loading the spell list…</p>
      ) : (
        <div className="space-y-2.5">
          <input
            className="ink-field"
            value={query}
            placeholder="Search by name, school, or class…"
            aria-label="Search spells"
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex gap-2">
            <Select
              label="Level"
              className="flex-1"
              value={level}
              options={[
                { value: "any", label: "Any level" },
                ...LEVEL_LABELS.map((l, i) => ({ value: String(i), label: l })),
              ]}
              onChange={setLevel}
            />
            <Select
              label="Spell list"
              className="flex-1"
              value={forClass}
              options={[
                { value: "any", label: "Any class" },
                ...classOptions.map((n) => ({ value: n, label: n })),
              ]}
              onChange={setForClass}
            />
          </div>

          <p className="formula">
            {results.length} spell{results.length === 1 ? "" : "s"} match
            {added.length > 0 && ` · ${added.length} added`}
          </p>

          <div className="space-y-1.5">
            {results.slice(0, 60).map((s) => {
              const have = onSheet.has(s.name.toLowerCase()) || added.includes(s.name);
              return (
                <div
                  key={s.name}
                  className="rounded border px-2.5 py-2"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setPreview(preview?.name === s.name ? null : s)}
                    >
                      <span className="block truncate text-[0.95rem] leading-tight">
                        {s.name}
                      </span>
                      <span className="formula block truncate">{summarise(s)}</span>
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm shrink-0 ${have ? "" : "btn-primary"}`}
                      disabled={have}
                      onClick={() => add(s)}
                    >
                      {have ? "On sheet" : "Add"}
                    </button>
                  </div>
                  {preview?.name === s.name && (
                    <div className="mt-2 space-y-1">
                      <p className="formula not-italic">
                        <strong>Casting time</strong> {s.castingTime} ·{" "}
                        <strong>Range</strong> {s.range} · <strong>Components</strong>{" "}
                        {s.components} · <strong>Duration</strong> {s.duration}
                      </p>
                      <p className="text-sm">{s.text}</p>
                      <p className="formula">On the {s.classes.join(", ")} list.</p>
                    </div>
                  )}
                </div>
              );
            })}
            {results.length > 60 && (
              <p className="formula">
                Showing the first 60 of {results.length}. Narrow the search to see
                the rest — nothing is hidden permanently.
              </p>
            )}
            {results.length === 0 && (
              <p className="py-4 text-center text-sm italic text-ink-faint">
                Nothing matches that.
              </p>
            )}
          </div>

          <hr className="divider" />
          <p className="formula" style={{ fontSize: "0.66rem" }}>
            {SRD_ATTRIBUTION}
          </p>
        </div>
      )}
    </Modal>
  );
}
