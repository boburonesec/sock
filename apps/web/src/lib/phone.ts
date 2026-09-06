/**
 * Uzbekistan phone number utilities for Paypoq OS.
 * Canonical storage format: +998XXXXXXXXX (exactly 13 characters, +998 followed by 9 digits).
 * Display format: +998 90 123 45 67
 */

const UZ_CANONICAL_REGEX = /^\+998\d{9}$/;
const HAS_LETTERS_REGEX = /[a-zA-Z]/;

/**
 * Extracts digits from any raw phone string.
 * Strips formatting characters (spaces, hyphens, parentheses, etc.).
 */
export function extractDigits(value?: string | null): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

/**
 * Normalizes an Uzbekistan phone number to canonical +998XXXXXXXXX.
 * Returns null if input is empty, whitespace, contains letters, or is incomplete/invalid.
 * Accepts:
 *  - "+998 90 123 45 67" -> "+998901234567"
 *  - "+998901234567"     -> "+998901234567"
 *  - "901234567"         -> "+998901234567"
 *  - "8 90 123 45 67"    -> "+998901234567"
 *  - "+998"              -> null (prefix only)
 */
export function normalizeUzPhone(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "+998" || trimmed === "+") return null;

  // If input contains alphabetic letters, it's invalid
  if (HAS_LETTERS_REGEX.test(trimmed)) return null;

  const digits = extractDigits(trimmed);
  if (digits.length === 0) return null;

  // Case 1: Starts with 998 and has exactly 12 digits (998 + 9 digits)
  if (digits.startsWith("998")) {
    if (digits.length === 12) {
      return `+${digits}`;
    }
    // If not 12 digits, it's incomplete or too long
    return null;
  }

  // Case 2: Starts with 8 and has exactly 10 digits (e.g. 8901234567)
  if (digits.startsWith("8") && digits.length === 10) {
    return `+998${digits.slice(1, 10)}`;
  }

  // Case 3: Exactly 9 digits (national number, e.g. 901234567)
  if (digits.length === 9) {
    return `+998${digits}`;
  }

  return null;
}

/**
 * Validates whether a phone number string is a complete and valid Uzbekistan phone number.
 * Must evaluate to canonical +998XXXXXXXXX (exactly 9 national digits).
 */
export function isValidUzPhone(value?: string | null): boolean {
  const normalized = normalizeUzPhone(value);
  if (!normalized) return false;
  return UZ_CANONICAL_REGEX.test(normalized);
}

/**
 * Formats canonical or raw phone string into user-facing display "+998 90 123 45 67".
 * If empty or invalid, returns empty string or fallback.
 */
export function formatUzPhone(value?: string | null): string {
  if (!value) return "";
  const digits = extractDigits(value);
  if (digits.length === 0) return "";

  let national = "";
  if (digits.startsWith("998")) {
    national = digits.slice(3, 12);
  } else if (digits.startsWith("8") && digits.length === 10) {
    national = digits.slice(1, 10);
  } else {
    national = digits.slice(0, 9);
  }

  return formatNationalDigits(national);
}

/**
 * Formats up to 9 national digits into "+998 XX XXX XX XX".
 * Handles progressive typing (1 to 9 digits).
 */
export function formatNationalDigits(national: string): string {
  const clean = national.slice(0, 9);
  if (clean.length === 0) return "+998";

  const p1 = clean.slice(0, 2);
  const p2 = clean.slice(2, 5);
  const p3 = clean.slice(5, 7);
  const p4 = clean.slice(7, 9);

  let result = `+998 ${p1}`;
  if (p2) result += ` ${p2}`;
  if (p3) result += ` ${p3}`;
  if (p4) result += ` ${p4}`;

  return result;
}

/**
 * Real-time input formatter for keyboard and paste events.
 * If input is completely emptied by user, returns "".
 * Otherwise ensures "+998 " prefix and formats up to 9 national digits.
 */
export function formatUzPhoneInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed || trimmed === "+") return "";

  const digits = extractDigits(trimmed);
  if (digits.length === 0) return "";

  let national = "";
  if (digits.startsWith("998")) {
    national = digits.slice(3, 12);
  } else if (digits.startsWith("8") && digits.length === 10) {
    national = digits.slice(1, 10);
  } else {
    national = digits.slice(0, 9);
  }

  // If user cleared everything except "+998" or "998"
  if (national.length === 0 && (digits === "998" || digits === "99" || digits === "9")) {
    return "+998 ";
  }

  return formatNationalDigits(national);
}
