"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  DEMO_APPROVED_AT,
  DEMO_DATE_CONTEXT,
  DEMO_HANDOFF_AT,
  DEMO_NOW,
} from "@/lib/demo-date";
import { deterministicExtractUpdate } from "@/lib/extraction";
import { parseTravelerIntent } from "@/lib/intent";
import { calculateMetrics } from "@/lib/metrics";
import { buildHotelJsonLd } from "@/lib/schema";
import type {
  AuditLogEntry,
  BookingHandoff,
  HotelGraph,
  LiveLocalUpdate,
} from "@/lib/types";

type TabId = "console" | "graph" | "agent" | "metrics";
type TravelerAgentMode = "deterministic" | "llm-grounded";

const tabs: Array<{ id: TabId; label: string; icon: typeof ClipboardCheck }> = [
  {
    id: "console",
    label: "Hotel Operator Live & Local Update Console",
    icon: ClipboardCheck,
  },
  { id: "graph", label: "Live & Local Hotel Knowledge Graph", icon: Database },
  { id: "metrics", label: "Metrics & AI Discoverability Audit", icon: BadgeCheck },
  { id: "agent", label: "Traveler AI Agent Simulation", icon: Bot },
];

const tourSteps: TourStep[] = [
  {
    title: "Select a hotel",
    body: "Start with a synthetic Nikko property. The static graph already separates Schema.org hotel fields from triplaNeo live/local enrichment.",
    tab: "console",
  },
  {
    title: "Add a live/local operator update",
    body: "The hotel operator and Okami-san（女将） console is where hotel staff will add time-sensitive information without a complex dashboard.",
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

interface BookingIntent {
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  adults: number;
  children: number;
  pets: number;
  roomType: string;
  hotelName: string;
  estimatedRateYen?: number;
  availabilityVerified: boolean;
  availabilityNote: string;
  rateNote: string;
  handoffType: "verified_booking_handoff" | "booking_inquiry_handoff";
  liveLocalUpdateUsed: string;
}

function cloneBaselineHotels() {
  return JSON.parse(JSON.stringify(baselineHotels)) as HotelGraph[];
}

function findHotelById(hotels: HotelGraph[], hotelId: string) {
  return hotels.find((hotel) => hotel.id === hotelId) ?? hotels[0];
}

function buildBookingIntent(
  query: string,
  result: TravelerAgentResult,
  hotels: HotelGraph[]
): BookingIntent {
  const parsed = parseTravelerIntent(query);
  const matchedHotel = findHotelById(hotels, result.matchedHotelId);
  const matchedRoom =
    matchedHotel.roomTypes.find((room) => room.name === result.availableRoom.roomType) ??
    matchedHotel.roomTypes[0];
  const requestedAvailability = matchedRoom.availability.find(
    (slot) => slot.date === parsed.checkInDate
  );
  const availabilityVerified = Boolean(requestedAvailability?.available);

  return {
    ...parsed,
    roomType: matchedRoom.name,
    hotelName: result.hotelName,
    estimatedRateYen: availabilityVerified ? matchedRoom.rateYen : undefined,
    availabilityVerified,
    availabilityNote: availabilityVerified
      ? `${matchedRoom.name} has ${requestedAvailability?.remaining ?? 0} room(s) left on ${parsed.checkInDate}.`
      : "Availability for requested dates is not verified in the mock graph.",
    rateNote: availabilityVerified
      ? `Verified mock graph rate: ¥${matchedRoom.rateYen.toLocaleString()}.`
      : "Rate unavailable in mock graph for requested dates.",
    handoffType: availabilityVerified
      ? "verified_booking_handoff"
      : "booking_inquiry_handoff",
    liveLocalUpdateUsed:
      result.latestUpdatesUsed[0]?.travelerFacingSummary ??
      "No query-relevant live/local update used.",
  };
}

export default function Home() {
  const [hotels, setHotels] = useState<HotelGraph[]>(() => cloneBaselineHotels());
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("console");
  const [selectedHotelId, setSelectedHotelId] = useState(baselineHotels[0].id);
  const [updateText, setUpdateText] = useState(updateExamples[0].text);
  const [structuredUpdate, setStructuredUpdate] =
    useState<LiveLocalUpdate | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [operatorMessage, setOperatorMessage] = useState<string | null>(null);
  const [travelerQuery, setTravelerQuery] = useState(travelerQueryExamples[0]);
  const [agentResult, setAgentResult] = useState<TravelerAgentResult | null>(null);
  const [agentMode, setAgentMode] =
    useState<TravelerAgentMode>("deterministic");
  const [handoffs, setHandoffs] = useState<BookingHandoff[]>([]);
  const [latestHandoff, setLatestHandoff] = useState<BookingHandoff | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<"idle" | "created">("idle");
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const extractionRequestId = useRef(0);
  const agentRequestId = useRef(0);

  const selectedHotel = useMemo(
    () => findHotelById(hotels, selectedHotelId),
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
    setUpdateText(updateExamples[0].text);
  }

  function goToTourStep(nextStep: number) {
    if (nextStep >= tourSteps.length) {
      setTourOpen(false);
      return;
    }

    let updateForApproval = structuredUpdate;
    if (nextStep >= 2 && !updateForApproval) {
      updateForApproval = extractDeterministicForCurrentHotel();
    }
    if (nextStep >= 3 && updateForApproval?.status !== "approved") {
      handleApproveUpdate(updateForApproval);
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
    setHotels(cloneBaselineHotels());
    setAuditLog([]);
    setActiveTab("console");
    setSelectedHotelId("nikko-cedar-ryokan");
    setUpdateText(updateExamples[0].text);
    setStructuredUpdate(null);
    setIsExtracting(false);
    setOperatorMessage(null);
    setTravelerQuery(travelerQueryExamples[0]);
    setAgentResult(null);
    setAgentMode("deterministic");
    setHandoffs([]);
    setLatestHandoff(null);
    setHandoffStatus("idle");
    setTourOpen(false);
    setTourStep(0);
    extractionRequestId.current += 1;
    agentRequestId.current += 1;
  }

  function handleSelectedHotelChange(hotelId: string) {
    setSelectedHotelId(hotelId);
    setStructuredUpdate(null);
    setIsExtracting(false);
    setOperatorMessage(null);
    setAgentResult(null);
    setAgentMode("deterministic");
    setLatestHandoff(null);
    setHandoffStatus("idle");
    extractionRequestId.current += 1;
    agentRequestId.current += 1;
  }

  function extractDeterministicForCurrentHotel() {
    const targetHotel = findHotelById(hotels, selectedHotelId);
    const extracted = deterministicExtractUpdate(updateText, targetHotel);
    setStructuredUpdate(extracted);
    setOperatorMessage(null);
    return extracted;
  }

  async function handleExtractUpdate() {
    const requestId = extractionRequestId.current + 1;
    extractionRequestId.current = requestId;
    setIsExtracting(true);
    setOperatorMessage(null);
    const targetHotel = findHotelById(hotels, selectedHotelId);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8500);

    try {
      const response = await fetch("/api/extract-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          input: updateText,
          hotelId: targetHotel.id,
        }),
      });
      if (!response.ok) {
        throw new Error(`Extraction failed with ${response.status}`);
      }
      const payload = (await response.json()) as { update?: LiveLocalUpdate };
      const extracted =
        payload.update ?? deterministicExtractUpdate(updateText, targetHotel);
      if (requestId === extractionRequestId.current) {
        setStructuredUpdate(extracted);
      }
      return extracted;
    } catch (error) {
      console.log("Client extraction fallback:", error);
      const extracted = deterministicExtractUpdate(updateText, targetHotel);
      if (requestId === extractionRequestId.current) {
        setStructuredUpdate(extracted);
      }
      return extracted;
    } finally {
      window.clearTimeout(timeout);
      if (requestId === extractionRequestId.current) {
        setIsExtracting(false);
      }
    }
  }

  function handleApproveUpdate(update = structuredUpdate) {
    if (!selectedHotelId) {
      setOperatorMessage("Choose a hotel before approving an update.");
      return;
    }
    if (!update || !("hotelId" in update)) {
      setOperatorMessage("Extract an update before approving it.");
      return;
    }
    const targetHotel = hotels.find((hotel) => hotel.id === update.hotelId);
    if (!targetHotel) {
      setOperatorMessage("The target hotel could not be found. Reset Demo and try again.");
      return;
    }

    const approvedUpdate: LiveLocalUpdate = {
      ...update,
      status: "approved",
      approvedAt: DEMO_APPROVED_AT,
      lastVerifiedAt: DEMO_APPROVED_AT,
    };

    setHotels((currentHotels) =>
      currentHotels.map((hotel) => {
        if (hotel.id !== approvedUpdate.hotelId) return hotel;
        const liveLocalUpdates = Array.isArray(hotel.liveLocalUpdates)
          ? hotel.liveLocalUpdates
          : [];
        const maintenanceNotices = Array.isArray(hotel.maintenanceNotices)
          ? hotel.maintenanceNotices
          : [];
        const promotions = Array.isArray(hotel.promotions) ? hotel.promotions : [];
        const withoutDraftDuplicate = liveLocalUpdates.filter(
          (existing) => existing.id !== approvedUpdate.id
        );
        return {
          ...hotel,
          liveLocalUpdates: [...withoutDraftDuplicate, approvedUpdate],
          maintenanceNotices:
            approvedUpdate.category === "maintenance"
              ? [approvedUpdate.travelerFacingSummary, ...maintenanceNotices]
              : maintenanceNotices,
          promotions:
            approvedUpdate.category === "promotion"
              ? [approvedUpdate.travelerFacingSummary, ...promotions]
              : promotions,
          lastVerifiedAt: approvedUpdate.lastVerifiedAt,
        };
      })
    );

    setAuditLog((entries = []) => [
      {
        id: `audit-${approvedUpdate.id}`,
        timestamp: approvedUpdate.approvedAt ?? approvedUpdate.lastVerifiedAt,
        hotel: targetHotel.name,
        category: approvedUpdate.category,
        source: approvedUpdate.source,
        riskLevel: approvedUpdate.riskLevel,
        approvedBy: "operator",
        status: "approved",
      },
      ...entries,
    ]);
    setStructuredUpdate(approvedUpdate);
    setOperatorMessage("Update approved and added to the current Hotel Knowledge Graph.");
  }

  function handleRunAgent() {
    const result = runTravelerAgent(travelerQuery, hotels);
    setAgentResult(result);
    setAgentMode("deterministic");
    setLatestHandoff(null);
    setHandoffStatus("idle");
    const requestId = agentRequestId.current + 1;
    agentRequestId.current = requestId;
    void requestGroundedTravelerAgent(travelerQuery, hotels, requestId);
    return result;
  }

  async function requestGroundedTravelerAgent(
    querySnapshot: string,
    hotelsSnapshot: HotelGraph[],
    requestId: number
  ) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8500);

    try {
      const response = await fetch("/api/traveler-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          query: querySnapshot,
          hotels: hotelsSnapshot,
        }),
      });

      if (!response.ok) {
        throw new Error(`Traveler agent failed with ${response.status}`);
      }

      const payload = (await response.json()) as {
        mode?: TravelerAgentMode;
        result?: TravelerAgentResult;
      };

      if (requestId !== agentRequestId.current) {
        return;
      }
      if (payload.result) {
        setAgentResult(payload.result);
      }
      setAgentMode(
        payload.mode === "llm-grounded" ? "llm-grounded" : "deterministic"
      );
    } catch (error) {
      console.log("Traveler agent client fallback:", error);
      if (requestId === agentRequestId.current) {
        setAgentMode("deterministic");
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function handleCreateHandoff(result = agentResult) {
    if (!result) return null;
    const intent = buildBookingIntent(travelerQuery, result, hotels);
    const handoff: BookingHandoff = {
      id: `handoff-${Date.now()}`,
      hotelId: result.matchedHotelId,
      hotelName: result.hotelName,
      roomType: intent.roomType,
      dates: `${intent.checkInDate} to ${intent.checkOutDate}`,
      checkInDate: intent.checkInDate,
      checkOutDate: intent.checkOutDate,
      guests: intent.guests,
      adults: intent.adults,
      children: intent.children,
      pets: intent.pets,
      rateYen: intent.estimatedRateYen,
      handoffType: intent.handoffType,
      availabilityVerified: intent.availabilityVerified,
      rateNote: intent.rateNote,
      liveLocalUpdateUsed: intent.liveLocalUpdateUsed,
      bookingUrl: `https://example.com/triplaNeoByDaniel/book/${result.matchedHotelId}?room=${encodeURIComponent(
        intent.roomType
      )}&checkIn=${intent.checkInDate}&checkOut=${intent.checkOutDate}&adults=${intent.adults}&children=${intent.children}&pets=${intent.pets}`,
      createdAt: DEMO_HANDOFF_AT,
    };
    setHandoffs((current) => [handoff, ...current]);
    setLatestHandoff(handoff);
    setHandoffStatus("created");
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
            <p className="md:col-span-3">
              Live & local hotel knowledge → AI discoverability → verified direct
              booking handoff
            </p>
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
                setSelectedHotelId={handleSelectedHotelChange}
                updateText={updateText}
                setUpdateText={setUpdateText}
                structuredUpdate={structuredUpdate}
                onExtract={handleExtractUpdate}
                isExtracting={isExtracting}
                onApprove={handleApproveUpdate}
                onReject={() => setStructuredUpdate(null)}
                auditLog={auditLog}
                operatorMessage={operatorMessage}
              />
            ) : null}
            {activeTab === "graph" ? (
              <KnowledgeGraphTab hotel={selectedHotel} jsonLd={jsonLd} />
            ) : null}
            {activeTab === "agent" ? (
              <AgentTab
                hotels={hotels}
                travelerQuery={travelerQuery}
                setTravelerQuery={setTravelerQuery}
                agentResult={agentResult}
                agentMode={agentMode}
                onRunAgent={handleRunAgent}
                handoff={latestHandoff}
                handoffStatus={handoffStatus}
                onCreateHandoff={handleCreateHandoff}
              />
            ) : null}
            {activeTab === "metrics" ? (
              <MetricsTab metrics={metrics} />
            ) : null}
          </section>
        </section>

        <footer className="flex flex-col gap-2 border-t border-zinc-200 py-4 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Demo by Daniel Jimenez · Synthetic data · Senior PM Gen AI take-home prototype</p>
          <p>
            Demo date context: {DEMO_DATE_CONTEXT} · Payment execution, PMS
            integration, crawling, and production MCP are intentionally out of scope.
          </p>
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
  operatorMessage,
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
  operatorMessage: string | null;
}) {
  const selectedHotel =
    hotels.find((hotel) => hotel.id === selectedHotelId) ?? hotels[0];

  return (
    <div className="grid gap-4">
      <Panel
        eyebrow="Hotel Operator & Okami-san（女将）"
        title="Hotel Operator Live & Local Update Console"
        description="This is where hotel staff add fresh information that OTAs and stale crawlers usually miss."
      >
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-medium text-blue-900">
          Current hotel context: {selectedHotel.name}
        </div>
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">
                Set Live & Local Updates
              </h3>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                This is where hotel staff add fresh information that OTAs and
                stale crawlers usually miss.
              </p>
            </div>
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
                  key={example.label}
                  type="button"
                  onClick={() => {
                    setUpdateText(example.text);
                    onReject();
                  }}
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-left text-xs text-zinc-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <span className="font-semibold text-zinc-900">
                    {example.label}:
                  </span>{" "}
                  {example.text}
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
        {operatorMessage ? (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-700">
            {operatorMessage}
          </div>
        ) : null}
      </Panel>
      <Guardrails />
      <Panel
        eyebrow="Selected hotel facts"
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
  hotel: HotelGraph;
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
                <a
                  href={`/api/schema/${hotel.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
                >
                  Open JSON-LD URL
                </a>
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
  hotels,
  travelerQuery,
  setTravelerQuery,
  agentResult,
  agentMode,
  onRunAgent,
  handoff,
  handoffStatus,
  onCreateHandoff,
}: {
  hotels: HotelGraph[];
  travelerQuery: string;
  setTravelerQuery: (query: string) => void;
  agentResult: TravelerAgentResult | null;
  agentMode: TravelerAgentMode;
  onRunAgent: () => TravelerAgentResult;
  handoff: BookingHandoff | null;
  handoffStatus: "idle" | "created";
  onCreateHandoff: () => BookingHandoff | null;
}) {
  const handoffRef = useRef<HTMLDivElement>(null);
  const bookingIntent = agentResult
    ? buildBookingIntent(travelerQuery, agentResult, hotels)
    : null;

  useEffect(() => {
    if (handoff) {
      handoffRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [handoff]);

  return (
    <div className="grid gap-4">
      <Panel
        eyebrow="Traveler-facing AI"
        title="Traveler AI Agent Simulation"
        description="The simulated agent searches across all 3 hotel knowledge graphs by default. It must not invent prices, availability, amenities, policies, or activities."
      >
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-medium text-blue-900">
          Search scope: all 3 hotel knowledge graphs. Booking handoff follows the
          agent-selected hotel, not the operator-selected hotel.
        </div>
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
        <div className="mt-4 inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600">
          {agentMode === "llm-grounded"
            ? "LLM-grounded mode"
            : "Deterministic mode"}
        </div>
      </Panel>
      {agentResult ? (
        <Panel
          eyebrow="Agent answer"
          title={`Matched hotel: ${agentResult.hotelName}`}
          description="Source: Hotel Knowledge Graph"
        >
          <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <h3 className="text-sm font-semibold text-zinc-950">
              Why this hotel was selected
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {agentResult.selectionReason}
            </p>
          </div>
          {agentResult.assistantMessage ? (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="text-sm font-semibold text-blue-950">
                Grounded traveler response
              </h3>
              <p className="mt-2 text-sm leading-6 text-blue-800">
                {agentResult.assistantMessage}
              </p>
              {agentResult.missingInformation?.length ? (
                <div className="mt-3 text-sm leading-6 text-blue-800">
                  <span className="font-medium">Missing information: </span>
                  {agentResult.missingInformation.join(", ")}
                </div>
              ) : null}
            </div>
          ) : null}
          {bookingIntent ? <BookingIntentCard intent={bookingIntent} /> : null}
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
              {bookingIntent?.availabilityVerified ? (
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {bookingIntent.availabilityNote} {bookingIntent.rateNote}
                </p>
              ) : (
                <div className="mt-2 space-y-1.5 text-sm leading-6 text-zinc-600">
                  <p>Availability for requested dates is not verified in the mock graph.</p>
                  <p>Rate unavailable in mock graph for requested dates.</p>
                </div>
              )}
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
            onClick={() => onCreateHandoff()}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            {handoffStatus === "created"
              ? handoff?.handoffType === "booking_inquiry_handoff"
                ? "Booking inquiry handoff created"
                : "Booking handoff created"
              : bookingIntent?.availabilityVerified === false
                ? "Generate booking inquiry handoff"
                : "Generate direct booking handoff"}
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
      {handoff ? (
        <div ref={handoffRef} tabIndex={-1}>
          <BookingHandoffCard handoff={handoff} />
        </div>
      ) : null}
    </div>
  );
}

function MetricsTab({ metrics }: { metrics: ReturnType<typeof calculateMetrics> }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-medium text-blue-900">
        Audit scope: all 3 hotel knowledge graphs in this single-session demo.
      </div>
      <MetricsTiles metrics={metrics} />
      <RecommendedNextActions />
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
        {update.eventTime ? <Fact label="Event time" value={update.eventTime} /> : null}
        {update.bookingDeadline ? (
          <Fact label="Booking deadline" value={update.bookingDeadline} />
        ) : null}
        <Fact
          label="Affected rooms"
          value={update.affectedRoomTypes.join(", ") || "No room-specific impact"}
        />
        <Fact label="Price impact" value={update.priceImpact} />
      </div>
      {update.sanitizedTravelerCopy ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
          Reputation-sensitive update: traveler-facing copy sanitized.
        </div>
      ) : null}
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
        onClick={() => onApprove()}
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

function BookingIntentCard({ intent }: { intent: BookingIntent }) {
  return (
    <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-950">
            Parsed booking intent
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            Simple deterministic parsing for demo dates, guests, and best
            matching room.
          </p>
        </div>
        <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">
          {intent.guests} guests · {intent.pets} pets
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Fact label="Selected hotel" value={intent.hotelName} />
        <Fact label="Check-in" value={intent.checkInDate} />
        <Fact label="Check-out" value={intent.checkOutDate} />
        <Fact
          label="Party"
          value={`${intent.adults} adults, ${intent.children} children, ${intent.pets} pets`}
        />
        <Fact label="Room type" value={intent.roomType} />
        <Fact
          label="Estimated rate"
          value={
            intent.estimatedRateYen
              ? `¥${intent.estimatedRateYen.toLocaleString()}`
              : "Rate unavailable in mock graph for requested dates."
          }
        />
        <Fact label="Availability" value={intent.availabilityNote} />
        <Fact label="Live/local update used" value={intent.liveLocalUpdateUsed} />
      </div>
    </div>
  );
}

function BookingHandoffCard({ handoff }: { handoff: BookingHandoff }) {
  const isInquiry = handoff.handoffType === "booking_inquiry_handoff";

  return (
    <Panel
      eyebrow={isInquiry ? "Booking inquiry handoff created" : "Mock direct booking handoff created"}
      title={handoff.hotelName}
      description={
        isInquiry
          ? "The requested date is outside verified mock availability, so the demo creates an inquiry handoff without inventing rate or availability."
          : "Payment integration is intentionally out of scope. The first milestone is proving AI discovery → verified quote → direct booking handoff."
      }
    >
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <QRCodeCanvas value={handoff.bookingUrl} size={180} includeMargin />
        </div>
        <div className="space-y-3">
          <Fact label="Room" value={handoff.roomType} />
          <Fact label="Check-in" value={handoff.checkInDate} />
          <Fact label="Check-out" value={handoff.checkOutDate} />
          <Fact
            label="Guests"
            value={`${handoff.guests} total · ${handoff.adults ?? handoff.guests} adults · ${handoff.children ?? 0} children · ${handoff.pets ?? 0} pets`}
          />
          <Fact
            label="Potential direct GMV"
            value={
              handoff.rateYen
                ? `¥${handoff.rateYen.toLocaleString()}`
                : "Rate unavailable in mock graph for requested dates."
            }
          />
          <Fact
            label="Availability status"
            value={
              handoff.availabilityVerified
                ? "Verified in mock graph"
                : "Availability for requested dates is not verified in the mock graph."
            }
          />
          <Fact
            label="Live/local update used"
            value={handoff.liveLocalUpdateUsed}
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

function RecommendedNextActions() {
  const actions = [
    {
      metric: "AI Discovery Readiness",
      action:
        "Add missing room policies, pet policy, multilingual summaries, and live/local updates.",
    },
    {
      metric: "Freshness Score",
      action:
        "Ask operator to verify today’s bath schedule, meal availability, and local events.",
    },
    {
      metric: "Direct Booking Handoff Count",
      action: "Test traveler prompts and ensure each hotel has bookable offers.",
    },
    {
      metric: "Incremental Direct GMV",
      action: "Add direct-only packages, upgrades, and seasonal offers.",
    },
    {
      metric: "Operator Time Saved",
      action:
        "Convert frequent bot questions into reusable structured answers.",
    },
  ];

  return (
    <Panel
      eyebrow="Reviewer clarity"
      title="Recommended next actions"
      description="Each metric points to a concrete product lever rather than a vanity AI feature."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {actions.map((item) => (
          <div
            key={item.metric}
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
          >
            <p className="text-sm font-semibold text-zinc-950">{item.metric}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{item.action}</p>
          </div>
        ))}
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
      request: {
        query: "business hotel with fast Wi-Fi, HDMI, workspace, and breakfast",
        dates: ["2026-05-02"],
        guests: 2,
      },
    },
    {
      name: "get_hotel_context",
      method: "POST",
      path: "/api/tools/get_hotel_context",
      description: "Return structured hotel context for AI-readable discovery.",
      request: { hotelId: "nikko-cedar-ryokan" },
    },
    {
      name: "check_availability",
      method: "POST",
      path: "/api/tools/check_availability",
      description: "Return only mock availability and prices present in JSON.",
      request: {
        hotelId: "nikko-station-business-hotel",
        roomType: "Work Twin",
        dates: ["2026-05-02"],
      },
    },
    {
      name: "create_booking_handoff",
      method: "POST",
      path: "/api/tools/create_booking_handoff",
      description: "Create a simulated direct booking link without payment execution.",
      request: {
        hotelId: "lake-chuzenji-activity-lodge",
        roomType: "Lake Family Room",
        dates: ["2026-05-02"],
        guestInfo: { adults: 2, children: 2, pets: 1 },
      },
    },
  ];
  const [toolRun, setToolRun] = useState<{
    name: string;
    request: Record<string, unknown>;
    response: unknown;
    status: "idle" | "running" | "complete";
  } | null>(null);

  async function runTool(tool: (typeof tools)[number]) {
    const request = tool.request;
    setToolRun({
      name: tool.name,
      request,
      response: { status: "running" },
      status: "running",
    });

    try {
      const response = await fetch(tool.path, {
        method: tool.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      setToolRun({
        name: tool.name,
        request,
        response: await response.json(),
        status: "complete",
      });
    } catch (error) {
      setToolRun({
        name: tool.name,
        request,
        response: {
          error: "tool_call_failed",
          detail: error instanceof Error ? error.message : "Unknown error",
        },
        status: "complete",
      });
    }
  }

  return (
    <Panel
      eyebrow="Tool/API thinking"
      title="Agent Tool Layer Simulation"
      description="These demo API routes simulate the tools an AI agent would call. In production they would become standards-compliant MCP/UCP adapters."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
            <button
              type="button"
              onClick={() => runTool(tool)}
              className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-zinc-950 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
            >
              Run {tool.name}
            </button>
          </div>
        ))}
      </div>
      {toolRun ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <JsonViewer
            title={`Request JSON · ${toolRun.name}`}
            value={toolRun.request}
          />
          <JsonViewer
            title={
              toolRun.status === "running"
                ? "Response JSON · running"
                : `Response JSON · ${toolRun.name}`
            }
            value={toolRun.response}
          />
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
          Click a tool button to see the exact request JSON and mock response JSON.
        </div>
      )}
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

function GraphCards({ hotel }: { hotel: HotelGraph }) {
  const isSessionUpdate = (update: LiveLocalUpdate) =>
    update.createdAt === DEMO_NOW || update.approvedAt === DEMO_APPROVED_AT;
  const liveUpdateItems = hotel.liveLocalUpdates.map((update) => {
    const sessionLabel = isSessionUpdate(update) ? " · New in this session" : "";
    const timing = update.eventTime ? ` · ${update.eventTime}` : "";
    const deadline = update.bookingDeadline
      ? ` · book by ${update.bookingDeadline}`
      : "";
    return `${update.title}: ${update.travelerFacingSummary}${timing}${deadline}${sessionLabel}`;
  });
  const sessionUpdateItems = hotel.liveLocalUpdates
    .filter(isSessionUpdate)
    .map(
      (update) =>
        `${update.title}: ${update.travelerFacingSummary} · New in this session`
    );
  const sections = [
    [
      "Live & Local Updates",
      liveUpdateItems.length ? liveUpdateItems : ["No live/local updates yet"],
    ],
    ["Promotions", hotel.promotions],
    ["Maintenance Notices", hotel.maintenanceNotices],
    [
      "Recently Changed Fields / Session Updates",
      sessionUpdateItems.length ? sessionUpdateItems : ["No session updates yet"],
    ],
    ["Hotel identity", [`${hotel.name} · ${hotel.type} · ${hotel.location}`]],
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
              <li key={item}>
                {item.includes("New in this session") ? (
                  <>
                    {item.replace(" · New in this session", "")}{" "}
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                      New in this session
                    </span>
                  </>
                ) : (
                  item
                )}
              </li>
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
