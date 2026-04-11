/**
 * Returns today's date in `YYYY-MM-DD` format, computed in the
 * `America/Sao_Paulo` timezone. Used as the "day line" for the daily card,
 * so every user across the pt-BR product shares the same daily cycle
 * regardless of their browser timezone.
 *
 * Brazil has no DST, but this uses Intl.DateTimeFormat anyway so that
 * future rule changes are handled automatically.
 */
export function dateInSaoPaulo(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;

  return `${year}-${month}-${day}`;
}
