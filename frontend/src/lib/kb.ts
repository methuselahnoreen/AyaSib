import data from "@/data/kb.json";
import type { KbEntry } from "./types";

// Generated from /kb/*.yaml by scripts/sync-data.mjs (runs before dev and build).
export const kb = data as unknown as KbEntry[];
