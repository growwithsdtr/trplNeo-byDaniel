export const DEMO_TIMEZONE = "Asia/Tokyo";
export const DEMO_TIMEZONE_LABEL = "JST";
export const DEMO_DATE_CONTEXT = "2026-04-29";
export const DEMO_NOW = "2026-04-29T12:00:00+09:00";
export const DEMO_APPROVED_AT = "2026-04-29T12:03:00+09:00";
export const DEMO_HANDOFF_AT = "2026-04-29T12:06:00+09:00";

export function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day + days));
  return utcDate.toISOString().slice(0, 10);
}

export function dateRangeFrom(startDate: string, numberOfDays: number) {
  return Array.from({ length: numberOfDays }, (_, index) =>
    addDays(startDate, index)
  );
}

export const DEMO_TODAY = DEMO_DATE_CONTEXT;
export const DEMO_TOMORROW = addDays(DEMO_DATE_CONTEXT, 1);
export const DEMO_WEEKEND = {
  checkInDate: "2026-05-02",
  checkOutDate: "2026-05-03",
};
export const DEMO_NEXT_WEEKEND = {
  checkInDate: "2026-05-09",
  checkOutDate: "2026-05-10",
};
export const DEMO_SECOND_WEEK_NEXT_MONTH = {
  checkInDate: "2026-05-08",
  checkOutDate: "2026-05-14",
};
export const DEMO_GOLDEN_WEEK = {
  checkInDate: "2026-04-29",
  checkOutDate: "2026-05-05",
};
export const DEMO_NEW_YEAR_NIGHT = {
  checkInDate: "2026-12-31",
  checkOutDate: "2027-01-01",
};
