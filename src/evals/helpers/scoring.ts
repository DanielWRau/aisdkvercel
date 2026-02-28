import { type ZodType } from 'zod';

/**
 * Validates a value against a Zod schema.
 * Returns 1.0 if valid, 0.0 if invalid.
 */
export function schemaValid(value: unknown, schema: ZodType): number {
  const result = schema.safeParse(value);
  return result.success ? 1.0 : 0.0;
}

/**
 * Checks how many of the specified fields are non-empty.
 * Returns ratio of populated fields (0.0–1.0).
 */
export function fieldsPopulated(
  obj: Record<string, unknown>,
  fields: string[],
): number {
  if (fields.length === 0) return 1.0;
  const populated = fields.filter((f) => {
    const val = obj[f];
    if (val === undefined || val === null || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val as object).length === 0)
      return false;
    return true;
  });
  return populated.length / fields.length;
}

/**
 * Checks if an array has at least `min` items.
 * Returns 1.0 if yes, fraction if partial.
 */
export function minItems(arr: unknown[], min: number): number {
  if (min <= 0) return 1.0;
  return Math.min(arr.length / min, 1.0);
}

/**
 * Checks if a string has at least `min` characters.
 * Returns 1.0 if yes, fraction if partial.
 */
export function minLength(str: string, min: number): number {
  if (min <= 0) return 1.0;
  return Math.min(str.length / min, 1.0);
}

/**
 * Computes weighted average of multiple scores.
 */
export function weightedAverage(
  scores: { score: number; weight: number }[],
): number {
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = scores.reduce(
    (sum, s) => sum + s.score * s.weight,
    0,
  );
  return weightedSum / totalWeight;
}

/**
 * Formats a score result for test output.
 */
export function formatScore(
  name: string,
  score: number,
  details: Record<string, number> = {},
): string {
  const detailStr = Object.entries(details)
    .map(([k, v]) => `${k}=${v.toFixed(2)}`)
    .join(', ');
  return `${name}: ${score.toFixed(2)}${detailStr ? ` (${detailStr})` : ''}`;
}
