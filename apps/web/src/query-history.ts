export type TimestampedRecord = { ledgerTimestamp: string };

export function sortByLedgerTimestampNewest<T extends TimestampedRecord>(
  records: T[],
): T[] {
  return [...records].sort((a, b) => {
    const difference =
      Date.parse(b.ledgerTimestamp) - Date.parse(a.ledgerTimestamp);
    return Number.isNaN(difference)
      ? b.ledgerTimestamp.localeCompare(a.ledgerTimestamp)
      : difference;
  });
}

export function formatLedgerTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;

  const parts = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("day")} ${value("month")} ${value("year")}, ${value("hour")}:${value("minute")} ${value("dayPeriod")}`;
}
