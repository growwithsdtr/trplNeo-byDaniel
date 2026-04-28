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
  const date = Array.isArray(body.dates) && body.dates[0] ? body.dates[0] : room.availability[0].date;
  const bookingId = `mock-${hotel.id}-${Date.now()}`;

  return NextResponse.json({
    simulated: true,
    status: "booking_handoff_created",
    source: "Hotel Knowledge Graph",
    payment: "not_executed",
    bookingId,
    hotelId: hotel.id,
    hotelName: hotel.name,
    roomType: room.name,
    date,
    rateYen: room.rateYen,
    bookingUrl: `https://example.com/triplaNeoByDaniel/book/${hotel.id}?bookingId=${bookingId}`,
    note: "Payment integration is intentionally out of scope.",
  });
}
