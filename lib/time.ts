const JAPAN_TIMEZONE = "Asia/Tokyo";

export function formatDateTimeJst(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("ja-JP", {
    timeZone: JAPAN_TIMEZONE,
    hour12: false,
  });
}
