/**
 * Strip HTML/control characters from free-text operator fields
 * (defect reasons, notes). Stored values remain plain text for operators.
 */
export function sanitizeOperatorText(
  value: string,
  options?: { maxLength?: number; minLength?: number },
): string {
  const maxLength = options?.maxLength ?? 500;
  const cleaned = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

  if (options?.minLength != null && cleaned.length < options.minLength) {
    return cleaned;
  }

  return cleaned;
}
