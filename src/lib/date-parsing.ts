import {
  DEMO_DATE_CONTEXT,
  DEMO_GOLDEN_WEEK,
  DEMO_NEW_YEAR_NIGHT,
  DEMO_NEXT_WEEKEND,
  DEMO_SECOND_WEEK_NEXT_MONTH,
  DEMO_TODAY,
  DEMO_TOMORROW,
  DEMO_WEEKEND,
  addDays,
  dateRangeFrom,
} from "@/lib/demo-date";

export const DATE_INTERPRETATION_NOTE =
  "Date interpretation shown for demo purposes; production would confirm before booking.";

type DurationUnit = "days" | "nights";

interface ParsedDuration {
  length: number;
  unit: DurationUnit;
  label: string;
}

interface ParsedStartDate {
  startDate: string;
  defaultCheckOutDate: string;
  operatorEndDate: string;
  label: string;
}

export interface ParsedTravelerDates {
  checkInDate: string;
  checkOutDate: string;
  dateLabel: string;
  stayLengthDays?: number;
  stayLengthNights?: number;
  dateInterpretationNote?: string;
}

export interface ParsedOperatorDateContext {
  affectedDates: string[];
  startDate?: string;
  endDate?: string;
  dateLabel: string;
  repeatNote?: string;
  timeContext?: string;
  dateInterpretationNote?: string;
}

const numberWords: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const weekdays: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function normalizeDateText(text: string) {
  return text.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
}

export function numberWordToValue(text: string) {
  if (/^\d+$/.test(text)) return Number(text);
  return numberWords[text];
}

function dayDiff(startDate: string, endDate: string) {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const start = Date.UTC(startYear, startMonth - 1, startDay);
  const end = Date.UTC(endYear, endMonth - 1, endDay);
  return Math.round((end - start) / 86_400_000);
}

function dateRangeInclusive(startDate: string, endDate: string) {
  const days = Math.max(0, dayDiff(startDate, endDate));
  return dateRangeFrom(startDate, days + 1);
}

