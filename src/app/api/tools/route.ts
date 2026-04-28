import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    label:
      "Simulated MCP-style tools — production would expose standards-compliant MCP.",
    tools: [
      {
        name: "search_hotels",
        method: "POST",
        path: "/api/tools/search_hotels",
        input: { query: "string", dates: "string[]", guests: "number" },
      },
      {
        name: "get_hotel_context",
        method: "POST",
        path: "/api/tools/get_hotel_context",
        input: { hotelId: "string" },
      },
      {
        name: "check_availability",
        method: "POST",
        path: "/api/tools/check_availability",
        input: { hotelId: "string", roomType: "string", dates: "string[]" },
      },
      {
        name: "create_booking_handoff",
        method: "POST",
        path: "/api/tools/create_booking_handoff",
        input: {
          hotelId: "string",
          roomType: "string",
          dates: "string[]",
          guestInfo: "object",
        },
      },
    ],
  });
}
