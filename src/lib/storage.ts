// Persistence. Everything lives in this device's localStorage -- no server,
// no account, nothing leaves the tablet unless you export it yourself.

import { type Character, migrateCharacter } from "./types";

const KEY = "parchment.characters.v1";
const ACTIVE_KEY = "parchment.active.v1";

export function loadAll(): Character[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(migrateCharacter);
  } catch (err) {
    console.error("Could not read saved characters", err);
    return [];
  }
}

export function saveAll(characters: Character[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(characters));
    return true;
  } catch (err) {
    console.error("Could not save characters", err);
    return false;
  }
}

export function loadActiveId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(ACTIVE_KEY, id);
  else window.localStorage.removeItem(ACTIVE_KEY);
}

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
  return cleaned.toLowerCase() || "character";
}

/** Downloads one character as a .json file. */
export function exportCharacter(c: Character) {
  download(`${safeFileName(c.name)}.json`, JSON.stringify(c, null, 2));
}

/** Downloads every character on this device as a single backup file. */
export function exportAll(characters: Character[]) {
  const payload = {
    kind: "parchment-backup",
    exportedAt: new Date().toISOString(),
    characters,
  };
  const stamp = new Date().toISOString().slice(0, 10);
  download(`character-backup-${stamp}.json`, JSON.stringify(payload, null, 2));
  markFullBackup();
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ImportResult {
  characters: Character[];
  error?: string;
}

/** Accepts either a single exported character or a full backup file. */
export function parseImport(text: string): ImportResult {
  try {
    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.characters)) {
      return { characters: parsed.characters.map(migrateCharacter) };
    }
    if (Array.isArray(parsed)) {
      return { characters: parsed.map(migrateCharacter) };
    }
    if (parsed && typeof parsed === "object" && "abilities" in parsed) {
      return { characters: [migrateCharacter(parsed)] };
    }
    return { characters: [], error: "That file doesn't look like a character export." };
  } catch {
    return { characters: [], error: "That file isn't valid JSON." };
  }
}

// --- Backup reminders ----------------------------------------------------

const BACKUP_KEY = "parchment.lastFullBackup";

/** Records that the player took a full backup, for the reminder on the roster. */
export function markFullBackup() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BACKUP_KEY, new Date().toISOString());
  } catch {
    // A failed note is not worth interrupting the download for.
  }
}

export function getLastFullBackup(): Date | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}
