import { format as fnsFormat, formatDistance as fnsFormatDistance } from "date-fns";
import { ru } from "date-fns/locale";

const MSK_TZ = "Europe/Moscow";

const mskFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: MSK_TZ,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hour12: false,
});

function getPart(parts: Intl.DateTimeFormatPart[], type: string): number {
  const p = parts.find((p) => p.type === type);
  return p ? parseInt(p.value, 10) : 0;
}

export function toMsk(date: string | Date): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  const parts = mskFormatter.formatToParts(d);
  return new Date(
    getPart(parts, "year"),
    getPart(parts, "month") - 1,
    getPart(parts, "day"),
    getPart(parts, "hour"),
    getPart(parts, "minute"),
    getPart(parts, "second"),
  );
}

export function formatMsk(date: string | Date, fmt: string): string {
  return fnsFormat(toMsk(date), fmt, { locale: ru });
}

export function distanceToNowMsk(date: string | Date): string {
  const mskDate = toMsk(date);
  const mskNow = toMsk(new Date());
  return fnsFormatDistance(mskDate, mskNow, { addSuffix: true, locale: ru });
}
