# Harvest Rebuild — Research Index

> Goal: build an **agentic framework** that can agentically rebuild **Harvest** (time-tracking tool)
> as an internal product. The rebuild **must expose an MCP server** that agents connect into.
> This folder maps everything we know about Harvest + what the rebuild + MCP layer needs to cover.

Project: AI Conference Hackathon · Azure AI Foundry (`AIFoundryMcConference`, deployment `claude-opus-4-7`)

## Contents

| File | What it covers | Source of truth |
|---|---|---|
| [api/](api/) | Harvest API v2 — full endpoint reference, auth, pagination, rate limits, errors, webhooks | help.getharvest.com/api-v2 |
| [data-model.md](data-model.md) | Harvest entities, fields, relationships → target schema for the rebuild | API docs |
| [product-scope.md](product-scope.md) | What Harvest *does* as a product — features to rebuild, prioritized | getharvest.com + help center |
| [mcp-server.md](mcp-server.md) | MCP spec essentials + proposed MCP tool/resource surface for the rebuilt Harvest | modelcontextprotocol.io |
| [findings.md](findings.md) | Cross-cutting synthesis: rebuild approach, gaps, open questions, decisions | this research |

## Status

- [x] Harvest API v2 reference mapped — 9 files, ~95 endpoints across 13 resource areas ([api/](api/))
- [x] Data model extracted — 19 entities + Mermaid ER diagram ([data-model.md](data-model.md))
- [x] Product scope catalogued — 7 feature areas + MoSCoW MVP backlog ([product-scope.md](product-scope.md))
- [x] MCP server surface designed — 25 tools, 9 resources, TS SDK + Streamable HTTP ([mcp-server.md](mcp-server.md))
- [x] Synthesis + open questions ([findings.md](findings.md))

## Headline findings (see findings.md)

- The domain core is tiny: everything orbits **TimeEntry** + 2 join tables → an MVP that nails time tracking is genuinely useful.
- **Harvest has no webhooks/events** — our rebuild can be **event-native + MCP-native**, which is the differentiator and the point of the agentic framework.
- Two agent layers: **build-time** agents (rebuild the product) and **run-time** agents (operate it via MCP).
- Recommended first step: prove the MCP transport with a `ping` tool + Inspector before any domain logic.

_Last updated: 2026-05-21_
