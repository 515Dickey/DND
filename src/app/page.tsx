"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { characterSummary, abilityLine, maxHp } from "@/lib/rules";
import {
  exportAll,
  exportCharacter,
  getLastFullBackup,
  parseImport,
} from "@/lib/storage";
import { StorageNotice, StorageStatusLine } from "@/components/StorageNotice";
import { ConfirmButton, Empty, Panel } from "@/components/ui";
import { ThemeToggle } from "@/components/Theme";

export default function RosterPage() {
  const { ready, characters, create, remove, duplicate, addMany, saveError } = useStore();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);

  // Drop straight into the new sheet -- nobody makes a character to admire the list.
  const handleCreate = () => {
    const c = create();
    router.push(`/sheet?id=${c.id}`);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const result = parseImport(text);
    if (result.error) {
      setNotice(result.error);
      return;
    }
    const count = addMany(result.characters);
    setNotice(
      count === 1 ? "Imported 1 character." : `Imported ${count} characters.`,
    );
  };

  const effectiveBackup = lastBackup ?? getLastFullBackup();
  const backupLabel = effectiveBackup
    ? "Last full backup " + describeAge(effectiveBackup) + "."
    : "No full backup taken on this device yet.";

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="display text-3xl text-accent sm:text-4xl">D&amp;D&amp;D</h1>
          <p className="display mt-1 text-xs text-ink-soft sm:text-sm">
            Derrick and Dungeons and Dragons
          </p>
          <p className="mt-1.5 text-sm italic text-ink-soft">
            Character sheets are stored on this device.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <StorageNotice hasCharacters={characters.length > 0} />

      {saveError && (
        <div
          className="mb-4 rounded border px-3 py-2 text-sm"
          style={{ borderColor: "var(--bad)", color: "var(--bad)" }}
        >
          {saveError}
        </div>
      )}

      {notice && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded border border-rule px-3 py-2 text-sm">
          <span>{notice}</span>
          <button className="btn btn-sm" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={handleCreate}>
          + New character
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Import
        </button>
        <button
          className="btn"
          disabled={characters.length === 0}
          onClick={() => {
            exportAll(characters);
            setLastBackup(new Date());
          }}
        >
          Back up all
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImport(f);
            e.target.value = "";
          }}
        />
      </div>

      {!ready ? (
        <Empty>Opening the ledger…</Empty>
      ) : characters.length === 0 ? (
        <Panel>
          <Empty>
            No characters yet. Tap <strong>New character</strong> to roll one up, or{" "}
            <strong>Import</strong> a sheet someone sent you.
          </Empty>
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {characters.map((c) => (
            <Panel key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <Link href={`/sheet?id=${c.id}`} className="min-w-0 flex-1">
                  <h2 className="display truncate text-lg text-ink">
                    {c.name || "Unnamed"}
                  </h2>
                  <p className="mt-0.5 text-sm text-ink-soft">{characterSummary(c)}</p>
                  <p className="formula mt-1.5">{abilityLine(c)}</p>
                  <p className="formula mt-0.5">
                    HP {c.hpCurrent}/{maxHp(c).value}
                    {c.hpTemp > 0 && ` (+${c.hpTemp} temp)`}
                  </p>
                </Link>
              </div>
              <hr className="divider my-3" />
              <div className="flex flex-wrap gap-1.5">
                <Link href={`/sheet?id=${c.id}`} className="btn btn-sm btn-primary">
                  Open
                </Link>
                <button className="btn btn-sm" onClick={() => exportCharacter(c)}>
                  Export
                </button>
                <button className="btn btn-sm" onClick={() => duplicate(c.id)}>
                  Duplicate
                </button>
                <ConfirmButton onConfirm={() => remove(c.id)}>Delete</ConfirmButton>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <p className="formula mt-10 text-center">
        Everything is stored in this browser only — nothing is uploaded anywhere.
        Clearing site data will erase your characters, so export a backup now and
        then.
      </p>
      <p className="formula mt-1 text-center">
        <StorageStatusLine />
        {characters.length > 0 && (
          <>{" · " + backupLabel}</>
        )}
      </p>
    </main>
  );
}

/** Plain-language age, so a stale backup is obvious at a glance. */
function describeAge(d: Date): string {
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return days + " days ago";
  const months = Math.floor(days / 30);
  return months === 1 ? "about a month ago" : "about " + months + " months ago";
}
