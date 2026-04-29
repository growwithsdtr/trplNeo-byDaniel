# trplNeo / triplaNeo Prototype — PRD & Technical Summary

## 0. OpenAI model configuration summary

No code changes were required for model selection; `OPENAI_MODEL` is environment-configurable.

1. `OPENAI_MODEL` is read in two server route handlers: `src/app/api/extract-update/route.ts` for operator-update extraction and `src/app/api/traveler-agent/route.ts` for the optional grounded traveler response.
2. The current fallback model is `gpt-4o-mini` in both routes.
3. The model is configurable through server-side environment variables. In production this means Vercel environment variables; locally it can also be set through `.env.local`. There is no client-side product setting or UI control for model selection.
4. If `OPENAI_MODEL=gpt-5.5` is set in Vercel, the current code will send `gpt-5.5` as the model value on OpenAI calls, assuming `OPENAI_API_KEY` is present and the OpenAI project has access to that model.
5. The current implementation already uses the OpenAI Responses API via `fetch("https://api.openai.com/v1/responses", ...)` with `text.format` JSON schema outputs. No Responses API migration is required. Official OpenAI docs list `gpt-5.5` as a frontier model and state that current models are available through the Responses API and client SDKs.

## 1. Executive summary

The prototype is a completed Stage 0 strategy demo for triplaNeo: Agentic Hotel Discovery & Direct Booking for the AI Travel Era. It demonstrates how hotel-owned knowledge can be enriched by staff at the source, converted into structured live/local facts, exposed through schema and agent-style tools, and used by a traveler AI flow to recommend a hotel and create a direct-booking or inquiry handoff. The broader strategic product idea is: Live & local hotel knowledge enriched at source → Enhanced AI hotel discoverability → Verified quote / inquiry / direct-booking handoff → Attributable direct GMV. The prototype proves that operator-approved, source-attributed facts can influence AI-mediated hotel discovery without requiring a full production PMS, crawler, payment, or agent-commerce integration. It also proves that the product story can connect AI features to measurable business outcomes such as readiness, freshness, direct-booking handoffs, GMV potential, operator time saved, and OaaS counters. The demo intentionally simulates production integrations while keeping the core product thesis visible: the parser and structured graph decide facts; the LLM only explains from those facts when configured.

## 2. Business goals

| Goal | Why it matters | Prototype demonstration | Production requirement |
| --- | --- | --- | --- |
| Increase AI Discovery Share. | AI agents are becoming a discovery layer that can steer demand before a traveler reaches an OTA or hotel site. | AI Discovery Readiness, schema preview, all-hotel traveler search, and source-cited traveler responses show agent-readability. | Prompt monitoring, crawler/AEO measurement, source-quality scoring, and real share-of-answer tracking. |
| Convert AI-mediated demand into direct-booking handoffs. | Discovery is valuable only if it leads to a direct hotel-owned action. | The traveler agent generates verified booking handoffs or inquiry handoffs with parsed intent and dummy direct links. | Real booking engine, availability/rate verification, session continuity, and production handoff APIs. |
| Reduce OTA dependency by making hotel-owned data fresher and more useful to AI agents. | OTA summaries and stale crawlers can misrepresent current hotel facts. | Operator updates flow into an in-session hotel graph and can influence traveler matching. | Production ingestion from Book, Bot, Connect, Pay, Link, Nexus, PMS, CRM, and staff workflows. |
| Create attributable Incremental Direct Booking GMV. | AI features need revenue accountability, not just conversation volume. | Incremental Direct GMV Potential increases when mock handoffs include a verified rate. | Revenue attribution, booking reconciliation, channel comparison, and holdout or incrementality methodology. |
| Make Outcome-as-a-Service measurable through event-level attribution. | OaaS needs auditable units of value. | Metrics and OaaS counters track AI-discovery matches and booking handoffs. | Durable events, billing rules, customer dashboards, fraud controls, and finance reconciliation. |
| Reduce hotel-operator friction in keeping official data fresh. | Staff knowledge often lives in conversation, front desk notes, or memory rather than structured systems. | A plain text update becomes a structured, reviewable, multilingual draft with approval controls. | Role-based workflows, mobile/voice input, localization, notifications, and approval policy engines. |

