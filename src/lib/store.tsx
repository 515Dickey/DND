"use client";

// localStorage is an external store, so the characters live in a module-level
// cache that components read through useSyncExternalStore. That gives correct
// server/client behaviour on the prerendered page without a hydration mismatch,
// and keeps writes debounced so typing doesn't hammer the disk.

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { type Character, createCharacter, migrateCharacter, newId } from "./types";
import * as storage from "./storage";

const EMPTY: Character[] = [];

let cache: Character[] | null = null;
let saveError: string | null = null;
let loaded = false;
const listeners = new Set<() => void>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const l of listeners) l();
}

function getSnapshot(): Character[] {
  if (cache === null) {
    cache = storage.loadAll();
    loaded = true;
  }
  return cache;
}

// The prerendered HTML can't know what's on the device, so it renders the
// loading state and the client swaps in the real list on first paint.
function getServerSnapshot(): Character[] {
  return EMPTY;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function flush() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (cache === null) return;
  const ok = storage.saveAll(cache);
  const nextError = ok
    ? null
    : "This device refused to save. Check that private browsing is off, then export a backup.";
  if (nextError !== saveError) {
    saveError = nextError;
    emit();
  }
}

function commit(next: Character[]) {
  cache = next;
  emit();
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(flush, 250);
}

// Don't lose the last few keystrokes if the tab is closed or backgrounded.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

function getReady() {
  return loaded;
}

function getSaveError() {
  return saveError;
}

interface StoreValue {
  ready: boolean;
  characters: Character[];
  saveError: string | null;
  get(id: string): Character | undefined;
  create(name?: string): Character;
  update(id: string, patch: Partial<Character>): void;
  mutate(id: string, fn: (draft: Character) => Character): void;
  remove(id: string): void;
  duplicate(id: string): Character | undefined;
  addMany(chars: Character[]): number;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const characters = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useSyncExternalStore(subscribe, getReady, () => false);
  const currentSaveError = useSyncExternalStore(subscribe, getSaveError, () => null);

  const get = useCallback(
    (id: string) => characters.find((c) => c.id === id),
    [characters],
  );

  const create = useCallback((name?: string) => {
    const c = createCharacter(name);
    commit([...(cache ?? []), c]);
    return c;
  }, []);

  const mutate = useCallback((id: string, fn: (draft: Character) => Character) => {
    const list = cache ?? [];
    commit(
      list.map((c) =>
        c.id === id ? { ...fn(c), updatedAt: new Date().toISOString() } : c,
      ),
    );
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<Character>) => {
      mutate(id, (c) => ({ ...c, ...patch }));
    },
    [mutate],
  );

  const remove = useCallback((id: string) => {
    commit((cache ?? []).filter((c) => c.id !== id));
  }, []);

  const duplicate = useCallback((id: string) => {
    const source = (cache ?? []).find((c) => c.id === id);
    if (!source) return undefined;
    const copy: Character = {
      ...structuredClone(source),
      id: newId(),
      name: `${source.name} (copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    commit([...(cache ?? []), copy]);
    return copy;
  }, []);

  const addMany = useCallback((incoming: Character[]) => {
    // Fresh ids on import, so a file can never overwrite a character that
    // happens to share one.
    const prepared = incoming.map((raw) => ({ ...migrateCharacter(raw), id: newId() }));
    commit([...(cache ?? []), ...prepared]);
    return prepared.length;
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      characters,
      saveError: currentSaveError,
      get,
      create,
      update,
      mutate,
      remove,
      duplicate,
      addMany,
    }),
    [
      ready,
      characters,
      currentSaveError,
      get,
      create,
      update,
      mutate,
      remove,
      duplicate,
      addMany,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/**
 * Convenience hook for a single character's sheet: the character plus a `set`
 * that patches fields and a `mut` for list edits.
 */
export function useCharacter(id: string) {
  const { get, update, mutate, ready } = useStore();
  const character = get(id);
  const set = useCallback(
    (patch: Partial<Character>) => update(id, patch),
    [id, update],
  );
  const mut = useCallback(
    (fn: (draft: Character) => Character) => mutate(id, fn),
    [id, mutate],
  );
  return { character, set, mut, ready };
}
