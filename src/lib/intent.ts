import {
  DEMO_GOLDEN_WEEK,
  DEMO_NEW_YEAR_NIGHT,
  DEMO_NEXT_WEEKEND,
  DEMO_SECOND_WEEK_NEXT_MONTH,
  DEMO_TODAY,
  DEMO_TOMORROW,
  DEMO_WEEKEND,
  addDays,
} from "@/lib/demo-date";

export interface ParsedTravelerIntent {
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  adults: number;
  children: number;
  pets: number;
  bedConfiguration: string;
  dateLabel: string;
  stayLengthDays?: number;
  stayLengthNights?: number;
  dateInterpretationNote?: string;
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function numberWordToValue(text: string) {
  if (/^\d+$/.test(text)) return Number(text);
  if (text === "five") return 5;
  if (text === "two") return 2;
  if (text === "three") return 3;
  if (text === "four") return 4;
  if (text === "one") return 1;
  return undefined;
}

function parseChildren(normalized: string) {
  const childMatch = normalized.match(
    /\b(one|two|three|four|five|\d+)\s+(kids?|children|child)\b/
  );
  if (!childMatch) return 0;
  return numberWordToValue(childMatch[1]) ?? 1;
}

function parsePets(normalized: string) {
  const petMatch = normalized.match(/\b(one|two|three|four|five|\d+)\s+(pets?|dogs?)\b/);
  if (petMatch) return numberWordToValue(petMatch[1]) ?? 1;
  return hasAny(normalized, ["with pets", " pet", " dog", "pets", "dogs"]) ? 1 : 0;
}

function parseAdults(normalized: string, children: number) {
  if (hasAny(normalized, ["just me", "solo", "alone", "one person", "1 guest"])) {
    return 1;
  }
  if (hasAny(normalized, ["me and my four children", "me and my 4 children"])) {
    return 1;
  }
  if (
    hasAny(normalized, [
      "me, my wife",
      "me and my wife",
      "my wife and i",
      "wife and i",
      "me, my husband",
      "me and my husband",
      "husband and i",
      "partner and i",
    ])
  ) {
    return 2;
  }
  if (
    hasAny(normalized, [
      "two business travelers",
      "for two",
      "two people",
      "two guests",
      "2 people",
      "2 guests",
    ])
  ) {
    return children > 0 ? Math.max(0, 2 - children) : 2;
  }
  return children > 0 ? 2 : 2;
}

function parseDates(normalized: string) {
  const durationFromTomorrow = normalized.match(
    /(?:from tomorrow to stay|from tomorrow for|stay)\s+(one|two|three|four|five|\d+)\s+(days?|nights?)/
  );
  const durationAfterFrom = normalized.match(
    /\bfor\s+(one|two|three|four|five|\d+)\s+(days?|nights?|week)\s+from\s+(today|tomorrow|\d{4}-\d{2}-\d{2})/
  );
  const fromDateToStay = normalized.match(
    /\bfrom\s+(today|tomorrow|\d{4}-\d{2}-\d{2})\s+to stay\s+(one|two|three|four|five|\d+)\s+(days?|nights?)/
  );

  const durationMatch = fromDateToStay ?? durationAfterFrom ?? durationFromTomorrow;
  if (durationMatch) {
    const fromDateMatch = fromDateToStay?.[1] ?? durationAfterFrom?.[3] ?? "tomorrow";
    const lengthText = fromDateToStay?.[2] ?? durationAfterFrom?.[1] ?? durationFromTomorrow?.[1] ?? "1";
    const unit = fromDateToStay?.[3] ?? durationAfterFrom?.[2] ?? durationFromTomorrow?.[2] ?? "days";
    const startDate =
      fromDateMatch === "today"
        ? DEMO_TODAY
        : fromDateMatch === "tomorrow"
          ? DEMO_TOMORROW
          : fromDateMatch;
    const isWeek = unit === "week";
    const length = isWeek ? 7 : numberWordToValue(lengthText) ?? Number(lengthText);
    const isNight = unit.startsWith("night");
    const offset = isNight ? length : Math.max(1, length) - 1;

    return {
      checkInDate: startDate,
      checkOutDate: addDays(startDate, offset),
      dateLabel: isNight
        ? `${length}-night stay from ${fromDateMatch}`
        : `${length}-day stay from ${fromDateMatch}`,
      stayLengthDays: isNight ? undefined : length,
      stayLengthNights: isNight ? length : undefined,
      dateInterpretationNote:
        "Date interpretation is shown for demo purposes; production would ask for confirmation before creating a booking.",
    };
  }

  if (
    normalized.includes("new year's eve") ||
    normalized.includes("new years eve") ||
    normalized.includes("new year's night") ||
    normalized.includes("new years night")
  ) {
    return { ...DEMO_NEW_YEAR_NIGHT, dateLabel: "New Year's Eve" };
  }
  if (normalized.includes("golden week")) {
    return { ...DEMO_GOLDEN_WEEK, dateLabel: "Golden Week" };
  }
  if (normalized.includes("second week of next month")) {
    return {
      ...DEMO_SECOND_WEEK_NEXT_MONTH,
      dateLabel: "Second week of next month",
    };
  }
  if (normalized.includes("next weekend")) {
    return { ...DEMO_NEXT_WEEKEND, dateLabel: "Next weekend" };
  }
  if (normalized.includes("tomorrow night") || normalized.includes("tomorrow")) {
    return {
      checkInDate: DEMO_TOMORROW,
      checkOutDate: addDays(DEMO_TOMORROW, 1),
      dateLabel: "Tomorrow",
    };
  }
  if (normalized.includes("this weekend") || normalized.includes("weekend")) {
    return { ...DEMO_WEEKEND, dateLabel: "Demo weekend" };
  }
  return { ...DEMO_WEEKEND, dateLabel: "Demo weekend default" };
}

function parseBedConfiguration(normalized: string) {
  if (hasAny(normalized, ["two separate beds", "separate beds", "twin beds"])) {
    return "twin";
  }
  if (hasAny(normalized, ["one big bed", "big bed", "king bed", "double bed"])) {
    return "king/double";
  }
  return "not specified";
}

export function parseTravelerIntent(query: string): ParsedTravelerIntent {
  const normalized = query.toLowerCase().replace(/[’]/g, "'");
  const children = parseChildren(normalized);
  const pets = parsePets(normalized);
  const adults = parseAdults(normalized, children);
  const dates = parseDates(normalized);
  const bedConfiguration = parseBedConfiguration(normalized);

  return {
    ...dates,
    adults,
    children,
    pets,
    bedConfiguration,
    guests: adults + children,
  };
}
