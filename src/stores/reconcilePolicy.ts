/**
 * When a new last-frost date moves plants to other seasons. Only a change from
 * one date to another reconciles: the first date, or the stored date loading
 * at app start (null to date), must not outdate the seasons.
 * Pure: no Zustand, no "@/" imports.
 */
export function shouldReconcile(previous: string | null, next: string | null): boolean {
  return previous !== null && next !== null && next !== previous;
}
