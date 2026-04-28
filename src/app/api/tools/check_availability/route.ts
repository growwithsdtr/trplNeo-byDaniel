import { NextResponse } from "next/server";
import { baselineHotels } from "@/data/hotels";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const hotel = baselineHotels.find((candidate) => candidate.id === body.hotelId);

  if (!hotel) {
    return NextResponse.json(
      { error: "hotel_not_found", source: "Hotel Knowledge Graph" },
      { status: 404 }
    );
  }

  const requestedRoomType = String(body.roomType ?? "").toLowerCase();
  const room =
    hotel.roomTypes.find((candidate) =>
      candidate.name.toLowerCase().includes(requestedRoomType)
    ) ?? hotel.roomTypes[0];
  const requestedDates = Array.isArray(body.dates) ? body.dates : [];
  const availability =
    requestedDates.length > 0
      ? room.availability.filter((slot) => requestedDates.includes(slot.date))
      : room.availability;

  return NextResponse.json({
    simulated: true,
    source: "Hotel Knowledge Graph",
    guardrail: "Availability and price are returned only from JSON.",
    hotelId: hotel.id,
    hotelName: hotel.name,
    roomType: room.name,
    rateYen: room.rateYen,
    currency: room.currency,
    availability,
  });
}
