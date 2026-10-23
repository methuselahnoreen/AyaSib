// Feature: ayasib-andam-na
// Device-only persistence of checklist states in localStorage. Keyed by KB entry id plus the
// stable requirement key (never by array index). Nothing is ever sent to a server.
import type { ItemState } from "./readiness";

const KEY = "ayasib.readiness.v1"; // versioned key; bump on any state-shape change.
const LAST_KEY = "ayasib.lastService.v1"; // remembers the most recently opened checklist service (device-only).

type Store = Record<string, Record<string, ItemState>>;

const isItemState = (v: unknown): v is ItemState => v === "HAS" || v === "STILL_NEEDS" || v === "NEEDS_TO_CONFIRM";

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStore(storage: Storage): Store {
  const raw = storage.getItem(KEY);
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return parsed as Store;
}

/** Returns the saved state map for an entry, keyed by requirementKey. Safe: {} on any failure. */
export function loadStates(id: string): Record<string, ItemState> {
  const storage = getStorage();
  if (!storage) return {};
  try {
    const store = readStore(storage);
    const forId = store[id];
    if (!forId || typeof forId !== "object" || Array.isArray(forId)) return {};
    // Keep only well-formed entries so malformed data can never corrupt the UI.
    const out: Record<string, ItemState> = {};
    for (const [key, value] of Object.entries(forId)) {
      if (isItemState(value)) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

/** Remembers the last checklist service the user opened, so the Checklist tab can return to it. */
export function setLastService(id: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(LAST_KEY, id);
  } catch {
    // Best-effort only.
  }
}

/** Returns the last opened checklist service id, or null if none/unavailable. */
export function getLastService(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const v = storage.getItem(LAST_KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

/** Removes all saved states for one service id (the "Start over" action). Best-effort; other ids untouched. */
export function clearStates(id: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    let store: Store;
    try {
      store = readStore(storage);
    } catch {
      return;
    }
    if (store[id]) {
      delete store[id];
      storage.setItem(KEY, JSON.stringify(store));
    }
  } catch {
    // Best-effort only.
  }
}

/** Best-effort persist of one requirement's state by its stable key; swallows errors. */
export function saveState(id: string, key: string, state: ItemState): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    let store: Store;
    try {
      store = readStore(storage);
    } catch {
      store = {};
    }
    const forId = store[id] && typeof store[id] === "object" && !Array.isArray(store[id]) ? store[id] : {};
    forId[key] = state;
    store[id] = forId;
    storage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Device storage may be unavailable or full; persistence is best-effort only.
  }
}
