"use client";

// Class and species pickers. Choosing one writes the SRD's values onto the
// sheet -- hit dice, saves, proficiencies, and the features themselves, with
// their uses already set. Everything written stays editable afterwards, and
// re-applying replaces only what a previous apply created.

import { useCallback, useEffect, useState } from "react";
import type { Character } from "@/lib/types";
import {
  applyClass,
  applySpecies,
  applySubclass,
  backfillDescriptions,
  countMissingText,
  loadSrd,
  skillChoicesFromTrait,
  SRD_ATTRIBUTION,
  type SrdData,
} from "@/lib/srd";
import { SKILLS } from "@/lib/types";
import { ConfirmButton, NumField, Panel, Select, Toggle } from "@/components/ui";

export function SrdPicker({
  c,
  mut,
}: {
  c: Character;
  mut: (fn: (draft: Character) => Character) => void;
}) {
  const [data, setData] = useState<SrdData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [className, setClassName] = useState("");
  const [classLevel, setClassLevel] = useState(c.level || 1);
  const [speciesName, setSpeciesName] = useState("");
  const [note, setNote] = useState<string | null>(null);
  // null means "follow the sheet": the toggle only pins a choice once the
  // player disagrees with what was worked out from the classes already on it.
  const [multiclassChoice, setMulticlassChoice] = useState<boolean | null>(null);

  const ensureData = useCallback(async () => {
    if (data) return data;
    setLoading(true);
    setError(null);
    try {
      const loaded = await loadSrd();
      setData(loaded);
      return loaded;
    } catch {
      setError("Couldn't load the rules data. You can still fill the sheet in by hand.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [data]);

  // A character that already carries SRD-sourced entries has plainly used this
  // before, so don't make them press Load again after every tab switch. The
  // module caches the data, so this is instant on the second visit.
  const alreadyUsed = c.features.some((f) => f.source.startsWith("srd:"));
  useEffect(() => {
    if (!alreadyUsed) return;
    let cancelled = false;
    loadSrd()
      .then((loaded) => {
        if (!cancelled) setData(loaded);
      })
      .catch(() => {
        // Leave the Load button as the fallback.
      });
    return () => {
      cancelled = true;
    };
  }, [alreadyUsed]);

  // Classes this sheet already carries, read back off the feature sources.
  const appliedClasses = [
    ...new Set(
      c.features
        .map((f) => /^srd:class:(.+)$/.exec(f.source)?.[1])
        .filter((n): n is string => Boolean(n)),
    ),
  ];
  const otherClasses = appliedClasses.filter((n) => n !== shownClass);
  const asMulticlass = multiclassChoice ?? otherClasses.length > 0;

  const doApplyClass = async () => {
    const d = await ensureData();
    if (!d || !shownClass) return;
    let summary: string[] = [];
    mut((draft) => {
      const result = applyClass(draft, d, shownClass, classLevel, asMulticlass);
      summary = result.summary;
      return { ...draft, ...result.patch };
    });
    setNote(`${shownClass} ${classLevel}: ${summary.join(" · ")}`);
  };

  const doApplySubclass = async () => {
    const d = await ensureData();
    if (!d || !shownClass) return;
    let summary: string[] = [];
    mut((draft) => {
      const result = applySubclass(draft, d, shownClass, classLevel);
      summary = result.summary;
      return { ...draft, ...result.patch };
    });
    setNote(summary.join(" · "));
  };

  const doApplySpecies = async () => {
    const d = await ensureData();
    if (!d || !shownSpecies) return;
    let summary: string[] = [];
    mut((draft) => {
      const result = applySpecies(draft, d, shownSpecies);
      summary = result.summary;
      return { ...draft, ...result.patch };
    });
    setNote(`${shownSpecies}: ${summary.join(" · ")}`);
  };

  const classNames = data ? Object.keys(data.classes) : [];
  const speciesNames = data ? Object.keys(data.species) : [];

  // Derive the shown selection rather than syncing state: fall back to what the
  // sheet already says, so returning to this tab doesn't blank the pickers.
  const firstWordOfClass = c.classText.trim().split(/[\s/]+/)[0] ?? "";
  const shownClass =
    className || (data && data.classes[firstWordOfClass] ? firstWordOfClass : "");
  const shownSpecies = speciesName || (data && data.species[c.race] ? c.race : "");
  const missingText = countMissingText(c);
  const subclass = data && shownClass ? data.classes[shownClass]?.subclass : null;

  // The skills this class may choose from, so the sheet can point them out.
  const chosen = data && shownClass ? data.classes[shownClass]?.traits : null;
  const skillInfo = skillChoicesFromTrait(chosen?.["Skill Proficiencies"]);

  return (
    <Panel
      title="Fill from the rules"
      action={
        !data && (
          <button className="btn btn-sm" onClick={ensureData} disabled={loading}>
            {loading ? "Loading…" : "Load"}
          </button>
        )
      }
    >
      {!data ? (
        <p className="text-sm">
          Load the SRD and the sheet can fill in your hit dice, saving throws,
          proficiencies, and class features for you — each one still editable
          afterwards.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <Select
              label="Class"
              className="min-w-36 flex-1"
              value={shownClass}
              options={[
                { value: "", label: "Choose a class…" },
                ...classNames.map((n) => ({ value: n, label: n })),
              ]}
              onChange={setClassName}
            />
            <NumField
              label="Level"
              className="w-20"
              value={classLevel}
              min={1}
              max={20}
              onChange={setClassLevel}
            />
            <button
              className="btn btn-primary"
              disabled={!shownClass}
              onClick={doApplyClass}
            >
              Apply
            </button>
          </div>

          {/*
            Only shown once there's another class on the sheet, because that's
            the only time the question exists. Defaulted on, since getting it
            wrong hands out saving throws the character never earned.
          */}
          {shownClass && otherClasses.length > 0 && (
            <div className="mt-1">
              <Toggle
                label="Additional class (multiclassing)"
                checked={asMulticlass}
                onChange={setMulticlassChoice}
                hint={
                  asMulticlass
                    ? `${otherClasses.join(" and ")} already on this sheet. No saving throws — only a first class grants those — and only some proficiencies.`
                    : `Treated as a first class: full saves and proficiencies. Turn on if ${shownClass} is being added alongside ${otherClasses.join(" and ")}.`
                }
              />
              {asMulticlass && data?.classes[shownClass]?.multiclass?.text && (
                <p className="formula mt-0.5">
                  {data.classes[shownClass]!.multiclass!.text}
                </p>
              )}
            </div>
          )}

          {shownClass && skillInfo.choose > 0 && (
            <p className="formula">
              {shownClass} chooses {skillInfo.choose} skill
              {skillInfo.choose === 1 ? "" : "s"} from{" "}
              {skillInfo.options.length === SKILLS.length
                ? "any on the sheet"
                : skillInfo.options
                    .map((k) => SKILLS.find((s) => s.key === k)?.name)
                    .filter(Boolean)
                    .join(", ")}
              . Tick them yourself — the sheet won&apos;t guess which you picked.
            </p>
          )}

          {/*
            The subclass is a separate choice made at level 3, and the SRD
            publishes only one per class -- so it's offered rather than assumed.
          */}
          {subclass && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 text-sm">
                {shownClass} subclass: <strong>{subclass.name}</strong>
                {classLevel < 3 && (
                  <span className="formula"> — chosen at level 3</span>
                )}
              </span>
              <button
                className="btn"
                disabled={classLevel < 3}
                onClick={doApplySubclass}
              >
                Apply
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <Select
              label="Species"
              className="min-w-36 flex-1"
              value={shownSpecies}
              options={[
                { value: "", label: "Choose a species…" },
                ...speciesNames.map((n) => ({ value: n, label: n })),
              ]}
              onChange={setSpeciesName}
            />
            <button
              className="btn btn-primary"
              disabled={!shownSpecies}
              onClick={doApplySpecies}
            >
              Apply
            </button>
          </div>

          {note && (
            <p className="text-sm" style={{ color: "var(--good)" }}>
              Added — {note}
            </p>
          )}

          {/*
            Characters built before the rules text shipped have entries with no
            description. Offer to fill just that in, rather than making them
            re-apply the whole class and lose any uses they'd spent.
          */}
          {missingText > 0 && (
            <div
              className="rounded border px-2.5 py-2"
              style={{ borderColor: "var(--warn)" }}
            >
              <p className="text-sm">
                {missingText} entr{missingText === 1 ? "y has" : "ies have"} no rules
                text — they were added before the sheet carried it.
              </p>
              <button
                className="btn btn-sm mt-2"
                onClick={() => {
                  let filled = 0;
                  mut((draft) => {
                    const result = backfillDescriptions(draft, data);
                    filled = result.filled;
                    return { ...draft, features: result.features };
                  });
                  setNote(
                    filled
                      ? `filled in ${filled} description${filled === 1 ? "" : "s"}`
                      : "nothing left to fill in",
                  );
                }}
              >
                Fill in the missing text
              </button>
            </div>
          )}

          <p className="formula">
            Applying again replaces only what it added before, so anything you
            typed yourself is left alone.
          </p>

          {c.features.some((f) => f.source) && (
            <ConfirmButton
              className="btn btn-sm btn-danger"
              onConfirm={() =>
                mut((d) => ({
                  ...d,
                  features: d.features.filter((f) => !f.source),
                }))
              }
            >
              Remove everything the rules added
            </ConfirmButton>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      )}

      {/* CC-BY-4.0 requires this attribution wherever the material is used. */}
      {data && (
        <>
          <hr className="divider my-3" />
          <p className="formula" style={{ fontSize: "0.66rem" }}>
            {SRD_ATTRIBUTION}
          </p>
        </>
      )}
    </Panel>
  );
}
