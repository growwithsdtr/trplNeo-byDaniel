import type { HotelGraph, LiveLocalUpdate, RiskLevel, UpdateCategory } from "@/lib/types";
import {
  DEMO_NOW,
  DEMO_TODAY,
  DEMO_TOMORROW,
  DEMO_WEEKEND,
  addDays,
  dateRangeFrom,
} from "@/lib/demo-date";

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function isReputationSensitive(text: string) {
  return hasAny(text, [
    "vomit",
    "vomited",
    "drunk",
    "incident",
    "cleanliness",
    "dirty",
    "unsafe",
  ]);
}

function isShamisenText(text: string) {
  return hasAny(text, ["shamisen", "samizen", "shamizen"]);
}

function isCulinaryEvent(text: string) {
  return hasAny(text, [
    "culinary",
    "gourmet",
    "gourmets",
    "washoku",
    "french",
    "chinese cuisine",
    "chef",
    "chefs",
    "michelin",
  ]);
}

function isLocalEventText(text: string) {
  return (
    hasAny(text, ["concert", "event", "jazz"]) ||
    isShamisenText(text) ||
    isCulinaryEvent(text)
  );
}

function riskForText(text: string): { riskLevel: RiskLevel; requiresApproval: boolean } {
  const highRiskTerms = [
    "price",
    "¥",
    "payment",
    "cancel",
    "refund",
    "closure",
    "closed",
    "maintenance",
    "clean",
    "cleanliness",
    "safe",
    "safety",
    "vomit",
    "vomited",
    "drunk",
    "incident",
  ];
  const highRisk = hasAny(text, highRiskTerms);
  const mediumRisk = hasAny(text, ["michelin", "awarded", "award-winning"]);

  return {
    riskLevel: highRisk ? "high" : mediumRisk ? "medium" : "low",
    requiresApproval: highRisk,
  };
}

function categoryForText(text: string): UpdateCategory {
  if (isReputationSensitive(text)) return "reputation_sensitive";
  if (isLocalEventText(text)) return "local_event";
  if (hasAny(text, ["onsen", "bath", "sauna", "yuzu"])) return "onsen_update";
  if (hasAny(text, ["kaiseki", "breakfast", "vegetarian", "dessert", "meal"])) {
    return "meal_plan";
  }
  if (hasAny(text, ["late checkout", "discount", "direct-only offer"])) return "promotion";
  if (hasAny(text, ["maintenance", "closure", "closed"])) return "maintenance";
  if (hasAny(text, ["dog", "pet"])) return "pet_policy";
  if (hasAny(text, ["wi-fi", "wifi", "hdmi", "speed"])) return "room_tech";
  if (hasAny(text, ["desk", "business", "presentation"])) return "business_amenity";
  if (hasAny(text, ["cycling", "hiking", "tour", "lake", "surf", "surfboard", "wakeboard", "water gear"])) return "activity";
  if (hasAny(text, ["korean guests", "many guests", "ask about"])) return "guest_insight";
  return "policy_update";
}

function affectedRoomTypes(text: string, hotel: HotelGraph) {
  const lowerRoomMatches = hotel.roomTypes.filter((room) => {
    const name = room.name.toLowerCase();
    return (
      text.includes(name) ||
      name
        .split(" ")
        .filter((part) => part.length > 4)
        .some((part) => text.includes(part))
    );
  });

  if (lowerRoomMatches.length > 0) {
    return lowerRoomMatches.map((room) => room.name);
  }

  if (text.includes("business")) return ["Business Single"];
  if (text.includes("garden") || text.includes("dog")) return ["Dog-Friendly Garden Room"];
  if (text.includes("private bath")) return ["Private Bath Suite"];
  if (text.includes("deluxe")) return ["Deluxe Rooms"];
  return [];
}

function affectedDates(text: string) {
  if (text.includes("every night from today") && text.includes("one week")) {
    return dateRangeFrom(DEMO_TODAY, 7);
  }
  if (text.includes("from today") && text.includes("one week")) {
    return dateRangeFrom(DEMO_TODAY, 7);
  }
  if (text.includes("tomorrow")) return [DEMO_TOMORROW];
  if (text.includes("weekend") || text.includes("saturday")) {
    return [DEMO_WEEKEND.checkInDate, DEMO_WEEKEND.checkOutDate];
  }
  if (text.includes("wednesday")) return [DEMO_TODAY];
  if (text.includes("today")) return [DEMO_TODAY];
  return [DEMO_WEEKEND.checkInDate];
}

