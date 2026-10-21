/** Tiny in-memory cache with expiry. Saves model calls (and free-tier quota) for repeated questions. */
export class TtlCache<T> {
  private store = new Map<string, { at: number; value: T }>();

  constructor(
    private ttlMs = 3_600_000,
    private max = 200,
  ) {}

  get(key: string, now = Date.now()): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (now - hit.at >= this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T, now = Date.now()): void {
    if (this.store.size >= this.max && !this.store.has(key)) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { at: now, value });
  }
}
