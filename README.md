# triplaNeoByDaniel

Agentic Direct Booking Infrastructure for the AI Travel Era

Powered by a Live & Local Hotel Knowledge Graph

Demo by Daniel Jimenez · Synthetic data · Senior PM Gen AI take-home prototype

## Links

- GitHub repo: https://github.com/growwithsdtr/trplNeo-byDaniel
- Live deployed URL: https://trplaneo-by-daniel.vercel.app

## What this demo proves

`triplaNeoByDaniel` is a take-home strategy prototype for a Senior Product Manager - Gen AI role in hospitality SaaS. It demonstrates how independent hotels can protect direct-booking economics as travel discovery shifts from Google/OTA search to AI agents such as ChatGPT, Gemini, Claude, and Perplexity.

The core product thesis:

Live & local hotel knowledge -> AI discoverability -> verified direct booking handoff

The demo shows that a hotel-owned, standards-aligned knowledge graph can be enriched by operators with fresh, local, time-sensitive information, then used by a traveler-facing AI agent to produce direct-bookable recommendations.

## Why this matters strategically

If AI agents become a major travel discovery layer, hotels risk being represented by stale OTA-controlled summaries instead of hotel-owned facts. triplaNeoByDaniel reframes the opportunity as direct-booking infrastructure:

- AI Discoverability / AEO: make hotel-owned facts readable and citeable by agents.
- Agentic Commerce Readiness: expose verified quote and booking-handoff actions.
- Traveler-Facing AI: answer intent-rich traveler questions without inventing facts.
- Operator AI: let hotel staff add live/local knowledge without complex dashboards.
- Outcome Metrics: measure readiness, freshness, handoffs, GMV potential, and time saved.

## What is implemented

- Polished Next.js dashboard with four tabs.
- Three deep synthetic Nikko-style hotels.
- Schema.org-inspired hotel knowledge graph.
- triplaNeo live/local enrichment layer.
- Operator text update extraction using deterministic local logic.
- Risk taxonomy and visible approval guardrails.
- Human approval flow before publishing updates.
- In-memory hotel graph mutation.
- Traveler AI agent simulation that reads only from the current graph.
- Optional LLM-grounded traveler response when `OPENAI_API_KEY` is configured, with deterministic fallback as the default.
- Direct booking handoff with dummy booking link and QR code.
- Metrics that improve after approved updates and booking handoffs.
- Schema.org JSON-LD preview with copy button and validator link.
- Per-hotel JSON-LD URL for validator-friendly review.
- Simulated MCP-style tool panel and stateless API endpoints.

## What is simulated

- PMS/channel availability.
- tripla Book, Bot, Connect, Pay, CRM, and PMS enrichment.
- MCP/UCP/AP2 production integrations.
- triplaPay/GMO payment execution.
- Real crawler ingestion.
- Voice transcription.
- Proprietary tripla data.

## 90-second demo script

1. Open the app and click **Start Demo Tour**.
2. Select **Nikko Cedar Ryokan**.
3. In the Okami-san console, use the example update: “Tomorrow the outdoor onsen will have yuzu aroma.”
4. Extract the structured update and point out category, affected date, source, confidence, risk, and approval status.
5. Approve the update and show the audit log entry.
6. Move to the Knowledge Graph tab and show that the live/local update is now part of the hotel-owned graph.
7. Open the Schema.org JSON-LD preview, copy it, and use the validator affordance if desired.
8. Move to Metrics and show AI Discovery Readiness and Freshness improving.
9. Run the traveler query: “I want a quiet ryokan in Nikko this weekend with onsen, local food, and a special experience.”
10. Show that the traveler agent cites **Source: Hotel Knowledge Graph** and uses the yuzu aroma update.
11. Generate the direct booking handoff and show the booking summary, dummy link, QR code, and potential direct GMV.
12. Close by emphasizing that payment is intentionally out of scope; the milestone is AI discovery -> verified quote -> direct booking handoff.

## Local run instructions

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Validate before sharing:

