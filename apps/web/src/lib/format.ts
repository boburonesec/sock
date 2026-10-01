export function formatDateTimeForUser(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "Noma’lum sana";
  }

  // Avoid uz-UZ short month quirks like "M07" — use explicit numeric layout.
  const datePart = formatDateShort(date);
  const timePart = new Intl.DateTimeFormat("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${datePart}, ${timePart}`;
}

/** dd.MM.yyyy — stable across locales */
export function formatDateShort(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Today's date as `YYYY-MM-DD` for `<input type="date">` defaults, in the
 * operator's local calendar. `new Date().toISOString().slice(0, 10)` is the UTC
 * date, which in Tashkent (UTC+5) is still "yesterday" until 05:00 — payments
 * and purchases recorded after midnight defaulted to the previous day.
 */
export function todayDateInputValue(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
