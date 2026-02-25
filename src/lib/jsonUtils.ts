/**
 * Normalize a value from PocketBase to a JSON string.
 * PocketBase JSON fields can return either a string or an already-parsed object.
 */
export function safeJsonStr(val: unknown): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return JSON.stringify(val);
  return undefined;
}

/**
 * Safely parse a value that may be a JSON string OR an already-parsed object.
 * Returns null on failure.
 */
export function safeJsonParse<T>(val: unknown): T | null {
  if (!val) return null;
  if (typeof val === 'object') return val as T;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  }
  return null;
}
