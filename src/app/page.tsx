"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Bot,
  Braces,
  ClipboardCheck,
  Database,
  MapPin,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { DemoTour, type TourStep } from "@/components/demo-tour";
import { HotelSelector } from "@/components/hotel-selector";
import { JsonViewer } from "@/components/json-viewer";
import { MetricsTiles } from "@/components/metrics-tiles";
import { baselineHotels, travelerQueryExamples, updateExamples } from "@/data/hotels";
import { calculateMetrics } from "@/lib/metrics";
import { buildHotelJsonLd } from "@/lib/schema";

type TabId = "console" | "graph" | "agent" | "metrics";

const tabs: Array<{ id: TabId; label: string; icon: typeof ClipboardCheck }> = [
  { id: "console", label: "Okami-san Live Update Console", icon: ClipboardCheck },
  { id: "graph", label: "Live & Local Hotel Knowledge Graph", icon: Database },
  { id: "agent", label: "Traveler AI Agent Simulation", icon: Bot },
  { id: "metrics", label: "Metrics & AI Discoverability Audit", icon: BadgeCheck },
];

const tourSteps: TourStep[] = [
  {
    title: "Select a hotel",
    body: "Start with a synthetic Nikko property. The static graph already separates Schema.org hotel fields from triplaNeo live/local enrichment.",
    tab: "console",
  },
  {
    title: "Add a live/local operator update",
    body: "The operator console is where hotel staff will add time-sensitive information without a complex dashboard.",
    tab: "console",
  },
  {
    title: "Approve the update",
    body: "High-risk updates require human approval before they can affect traveler-facing AI responses.",
    tab: "console",
  },
  {
    title: "Inspect the updated knowledge graph",
    body: "The graph view makes hotel-owned facts readable for humans and structured consumers.",
    tab: "graph",
  },
  {
    title: "See readiness improve",
    body: "Metrics turn the AI work into outcome thinking: freshness, direct handoffs, and GMV potential.",
    tab: "metrics",
  },
  {
    title: "Run a traveler query",
    body: "The simulated agent only reads from the current Hotel Knowledge Graph and cites its source.",
    tab: "agent",
  },
  {
    title: "Use the fresh update",
    body: "The strongest demo moment is the traveler agent using a newly approved operator update in its recommendation.",
    tab: "agent",
  },
  {
    title: "Generate direct booking handoff",
    body: "The prototype stops at verified quote and direct booking handoff. Payment execution is deliberately out of scope.",
    tab: "agent",
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("console");
  const [selectedHotelId, setSelectedHotelId] = useState(baselineHotels[0].id);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const selectedHotel = useMemo(
    () =>
      baselineHotels.find((hotel) => hotel.id === selectedHotelId) ??
      baselineHotels[0],
    [selectedHotelId]
  );

  const metrics = useMemo(() => calculateMetrics(baselineHotels), []);
  const jsonLd = useMemo(() => buildHotelJsonLd(selectedHotel), [selectedHotel]);

  function startTour() {
    setTourOpen(true);
    setTourStep(0);
    setActiveTab("console");
    setSelectedHotelId("nikko-cedar-ryokan");
  }

  function goToTourStep(nextStep: number) {
    if (nextStep >= tourSteps.length) {
      setTourOpen(false);
      return;
    }
    setTourStep(nextStep);
    setActiveTab(tourSteps[nextStep].tab as TabId);
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                <Sparkles className="h-3.5 w-3.5" />
                Demo by Daniel Jimenez
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950">
                triplaNeoByDaniel
              </h1>
              <p className="mt-2 text-lg font-medium text-zinc-800">
                Agentic Direct Booking Infrastructure for the AI Travel Era
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Powered by a Live & Local Hotel Knowledge Graph
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={startTour}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
              >
                <Sparkles className="h-4 w-4" />
                Start Demo Tour
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Demo
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 border-t border-zinc-100 pt-5 text-sm text-zinc-600 md:grid-cols-3">
            <p>Live & local hotel knowledge</p>
            <p>AI discoverability</p>
            <p>Verified direct booking handoff</p>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
            <nav className="flex flex-col gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition ${
                      isActive
                        ? "bg-zinc-950 text-white"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-600">
              Synthetic data only. Production would scale this graph across
              tripla-powered properties and connect it to direct-booking actions.
            </div>
          </aside>

          <section className="min-w-0">
            {activeTab === "console" ? (
              <ConsoleTab
                selectedHotelId={selectedHotelId}
                setSelectedHotelId={setSelectedHotelId}
              />
            ) : null}
            {activeTab === "graph" ? (
              <KnowledgeGraphTab hotel={selectedHotel} jsonLd={jsonLd} />
            ) : null}
            {activeTab === "agent" ? <AgentTab hotelName={selectedHotel.name} /> : null}
            {activeTab === "metrics" ? <MetricsTab metrics={metrics} /> : null}
          </section>
        </section>

        <footer className="flex flex-col gap-2 border-t border-zinc-200 py-4 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Demo by Daniel Jimenez · Synthetic data · Senior PM Gen AI take-home prototype</p>
          <p>Payment execution, PMS integration, crawling, and production MCP are intentionally out of scope.</p>
        </footer>
      </div>

      <DemoTour
        isOpen={tourOpen}
        step={tourStep}
        steps={tourSteps}
        onNext={() => goToTourStep(tourStep + 1)}
        onPrevious={() => goToTourStep(Math.max(0, tourStep - 1))}
        onSkip={() => setTourOpen(false)}
      />
    </main>
  );
}

function ConsoleTab({
  selectedHotelId,
  setSelectedHotelId,
}: {
  selectedHotelId: string;
  setSelectedHotelId: (hotelId: string) => void;
}) {
  const selectedHotel =
    baselineHotels.find((hotel) => hotel.id === selectedHotelId) ??
    baselineHotels[0];

  return (
    <div className="grid gap-4">
      <Panel
        eyebrow="Stage A foundation"
        title="Okami-san Live Update Console"
        description="Operator update extraction and approval arrive in Stage B. This shell shows the final workflow and example inputs."
      >
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <HotelSelector
              hotels={baselineHotels}
              selectedHotelId={selectedHotelId}
              onChange={setSelectedHotelId}
            />
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-medium text-zinc-950">Voice input</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Voice input disabled in demo environment. Use text input.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <textarea
              readOnly
              value="Tomorrow the outdoor onsen will have yuzu aroma."
              className="min-h-28 w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700 shadow-sm"
            />
            <div className="flex flex-wrap gap-2">
              {updateExamples.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-left text-xs font-medium text-zinc-600 shadow-sm"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
          Stage B will turn this into a working flow: text update → structured
          extraction → risk review → operator approval → graph mutation.
        </div>
      </Panel>
      <Guardrails />
      <Panel
        eyebrow="Selected hotel"
        title={selectedHotel.name}
        description={selectedHotel.shortDescription}
      >
        <div className="flex flex-wrap gap-2">
          {selectedHotel.amenities.map((amenity) => (
            <span
              key={amenity}
              className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-600"
            >
              {amenity}
            </span>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function KnowledgeGraphTab({
  hotel,
  jsonLd,
}: {
  hotel: (typeof baselineHotels)[number];
  jsonLd: unknown;
}) {
  return (
    <div className="grid gap-4">
      <Panel
        eyebrow="Standards-based core + triplaNeo live/local extensions"
        title={hotel.name}
        description={hotel.shortDescription}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <Fact label="Type" value={hotel.type} />
          <Fact label="Location" value={hotel.location} />
          <Fact label="Last verified" value={hotel.lastVerifiedAt} />
        </div>
      </Panel>
      <div className="grid gap-4 xl:grid-cols-2">
        <GraphCards hotel={hotel} />
        <div className="space-y-4">
          <JsonViewer value={hotel} title="Developer JSON graph view" />
          <JsonViewer value={jsonLd} title="Schema.org JSON-LD preview" />
        </div>
      </div>
    </div>
  );
}

function AgentTab({ hotelName }: { hotelName: string }) {
  return (
    <div className="grid gap-4">
      <Panel
        eyebrow="Traveler-facing AI"
        title="Traveler AI Agent Simulation"
        description="Stage B will make the agent read the current in-session graph. Stage C adds QR booking handoff."
      >
        <textarea
          readOnly
          value="I want a quiet ryokan in Nikko this weekend with onsen, local food, and a special experience."
          className="min-h-28 w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700 shadow-sm"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {travelerQueryExamples.map((query) => (
            <button
              key={query}
              type="button"
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-left text-xs font-medium text-zinc-600 shadow-sm"
            >
              {query}
            </button>
          ))}
        </div>
      </Panel>
      <Panel
        eyebrow="Static preview"
        title={`Likely match: ${hotelName}`}
        description="Source: Hotel Knowledge Graph"
      >
        <p className="text-sm leading-6 text-zinc-600">
          The final flow will cite only structured hotel facts, show room/rate
          only when present in JSON, and explain why direct booking is useful.
        </p>
      </Panel>
    </div>
  );
}

function MetricsTab({ metrics }: { metrics: ReturnType<typeof calculateMetrics> }) {
  return (
    <div className="grid gap-4">
      <MetricsTiles metrics={metrics} />
      <Panel
        eyebrow="Outcome proxy"
        title="AI Discovery Share definition"
        description="In this demo, AI Discovery Readiness is a proxy metric. In production, this becomes AI Discovery Share: the percentage of monitored traveler-intent prompts where tripla-powered hotel surfaces are cited, accurately described, and linked as direct-bookable sources."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-sm font-medium text-zinc-950">Simulated MCP-style tools</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Production would expose standards-compliant MCP. Stage C adds tool
              cards and simple stateless API endpoints.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-sm font-medium text-zinc-950">Business impact</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Direct-booking economics are protected when AI agents can discover
              verified hotel-owned facts and hand travelers to direct booking.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-600">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function GraphCards({ hotel }: { hotel: (typeof baselineHotels)[number] }) {
  const sections = [
    ["Rooms", hotel.roomTypes.map((room) => `${room.name}: ${room.capacity}`)],
    ["Rates", hotel.roomTypes.map((room) => `${room.name}: ¥${room.rateYen.toLocaleString()}`)],
    [
      "Availability",
      hotel.roomTypes.flatMap((room) =>
        room.availability.map(
          (slot) =>
            `${room.name} · ${slot.date}: ${
              slot.available ? `${slot.remaining} left` : "not available"
            }`
        )
      ),
    ],
    ["Meal plans", hotel.mealPlans],
    ["Onsen / bath / sauna", hotel.onsenBathSauna],
    ["Activities", hotel.localActivities.map((activity) => `${activity.name}: ${activity.schedule}`)],
    ["Pet policy", hotel.petPolicyDetails],
    ["Business amenities", hotel.businessTravelerAmenities],
    ["Room tech amenities", hotel.roomTechAmenities],
    [
      "Live local updates",
      hotel.liveLocalUpdates.map((update) => update.travelerFacingSummary),
    ],
    ["Promotions", hotel.promotions],
    ["Maintenance notices", hotel.maintenanceNotices],
    [
      "Traveler / CRM / Bot insights",
      [
        ...hotel.verifiedGuestInsights,
        ...hotel.crmSegmentInsights,
        ...hotel.botQuestionInsights,
      ].map((insight) => `${insight.source}: ${insight.summary}`),
    ],
  ];

  return (
    <div className="grid gap-3">
      {sections.map(([title, items]) => (
        <div key={title as string} className="rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-950">{title as string}</h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-zinc-600">
            {(items as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-zinc-950">{value}</p>
    </div>
  );
}

function Guardrails() {
  const guardrails = [
    "No price unless present in JSON.",
    "No availability unless present in JSON.",
    "No high-risk update published without approval.",
    "No payment execution.",
    "Traveler agent shows Source: Hotel Knowledge Graph.",
    "Audit log is session-only in this demo.",
  ];

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Braces className="h-4 w-4 text-blue-600" />
        <h2 className="text-sm font-semibold text-zinc-950">Visible guardrails</h2>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {guardrails.map((guardrail) => (
          <div
            key={guardrail}
            className="flex items-start gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600"
          >
            <MapPin className="mt-0.5 h-3.5 w-3.5 text-blue-600" />
            <span>{guardrail}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
