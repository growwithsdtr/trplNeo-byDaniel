import {
  DEMO_GOLDEN_WEEK,
  DEMO_NEW_YEAR_NIGHT,
  DEMO_NEXT_WEEKEND,
  DEMO_SECOND_WEEK_NEXT_MONTH,
  DEMO_TOMORROW,
  DEMO_WEEKEND,
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
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function numberWordToValue(text: string) {
  if (text.includes("five") || text.includes("5")) return 5;
  if (text.includes("two") || text.includes("2")) return 2;
  if (text.includes("three") || text.includes("3")) return 3;
  if (text.includes("four") || text.includes("4")) return 4;
  if (text.includes("one") || text.includes("1")) return 1;
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
      checkOutDate: "2026-04-30",
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
