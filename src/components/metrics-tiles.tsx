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
      detail: "Structured graph + approved live context",
      icon: Gauge,
    },
    {
      label: "Freshness Score",
      value: `${metrics.freshnessScore}/100`,
      detail: "Recency of operator-approved hotel facts",
      icon: RefreshCcw,
    },
    {
      label: "Direct Booking Handoff Count",
      value: metrics.directBookingHandoffCount.toString(),
      detail: "Verified quote-to-direct link handoffs",
      icon: Link2,
    },
    {
      label: "Incremental Direct GMV Potential",
      value: formatYen(metrics.incrementalDirectGmvPotential),
      detail: "Mock value of direct handoff opportunities",
      icon: JapaneseYen,
    },
    {
      label: "Operator Time Saved Estimate",
      value: `${metrics.operatorTimeSavedMinutes} min`,
      detail: "Reusable answers from one approved update",
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
