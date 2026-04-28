import type { BookingHandoff, DemoMetrics, HotelGraph } from "@/lib/types";

export function calculateMetrics(
  hotels: HotelGraph[],
  handoffs: BookingHandoff[] = []
): DemoMetrics {
  const approvedUpdates = hotels.flatMap((hotel) =>
    hotel.liveLocalUpdates.filter((update) => update.status === "approved")
  );
  const baseReadiness = 72;
  const baseFreshness = 68;
  const readinessLift = Math.min(18, approvedUpdates.length * 4);
  const freshnessLift = Math.min(24, approvedUpdates.length * 6);

  return {
    aiDiscoveryReadiness: baseReadiness + readinessLift,
    freshnessScore: baseFreshness + freshnessLift,
    directBookingHandoffCount: handoffs.length,
    incrementalDirectGmvPotential: handoffs.reduce(
      (total, handoff) => total + handoff.rateYen,
      0
    ),
    operatorTimeSavedMinutes: approvedUpdates.length * 8 + handoffs.length * 3,
  };
}

export function formatYen(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}
