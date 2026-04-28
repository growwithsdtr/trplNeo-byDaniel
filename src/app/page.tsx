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
import { QRCodeCanvas } from "qrcode.react";
import { DemoTour, type TourStep } from "@/components/demo-tour";
import { HotelSelector } from "@/components/hotel-selector";
import { JsonViewer } from "@/components/json-viewer";
import { MetricsTiles } from "@/components/metrics-tiles";
import { baselineHotels, travelerQueryExamples, updateExamples } from "@/data/hotels";
import { runTravelerAgent, type TravelerAgentResult } from "@/lib/agent";
import { deterministicExtractUpdate } from "@/lib/extraction";
import { calculateMetrics } from "@/lib/metrics";
import { buildHotelJsonLd } from "@/lib/schema";
import type {
  AuditLogEntry,
  BookingHandoff,
  HotelGraph,
  LiveLocalUpdate,
} from "@/lib/types";

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
  const [hotels, setHotels] = useState<HotelGraph[]>(baselineHotels);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("console");
  const [selectedHotelId, setSelectedHotelId] = useState(baselineHotels[0].id);
  const [updateText, setUpdateText] = useState(updateExamples[0]);
  const [structuredUpdate, setStructuredUpdate] =
    useState<LiveLocalUpdate | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [travelerQuery, setTravelerQuery] = useState(travelerQueryExamples[0]);
  const [agentResult, setAgentResult] = useState<TravelerAgentResult | null>(null);
  const [handoffs, setHandoffs] = useState<BookingHandoff[]>([]);
  const [latestHandoff, setLatestHandoff] = useState<BookingHandoff | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const selectedHotel = useMemo(
    () =>
      hotels.find((hotel) => hotel.id === selectedHotelId) ?? hotels[0],
    [hotels, selectedHotelId]
  );

  const metrics = useMemo(
    () => calculateMetrics(hotels, handoffs),
    [hotels, handoffs]
  );
  const jsonLd = useMemo(() => buildHotelJsonLd(selectedHotel), [selectedHotel]);

  function startTour() {
    resetDemo();
    setTourOpen(true);
    setTourStep(0);
    setActiveTab("console");
    setSelectedHotelId("nikko-cedar-ryokan");
    setUpdateText(updateExamples[0]);
  }

  function goToTourStep(nextStep: number) {
    if (nextStep >= tourSteps.length) {
      setTourOpen(false);
      return;
    }
    if (nextStep === 2 && !structuredUpdate) {
      void handleExtractUpdate();
    }
    if (nextStep === 3 && structuredUpdate?.status !== "approved") {
      handleApproveUpdate(
        structuredUpdate ?? deterministicExtractUpdate(updateText, selectedHotel)
      );
    }
    if (nextStep === 5) {
      setTravelerQuery(travelerQueryExamples[0]);
    }
    if (nextStep === 6) {
      handleRunAgent();
    }
    if (nextStep === 7) {
      const result = agentResult ?? handleRunAgent();
      handleCreateHandoff(result);
    }
    setTourStep(nextStep);
    setActiveTab(tourSteps[nextStep].tab as TabId);
  }

  function resetDemo() {
    setHotels(baselineHotels);
    setAuditLog([]);
    setSelectedHotelId("nikko-cedar-ryokan");
    setUpdateText(updateExamples[0]);
    setStructuredUpdate(null);
    setIsExtracting(false);
    setTravelerQuery(travelerQueryExamples[0]);
    setAgentResult(null);
    setHandoffs([]);
    setLatestHandoff(null);
  }

  async function handleExtractUpdate() {
    setIsExtracting(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8500);

    try {
      const response = await fetch("/api/extract-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          input: updateText,
          hotelId: selectedHotel.id,
        }),
      });
      if (!response.ok) {
        throw new Error(`Extraction failed with ${response.status}`);
      }
      const payload = (await response.json()) as { update?: LiveLocalUpdate };
      const extracted =
        payload.update ?? deterministicExtractUpdate(updateText, selectedHotel);
      setStructuredUpdate(extracted);
      return extracted;
    } catch (error) {
      console.log("Client extraction fallback:", error);
      const extracted = deterministicExtractUpdate(updateText, selectedHotel);
      setStructuredUpdate(extracted);
      return extracted;
    } finally {
      window.clearTimeout(timeout);
      setIsExtracting(false);
    }
  }

  function handleApproveUpdate(update = structuredUpdate) {
    if (!update) return;
    const approvedUpdate: LiveLocalUpdate = {
      ...update,
      status: "approved",
      approvedAt: "2026-04-28T12:03:00+09:00",
      lastVerifiedAt: "2026-04-28T12:03:00+09:00",
    };

    setHotels((currentHotels) =>
      currentHotels.map((hotel) => {
        if (hotel.id !== approvedUpdate.hotelId) return hotel;
        const withoutDraftDuplicate = hotel.liveLocalUpdates.filter(
          (existing) => existing.id !== approvedUpdate.id
        );
        return {
          ...hotel,
          liveLocalUpdates: [...withoutDraftDuplicate, approvedUpdate],
          maintenanceNotices:
            approvedUpdate.category === "maintenance"
              ? [approvedUpdate.travelerFacingSummary, ...hotel.maintenanceNotices]
              : hotel.maintenanceNotices,
          promotions:
            approvedUpdate.category === "promotion"
              ? [approvedUpdate.travelerFacingSummary, ...hotel.promotions]
              : hotel.promotions,
          lastVerifiedAt: approvedUpdate.lastVerifiedAt,
        };
      })
    );

    const hotelName =
      hotels.find((hotel) => hotel.id === approvedUpdate.hotelId)?.name ??
      selectedHotel.name;

    setAuditLog((entries) => [
      {
        id: `audit-${approvedUpdate.id}`,
        timestamp: approvedUpdate.approvedAt ?? approvedUpdate.lastVerifiedAt,
        hotel: hotelName,
        category: approvedUpdate.category,
        source: approvedUpdate.source,
        riskLevel: approvedUpdate.riskLevel,
        approvedBy: "operator",
        status: "approved",
      },
      ...entries,
    ]);
    setStructuredUpdate(approvedUpdate);
  }

  function handleRunAgent() {
    const result = runTravelerAgent(travelerQuery, hotels);
    setAgentResult(result);
    setSelectedHotelId(result.matchedHotelId);
    return result;
  }

  function handleCreateHandoff(result = agentResult) {
    if (!result) return null;
    const handoff: BookingHandoff = {
      id: `handoff-${Date.now()}`,
      hotelId: result.matchedHotelId,
      hotelName: result.hotelName,
      roomType: result.availableRoom.roomType,
      dates: result.availableRoom.date,
      rateYen: result.rateYen,
      bookingUrl: `https://example.com/triplaNeoByDaniel/book/${result.matchedHotelId}?room=${encodeURIComponent(
        result.availableRoom.roomType
      )}&date=${result.availableRoom.date}`,
      createdAt: "2026-04-28T12:06:00+09:00",
    };
    setHandoffs((current) => [handoff, ...current]);
    setLatestHandoff(handoff);
    return handoff;
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
                onClick={resetDemo}
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
                hotels={hotels}
                selectedHotelId={selectedHotelId}
                setSelectedHotelId={setSelectedHotelId}
                updateText={updateText}
                setUpdateText={setUpdateText}
                structuredUpdate={structuredUpdate}
                onExtract={handleExtractUpdate}
                isExtracting={isExtracting}
                onApprove={handleApproveUpdate}
                onReject={() => setStructuredUpdate(null)}
                auditLog={auditLog}
              />
            ) : null}
            {activeTab === "graph" ? (
              <KnowledgeGraphTab hotel={selectedHotel} jsonLd={jsonLd} />
            ) : null}
            {activeTab === "agent" ? (
              <AgentTab
                travelerQuery={travelerQuery}
                setTravelerQuery={setTravelerQuery}
                agentResult={agentResult}
                onRunAgent={handleRunAgent}
                handoff={latestHandoff}
                onCreateHandoff={handleCreateHandoff}
              />
            ) : null}
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
  hotels,
  selectedHotelId,
  setSelectedHotelId,
  updateText,
  setUpdateText,
  structuredUpdate,
  onExtract,
  isExtracting,
  onApprove,
  onReject,
  auditLog,
}: {
  hotels: HotelGraph[];
  selectedHotelId: string;
  setSelectedHotelId: (hotelId: string) => void;
  updateText: string;
  setUpdateText: (value: string) => void;
  structuredUpdate: LiveLocalUpdate | null;
  onExtract: () => Promise<LiveLocalUpdate>;
  isExtracting: boolean;
  onApprove: () => void;
  onReject: () => void;
  auditLog: AuditLogEntry[];
}) {
  const selectedHotel =
    hotels.find((hotel) => hotel.id === selectedHotelId) ?? hotels[0];

  return (
    <div className="grid gap-4">
      <Panel
        eyebrow="Operator AI control layer"
        title="Okami-san Live Update Console"
        description="Hotel staff add live, local, time-sensitive information. The demo extracts structured fields, flags risk, and requires approval before publishing."
      >
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <HotelSelector
              hotels={hotels}
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
              value={updateText}
              onChange={(event) => setUpdateText(event.target.value)}
              className="min-h-28 w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700 shadow-sm transition focus:border-blue-600"
            />
            <div className="flex flex-wrap gap-2">
              {updateExamples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setUpdateText(example);
                    onReject();
                  }}
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-left text-xs font-medium text-zinc-600 shadow-sm"
                >
                  {example}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onExtract}
                disabled={isExtracting}
                className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
              >
                {isExtracting ? "Extracting..." : "Extract structured update"}
              </button>
              <button
                type="button"
                onClick={onReject}
                className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
              >
                Reject / reset update
              </button>
            </div>
          </div>
        </div>
        {structuredUpdate ? (
          <StructuredUpdateCard update={structuredUpdate} onApprove={onApprove} />
        ) : (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
            Add an operator update and extract it into a structured,
            reviewable graph mutation.
          </div>
        )}
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
      <AuditLog entries={auditLog} />
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
  const [copied, setCopied] = useState(false);
  const jsonLdString = JSON.stringify(jsonLd, null, 2);

  async function copyJsonLd() {
    await navigator.clipboard.writeText(jsonLdString);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

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
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-600">
                  Schema.org validator affordance
                </p>
                <h3 className="mt-1 text-base font-semibold text-zinc-950">
                  JSON-LD preview
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyJsonLd}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
                >
                  {copied ? "Copied" : "Copy JSON-LD"}
                </button>
                <a
                  href="https://validator.schema.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-950 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
                >
                  Open Schema Validator
                </a>
              </div>
            </div>
            <div className="mt-4">
              <JsonViewer value={jsonLd} title="Schema.org JSON-LD preview" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentTab({
  travelerQuery,
  setTravelerQuery,
  agentResult,
  onRunAgent,
  handoff,
  onCreateHandoff,
}: {
  travelerQuery: string;
  setTravelerQuery: (query: string) => void;
  agentResult: TravelerAgentResult | null;
  onRunAgent: () => TravelerAgentResult;
  handoff: BookingHandoff | null;
  onCreateHandoff: () => BookingHandoff | null;
}) {
  return (
    <div className="grid gap-4">
      <Panel
        eyebrow="Traveler-facing AI"
        title="Traveler AI Agent Simulation"
        description="The simulated agent reads only from the current structured Hotel Knowledge Graph. It must not invent prices, availability, amenities, policies, or activities."
      >
        <textarea
          value={travelerQuery}
          onChange={(event) => setTravelerQuery(event.target.value)}
          className="min-h-28 w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700 shadow-sm transition focus:border-blue-600"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {travelerQueryExamples.map((query) => (
            <button
              key={query}
              type="button"
              onClick={() => setTravelerQuery(query)}
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-left text-xs font-medium text-zinc-600 shadow-sm"
            >
              {query}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onRunAgent}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
        >
          Run traveler query
        </button>
      </Panel>
      {agentResult ? (
        <Panel
          eyebrow="Agent answer"
          title={`Matched hotel: ${agentResult.hotelName}`}
          description="Source: Hotel Knowledge Graph"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <h3 className="text-sm font-semibold text-zinc-950">Matching criteria</h3>
              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-zinc-600">
                {agentResult.matchingCriteria.map((criterion) => (
                  <li key={criterion}>{criterion}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <h3 className="text-sm font-semibold text-zinc-950">Verified room and rate</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {agentResult.availableRoom.roomType} on {agentResult.availableRoom.date}
                : {agentResult.availableRoom.remaining} left at ¥
                {agentResult.rateYen.toLocaleString()}.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-zinc-950">
              Latest live/local updates used
            </h3>
            {agentResult.latestUpdatesUsed.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-zinc-600">
                {agentResult.latestUpdatesUsed.map((update) => (
                  <li key={update.id}>{update.travelerFacingSummary}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                No query-relevant fresh updates were needed for this match.
              </p>
            )}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <h3 className="text-sm font-semibold text-zinc-950">Policy notes</h3>
              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-zinc-600">
                {agentResult.policyNotes.map((policy) => (
                  <li key={policy}>{policy}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="text-sm font-semibold text-blue-950">
                Why direct booking is useful
              </h3>
              <p className="mt-2 text-sm leading-6 text-blue-800">
                {agentResult.directBookingRationale}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCreateHandoff}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            Generate direct booking handoff
          </button>
        </Panel>
      ) : (
        <Panel
          eyebrow="Ready"
          title="Run a traveler query"
          description="The answer will cite Source: Hotel Knowledge Graph and use only known facts."
        >
          <p className="text-sm leading-6 text-zinc-600">
            No traveler-agent response yet.
          </p>
        </Panel>
      )}
      {handoff ? <BookingHandoffCard handoff={handoff} /> : null}
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
              Simulated MCP-style tools — production would expose standards-compliant MCP.
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
      <McpToolsPanel />
    </div>
  );
}

function StructuredUpdateCard({
  update,
  onApprove,
}: {
  update: LiveLocalUpdate;
  onApprove: () => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            Extracted structured update
          </p>
          <h3 className="mt-2 text-base font-semibold text-zinc-950">
            {update.title}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              update.riskLevel === "high"
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {update.riskLevel} risk
          </span>
          <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">
            {update.requiresApproval ? "Approval required" : "Review before publish"}
          </span>
          <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">
            {update.status}
          </span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Fact label="Category" value={update.category} />
        <Fact label="Affected dates" value={update.affectedDates.join(", ")} />
        <Fact
          label="Affected rooms"
          value={update.affectedRoomTypes.join(", ") || "No room-specific impact"}
        />
        <Fact label="Price impact" value={update.priceImpact} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
            EN preview
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-700">{update.preview.en}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
            JA preview
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-700">{update.preview.ja}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
            KO preview
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-700">{update.preview.ko}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
            Traditional Chinese preview
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-700">{update.preview.zhTW}</p>
        </div>
      </div>
      <JsonViewer value={update} title="Structured update JSON" />
      <button
        type="button"
        onClick={onApprove}
        disabled={update.status === "approved"}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {update.riskLevel === "high" ? "Approve high-risk update" : "Approve update"}
      </button>
    </div>
  );
}

function AuditLog({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <Panel
      eyebrow="Audit log"
      title="Session log"
      description="In-memory session log. It clears on refresh or Reset Demo."
    >
      {entries.length === 0 ? (
        <p className="text-sm leading-6 text-zinc-600">No approved updates yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Hotel</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Risk</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-600">
                    {entry.timestamp}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">{entry.hotel}</td>
                  <td className="px-3 py-2 text-zinc-700">{entry.category}</td>
                  <td className="px-3 py-2 text-zinc-700">{entry.riskLevel}</td>
                  <td className="px-3 py-2 text-zinc-700">
                    {entry.status} by {entry.approvedBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function BookingHandoffCard({ handoff }: { handoff: BookingHandoff }) {
  return (
    <Panel
      eyebrow="Mock direct booking handoff created"
      title={handoff.hotelName}
      description="Payment integration is intentionally out of scope. The first milestone is proving AI discovery → verified quote → direct booking handoff."
    >
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <QRCodeCanvas value={handoff.bookingUrl} size={180} includeMargin />
        </div>
        <div className="space-y-3">
          <Fact label="Room" value={handoff.roomType} />
          <Fact label="Date" value={handoff.dates} />
          <Fact
            label="Potential direct GMV"
            value={`¥${handoff.rateYen.toLocaleString()}`}
          />
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
              Dummy booking link
            </p>
            <a
              href={handoff.bookingUrl}
              className="mt-2 block break-all font-mono text-xs text-blue-700"
            >
              {handoff.bookingUrl}
            </a>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
        No payment execution. Production integration would connect to triplaPay
        and/or payment providers such as GMO where relevant.
      </div>
    </Panel>
  );
}

function McpToolsPanel() {
  const tools = [
    {
      name: "search_hotels",
      method: "POST",
      path: "/api/tools/search_hotels",
      description: "Search synthetic hotels by traveler intent, dates, and guests.",
    },
    {
      name: "get_hotel_context",
      method: "POST",
      path: "/api/tools/get_hotel_context",
      description: "Return structured hotel context for AI-readable discovery.",
    },
    {
      name: "check_availability",
      method: "POST",
      path: "/api/tools/check_availability",
      description: "Return only mock availability and prices present in JSON.",
    },
    {
      name: "create_booking_handoff",
      method: "POST",
      path: "/api/tools/create_booking_handoff",
      description: "Create a simulated direct booking link without payment execution.",
    },
  ];

  return (
    <Panel
      eyebrow="Tool/API thinking"
      title="Simulated MCP-style tools"
      description="Simulated MCP-style tools — production would expose standards-compliant MCP."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {tools.map((tool) => (
          <div
            key={tool.name}
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-mono text-sm font-semibold text-zinc-950">
                {tool.name}
              </h3>
              <span className="rounded-md bg-white px-2 py-1 font-mono text-xs text-zinc-600 ring-1 ring-zinc-200">
                {tool.method}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {tool.description}
            </p>
            <p className="mt-3 break-all font-mono text-xs text-blue-700">
              {tool.path}
            </p>
          </div>
        ))}
      </div>
    </Panel>
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
