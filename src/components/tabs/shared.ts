import type { Character } from "@/lib/types";

export interface SheetProps {
  c: Character;
  set: (patch: Partial<Character>) => void;
  mut: (fn: (draft: Character) => Character) => void;
  setOverride: (key: string, value: number | null) => void;
}