function titleForCategory(category: UpdateCategory) {
  const titles: Record<UpdateCategory, string> = {
    onsen_update: "Live onsen update",
    meal_plan: "Meal plan update",
    promotion: "Direct-booking promotion",
    maintenance: "Maintenance notice",
    local_event: "Local event update",
    pet_policy: "Pet policy update",
    room_tech: "Room technology update",
    business_amenity: "Business amenity update",
    activity: "Activity schedule update",
    policy_update: "Policy update",
    guest_insight: "Guest insight",
    crm_insight: "CRM segment insight",
    bot_insight: "Bot question insight",
    reputation_sensitive: "Reputation-sensitive cleanliness incident",
  };
  return titles[category];
}

function travelerSummary(input: string) {
  const sentence = input.trim().replace(/\s+/g, " ");
  return sentence.endsWith(".") ? sentence : `${sentence}.`;
}

function parseClockTime(text: string, term: "event" | "deadline") {
  const pattern =
    term === "event"
      ? /\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/
      : /\b(?:by|book by|please book by)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/;
  const match = text.match(pattern);
  if (!match) return undefined;

  let hour = Number(match[1]);
  const minute = match[2] ?? "00";
  const suffix = match[3];
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  if (term === "deadline" && !suffix && hour < 12) {
    hour += 12;
  }

  return `${hour.toString().padStart(2, "0")}:${minute}`;
}

function eventLocation(text: string) {
  if (text.includes("lobby")) return "lobby";
  if (text.includes("washitsu")) return "washitsu room";
  if (text.includes("garden")) return "garden";
  if (text.includes("lake")) return "lake";
  return undefined;
}

function titleForInput(category: UpdateCategory, text: string) {
  if (isShamisenText(text)) return "Shamisen concert";
  if (text.includes("jazz")) return "Jazz concert";
  if (isCulinaryEvent(text)) return "Gourmet dining event";
  if (text.includes("concert")) return "Live concert";
  if (hasAny(text, ["surf", "surfboard", "wakeboard", "water gear"])) {
    return "Water gear activity update";
  }
  return titleForCategory(category);
}

function eventSummary(input: string, normalized: string) {
  const eventTime = parseClockTime(normalized, "event");
  const bookingDeadline = parseClockTime(normalized, "deadline");
  const location = eventLocation(normalized);
  const repeatNote =
    normalized.includes("every night") && normalized.includes("one week")
      ? `Every night from ${DEMO_TODAY} through ${addDays(DEMO_TODAY, 6)}.`
      : undefined;

  if (isShamisenText(normalized)) {
    const timeText = eventTime ? ` at ${eventTime}` : "";
    const locationText = location ? ` in the ${location}` : "";
    const deadlineText = bookingDeadline
      ? ` Please book by ${bookingDeadline}.`
      : "";
    return {
      eventTime,
      bookingDeadline,
      eventLocation: location,
      repeatNote,
      summary: `A free shamisen concert will be held${locationText}${timeText}.${deadlineText}`.replace(/\s+/g, " ").trim(),
    };
  }

  if (normalized.includes("jazz")) {
    const locationText = location ? ` in the ${location}` : "";
    const repeatText = repeatNote ? " every night for one week" : "";
    const timeText = eventTime ? ` at ${eventTime}` : "";
    const deadlineText = bookingDeadline
      ? ` Please book by ${bookingDeadline}.`
      : "";
    return {
      eventTime,
      bookingDeadline,
      eventLocation: location,
      repeatNote,
      summary: `A jazz concert will be held${locationText}${repeatText}${timeText}.${deadlineText}`.replace(/\s+/g, " ").trim(),
    };
  }

  if (isCulinaryEvent(normalized)) {
    return {
      eventTime,
      bookingDeadline,
      eventLocation: location,
      repeatNote,
      summary:
        "A gourmet dining event will feature washoku, French, and Chinese cuisine. The operator notes Michelin Guide recognition; guests should book early.",
    };
  }

  return {
    eventTime,
    bookingDeadline,
    eventLocation: location,
    repeatNote,
    summary: travelerSummary(input.replace(/samizen|shamizen/gi, "shamisen")),
  };
}

