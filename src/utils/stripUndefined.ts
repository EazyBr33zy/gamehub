/**
 * Recursively removes all undefined properties from objects and arrays.
 * Prevents Firestore from rejecting documents with undefined values.
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === undefined) {
    return undefined as unknown as T;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .map((item) => stripUndefined(item))
      .filter((item) => item !== undefined) as unknown as T;
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      cleaned[key] = stripUndefined(value);
    }
  }
  return cleaned as T;
}
