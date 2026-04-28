import { baselineHotels } from "@/data/hotels";
import { buildHotelJsonLd } from "@/lib/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;
  const hotel = baselineHotels.find((candidate) => candidate.id === hotelId);

  if (!hotel) {
    return Response.json(
      { error: "hotel_not_found", source: "Hotel Knowledge Graph" },
      { status: 404 }
    );
  }

  return new Response(JSON.stringify(buildHotelJsonLd(hotel), null, 2), {
    headers: {
      "content-type": "application/ld+json; charset=utf-8",
    },
  });
}
