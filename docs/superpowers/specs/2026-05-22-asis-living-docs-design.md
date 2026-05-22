# Design: `asis` — Living-Documentation Subsystem for CDD

> Wire the As-Is Discovery Kit into the CLI-Driven-Development (CDD) framework as a
> native subsystem that, from a **single human trigger**, self-provisions, scans the
> codebase, discovers/maps its command surface, computes drift, and keeps the
> documentation alive — with the agent (never the human) writing the narrative.

- **Date:** 2026-05-22
- **Status:** Approved (design) — pending spec review → implementation plan
- **Author:** Bryan + Claude
- **Target repo:** `cli-driven-dev` (https://github.com/BravoVictor27/cli-driven-dev)
- **Demo target:** the Harvest rebuild (see `research/`)

---

## 1. Context

Two assets exist independently:

- **CDD** (`cli-driven-dev`) — a mature, agent-first, bash framework. It already has the
  machinery this feature needs: a hook loop (`SessionStart`, `UserPromptSubmit`,
  `PreToolUse`, `PostToolUse`), a heuristic discovery layer (`cdd suggest` +
  `lib/discoverers/*`), a `docs` subsystem that auto-derives a markdown docs site from
  CDD state, `cdd diff`, `cdd doctor`, an autopilot **state machine**
  (`lib/commands/autopilot.sh`), and a strict 4-piece native-subsystem template
  (state + emitter + verbs + doctor) as its single extension point.
- **As-Is Discovery Kit** (`asis-discovery-kit`) — a heavyweight, **deterministic,
  sandboxed** structural scanner (read-only + networkless Docker) that produces the
  reality picture CDD's heuristics don't: complexity, code clones, churn, debt
  fingerprints, git history, package refs, frontend dep graph, ERD candidates. It
  already retains `artifacts-run1-backup/` **for run-to-run diffing**, and today runs
  manually via `run-all.ps1`.

The goal is the **agentic SDLC framework** itself — not any one product. This feature
makes "living, self-maintaining as-is documentation" a **reusable capability of the
framework**, demonstrated on the Harvest rebuild.

## 2. Goal & success criteria

**Goal:** From one command, the framework keeps a project's as-is documentation
continuously true to the code, with zero human input beyond the trigger.

**Success criteria:**

1. A human runs **one** command (`cdd asis init`) on any project. Everything else —
   tool provisioning, Docker image build, first scan, discovery/mapping, drift,
   narrative scaffold, doc render, and git-hook installation — happens with **no
   further human input**.
2. Thereafter, every `git push` autonomously refreshes the as-is state + drift and
   queues a narrative refresh that the **agent** completes; the human types nothing.
3. The deterministic safety contract of the kit (`:ro` mount, `network_mode:none`,
   read-only container fs) is preserved verbatim.
4. The subsystem follows CDD's native-subsystem template exactly and reuses the
   existing scaffold + PostToolUse-finalize mechanism (no new bespoke machinery).
5. The whole suite runs in CI **without Docker** via an injectable fake engine; one
   opt-in integration test exercises the real container.

## 3. Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Scope | Reusable CDD native subsystem; demoed on the Harvest rebuild |
| 2 | Trigger | `git` — `pre-push` hook (default), `post-commit` opt-in |
| 3 | "Alive" means | scan → drift → AI narrative, every cycle |
| 4 | AI engine | Prompt-scaffold (agent fills it); zero LLM coupling at framework layer |
| 5 | Architecture | CDD subsystem **orchestrates** the Docker kit as its deterministic engine |
| 6 | Autonomy | One human trigger; self-provisioning; agent (not human) fills narrative |

**Chosen defaults** (delegated: "you choose best choices"):

- **Cadence:** `pre-push`, scan runs **async / non-blocking** (never holds up git).
- **Scan source:** `mounted` (working tree mounted `:ro` directly — fast, safe) for the
  host repo; `mirror` (`git clone --local`) mode retained for external/untrusted targets.
- **Scan breadth on the hook:** full scan, async. (Per-push frequency is low enough that
  a `--changed-only` fast lane is deferred as YAGNI; the flag is reserved, not built.)
- **Discovery chaining:** after a scan, autonomously run `cdd suggest --scan . | cdd seed
  --stdin` so the catalog reflects the scanned reality ("discovers, maps").
- **Provisioning:** `cdd asis init` checks deps (docker, jq, python3), builds the toolbelt
  image if absent, and runs a first full cycle. Idempotent.

## 4. Architecture

### 4.1 A native CDD Layer-4 subsystem (`asis`)

Follows CDD's mandatory four-piece template, identical in shape to `schema`/`journey`:

| Piece | Path | Purpose |
|---|---|---|
| State | `lib/core/asis_state.sh` | load / save / seed `.cdd/state/asis.json` |
| Emitter | `lib/core/asis_emitter.sh` | render living docs → `dist/asis/`, feed `docs` subsystem |
| Verbs | `lib/commands/asis.sh` | `init scan discover drift synthesize tick status doctor regenerate reset` |
| Default | `templates/asis-default.json` | seed shape copied by `asis init` |
| Engine | `lib/engines/asis-docker/` | vendored kit: `Dockerfile`, `docker-compose.yml`, `01-extract.sh` |

The PowerShell orchestrator (`run-all.ps1`) is **not** ported; the bash subsystem becomes
the orchestrator and calls `docker compose run --rm asis` directly, keeping the loop
cross-platform (Git Bash / macOS / Linux). The three trust-surface files
(`Dockerfile`, `docker-compose.yml`, `01-extract.sh`) move over **unchanged** so the
safety guarantees are byte-identical.

### 4.2 Autonomy as an autopilot-style state machine

The single-trigger experience is modeled on the existing `autopilot` state machine
(it persists to `.cdd/state/`, advances on a checkable condition, and stops at
checkpoints emitting `agent_instructions` for the agent to act on). The as-is loop is a
sibling machine persisted to `.cdd/state/asis.json` under a `pipeline` key:

```
idle ─► provisioning ─► scanning ─► discovering ─► drifting ─► synthesizing ─► rendering ─► watching
                                                                   │ (checkpoint: agent fills narrative)
                                                                   ▼
                                                   PostToolUse finalize ─► rendering
```

- **provisioning** — ensure docker/jq/python3; build the toolbelt image if missing. Idempotent. (Skipped on subsequent cycles if image present.)
- **scanning** — `docker compose run --rm asis` against the `:ro` source → raw artifacts → normalize into `.cdd/state/asis.json`.
- **discovering** — `cdd suggest --scan . --json | cdd seed --stdin` → command surface mapped from reality (idempotent; preserves existing implementations).
- **drifting** — diff current snapshot vs previous → structured delta.
- **synthesizing** — scaffold `.cdd/asis/synthesis-<date>.md` with drift + summary as structured input, narrative placeholders, and a trailing `CDD-ASIS-MARKER: pending`. **Checkpoint:** emit a success envelope whose `agent_instructions` tell the agent to fill the narrative.
- **rendering** — once the agent fills the file, the extended **PostToolUse hook** flips the marker to `finalised`, updates state, and the emitter renders `dist/asis/as-is.md`.
- **watching** — steady state; the git hook re-enters at **scanning** on the next push.

`cdd asis tick` is the non-interactive advance (what the git hook calls); `cdd asis init`
is the human's one-shot bootstrap that runs provisioning + a first full cycle and installs
the hook.

### 4.3 Canonical state — `.cdd/state/asis.json`

The kit's scattered raw artifacts are normalized into one diffable, AI-ready object.
Raw artifacts still land in `artifacts/`; this state file is the contract every other
piece reads.

```json
{
  "version": 1,
  "pipeline": { "phase": "watching", "updated_at": "2026-05-22T...Z", "history": [] },
  "config": { "trigger": "pre-push", "scan_mode": "mounted", "async": true },
  "last_scan": {
    "started_at": "...", "finished_at": "...",
    "commit": "<sha>", "engine": "asis-docker@<digest>",
    "stacks": ["dotnet", "node", "python"]
  },
  "summary": {
    "functions": 3639,
    "clones": { "count": 1189, "dup_pct": 26.2 },
    "debt_markers": 71,
    "commits": 408,
    "loc": { "cs": 0, "ts": 0 },
    "complexity": { "median_ccn": 0, "mean_ccn": 0, "top_offenders": [] },
    "churn_top": [],
    "packages": { "dotnet": [], "npm": [] }
  },
  "artifacts_path": "artifacts/",
  "snapshots": [ { "at": "...", "commit": "<sha>", "summary_ref": "..." } ]
}
```

### 4.4 Drift delta — `.cdd/asis/drift-<date>.{json,md}`

Deterministic, no AI. Diff of the current snapshot vs the previous:

- Δ functions, Δ duplication %, Δ commit count
- new / removed debt markers (keyed by `file:line`)
- complexity regressions (functions that crossed a CCN threshold since last run)
- new code clones
- churn shifts (files newly hot / cooled)
- dependency add / remove (per package manager)

First run = baseline (no prior snapshot): handled gracefully, drift is empty + flagged
`baseline: true` (not an error).

### 4.5 Narrative — prompt-scaffold (decision #4)

Identical mechanism to the journey mental-sim and autopilot:

1. `cdd asis synthesize` writes the scaffold with structured drift/summary input,
   narrative placeholders, and `CDD-ASIS-MARKER: pending`; returns a success envelope
   pointing the agent at the file.
2. The agent fills the placeholders via normal `Edit` calls (it already has a model —
   the framework never calls one).
3. The extended PostToolUse hook detects the filled file, flips the marker to
   `finalised`, updates `.cdd/state/asis.json`, prints `[CDD asis] ✓`, and triggers the
   doc render.

### 4.6 Living doc output

The emitter renders `dist/asis/as-is.md` from state + the finalized narrative, and
registers an `as-is` page with the existing `docs` subsystem so it appears in the
generated docs site. Drift reports accumulate under `.cdd/asis/` for history.

## 5. Data flow

```
human: cdd asis init  (one time, zero further input)
   │  provision (docker/jq/python3 + build image)  ── idempotent
   ▼
git pre-push hook ─► cdd asis tick ─► scanning (docker :ro, async)
                                         ▼  artifacts/  ─►  .cdd/state/asis.json
                                      discovering ── cdd suggest | cdd seed  (maps surface)
                                         ▼
                                       drifting ─► .cdd/asis/drift-<date>.{json,md}
                                         ▼
                                     synthesizing ─► .cdd/asis/synthesis-<date>.md (pending)
                                         │  (checkpoint: agent_instructions in envelope)
                                         ▼  agent fills narrative (Edit)
                          PostToolUse hook ─► marker: finalised + state update
                                         ▼
                                    rendering (emitter) ─► dist/asis/as-is.md  (living doc)
```

## 6. Self-provisioning ("everything installs")

`cdd asis init` mirrors `install.sh`'s idempotent dep-check pattern, extended:

- Check `docker`, `jq`, `python3`; print per-OS hints on miss (add a **Windows / Git-Bash
  branch** to the existing Darwin/Linux `dep_hint`, since the host is Windows 11).
- If the toolbelt image is absent → `docker compose build` (the ~5-min one-time step),
  surfaced as progress, not a prompt.
- Seed `.cdd/state/asis.json`; install the `pre-push` hook into `.git/hooks/` (or via the
  plugin `hooks/` dir); run the first full cycle.
- Re-running `init` is safe: provisioning steps short-circuit when already satisfied.

## 7. Error handling

- Every verb emits the CDD 11-category envelope. Docker missing → `config` with an
  install suggestion. Image build failure → `internal` with the build log tail. Scan
  timeout → `internal` + a `warnings` entry noting partial artifacts. No prior snapshot
  → `baseline`, not an error.
- All hooks **fail-open** — a missing `docker`/`jq`/`cdd` never breaks `git` or the
  Claude session (consistent with existing CDD hooks).
- The async scan writes a status flag; if a push happens mid-scan, the new scan is
  coalesced (no overlapping container runs).

## 8. Testing

bats suite in CDD's existing style:

- `asis init` provisions idempotently (image-present + image-absent paths, docker mocked).
- `asis scan` normalizes canned artifacts → expected state shape.
- `asis discover` chains suggest→seed idempotently.
- `asis drift` baseline case + a known delta fixture.
- synthesize scaffold lifecycle: `pending` → agent edit → PostToolUse → `finalised`.
- doctor validates state, detects missing engine, flags stale/pending drift.
- hook fail-open when docker/jq absent.

**Docker is mocked** by an injectable fake engine (env var points the subsystem at a
script that emits canned artifacts) so the suite runs without Docker. One opt-in
integration test (`ASIS_DOCKER_IT=1`) runs the real container against a tiny fixture repo.

## 9. File manifest (in `cli-driven-dev`)

**New**
- `lib/commands/asis.sh`
- `lib/core/asis_state.sh`
- `lib/core/asis_emitter.sh`
- `templates/asis-default.json`
- `lib/engines/asis-docker/{Dockerfile,docker-compose.yml,01-extract.sh,.dockerignore}` (vendored, unchanged)
- `.claude-plugin/hooks/git/pre-push` (installed by `asis init`)
- `skills/cdd/references/asis.md` (subsystem reference)
- `tests/bats/NN_asis.bats`
- `tests/bats/fixtures/asis/` (canned artifacts + tiny repo for IT)

**Modified**
- `bin/cdd` — register the `asis` verb in the dispatcher
- `.claude-plugin/hooks/post-tool-use.sh` — finalize `synthesis-*.md` (mirror journey-finalise)
- `.claude-plugin/hooks/session-start.sh` — surface "as-is drift pending review" when a scaffold is `pending`
- `lib/core/docs_*.sh` — register the `as-is` page (or document the integration point)
- `install.sh` — Windows/Git-Bash branch in `dep_hint`; note docker as an `asis`-only optional dep
- `README.md` / `ARCHITECTURE.md` — document the `asis` subsystem + the two-speed (fast heuristic / deep deterministic) model

## 10. Out of scope (YAGNI)

- Direct Foundry/LLM calls from the framework (rejected in decision #4).
- CI- and schedule-based triggers (only git was chosen; the state machine leaves room to add them later as alternate entry points).
- `--changed-only` incremental scanning (reserved flag, not built).
- The kit's downstream Stages 4–5 (Goal view, roadmap) and the ADO backlog pull — those stay in the standalone kit; this feature is the as-is loop only.
- Anonymization/demo-sheet generation (kit-local concern).

## 11. Open considerations (non-blocking)

- **Spec home / git:** the working directory (`MC Foundry`) is not a git repo, so this
  spec is written but not auto-committed. The implementation lands in `cli-driven-dev`
  via a feature branch + PR when we implement (requires the user's git auth).
- **Windows Docker:** Docker Desktop on Windows must be running for `asis scan`; `doctor`
  detects and reports the daemon state.
- **Mounted vs mirror on dirty trees:** `mounted` mode scans the working tree as-is
  (uncommitted changes included), which is desirable for live docs; `last_scan.commit`
  records `HEAD` plus a `dirty: true` flag when the tree isn't clean.
