import type { HotelGraph, LiveLocalUpdate, RiskLevel, UpdateCategory } from "@/lib/types";

const DEMO_NOW = "2026-04-28T12:00:00+09:00";

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
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
  ];
  const highRisk = hasAny(text, highRiskTerms);

  return {
    riskLevel: highRisk ? "high" : "low",
    requiresApproval: highRisk,
  };
}

function categoryForText(text: string): UpdateCategory {
  if (hasAny(text, ["onsen", "bath", "sauna", "yuzu"])) return "onsen_update";
  if (hasAny(text, ["kaiseki", "breakfast", "vegetarian", "dessert", "meal"])) {
    return "meal_plan";
  }
  if (hasAny(text, ["late checkout", "discount", "free"])) return "promotion";
  if (hasAny(text, ["maintenance", "closure", "closed"])) return "maintenance";
  if (hasAny(text, ["dog", "pet"])) return "pet_policy";
  if (hasAny(text, ["wi-fi", "wifi", "hdmi", "speed"])) return "room_tech";
  if (hasAny(text, ["desk", "business", "presentation"])) return "business_amenity";
  if (hasAny(text, ["cycling", "hiking", "tour", "lake"])) return "activity";
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
  if (text.includes("tomorrow")) return ["2026-04-29"];
  if (text.includes("weekend") || text.includes("saturday")) {
    return ["2026-05-02", "2026-05-03"];
  }
  if (text.includes("wednesday")) return ["2026-04-29"];
  if (text.includes("today")) return ["2026-04-28"];
  return ["2026-05-02"];
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
  };
  return titles[category];
}

function travelerSummary(input: string) {
  const sentence = input.trim().replace(/\s+/g, " ");
  return sentence.endsWith(".") ? sentence : `${sentence}.`;
}

function japanesePreview(category: UpdateCategory) {
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
  const summary = travelerSummary(input);

  return {
    id: `update-${hotel.id}-${Date.now()}`,
    category,
    title: titleForCategory(category),
    hotelId: hotel.id,
    affectedDates: affectedDates(normalized),
    affectedRoomTypes: affectedRoomTypes(normalized, hotel),
    affectedOffer: normalized.includes("kaiseki")
      ? "Seasonal Kaiseki Direct Plan"
      : normalized.includes("cycling")
        ? "Lake Cycling Direct Plan"
        : undefined,
    priceImpact: normalized.includes("¥") || normalized.includes("price")
      ? "Price or fee mentioned; verify before publishing."
      : "No room-rate change detected.",
    travelerFacingSummary: summary,
    internalNotes:
      "Deterministic demo extraction. Production would route high-risk items through policy and approval controls.",
    languagesToGenerate: ["ja", "en", "ko", "zh-TW"],
    preview: {
      ja: japanesePreview(category),
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
