import { NextResponse } from "next/server";
import { baselineHotels } from "@/data/hotels";
import { runTravelerAgent, type TravelerAgentResult } from "@/lib/agent";
import type { HotelGraph } from "@/lib/types";

type TravelerAgentMode = "deterministic" | "llm-grounded";

interface TravelerAgentResponse {
  mode: TravelerAgentMode;
  result: TravelerAgentResult;
}

function isHotelGraphArray(value: unknown): value is HotelGraph[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        "id" in item &&
        "roomTypes" in item &&
        "liveLocalUpdates" in item
    )
  );
}

function fallbackResponse(
  query: string,
  hotels: HotelGraph[],
  reason?: unknown
): TravelerAgentResponse {
  if (reason) {
    console.log("Traveler agent deterministic fallback:", reason);
  }

  return {
    mode: "deterministic",
    result: runTravelerAgent(query, hotels),
  };
}

function extractOutputText(data: {
  output_text?: unknown;
  output?: Array<{ content?: Array<{ text?: unknown }> }>;
}) {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  return data.output
    ?.flatMap((item) =>
      item.content?.map((content) =>
        typeof content.text === "string" ? content.text : ""
      ) ?? []
    )
    .join("");
}

function normalizeLlmResult(
  parsed: Record<string, unknown>,
  fallback: TravelerAgentResult,
  matchedHotel: HotelGraph,
  hotels: HotelGraph[]
): TravelerAgentResult {
  const assistantMessage =
    typeof parsed.assistantMessage === "string"
      ? parsed.assistantMessage
      : undefined;
  const missingInformation = Array.isArray(parsed.missingInformation)
    ? parsed.missingInformation.filter(
        (item): item is string => typeof item === "string"
      )
    : [];
  const citedSource =
    typeof parsed.citedSource === "string" ? parsed.citedSource : "";

  if (!assistantMessage || citedSource !== "Source: Hotel Knowledge Graph") {
    throw new Error("Malformed LLM traveler-agent response");
  }
  const mentionedOtherHotel = hotels.some(
    (hotel) =>
      hotel.id !== matchedHotel.id &&
      assistantMessage.toLowerCase().includes(hotel.name.toLowerCase())
  );
  if (mentionedOtherHotel) {
    throw new Error("LLM response recommended a different hotel than selectedHotelId");
  }
  const groundedMessage = assistantMessage
    .toLowerCase()
    .includes(matchedHotel.name.toLowerCase())
    ? assistantMessage
    : `${matchedHotel.name}: ${assistantMessage}`;

  return {
    ...fallback,
    assistantMessage: groundedMessage,
    missingInformation,
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    query?: unknown;
    hotels?: unknown;
  };
  const query = String(body.query ?? "");
  const hotels: HotelGraph[] = isHotelGraphArray(body.hotels)
    ? body.hotels
    : baselineHotels;
  const fallback = runTravelerAgent(query, hotels);

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      mode: "deterministic",
      result: fallback,
    } satisfies TravelerAgentResponse);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const matchedHotel = hotels.find(
      (hotel) => hotel.id === fallback.matchedHotelId
    );
    if (!matchedHotel) {
      throw new Error("Deterministic traveler-agent match was not found");
    }
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
              "You are a traveler-facing hotel agent for a strategy demo. The deterministic matcher has already selected exactly one hotel. Answer only for that selectedHotelId and selectedHotelName from the provided Hotel Knowledge Graph. Do not recommend, compare, or mention any other hotel. Do not invent prices, availability, amenities, policies, activities, or promotions. If information is missing, list what is missing. Cite exactly: Source: Hotel Knowledge Graph. Prefer direct-booking handoff when the selected hotel is suitable. Return only JSON matching the schema.",
          },
          {
            role: "user",
            content: JSON.stringify({
              travelerQuery: query,
              selectedHotelId: fallback.matchedHotelId,
              selectedHotelName: fallback.hotelName,
              deterministicMatch: fallback,
              selectedHotelKnowledgeGraph: matchedHotel,
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "grounded_traveler_agent_answer",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                assistantMessage: {
                  type: "string",
                  description:
                    "Concise traveler-facing answer grounded only in the provided graph.",
                },
                missingInformation: {
                  type: "array",
                  items: { type: "string" },
                  description:
                    "Facts the traveler asked for that were not present in the graph.",
                },
                directBookingHandoffRecommended: { type: "boolean" },
                citedSource: {
                  type: "string",
                  enum: ["Source: Hotel Knowledge Graph"],
                },
              },
              required: [
                "assistantMessage",
                "missingInformation",
                "directBookingHandoffRecommended",
                "citedSource",
              ],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI traveler-agent failed with ${response.status}`);
    }

    const outputText = extractOutputText(await response.json());
    if (!outputText) {
      throw new Error("OpenAI traveler-agent returned no output text");
    }

    const parsed = JSON.parse(outputText) as Record<string, unknown>;

    return NextResponse.json({
      mode: "llm-grounded",
      result: normalizeLlmResult(parsed, fallback, matchedHotel, hotels),
    } satisfies TravelerAgentResponse);
  } catch (error) {
    return NextResponse.json(fallbackResponse(query, hotels, error));
  } finally {
    clearTimeout(timeout);
  }
}