function japanesePreview(category: UpdateCategory, summary: string) {
  if (category === "local_event") {
    if (summary.toLowerCase().includes("jazz")) {
      return "最新情報: ロビーでジャズコンサートを開催予定です。詳細は宿泊施設の案内をご確認ください。";
    }
    if (summary.toLowerCase().includes("shamisen")) {
      return "最新情報: 三味線コンサートを開催予定です。詳細は宿泊施設の案内をご確認ください。";
    }
    if (summary.toLowerCase().includes("gourmet")) {
      return "最新情報: 和食・フレンチ・中華を楽しめるグルメイベントを開催予定です。お早めのご予約をおすすめします。";
    }
  }
  if (category === "activity" && hasAny(summary.toLowerCase(), ["surf", "wakeboard", "water gear"])) {
    return "最新情報: 湖で楽しめるウォーターギアの貸し出し情報が追加されました。";
  }

  const previews: Record<UpdateCategory, string> = {
    onsen_update: "最新情報: 対象日に温泉体験の更新があります。",
    meal_plan: "最新情報: 対象日の食事プランに更新があります。",
    promotion: "最新情報: 直接予約向けの特典があります。",
    maintenance: "重要: 対象時間帯にメンテナンス予定があります。",
    local_event: "最新情報: 周辺イベント情報が更新されました。",
    pet_policy: "最新情報: ペット同伴条件が更新されました。",
    room_tech: "最新情報: 客室設備情報が確認されました。",
    business_amenity: "最新情報: ビジネス利用向け設備が確認されました。",
    activity: "最新情報: アクティビティの予定が更新されました。",
    policy_update: "最新情報: 宿泊ポリシーが更新されました。",
    guest_insight: "ゲスト傾向: よくある質問に基づく情報が追加されました。",
    crm_insight: "CRM傾向: セグメント別の関心事項が追加されました。",
    bot_insight: "Bot傾向: 問い合わせ傾向に基づく情報が追加されました。",
    reputation_sensitive: "重要: ロビー清掃対応中です。ご不便をおかけします。",
  };
  return previews[category];
}

export function deterministicExtractUpdate(
  input: string,
  hotel: HotelGraph
): LiveLocalUpdate {
  const normalized = input.toLowerCase();
  const category = categoryForText(normalized);
  const risk = riskForText(normalized);
  const isSensitive = category === "reputation_sensitive";
  const localEvent = category === "local_event";
  const event = localEvent ? eventSummary(input, normalized) : null;
  const summary = isSensitive
    ? "Lobby cleaning is currently in progress. We apologize for any temporary inconvenience."
    : event?.summary ?? travelerSummary(input.replace(/samizen|shamizen/gi, "shamisen"));
  const internalNotes = isSensitive
    ? "Reported vomit incident in lobby; cleaning response needed."
    : event?.repeatNote
      ? `Deterministic demo extraction. ${event.repeatNote}`
      : event?.eventLocation
        ? `Deterministic demo extraction. Event location: ${event.eventLocation}.`
        : "Deterministic demo extraction. Production would route high-risk items through policy and approval controls.";
  const extractedDates = affectedDates(normalized);

  return {
    id: `update-${hotel.id}-${Date.now()}`,
    category,
    title: titleForInput(category, normalized),
    hotelId: hotel.id,
    affectedDates: extractedDates,
    affectedRoomTypes: affectedRoomTypes(normalized, hotel),
    affectedOffer: normalized.includes("kaiseki")
      ? "Seasonal Kaiseki Direct Plan"
      : normalized.includes("cycling")
        ? "Lake Cycling Direct Plan"
        : undefined,
    eventTime: event?.eventTime,
    bookingDeadline: event?.bookingDeadline,
    eventLocation: event?.eventLocation,
    repeatNote: event?.repeatNote,
    reputationSensitive: isSensitive,
    sanitizedTravelerCopy: isSensitive,
    priceImpact: normalized.includes("¥") || normalized.includes("price")
      ? "Price or fee mentioned; verify before publishing."
      : "No room-rate change detected.",
    travelerFacingSummary: summary,
    internalNotes,
    languagesToGenerate: ["ja", "en", "ko", "zh-TW"],
    preview: {
      ja: japanesePreview(category, summary),
      en: summary,
      ko: "Queued for production multilingual generation.",
      zhTW: "Queued for production multilingual generation.",
    },
    source: "operator_text",
    confidence: risk.riskLevel === "high" ? 0.82 : 0.9,
    riskLevel: risk.riskLevel,
    requiresApproval: risk.requiresApproval,
    status: "draft",
    lastVerifiedAt: DEMO_NOW,
    createdAt: DEMO_NOW,
  };
}
