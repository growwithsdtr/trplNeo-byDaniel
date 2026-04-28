import type { HotelGraph, LiveLocalUpdate } from "@/lib/types";

export interface TravelerAgentResult {
  matchedHotelId: string;
  hotelName: string;
  matchingCriteria: string[];
  latestUpdatesUsed: LiveLocalUpdate[];
  availableRoom: {
    roomType: string;
    date: string;
    remaining: number;
  };
  rateYen: number;
  policyNotes: string[];
  directBookingRationale: string;
  source: "Hotel Knowledge Graph";
  assistantMessage?: string;
  missingInformation?: string[];
}

function scoreHotel(query: string, hotel: HotelGraph) {
  const text = [
    hotel.name,
    hotel.type,
    hotel.shortDescription,
    hotel.amenities.join(" "),
    hotel.mealPlans.join(" "),
    hotel.onsenBathSauna.join(" "),
    hotel.petPolicyDetails.join(" "),
    hotel.businessTravelerAmenities.join(" "),
    hotel.roomTechAmenities.join(" "),
    hotel.localActivities.map((activity) => activity.name).join(" "),
    hotel.liveLocalUpdates.map((update) => update.travelerFacingSummary).join(" "),
  ]
    .join(" ")
    .toLowerCase();

  const queryTerms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);

  let score = queryTerms.reduce(
    (total, term) => total + (text.includes(term) ? 1 : 0),
    0
  );

  if (query.includes("ryokan") && hotel.type.includes("ryokan")) score += 6;
  if (query.includes("business") && hotel.type.includes("business")) score += 6;
  if ((query.includes("dog") || query.includes("pet")) && text.includes("dog")) score += 8;
  if ((query.includes("lake") || query.includes("cycling")) && text.includes("cycling")) {
    score += 7;
  }
  if ((query.includes("wi-fi") || query.includes("wifi") || query.includes("hdmi")) && text.includes("hdmi")) {
    score += 7;
  }
  if ((query.includes("onsen") || query.includes("kaiseki")) && text.includes("onsen")) {
    score += 7;
  }

  return score;
}

function relevantUpdates(query: string, hotel: HotelGraph) {
  const q = query.toLowerCase();
  return hotel.liveLocalUpdates
    .filter((update) => update.status === "approved")
    .filter((update) => {
      const updateText = [
        update.category,
        update.travelerFacingSummary,
        update.affectedRoomTypes.join(" "),
        update.affectedOffer ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return q
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length > 3)
        .some((term) => updateText.includes(term));
    })
    .slice(0, 3);
}

export function runTravelerAgent(
  query: string,
  hotels: HotelGraph[]
): TravelerAgentResult {
  const normalizedQuery = query.toLowerCase();
  const matchedHotel = [...hotels].sort(
    (a, b) => scoreHotel(normalizedQuery, b) - scoreHotel(normalizedQuery, a)
  )[0];
  const room =
    matchedHotel.roomTypes.find((candidate) =>
      candidate.availability.some((slot) => slot.available)
    ) ?? matchedHotel.roomTypes[0];
  const availability = room.availability.find((slot) => slot.available) ?? room.availability[0];
  const updates = relevantUpdates(normalizedQuery, matchedHotel);

  return {
    matchedHotelId: matchedHotel.id,
    hotelName: matchedHotel.name,
    matchingCriteria: [
      matchedHotel.type,
      ...matchedHotel.amenities.slice(0, 3),
      ...matchedHotel.localActivities.slice(0, 1).map((activity) => activity.name),
    ],
    latestUpdatesUsed: updates,
    availableRoom: {
      roomType: room.name,
      date: availability.date,
      remaining: availability.remaining,
    },
    rateYen: room.rateYen,
    policyNotes: matchedHotel.policies.slice(0, 3),
    directBookingRationale:
      "Direct booking is useful here because the hotel-owned graph can confirm room availability, current local details, and policy notes without relying on OTA-controlled summaries.",
    source: "Hotel Knowledge Graph",
  };
}
