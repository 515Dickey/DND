"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { useCharacter } from "@/lib/store";
import { armorClass, healthState, maxHp } from "@/lib/rules";
import type { Character } from "@/lib/types";
import { ThemeToggle } from "@/components/Theme";
import { Panel } from "@/components/ui";
import { MainTab } from "@/components/tabs/MainTab";
import { CombatTab } from "@/components/tabs/CombatTab";
import { SpellsTab } from "@/components/tabs/SpellsTab";
import { GearTab } from "@/components/tabs/GearTab";
import { NotesTab } from "@/components/tabs/NotesTab";

const TABS = [
  { key: "main", label: "Abilities" },
  { key: "combat", label: "Combat" },
  { key: "spells", label: "Spells" },
  { key: "gear", label: "Gear" },
  { key: "notes", label: "Notes" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/**
 * What the page prerenders to, and what shows while the character is read back
 * out of storage. It is on screen for a moment at most, which is exactly why
 * the mark belongs here: room to be seen at a size where it reads, and no
 * competition with anything the player actually needs.
 */
function OpeningLedger() {
  return (
    <main className="mx-auto max-w-5xl px-4 pt-16">
      <div className="flex flex-col items-center gap-3 text-ink-faint">
        {/* The emblem is taller than it is wide; the box matches so the mask
            fills it rather than shrinking to fit a square. */}
        <div
          className="deneir-mark h-20 opacity-60"
          style={{ aspectRatio: "649 / 956" }}
          aria-hidden="true"
        />
        <p className="text-sm italic">Opening the ledger…</p>
      </div>
    </main>
  );
}

export default function SheetPage() {
  // useSearchParams needs a Suspense boundary for this page to prerender.
  return (
    <Suspense fallback={<OpeningLedger />}>
      <Sheet />
    </Suspense>
  );
}

function Sheet() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const { character, set, mut, ready } = useCharacter(id);
  const [tab, setTab] = useState<TabKey>("main");

  const setOverride = useCallback(
    (key: string, value: number | null) => {
      mut((c: Character) => {
        const overrides = { ...c.overrides };
        if (value === null) delete overrides[key];
        else overrides[key] = value;
        return { ...c, overrides };
      });
    },
    [mut],
  );

  if (!ready) return <OpeningLedger />;

  if (!character) {
    return (
      <main className="mx-auto max-w-3xl px-4 pt-10">
        <Panel title="Not found">
          <p className="text-sm">
            That character isn&apos;t on this device. If it lives on another tablet,
            export it there and import the file here.
          </p>
          <Link href="/" className="btn btn-primary mt-4">
            Back to characters
          </Link>
        </Panel>
      </main>
    );
  }

  const c = character;
  const props = { c, set, mut, setOverride };
  const hp = maxHp(c).value;
  const ac = armorClass(c).value;
  const health = healthState(c);

  const healthColor =
    health.state === "dead"
      ? "var(--bad)"
      : health.state === "down"
        ? "var(--bad)"
        : health.state === "bloodied"
          ? "var(--warn)"
          : "var(--ink)";

  return (
    <div className="min-h-dvh">
      <header className="sheet-header sticky top-0 z-20 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2">
          <Link href="/" className="btn btn-icon" aria-label="Back to characters">
            ‹
          </Link>
          <div className="min-w-0 flex-1">
            <div className="display truncate text-base leading-tight text-ink">
              {c.name || "Unnamed"}
            </div>
            <div className="formula truncate not-italic">
              {[c.race, c.classText].filter(Boolean).join(" · ") || "—"}
              {` · Level ${c.level}`}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="stat-box px-2 py-1">
              <div className="label">AC</div>
              <div className="stat-value text-lg">{ac}</div>
            </div>
            <div className="stat-box px-2 py-1">
              <div className="label">HP</div>
              <div className="stat-value text-lg" style={{ color: healthColor }}>
                {c.hpCurrent}
                <span className="text-xs font-normal text-ink-faint">/{hp}</span>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <nav className="no-scrollbar mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 pb-2">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-current={active ? "page" : undefined}
                className="display shrink-0 rounded-t border-b-2 px-3 py-1.5 text-xs transition-colors"
                style={{
                  borderColor: active ? "var(--accent)" : "transparent",
                  color: active ? "var(--accent)" : "var(--ink-soft)",
                  background: active ? "rgba(255,250,235,0.35)" : "transparent",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="safe-bottom mx-auto max-w-5xl px-3 py-4">
        {tab === "main" && <MainTab {...props} />}
        {tab === "combat" && <CombatTab {...props} />}
        {tab === "spells" && <SpellsTab {...props} />}
        {tab === "gear" && <GearTab {...props} />}
        {tab === "notes" && <NotesTab {...props} />}
      </main>
    </div>
  );
}