```bash
npm run lint
npm run build
```

## Deployment instructions

Recommended deployment target: Vercel.

```bash
npm run build
vercel
vercel --prod
```

Environment variables are optional:

- `OPENAI_API_KEY` optional; if present, update extraction uses OpenAI with an 8-second timeout and deterministic fallback.
- `OPENAI_MODEL` optional; defaults to `gpt-4o-mini`.
- `DEEPGRAM_API_KEY` optional stretch only; voice input is disabled when absent.

The deployed demo must remain useful with no API keys.

Copy the example environment file when testing API-backed behavior locally:

```bash
cp .env.local.example .env.local
```

Leave `OPENAI_API_KEY` blank to keep deterministic fallback behavior. `.env.local` is gitignored and should never contain committed secrets.

## Simulated MCP-style endpoints

These endpoints are intentionally stateless and demo-only:

- `GET /api/tools`
- `POST /api/tools/search_hotels`
- `POST /api/tools/get_hotel_context`
- `POST /api/tools/check_availability`
- `POST /api/tools/create_booking_handoff`
- `POST /api/traveler-agent`
- `GET /api/schema/[hotelId]`

Label used in the app:

“Simulated MCP-style tools — production would expose standards-compliant MCP.”

`/api/traveler-agent` is not MCP. It is a server-side route that can use OpenAI for a grounded traveler-facing response when configured. The route receives the traveler query and current in-session Hotel Knowledge Graph, instructs the model to answer only from provided graph facts, and falls back silently to the deterministic traveler agent on missing key, timeout, network error, invalid response, or rate limit.

## Outcome metrics

Primary demo tiles:

- AI Discovery Readiness
- Freshness Score
- Direct Booking Handoff Count
- Incremental Direct GMV Potential
- Operator Time Saved Estimate

Additional production metrics:

- AI Discovery Share
- Zero-Click / Agentic Handoff Conversion
- Direct Revenue Contribution
- Incremental Direct Booking GMV
- Operator Time Saved
- Structured Data Completeness
- Agent Match Rate

In this demo, AI Discovery Readiness is a proxy metric. In production, this becomes AI Discovery Share: the percentage of monitored traveler-intent prompts where tripla-powered hotel surfaces are cited, accurately described, and linked as direct-bookable sources.

## Strategic roadmap

- Stage 1: Hotel Knowledge Graph Foundation
- Stage 2: Live & Local Operator Input Layer
- Stage 3: AI Discoverability & Measurement Layer
- Stage 4: Agentic Quote & Booking Handoff
- Stage 5: Operator OaaS Control Layer
- Stage 6: Traveler-Facing AI Tools

## What this demo deliberately does not do — and why

- No crawler: because crawling is an ingestion method, not the strategic moat.
- No real PMS/tripla integration: this is a synthetic demo only.
- No real payment: payment belongs to triplaPay/GMO integration.
- No real UCP/AP2: protocols are emerging; demo focuses on quote/handoff first.
- No full guardrail engine: demo uses visible simple guardrails.

This prototype intentionally focuses on the structured data and booking-handoff layer rather than crawling or full autonomous checkout. Crawling is an ingestion method; the strategic moat is the standards-aligned, live, local, operator-approved hotel knowledge graph connected to direct-booking actions.

## Known limitations

- State is in-memory and resets on refresh or Reset Demo.
- Hotel data is synthetic and intentionally scoped to three deeper properties.
- Traveler matching is deterministic and intentionally transparent.
- LLM-grounded traveler mode is optional; deterministic mode remains the default when no OpenAI key is configured.
- QR code and booking links are mock handoffs.
- The demo is not a production MCP server.
- Voice input is shown as disabled unless implemented as stretch work.

## Design intent

The UI is intentionally closer to a serious B2B SaaS dashboard than a toy chatbot: clean cards, restrained accent color, metric tiles, JSON panels, and professional empty states. The goal is to make the strategic product judgment easy for a CPO/CTO reviewer to see asynchronously.
