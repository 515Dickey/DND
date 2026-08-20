"use client";

// The SRD's feats, grouped by category. Short enough that it needs no search:
// seventeen entries, all visible at once.

import { useEffect, useState } from "react";
import type { Character } from "@/lib/types";
import {
  featSource,
  loadSrd,
  SRD_ATTRIBUTION,
  type SrdFeat,
  toFeatEntry,
} from "@/lib/srd";
import { Modal } from "@/components/ui";

const CATEGORY_ORDER = ["Origin", "General", "Fighting Style", "Epic Boon"];

export function FeatBrowser({
  c,
  mut,
  onClose,
}: {
  c: Character;
  mut: (fn: (draft: Character) => Character) => void;
  onClose: () => void;
}) {
  const [feats, setFeats] = useState<SrdFeat[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSrd()
      .then((d) => {
        if (!cancelled) setFeats(d.feats ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the feat list.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSheet = new Set(c.features.map((f) => f.source));

  const add = (feat: SrdFeat) => {
    const entry = toFeatEntry(feat);
    mut((d) => ({ ...d, features: [...d.features, entry] }));
  };

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: (feats ?? []).filter((f) => f.category === cat),
  })).filter((g) => g.items.length);

  return (
    <Modal title="Feats from the rules" onClose={onClose}>
      {error ? (
        <p className="text-sm" style={{ color: "var(--bad)" }}>
          {error}
        </p>
      ) : !feats ? (
        <p className="text-sm">Loading…</p>
      ) : (
        <div className="space-y-3">
          {grouped.map((g) => (
            <div key={g.cat}>
              <div
                className="label mb-1 border-b pb-0.5"
                style={{ borderColor: "var(--rule)", color: "var(--accent)" }}
              >
                {g.cat}
              </div>
              <div className="space-y-1.5">
                {g.items.map((f) => {
                  const have = onSheet.has(featSource(f.name));
                  return (
                    <div
                      key={f.name}
                      className="rounded border px-2.5 py-2"
                      style={{ borderColor: "var(--rule)" }}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => setOpen(open === f.name ? null : f.name)}
                        >
                          <span className="block truncate text-[0.95rem] leading-tight">
                            {f.name}
                          </span>
                          {f.prerequisite && (
                            <span className="formula block truncate">
                              needs {f.prerequisite}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm shrink-0 ${have ? "" : "btn-primary"}`}
                          disabled={have}
                          onClick={() => add(f)}
                        >
                          {have ? "On sheet" : "Add"}
                        </button>
                      </div>
                      {open === f.name && (
                        <p className="mt-2 text-sm">{f.text}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <p className="formula">
            These are the feats the SRD publishes. Anything from a full rulebook —
            Dueling, for instance — isn&apos;t here, so add those by hand.
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
