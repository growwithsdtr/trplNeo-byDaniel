import { NextResponse } from "next/server";
import { baselineHotels } from "@/data/hotels";
import { deterministicExtractUpdate } from "@/lib/extraction";
import type { LiveLocalUpdate, RiskLevel, UpdateCategory } from "@/lib/types";

const categories: UpdateCategory[] = [
  "onsen_update",
  "meal_plan",
  "promotion",
  "maintenance",
  "local_event",
  "pet_policy",
  "room_tech",
  "business_amenity",
  "activity",
  "policy_update",
  "guest_insight",
  "crm_insight",
  "bot_insight",
];

const riskLevels: RiskLevel[] = ["low", "medium", "high"];

function isCategory(value: unknown): value is UpdateCategory {
  return typeof value === "string" && categories.includes(value as UpdateCategory);
}

function isRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === "string" && riskLevels.includes(value as RiskLevel);
}

function normalizeOpenAiUpdate(
  parsed: Record<string, unknown>,
  fallback: LiveLocalUpdate
): LiveLocalUpdate {
  const travelerFacingSummary =
    typeof parsed.travelerFacingSummary === "string"
      ? parsed.travelerFacingSummary
      : fallback.travelerFacingSummary;
  const priceImpact =
    typeof parsed.priceImpact === "string"
      ? parsed.priceImpact
      : fallback.priceImpact;
  const riskText = `${travelerFacingSummary} ${priceImpact}`.toLowerCase();
  const hasHighRiskTerm = [
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
  ].some((term) => riskText.includes(term));
  const riskLevel = hasHighRiskTerm
    ? "high"
    : isRiskLevel(parsed.riskLevel)
      ? parsed.riskLevel
      : fallback.riskLevel;
  const requiresApproval =
    riskLevel === "high"
      ? true
      : typeof parsed.requiresApproval === "boolean"
        ? parsed.requiresApproval
        : fallback.requiresApproval;

  return {
    ...fallback,
    category: isCategory(parsed.category) ? parsed.category : fallback.category,
    affectedDates: Array.isArray(parsed.affectedDates)
      ? parsed.affectedDates.filter((item): item is string => typeof item === "string")
      : fallback.affectedDates,
    affectedRoomTypes: Array.isArray(parsed.affectedRoomTypes)
      ? parsed.affectedRoomTypes.filter(
          (item): item is string => typeof item === "string"
        )
      : fallback.affectedRoomTypes,
    affectedOffer:
      typeof parsed.affectedOffer === "string"
        ? parsed.affectedOffer
        : fallback.affectedOffer,
    priceImpact,
    travelerFacingSummary,
    internalNotes:
      typeof parsed.internalNotes === "string"
        ? parsed.internalNotes
        : "OpenAI structured extraction with deterministic fallback available.",
    riskLevel,
    requiresApproval,
    confidence:
      typeof parsed.confidence === "number" ? parsed.confidence : fallback.confidence,
    preview: {
      ja:
        typeof parsed.jaPreview === "string"
          ? parsed.jaPreview
          : fallback.preview.ja,
      en: travelerFacingSummary,
      ko: "Queued for production multilingual generation.",
      zhTW: "Queued for production multilingual generation.",
    },
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const input = String(body.input ?? "");
  const hotel =
    baselineHotels.find((candidate) => candidate.id === body.hotelId) ??
    baselineHotels[0];
  const fallback = deterministicExtractUpdate(input, hotel);

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      provider: "deterministic",
      update: fallback,
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        input: [
          {
            role: "system",
            content:
              "Extract a hotel operator update into JSON. Use only the supplied text. Do not invent prices, availability, amenities, or policies.",
          },
          {
            role: "user",
            content: `Hotel: ${hotel.name}\nOperator update: ${input}`,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "hotel_operator_update",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                category: { type: "string", enum: categories },
                affectedDates: { type: "array", items: { type: "string" } },
                affectedRoomTypes: { type: "array", items: { type: "string" } },
                affectedOffer: { type: "string" },
                priceImpact: { type: "string" },
                travelerFacingSummary: { type: "string" },
                internalNotes: { type: "string" },
                jaPreview: { type: "string" },
                confidence: { type: "number" },
                riskLevel: { type: "string", enum: riskLevels },
                requiresApproval: { type: "boolean" },
              },
              required: [
                "category",
                "affectedDates",
                "affectedRoomTypes",
                "affectedOffer",
                "priceImpact",
                "travelerFacingSummary",
                "internalNotes",
                "jaPreview",
                "confidence",
                "riskLevel",
                "requiresApproval",
              ],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI extraction failed with ${response.status}`);
    }

    const data = await response.json();
    const outputText =
      typeof data.output_text === "string"
        ? data.output_text
        : data.output
            ?.flatMap((item: { content?: Array<{ text?: string }> }) =>
              item.content?.map((content) => content.text ?? "") ?? []
            )
            .join("");

    if (!outputText) {
      throw new Error("OpenAI extraction returned no output text");
    }

    const parsed = JSON.parse(outputText) as Record<string, unknown>;

    return NextResponse.json({
      provider: "openai",
      update: normalizeOpenAiUpdate(parsed, fallback),
    });
  } catch (error) {
    console.log("OpenAI extraction fallback:", error);
    return NextResponse.json({
      provider: "deterministic_fallback",
      update: fallback,
    });
  } finally {
    clearTimeout(timeout);
  }
}
