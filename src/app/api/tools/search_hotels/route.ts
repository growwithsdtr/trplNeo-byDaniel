import { NextResponse } from "next/server";
import { baselineHotels } from "@/data/hotels";

function score(query: string, haystack: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2)
    .reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const query = String(body.query ?? "");

  const results = baselineHotels
    .map((hotel) => {
      const haystack = [
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
      ]
        .join(" ")
        .toLowerCase();
      return {
        hotelId: hotel.id,
        name: hotel.name,
        type: hotel.type,
        score: score(query, haystack),
        source: "Hotel Knowledge Graph",
      };
    })
    .sort((a, b) => b.score - a.score);

  return NextResponse.json({
    simulated: true,
    guardrail: "No facts are returned unless present in the synthetic graph.",
    results,
  });
}