## 3. Target users and stakeholders

Primary operator user: hotel operator, okami-san, GM, or revenue manager. Their pain is that fresh, local, revenue-relevant facts often live in staff knowledge rather than structured systems.

Traveler user: asks natural-language trip questions and expects AI to resolve hotel fit, dates, party composition, pets, beds, policy, availability, rate confidence, and booking path.

Business stakeholders: hotel owner or management company, tripla product team, CPO / CTO, customer success / implementation, and future payment or commerce partners.

## 4. Pain points detected

Hotel operator pain points:

- Updating static hotel data is too slow or fragmented.
- Local/current facts are not captured by OTAs or stale crawlers.
- Dashboards are too heavy for busy staff.
- Operators need approval and control over public-facing AI facts.

Traveler pain points:

- AI agents may hallucinate or rely on OTA summaries.
- Booking details such as pets, family size, bed preference, dates, and local events are hard to express in old forms.
- Travelers need confidence that availability, rate, and policy are verified.

tripla business pain points:

- Direct-booking economics are vulnerable if AI discovery defaults to OTAs.
- AI features must connect to GMV and attribution, not just conversations.
- Protocols and payments are emerging, but not stable enough to make full autonomous checkout the first milestone.

## 5. Proposed solution

| Product surface | What it does | User problem solved | Business metric supported | Production equivalent |
| --- | --- | --- | --- | --- |
| Hotel Operator Console — Live & Local Updates | Lets staff enter current facts in natural language, extract structure, preview, approve, or reject. | Reduces friction for turning staff knowledge into official data. | Freshness Score, Operator Time Saved, AI Discovery Readiness. | Staff console, mobile/voice capture, approvals, localization, and source policy controls. |
| Live & Local Hotel Knowledge Graph | Combines synthetic hotel facts, room/rate/availability fields, approved updates, enrichment sources, and JSON views. | Makes hotel-owned facts readable for humans and machines. | AI Discovery Readiness, quote/policy accuracy. | Production hotel graph built from tripla products, PMS, CRM, and operator workflows. |
| Traveler AI Agent — Discovery to Booking | Searches all hotel graphs, matches deterministic intent, optionally asks OpenAI to produce a grounded answer, and creates a handoff. | Lets travelers express rich intent and receive source-grounded recommendations. | AI-assisted handoff rate, Incremental Direct Booking GMV. | Agent-facing discovery and booking APIs with live availability, quote, and payment adapters. |
| Metrics, Audit & Agent Tools | Shows outcome metrics, audit posture, OaaS counters, and simulated tool request/response JSON. | Makes AI work measurable and defensible for operators and executives. | OaaS counters, attribution coverage, direct revenue contribution. | Durable telemetry, attribution pipeline, billing system, monitoring, and production MCP/UCP/AP2 adapters. |

## 6. What is implemented

### Operator update flow

- Text input for live/local staff updates.
- Example chips for onsen, business hotel, pet policy, activity, maintenance, meal plan, local event, guest insight, and culinary event updates.
- `/api/extract-update` route with deterministic extraction and optional OpenAI Responses API extraction when `OPENAI_API_KEY` is configured.
- Structured preview with category, affected dates, time context, event fields, room impact, price impact, risk, approval status, and traveler-facing summary.
- Approval and rejection/reset controls.
- Reputation-sensitive sanitization for incident-style updates; raw details are kept in internal notes while traveler-facing copy is sanitized.
- English, Japanese, Korean, and Traditional Chinese preview fields. EN and JA are populated; KO and Traditional Chinese are queued placeholders.
- Session-only audit log for approved updates.

### Live/local graph

