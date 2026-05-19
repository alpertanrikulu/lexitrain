/**
 * Tiny safe wrapper around localStorage. Catches all errors (Safari private
 * mode, quota, etc.) and degrades to an in-memory map.
 */
const memory = new Map<string, string>();

function canUseLocalStorage(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const k = "__lexitrain_probe__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

const useLs = canUseLocalStorage();

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return useLs ? window.localStorage.getItem(key) : memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      if (useLs) window.localStorage.setItem(key, value);
      else memory.set(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  removeItem(key: string): void {
    try {
      if (useLs) window.localStorage.removeItem(key);
      else memory.delete(key);
    } catch {
      memory.delete(key);
    }
  },
};
