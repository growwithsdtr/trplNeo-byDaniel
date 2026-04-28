import { Clock, Gauge, JapaneseYen, Link2, RefreshCcw } from "lucide-react";
import type { DemoMetrics } from "@/lib/types";
import { formatYen } from "@/lib/metrics";

interface MetricsTilesProps {
  metrics: DemoMetrics;
}

export function MetricsTiles({ metrics }: MetricsTilesProps) {
  const tiles = [
    {
      label: "AI Discovery Readiness",
      value: `${metrics.aiDiscoveryReadiness}/100`,
      detail: "How complete and machine-readable the hotel graph is.",
      icon: Gauge,
    },
    {
      label: "Freshness Score",
      value: `${metrics.freshnessScore}/100`,
      detail: "How recently live/local facts were verified or updated.",
      icon: RefreshCcw,
    },
    {
      label: "Direct Booking Handoff Count",
      value: metrics.directBookingHandoffCount.toString(),
      detail: "Mock direct-booking opportunities generated from AI discovery.",
      icon: Link2,
    },
    {
      label: "Incremental Direct GMV Potential",
      value: formatYen(metrics.incrementalDirectGmvPotential),
      detail: "Potential direct revenue represented by generated booking handoffs.",
      icon: JapaneseYen,
    },
    {
      label: "Operator Time Saved Estimate",
      value: `${metrics.operatorTimeSavedMinutes} min`,
      detail: "Estimated manual update/support time avoided.",
      icon: Clock,
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <div
            key={tile.label}
            className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                {tile.label}
              </p>
              <Icon className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950">
              {tile.value}
            </p>
            <p className="mt-2 text-xs leading-5 text-zinc-500">{tile.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
