import {
  normalizeDateText,
  numberWordToValue,
  parseTravelerDateIntent,
} from "@/lib/date-parsing";

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

function parseChildren(normalized: string) {
  const childMatch = normalized.match(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(kids?|children|child)\b/
  );
  if (!childMatch) return 0;
  return numberWordToValue(childMatch[1]) ?? 1;
}

function parsePets(normalized: string) {
  const petMatch = normalized.match(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(pets?|dogs?)\b/
  );
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
  const normalized = normalizeDateText(query);
  const children = parseChildren(normalized);
  const pets = parsePets(normalized);
  const adults = parseAdults(normalized, children);
  const dates = parseTravelerDateIntent(normalized);
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