- Synthetic `HotelGraph` data model with identity, location, rooms, rates, availability, offers, amenities, policies, activities, insights, enrichment sources, confidence, and last-verified timestamps.
- Approved updates mutate the in-memory graph and update `lastVerifiedAt`.
- Newly approved session updates are marked as "New in this session" in the graph cards.
- Selected-hotel facts are shown in the operator console.
- Developer JSON graph view and schema preview are available in the graph tab.

### Traveler agent

- Searches all three hotel graphs by default, not only the operator-selected hotel.
- Deterministic matching scores hotel text and approved live/local updates.
- Optional OpenAI grounded response is requested after deterministic selection when `OPENAI_API_KEY` is configured.
- The deterministic result controls `selectedHotelId`; the LLM response is rejected if it recommends or mentions a different hotel.
- Parses date intent, party size, children, pets, bed preference, stay length, and room choice.
- Approved live/local updates can increase match score and appear in "Latest live/local updates used."

### Booking / inquiry handoff

- Creates a verified handoff when requested dates match mock availability.
- Creates an inquiry handoff when requested dates or rates are unavailable in the mock graph.
- Shows parsed booking intent, selected hotel, dates, guests, pets, bed preference, room, rate/availability status, and live/local update used.
- Generates a dummy booking link and QR code.
- Handoff URL uses parsed intent parameters such as hotel, room, check-in, check-out, adults, children, pets, and bed.

### Metrics / OaaS

- Metrics implemented: AI Discovery Readiness, Freshness Score, Direct Booking Handoff Count, Incremental Direct GMV Potential, and Operator Time Saved Estimate.
- OaaS demo counters implemented for AI-discovery matches and booking handoffs.
- AI-discovery match counter increments when a traveler query is run.
- Booking handoff counter increments when a handoff is created.
- Reset Demo returns hotels, audit log, active tab, agent results, handoffs, counters, and request state to baseline.

### Schema / JSON-LD

- Schema.org-inspired JSON-LD preview is generated by `buildHotelJsonLd`.
- Graph tab includes Copy JSON-LD, Open JSON-LD URL, and Open Schema Validator affordances.
- Per-hotel schema endpoint: `GET /api/schema/[hotelId]`.

### Agent tool simulation

- Interactive tool buttons in "Agent Tool Layer Simulation."
- Request and response JSON are displayed for each tool call.
- Implemented routes: `GET /api/tools`, `POST /api/tools/search_hotels`, `POST /api/tools/get_hotel_context`, `POST /api/tools/check_availability`, and `POST /api/tools/create_booking_handoff`.

### Guardrails / audit

- Visible guardrails include: no price unless present in JSON, no availability unless present in JSON, no high-risk update published without approval, no payment execution, traveler agent cites "Source: Hotel Knowledge Graph," and audit log is session-only.
- Behind-the-scenes demo-only section exposes structured update JSON, multilingual preview, audit log, and guardrails.
- Updates carry source, confidence, risk level, approval status, timestamps, and internal notes.

## 7. Technical architecture

Frontend: Next.js 16 App Router with React 19, TypeScript, Tailwind CSS, client-side state, lucide-react icons, and `qrcode.react` for QR rendering. The primary UI is `src/app/page.tsx`, with smaller components for demo tour, hotel selector, metrics tiles, and JSON viewer.

State: The demo uses in-memory React state. `cloneBaselineHotels()` initializes synthetic data; Reset Demo restores baseline hotel graphs, audit log, agent results, handoffs, counters, and UI state.

Data: `src/data/hotels.ts` contains three synthetic Nikko-style hotels. `src/lib/types.ts` defines the hotel graph, live/local update, audit log, booking handoff, room, offer, activity, insight, and metric structures.

Server/API: Next route handlers support extraction, traveler agent grounding, schema output, and tool simulation. The API routes are stateless except for client-provided graph snapshots and server-side environment access.

LLM usage: OpenAI is optional. `/api/extract-update` and `/api/traveler-agent` call the Responses API only when `OPENAI_API_KEY` is configured. Both routes use deterministic fallback on missing key, timeout, network error, invalid response, or guardrail failure.

Environment variables:

