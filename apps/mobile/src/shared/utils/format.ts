export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("uz-UZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatMonth(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("uz-UZ", {
    year: "numeric",
    month: "long",
  }).format(date);
}

export function formatAmount(value: string): string {
  return `${value} so'm`;
}

export function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}
