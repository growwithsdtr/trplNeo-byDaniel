import {
  DEMO_NEW_YEAR_NIGHT,
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
  dateLabel: string;
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function numberWordToValue(text: string) {
  if (text.includes("two") || text.includes("2")) return 2;
  if (text.includes("three") || text.includes("3")) return 3;
  if (text.includes("four") || text.includes("4")) return 4;
  if (text.includes("one") || text.includes("1")) return 1;
  return undefined;
}

function parseChildren(normalized: string) {
  const childMatch = normalized.match(
    /\b(one|two|three|four|\d+)\s+(kids?|children|child)\b/
  );
  if (!childMatch) return 0;
  return numberWordToValue(childMatch[1]) ?? 1;
}

function parsePets(normalized: string) {
  const petMatch = normalized.match(/\b(one|two|three|four|\d+)\s+(pets?|dogs?)\b/);
  if (petMatch) return numberWordToValue(petMatch[1]) ?? 1;
  return hasAny(normalized, [" pet", " dog", "pets", "dogs"]) ? 1 : 0;
}

function parseAdults(normalized: string, children: number) {
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
  if (hasAny(normalized, ["for two", "two people", "two guests", "2 people", "2 guests"])) {
    return children > 0 ? Math.max(0, 2 - children) : 2;
  }
  if (hasAny(normalized, ["solo", "alone", "one person", "1 guest"])) {
    return 1;
  }
  return children > 0 ? 2 : 2;
}

function parseDates(normalized: string) {
  if (normalized.includes("new year's night") || normalized.includes("new years night")) {
    return { ...DEMO_NEW_YEAR_NIGHT, dateLabel: "New Year's night" };
  }
  if (normalized.includes("tomorrow")) {
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

export function parseTravelerIntent(query: string): ParsedTravelerIntent {
  const normalized = query.toLowerCase().replace(/[’]/g, "'");
  const children = parseChildren(normalized);
  const pets = parsePets(normalized);
  const adults = parseAdults(normalized, children);
  const dates = parseDates(normalized);

  return {
    ...dates,
    adults,
    children,
    pets,
    guests: adults + children,
  };
}