- `OPENAI_API_KEY`: enables optional OpenAI-backed extraction and grounded traveler response.
- `OPENAI_MODEL`: selects the model used in those OpenAI Responses API calls; fallback is `gpt-4o-mini`.
- `DEEPGRAM_API_KEY`: not present in the codebase; voice transcription is documented as simulated/out of scope.

Important architectural principle: the parser and structured state decide facts; the LLM should explain from those facts, not invent facts.

```text
Operator update
  -> structured live/local graph
  -> schema/JSON-LD + agent tools + traveler agent
  -> verified booking/inquiry handoff
  -> metrics/OaaS attribution
```

Prototype vs production:

| Implemented in prototype | Proposed for production triplaNeo |
| --- | --- |
| Synthetic hotel graph, in-memory state, deterministic parser, optional OpenAI response, schema preview, mock handoff, simulated tool routes, and demo metrics. | Production hotel graph, durable event store, real tripla inputs, live availability/rates, agent APIs, payment handoff, crawler/AEO monitoring, attribution, billing, and operator governance. |

## 8. Current vs future architecture

| Current prototype | Future triplaNeo platform |
| --- | --- |
| Synthetic data | Real Book/Bot/Connect/Pay/Link/Nexus inputs |
| In-memory graph | Production graph |
| Deterministic parser | Source attribution/freshness pipeline with human approval policy |
| Optional OpenAI response | Production agent tool APIs |
| Mock handoff | Agentic-commerce protocol adapters |
| Simulated tool routes | triplaPay/PSP handoff |
| No payment | Crawler/AEO monitoring |
| No PMS | Attribution pipeline |
| No real MCP/UCP/AP2 | OaaS billing |
| No real crawler | Production monitoring, auth, security, and evals |

## 9. Metrics and instrumentation

Demo metrics:

- AI Discovery Readiness.
- Freshness Score.
- Direct Booking Handoff Count.
- Incremental Direct GMV Potential.
- Operator Time Saved Estimate.
- OaaS demo counters for AI-discovery matches and booking handoffs.

Production metrics:

- AI Discovery Share.
- AI-assisted direct-booking handoff rate.
- Direct Revenue Contribution.
- Incremental Direct Booking GMV.
- Quote/policy accuracy.
- Unsupported claim rate.
- Operator adoption.
- Attribution coverage.

## 10. 90-second demo script

1. Open the live demo at `https://trplaneo-by-daniel.vercel.app`.
2. Click "Start Demo Tour."
3. In "Hotel Operator Console — Live & Local Updates," select a hotel such as Nikko Cedar Ryokan.
4. Add a live/local update using an example chip or free text.
5. Click "Extract structured update," review category, affected dates, risk, approval status, and traveler-facing summary, then approve it.
6. Open "Live & Local Hotel Knowledge Graph" and show the approved update, "New in this session" marker, developer JSON graph view, and Schema.org JSON-LD preview.
7. Open "Traveler AI Agent — Discovery to Booking" and ask a natural-language traveler query.
8. Show the matched hotel, source citation, parsed booking intent, matching criteria, policy notes, and latest live/local update used.
9. Generate the direct booking handoff or booking inquiry handoff and show the QR code, dummy booking link, parsed intent, and potential direct GMV or unavailable-rate note.
10. Open "Metrics, Audit & Agent Tools" and show metrics, OaaS counters, and the Agent Tool Layer Simulation request/response JSON.

## 11. Known limitations

- Synthetic data.
- In-memory state.
- No real PMS integration.
- No real payment.
- No production MCP/UCP/AP2.
- No real crawler.
- Optional OpenAI only.
- No production-grade eval/monitoring.
- No production auth/security.

## 12. Screenshots / appendix capture list

- Branded landing/header.
- Operator extraction before approval.
- Behind-the-scenes guardrails/JSON.
- Knowledge graph with approved update.
- Traveler query with matched hotel.
- Parsed booking intent.
- Booking/inquiry handoff.
- Metrics/OaaS counters.
- Agent tool simulation request/response.