function currentWeekday() {
  const [year, month, day] = DEMO_DATE_CONTEXT.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function nextWeekdayDate(dayName: string, forceNext: boolean) {
  const target = weekdays[dayName];
  const today = currentWeekday();
  let offset = target - today;
  if (offset < 0 || (forceNext && offset === 0)) {
    offset += 7;
  }
  return addDays(DEMO_TODAY, offset);
}

function parseDuration(normalized: string): ParsedDuration | undefined {
  const token = "(a|an|one|two|three|four|five|six|seven|eight|nine|ten|\\d+)";
  const unit = "(weeks?|days?|nights?)";
  const patterns = [
    new RegExp(`\\b(?:stay|staying|stays)\\s+(?:for\\s+)?${token}\\s+${unit}\\b`),
    new RegExp(`\\b(?:(?:will\\s+)?last(?:s|ing)?\\s+for|for)\\s+${token}\\s+${unit}\\b`),
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;

    const value = numberWordToValue(match[1]);
    if (!value) return undefined;

    const unitText = match[2];
    const isWeek = unitText.startsWith("week");
    const isNight = unitText.startsWith("night");
    const length = isWeek ? value * 7 : value;

    return {
      length,
      unit: isNight ? "nights" : "days",
      label: isNight ? `${length}-night stay` : `${length}-day stay`,
    };
  }

  return undefined;
}

function fixedRangeStart(normalized: string): ParsedStartDate | undefined {
  if (
    normalized.includes("new year's eve") ||
    normalized.includes("new years eve") ||
    normalized.includes("new year's night") ||
    normalized.includes("new years night")
  ) {
    return {
      startDate: DEMO_NEW_YEAR_NIGHT.checkInDate,
      defaultCheckOutDate: DEMO_NEW_YEAR_NIGHT.checkOutDate,
      operatorEndDate: DEMO_NEW_YEAR_NIGHT.checkInDate,
      label: "New Year's Eve",
    };
  }

  if (normalized.includes("golden week")) {
    return {
      startDate: DEMO_GOLDEN_WEEK.checkInDate,
      defaultCheckOutDate: DEMO_GOLDEN_WEEK.checkOutDate,
      operatorEndDate: DEMO_GOLDEN_WEEK.checkOutDate,
      label: "Golden Week",
    };
  }

  if (normalized.includes("second week of next month")) {
    return {
      startDate: DEMO_SECOND_WEEK_NEXT_MONTH.checkInDate,
      defaultCheckOutDate: DEMO_SECOND_WEEK_NEXT_MONTH.checkOutDate,
      operatorEndDate: DEMO_SECOND_WEEK_NEXT_MONTH.checkOutDate,
      label: "Second week of next month",
    };
  }

  if (normalized.includes("next weekend")) {
    return {
      startDate: DEMO_NEXT_WEEKEND.checkInDate,
      defaultCheckOutDate: DEMO_NEXT_WEEKEND.checkOutDate,
      operatorEndDate: DEMO_NEXT_WEEKEND.checkOutDate,
      label: "Next weekend",
    };
  }

  if (normalized.includes("this weekend") || normalized.includes("weekend")) {
    return {
      startDate: DEMO_WEEKEND.checkInDate,
      defaultCheckOutDate: DEMO_WEEKEND.checkOutDate,
      operatorEndDate: DEMO_WEEKEND.checkOutDate,
      label: "This weekend",
    };
  }

  return undefined;
}

function relativeStart(normalized: string): ParsedStartDate | undefined {
  const token = "(one|two|three|four|five|six|seven|eight|nine|ten|\\d+)";
  const fromNowMatch = normalized.match(new RegExp(`\\b${token}\\s+days?\\s+from\\s+now\\b`));
  const inDaysMatch = normalized.match(
    new RegExp(
      `\\b(?:starting\\s+|starts?\\s+|move\\s+there\\s+|go\\s+there\\s+|going\\s+there\\s+)?in\\s+${token}\\s+days?\\b`
    )
  );
  const relativeMatch = fromNowMatch ?? inDaysMatch;

  if (relativeMatch) {
    const value = numberWordToValue(relativeMatch[1]);
    if (value !== undefined) {
      const startDate = addDays(DEMO_TODAY, value);
      return {
        startDate,
        defaultCheckOutDate: addDays(startDate, 1),
        operatorEndDate: startDate,
        label: value === 1 ? "In 1 day" : `In ${value} days`,
      };
    }
  }

  if (
    /\bfrom\s+tomorrow(?:\s+night)?\b/.test(normalized) ||
    /\bstarting\s+tomorrow\b/.test(normalized) ||
    /\bstarts?\s+tomorrow\b/.test(normalized) ||
    normalized.includes("tomorrow night") ||
    normalized.includes("tomorrow")
  ) {
    return {
      startDate: DEMO_TOMORROW,
      defaultCheckOutDate: addDays(DEMO_TOMORROW, 1),
      operatorEndDate: DEMO_TOMORROW,
      label: normalized.includes("tomorrow night") ? "Tomorrow night" : "Tomorrow",
    };
  }

  if (
    /\bfrom\s+today\b/.test(normalized) ||
    /\bstarting\s+today\b/.test(normalized) ||
    /\bstarts?\s+today\b/.test(normalized) ||
    normalized.includes("this morning") ||
    normalized.includes("tonight") ||
    normalized.includes("today")
  ) {
    return {
      startDate: DEMO_TODAY,
      defaultCheckOutDate: addDays(DEMO_TODAY, 1),
      operatorEndDate: DEMO_TODAY,
      label: normalized.includes("tonight")
        ? "Tonight"
        : normalized.includes("this morning")
          ? "This morning"
          : "Today",
    };
  }

  const weekdayMatch = normalized.match(
    /\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/
  );
  if (weekdayMatch) {
    const startDate = nextWeekdayDate(weekdayMatch[2], Boolean(weekdayMatch[1]));
    const label = `${weekdayMatch[1] ? "Next " : ""}${weekdayMatch[2]}`;
    return {
      startDate,
      defaultCheckOutDate: addDays(startDate, 1),
      operatorEndDate: startDate,
      label: label.charAt(0).toUpperCase() + label.slice(1),
    };
  }

  return undefined;
}

function parseStartDate(normalized: string) {
  return fixedRangeStart(normalized) ?? relativeStart(normalized);
}

function parseTimeContext(normalized: string) {
  if (normalized.includes("this morning")) return "this morning";
  if (normalized.includes("tonight")) return "tonight";
  if (normalized.includes("every night")) return "every night";
  if (/\bmorning\b/.test(normalized)) return "morning";

  const atMatch = normalized.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (atMatch) {
    const suffix = atMatch[3] ? atMatch[3] : "";
    return `at ${atMatch[1]}${atMatch[2] ? `:${atMatch[2]}` : ""}${suffix}`;
  }

  return undefined;
}

function parseUntilNextWeekday(normalized: string) {
  const match = normalized.match(
    /\buntil\s+next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/
  );
  if (!match) return undefined;
  return nextWeekdayDate(match[1], true);
}

export function parseTravelerDateIntent(input: string): ParsedTravelerDates {
  const normalized = normalizeDateText(input);
  const duration = parseDuration(normalized);
  const start = parseStartDate(normalized);
  const startDate = start?.startDate ?? (duration ? DEMO_TODAY : DEMO_WEEKEND.checkInDate);

  if (duration) {
    const checkOutDate = addDays(startDate, duration.length);
    return {
      checkInDate: startDate,
      checkOutDate,
      dateLabel: `${duration.label} from ${start?.label ?? "demo date context"}`,
      stayLengthDays: duration.unit === "days" ? duration.length : undefined,
      stayLengthNights: duration.unit === "nights" ? duration.length : undefined,
      dateInterpretationNote: DATE_INTERPRETATION_NOTE,
    };
  }

  if (start) {
    return {
      checkInDate: start.startDate,
      checkOutDate: start.defaultCheckOutDate,
      dateLabel: start.label,
    };
  }

  return { ...DEMO_WEEKEND, dateLabel: "Demo weekend default" };
}

export function parseOperatorDateContext(input: string): ParsedOperatorDateContext {
  const normalized = normalizeDateText(input);
  const duration = parseDuration(normalized);
  const start = parseStartDate(normalized);
  const untilNextWeekday = parseUntilNextWeekday(normalized);
  const timeContext = parseTimeContext(normalized);

  if (untilNextWeekday) {
    return {
      affectedDates: dateRangeInclusive(DEMO_TODAY, untilNextWeekday),
      startDate: DEMO_TODAY,
      endDate: untilNextWeekday,
      dateLabel: `Until ${untilNextWeekday}`,
      timeContext,
    };
  }

  if (duration) {
    const startDate = start?.startDate ?? DEMO_TODAY;
    const endDate = addDays(startDate, duration.length);
    const lastAffectedDate = addDays(endDate, -1);
    const repeatNote = normalized.includes("every night")
      ? `Every night from ${startDate} through ${lastAffectedDate}.`
      : undefined;

    return {
      affectedDates: dateRangeFrom(startDate, duration.length),
      startDate,
      endDate,
      dateLabel: `${duration.label} from ${start?.label ?? "today"}`,
      repeatNote,
      timeContext,
      dateInterpretationNote:
        duration.unit === "days" ? DATE_INTERPRETATION_NOTE : undefined,
    };
  }

  if (start) {
    return {
      affectedDates: dateRangeInclusive(start.startDate, start.operatorEndDate),
      startDate: start.startDate,
      endDate: start.operatorEndDate,
      dateLabel: start.label,
      timeContext,
    };
  }

  return {
    affectedDates: [DEMO_WEEKEND.checkInDate],
    startDate: DEMO_WEEKEND.checkInDate,
    endDate: DEMO_WEEKEND.checkInDate,
    dateLabel: "Demo weekend default",
    timeContext,
  };
}
