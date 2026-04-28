import { NextResponse } from "next/server";
import { baselineHotels } from "@/data/hotels";
import { buildHotelJsonLd } from "@/lib/schema";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const hotel = baselineHotels.find((candidate) => candidate.id === body.hotelId);

  if (!hotel) {
    return NextResponse.json(
      { error: "hotel_not_found", source: "Hotel Knowledge Graph" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    simulated: true,
    source: "Hotel Knowledge Graph",
    hotel,
    jsonLd: buildHotelJsonLd(hotel),
  });
}
