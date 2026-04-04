/**
 * UUID Generator utility
 * Simple UUID v4 generator for creating unique component IDs
 */

/**
 * Generate a UUID v4 string
 * Uses crypto.randomUUID if available, otherwise falls back to a manual implementation
 */
export function generateId(): string {
  // Try to use crypto.randomUUID if available
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback implementation for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a short ID (8 characters)
 * Useful for display purposes or where full UUIDs are not needed
 */
export function generateShortId(): string {
  return generateId().substring(0, 8);
}

/**
 * Generate a timestamped ID
 * Combines timestamp with random suffix for sortable unique IDs
 */
export function generateTimestampedId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomPart}`;
}

/**
 * Validate if a string is a valid UUID v4
 */
export function isValidUuid(id: string): boolean {
  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(id);
}
