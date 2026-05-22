# `asis` Living-Documentation Subsystem — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native CDD subsystem `asis` that, from one human trigger, self-provisions and keeps a project's as-is documentation alive — by orchestrating the As-Is Discovery Kit's Docker scanner, normalizing the result into CDD state, computing drift, and scaffolding a narrative the agent fills.

**Architecture:** A Layer-4 CDD subsystem following the framework's exact four-piece template (state + emitter + verbs + default template), plus a vendored Docker engine and two extended hooks. Autonomy is an autopilot-style state machine persisted in `.cdd/state/asis.json`; the narrative reuses CDD's existing scaffold + PostToolUse-finalize mechanism (zero LLM coupling in the framework). The deep scan is invoked through a single seam (`asis_run_engine`) so tests inject a fake engine and run without Docker.

**Tech Stack:** bash 4+, jq, python3 (stdlib only — matches `lib/helpers/schema_validator.py`), Docker (optional, `asis`-only), bats-core for tests. All work lands in the `cli-driven-dev` repo.

**Spec:** `docs/superpowers/specs/2026-05-22-asis-living-docs-design.md`

---

## Conventions locked across all tasks

These names are used identically in every task. Do not rename.

| Thing | Value |
|---|---|
| Subsystem name / verb | `asis` |
| Command file | `lib/commands/asis.sh` → `cmd_asis()` → `_asis_<verb>()` |
| State module | `lib/core/asis_state.sh` (constants `ASIS_STATE_FILE`, `ASIS_DEFAULT_TMPL`) |
| Emitter module | `lib/core/asis_emitter.sh` |
| Default template | `templates/asis-default.json` |
| Scaffold template | `templates/asis-scaffold.md.tmpl` |
| State file | `.cdd/state/asis.json` |
| Engine dir | `lib/engines/asis-docker/` (`Dockerfile`, `docker-compose.yml`, `01-extract.sh`, `.dockerignore`) |
| Docker image tag | `cdd-asis:latest` |
| Normalizer | `lib/helpers/asis_normalize.py` |
| Drift helper | `lib/helpers/asis_drift.py` |
| Engine seam env var | `ASIS_ENGINE_CMD` (if set, scan calls `"$ASIS_ENGINE_CMD" <source_dir> <artifacts_dir>` instead of Docker) |
| Pending scaffold | `.cdd/asis/_pending/synthesis_<slug>.prompt.md` |
| Finalized narrative | `.cdd/asis/synthesis_<slug>.md` |
| Drift outputs | `.cdd/asis/drift-<slug>.json`, `.cdd/asis/drift-<slug>.md` |
| Living doc | `dist/asis/as-is.md` |
| Slug format | `date -u +%Y%m%d-%H%M%S` |
| Test file | `tests/bats/40_asis.bats` (bump the number if 40 is taken) |
| Fixtures | `tests/bats/fixtures/asis/artifacts/` (canned), `tests/bats/fixtures/asis/fake-engine.sh` |

**Pipeline phases** (in `.cdd/state/asis.json` `.pipeline.phase`): `idle → provisioning → scanning → discovering → drifting → synthesizing → rendering → watching`.

**Reference files to mirror** (read before starting): `lib/commands/secrets.sh`, `lib/core/secrets_state.sh`, `lib/commands/autopilot.sh`, `templates/journey-scaffold.md.tmpl`, `.claude-plugin/hooks/post-tool-use.sh`, `tests/bats/test_helpers.bash`.

---

## Task 1: Dispatcher wiring + command skeleton + vendored engine

Make `cdd asis help` work and vendor the Docker engine (copied verbatim from the kit to preserve the safety contract).

**Files:**
- Create: `lib/commands/asis.sh`
- Create: `lib/engines/asis-docker/Dockerfile` (copy of `asis-discovery-kit/Dockerfile`)
- Create: `lib/engines/asis-docker/docker-compose.yml` (copy of the kit's)
- Create: `lib/engines/asis-docker/01-extract.sh` (copy of `asis-discovery-kit/scripts/01-extract.sh`)
- Create: `lib/engines/asis-docker/.dockerignore` (copy of the kit's)
- Modify: `bin/cdd` (add `asis)` dispatch case + usage line)
- Test: `tests/bats/40_asis.bats`

- [ ] **Step 1: Copy the engine files verbatim from the kit.**

```bash
mkdir -p lib/engines/asis-docker
cp "/c/Users/BryanVlok/Documents/Agile Bridge/asis-discovery-kit/Dockerfile"            lib/engines/asis-docker/Dockerfile
cp "/c/Users/BryanVlok/Documents/Agile Bridge/asis-discovery-kit/docker-compose.yml"     lib/engines/asis-docker/docker-compose.yml
cp "/c/Users/BryanVlok/Documents/Agile Bridge/asis-discovery-kit/.dockerignore"          lib/engines/asis-docker/.dockerignore
cp "/c/Users/BryanVlok/Documents/Agile Bridge/asis-discovery-kit/scripts/01-extract.sh"  lib/engines/asis-docker/01-extract.sh
```
(The compose file stays for standalone/reference use; the subsystem invokes the image with `docker run` directly so mounts are parametric — see Task 3. Do not edit `01-extract.sh`; it is trust-surface code.)

- [ ] **Step 2: Write the failing test** in `tests/bats/40_asis.bats`:

```bash
#!/usr/bin/env bats
load test_helpers

setup()    { setup_tmpdir; "$CDD_BIN" init >/dev/null; }
teardown() { teardown_tmpdir; }

@test "cdd asis help lists the verbs" {
  run "$CDD_BIN" asis help
  [ "$status" -eq 0 ]
  [[ "$output" == *"scan"* ]]
  [[ "$output" == *"drift"* ]]
  [[ "$output" == *"synthesize"* ]]
}

@test "engine files are vendored" {
  [ -f "$CDD_ROOT/lib/engines/asis-docker/Dockerfile" ]
  [ -f "$CDD_ROOT/lib/engines/asis-docker/01-extract.sh" ]
}
```

- [ ] **Step 3: Run, see fail.**

Run: `bats tests/bats/40_asis.bats`
Expected: FAIL — `cdd: unknown command: asis`.

- [ ] **Step 4: Create `lib/commands/asis.sh` skeleton:**

```bash
# CDD asis command — living as-is documentation subsystem.
# Orchestrates the As-Is Discovery Kit (Docker) and keeps docs alive.
# shellcheck shell=bash

cmd_asis() {
  # shellcheck source=/dev/null
  source "$CDD_ROOT/lib/core/envelope.sh"
  # shellcheck source=/dev/null
  source "$CDD_ROOT/lib/core/asis_state.sh"
  # shellcheck source=/dev/null
  source "$CDD_ROOT/lib/core/asis_emitter.sh"

  local verb="${1:-help}"; shift || true
  case "$verb" in
    init)        _asis_init "$@" ;;
    scan)        _asis_scan "$@" ;;
    discover)    _asis_discover "$@" ;;
    drift)       _asis_drift "$@" ;;
    synthesize)  _asis_synthesize "$@" ;;
    finalize)    _asis_finalize "$@" ;;
    tick)        _asis_tick "$@" ;;
    status)      _asis_status "$@" ;;
    doctor)      _asis_doctor "$@" ;;
    regenerate)  _asis_regenerate "$@" ;;
    export)      _asis_export "$@" ;;
    import)      _asis_import "$@" ;;
    reset)       _asis_reset "$@" ;;
    -h|--help|help)
      cat <<EOF
Usage: cdd asis <verb> [args]

Verbs:
  init                 Self-provision (build image), seed state, install pre-push
                       hook, and run the first full cycle. The one human trigger.
  scan                 Run the deterministic structural scan → normalize to state
  discover             Map command surface from reality (cdd suggest | cdd seed)
  drift                Diff current vs previous snapshot → drift report
  synthesize           Scaffold the narrative prompt for the agent to fill
  finalize <slug>      Promote a filled scaffold → render the living doc
  tick [--hook]        Advance the autopilot state machine one step (hook entry)
  status [--json]      Snapshot summary + current phase
  doctor [--json]      Validate state + Docker availability + freshness
  regenerate           Re-render dist/asis/as-is.md from current state
  export [--file P]    Dump state JSON
  import <file>        Replace state from JSON
  reset                Restore empty as-is state

State: .cdd/state/asis.json   Living doc: dist/asis/as-is.md
EOF
      ;;
    *) log_error "asis: unknown verb: $verb"; exit 64 ;;
  esac
}
```

For now, add stub bodies so help works and other verbs fail cleanly. Put these **above** `cmd_asis` (they get overwritten in later tasks):

```bash
_asis_init()       { log_error "asis init: not yet implemented"; exit 70; }
_asis_scan()       { log_error "asis scan: not yet implemented"; exit 70; }
_asis_discover()   { log_error "asis discover: not yet implemented"; exit 70; }
_asis_drift()      { log_error "asis drift: not yet implemented"; exit 70; }
_asis_synthesize() { log_error "asis synthesize: not yet implemented"; exit 70; }
_asis_finalize()   { log_error "asis finalize: not yet implemented"; exit 70; }
_asis_tick()       { log_error "asis tick: not yet implemented"; exit 70; }
_asis_status()     { log_error "asis status: not yet implemented"; exit 70; }
_asis_doctor()     { log_error "asis doctor: not yet implemented"; exit 70; }
_asis_regenerate() { log_error "asis regenerate: not yet implemented"; exit 70; }
_asis_export()     { log_error "asis export: not yet implemented"; exit 70; }
_asis_import()     { log_error "asis import: not yet implemented"; exit 70; }
_asis_reset()      { log_error "asis reset: not yet implemented"; exit 70; }
```

Create empty placeholder modules so the `source` lines don't fail (filled in Task 2 and Task 6):

```bash
printf '# filled in Task 2\n' > lib/core/asis_state.sh
printf '# filled in Task 6\n' > lib/core/asis_emitter.sh
```

- [ ] **Step 5: Wire the dispatcher.** In `bin/cdd`, add a usage line under the command list (near the `secrets` line, ~line 65):

```
  asis [verb]                   Living as-is documentation — Docker scan + drift + narrative
```

And add a dispatch case immediately before the `jobs)` case (~line 317):

```bash
  asis)
    require_deps
    # shellcheck source=/dev/null
    source "$CDD_ROOT/lib/commands/asis.sh"
    cmd_asis "$@"
    ;;
```

- [ ] **Step 6: Run, see pass.**

Run: `bats tests/bats/40_asis.bats`
Expected: both tests PASS.

- [ ] **Step 7: Commit.**

```bash
git add lib/commands/asis.sh lib/core/asis_state.sh lib/core/asis_emitter.sh lib/engines/asis-docker bin/cdd tests/bats/40_asis.bats
git commit -m "feat(asis): subsystem skeleton, dispatcher wiring, vendored Docker engine"
```

---

## Task 2: State module + default template

**Files:**
- Create: `templates/asis-default.json`
- Modify: `lib/core/asis_state.sh` (replace the Task-1 placeholder)
- Test: `tests/bats/40_asis.bats` (append)

- [ ] **Step 1: Write the failing tests** (append to `40_asis.bats`):

```bash
@test "cdd asis status before scan reports phase idle, zero functions" {
  run "$CDD_BIN" asis status --json
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.data.phase == "idle"'
  echo "$output" | jq -e '.data.summary.functions == 0'
}
```

(`status` is implemented in Task 10; this test will be unskipped there. For now add it but mark it `skip` — remove the skip line in Task 10.)

```bash
@test "state seeds with schema_version and idle pipeline" {
  # drive seeding directly via the state module
  run bash -c "source '$CDD_ROOT/lib/core/shared.sh'; export CDD_ROOT='$CDD_ROOT'; source '$CDD_ROOT/lib/core/asis_state.sh'; asis_seed_defaults '$PWD'; cat .cdd/state/asis.json"
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.schema_version == "1.0.0"'
  echo "$output" | jq -e '.pipeline.phase == "idle"'
}
```

- [ ] **Step 2: Run, see fail.**

Run: `bats tests/bats/40_asis.bats -f "state seeds"`
Expected: FAIL — `.cdd/state/asis.json` not created (placeholder module).

- [ ] **Step 3: Create `templates/asis-default.json`:**

```json
{
  "schema_version": "1.0.0",
  "pipeline": { "phase": "idle", "updated_at": null, "history": [] },
  "config": { "trigger": "pre-push", "scan_mode": "mounted", "async": true },
  "last_scan": null,
  "summary": {
    "functions": 0,
    "clones": { "count": 0, "dup_pct": 0.0 },
    "debt_markers": 0,
    "commits": 0,
    "loc": {},
    "complexity": { "median_ccn": 0, "mean_ccn": 0.0, "top_offenders": [] },
    "churn_top": [],
    "packages": {},
    "stacks": []
  },
  "snapshots": []
}
```

- [ ] **Step 4: Write `lib/core/asis_state.sh`** (replace placeholder):

```bash
# CDD asis state helpers — load/save/seed/mutate .cdd/state/asis.json
# shellcheck shell=bash

ASIS_STATE_FILE=".cdd/state/asis.json"
ASIS_DEFAULT_TMPL="$CDD_ROOT/templates/asis-default.json"

asis_slug() { date -u +"%Y%m%d-%H%M%S"; }
asis_now()  { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

asis_state_path() {
  local root="${1:-$(cdd_root_project 2>/dev/null || echo "$PWD")}"
  echo "$root/$ASIS_STATE_FILE"
}

asis_ensure_dir() {
  local root="${1:-$(cdd_root_project 2>/dev/null || echo "$PWD")}"
  mkdir -p "$root/.cdd/state" "$root/.cdd/asis/_pending"
}

asis_load() {
  local root="${1:-$PWD}"
  local f="$root/$ASIS_STATE_FILE"
  if [[ ! -f "$f" ]]; then
    log_error "asis not initialized. Run: cdd asis init"
    exit 1
  fi
  cat "$f"
}

asis_save() {
  local root="$1" json="$2"
  asis_ensure_dir "$root"
  printf '%s\n' "$json" > "$root/$ASIS_STATE_FILE"
}

asis_seed_defaults() {
  local root="$1"
  asis_ensure_dir "$root"
  cp "$ASIS_DEFAULT_TMPL" "$root/$ASIS_STATE_FILE"
}

# asis_set_phase <root> <phase>
asis_set_phase() {
  local root="$1" phase="$2"
  local json; json="$(asis_load "$root")"
  json="$(echo "$json" | jq --arg p "$phase" --arg ts "$(asis_now)" \
    '.pipeline.phase = $p
     | .pipeline.updated_at = $ts
     | .pipeline.history += [{phase:$p, at:$ts}]')"
  asis_save "$root" "$json"
}

asis_get_phase() {
  local root="$1"
  local f="$root/$ASIS_STATE_FILE"
  [[ -f "$f" ]] && jq -r '.pipeline.phase // "idle"' "$f" 2>/dev/null || echo "idle"
}

# asis_record_scan <root> <commit> <engine> <summary_json>
# Sets last_scan + summary, and pushes a snapshot (summary kept inline for drift).
asis_record_scan() {
  local root="$1" commit="$2" engine="$3" summary="$4"
  local json; json="$(asis_load "$root")"
  json="$(echo "$json" | jq \
    --arg c "$commit" --arg e "$engine" --arg ts "$(asis_now)" \
    --argjson s "$summary" \
    '.last_scan = {finished_at:$ts, commit:$c, engine:$e}
     | .summary = $s
     | .snapshots += [{at:$ts, commit:$c, summary:$s}]
     | .snapshots = (.snapshots | if length > 10 then .[-10:] else . end)')"
  asis_save "$root" "$json"
}

# asis_validate <json> — print errors, return 1 if any
asis_validate() {
  local json="$1"; local errors=()
  echo "$json" | jq -e '.schema_version' >/dev/null 2>&1 || errors+=("missing schema_version")
  echo "$json" | jq -e '.pipeline.phase' >/dev/null 2>&1 || errors+=("missing pipeline.phase")
  echo "$json" | jq -e '.summary' >/dev/null 2>&1 || errors+=("missing summary")
  if [[ ${#errors[@]} -gt 0 ]]; then printf '%s\n' "${errors[@]}"; return 1; fi
  return 0
}
```

- [ ] **Step 5: Run, see pass.**

Run: `bats tests/bats/40_asis.bats -f "state seeds"`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add lib/core/asis_state.sh templates/asis-default.json tests/bats/40_asis.bats
git commit -m "feat(asis): state module + default template (pipeline + summary shape)"
```

---

## Task 3: `asis scan` — engine seam + normalization

**Files:**
- Create: `lib/helpers/asis_normalize.py`
- Create: `tests/bats/fixtures/asis/fake-engine.sh`
- Create: `tests/bats/fixtures/asis/artifacts/{complexity.xml,clones/jscpd-report.json,debt-fingerprints.txt,git-history.csv,loc.csv,churn-top50.txt,inventory.txt}`
- Modify: `lib/commands/asis.sh` (replace `_asis_scan`, add `_asis_require_init`, `asis_run_engine`, `asis_require_docker`)
- Test: `tests/bats/40_asis.bats` (append)

- [ ] **Step 1: Create the canned fixture artifacts.** Minimal but realistic:

`tests/bats/fixtures/asis/artifacts/complexity.xml`:
```xml
<?xml version="1.0"?>
<cppncss><measure type="Function">
  <item name="A::big(...)"><value>1</value><value>40</value><value>22</value></item>
  <item name="B::mid(...)"><value>2</value><value>20</value><value>11</value></item>
  <item name="C::small(...)"><value>3</value><value>5</value><value>3</value></item>
</measure></cppncss>
```

`tests/bats/fixtures/asis/artifacts/clones/jscpd-report.json`:
```json
{ "statistics": { "total": { "percentage": 26.2, "clones": 1189 } }, "duplicates": [] }
```

`tests/bats/fixtures/asis/artifacts/debt-fingerprints.txt`:
```
src/a.cs:10: TODO refactor this
src/b.cs:42: FIXME hardcoded url
src/c.ts:7: HACK temporary
```

`tests/bats/fixtures/asis/artifacts/git-history.csv`:
```
abc123|Engineer A|2026-05-01|initial
def456|Engineer A|2026-05-02|feature x
```

`tests/bats/fixtures/asis/artifacts/loc.csv`:
```
extension,lines
cs,1200
ts,800
```

`tests/bats/fixtures/asis/artifacts/churn-top50.txt`:
```
     12 src/a.cs
      9 src/b.cs
```

`tests/bats/fixtures/asis/artifacts/inventory.txt`:
```
## Solutions
/source/App.sln
## Node package.json
/source/web/package.json
```

- [ ] **Step 2: Create the fake engine** `tests/bats/fixtures/asis/fake-engine.sh` (copies fixtures into the target artifacts dir — stands in for Docker):

```bash
#!/usr/bin/env bash
# fake-engine.sh <source_dir> <artifacts_dir> — test stand-in for the Docker scan.
set -euo pipefail
ARTIFACTS="$2"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$ARTIFACTS/clones"
cp -r "$HERE/artifacts/." "$ARTIFACTS/"
echo "fake-engine: wrote artifacts to $ARTIFACTS" >&2
```
Then `chmod +x tests/bats/fixtures/asis/fake-engine.sh`.

- [ ] **Step 3: Write `lib/helpers/asis_normalize.py`** (stdlib only):

```python
#!/usr/bin/env python3
"""asis_normalize.py <artifacts_dir> — print summary JSON to stdout."""
import sys, os, json, csv, xml.etree.ElementTree as ET

art = sys.argv[1]
def path(n): return os.path.join(art, n)

summary = {
    "functions": 0,
    "clones": {"count": 0, "dup_pct": 0.0},
    "debt_markers": 0,
    "commits": 0,
    "loc": {},
    "complexity": {"median_ccn": 0, "mean_ccn": 0.0, "top_offenders": []},
    "churn_top": [],
    "packages": {},
    "stacks": [],
}

# Complexity from cppncss-style XML produced by lizard --xml
xmlf = path("complexity.xml")
if os.path.exists(xmlf):
    try:
        tree = ET.parse(xmlf)
        ccns, offenders = [], []
        for item in tree.iter("item"):
            vals = [v.text for v in item.findall("value")]
            if len(vals) >= 3:
                try:
                    ccn, nloc = int(vals[2]), int(vals[1])
                except (ValueError, TypeError):
                    continue
                ccns.append(ccn)
                offenders.append({"ccn": ccn, "nloc": nloc, "name": item.get("name", "")})
        offenders.sort(key=lambda o: o["ccn"], reverse=True)
        summary["functions"] = len(ccns)
        summary["complexity"]["top_offenders"] = offenders[:15]
        if ccns:
            s = sorted(ccns)
            summary["complexity"]["median_ccn"] = s[len(s) // 2]
            summary["complexity"]["mean_ccn"] = round(sum(ccns) / len(ccns), 1)
    except Exception:
        pass

# Clones from jscpd JSON
jf = path("clones/jscpd-report.json")
if os.path.exists(jf):
    try:
        d = json.load(open(jf))
        tot = d.get("statistics", {}).get("total", {})
        summary["clones"]["dup_pct"] = round(float(tot.get("percentage", 0)), 1)
        summary["clones"]["count"] = int(tot.get("clones", len(d.get("duplicates", []))))
    except Exception:
        pass

# Debt markers = non-empty lines in debt-fingerprints.txt
df = path("debt-fingerprints.txt")
if os.path.exists(df):
    summary["debt_markers"] = sum(1 for l in open(df, errors="ignore") if l.strip())

# Commits = lines in git-history.csv
gh = path("git-history.csv")
if os.path.exists(gh):
    summary["commits"] = sum(1 for l in open(gh, errors="ignore") if l.strip())

# LOC from loc.csv (skip header)
lf = path("loc.csv")
if os.path.exists(lf):
    try:
        for row in csv.reader(open(lf)):
            if len(row) >= 2 and row[0] != "extension":
                try:
                    summary["loc"][row[0]] = int(row[1])
                except ValueError:
                    pass
    except Exception:
        pass

# Churn top 10
cf = path("churn-top50.txt")
if os.path.exists(cf):
    summary["churn_top"] = [l.strip() for l in open(cf, errors="ignore") if l.strip()][:10]

# Stacks from inventory.txt
inv = path("inventory.txt")
if os.path.exists(inv):
    t = open(inv, errors="ignore").read()
    if ".sln" in t or ".csproj" in t: summary["stacks"].append("dotnet")
    if "package.json" in t:           summary["stacks"].append("node")
    if any(k in t for k in ("pyproject.toml", "requirements.txt", "setup.py")):
        summary["stacks"].append("python")

print(json.dumps(summary))
```

- [ ] **Step 4: Write failing test** (append to `40_asis.bats`):

```bash
@test "cdd asis scan (fake engine) normalizes artifacts into state" {
  export ASIS_ENGINE_CMD="$CDD_ROOT/tests/bats/fixtures/asis/fake-engine.sh"
  "$CDD_BIN" asis reset >/dev/null 2>&1 || true   # ensure seeded; reset lands in Task 10
  bash -c "source '$CDD_ROOT/lib/core/shared.sh'; export CDD_ROOT='$CDD_ROOT'; source '$CDD_ROOT/lib/core/asis_state.sh'; asis_seed_defaults '$PWD'"
  run "$CDD_BIN" asis scan --json
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.data.summary.functions == 3'
  echo "$output" | jq -e '.data.summary.clones.dup_pct == 26.2'
  echo "$output" | jq -e '.data.summary.debt_markers == 3'
  echo "$output" | jq -e '.data.summary.stacks | index("dotnet")'
  # state persisted
  jq -e '.snapshots | length == 1' .cdd/state/asis.json
}
```

- [ ] **Step 5: Run, see fail.**

Run: `bats tests/bats/40_asis.bats -f "scan"`
Expected: FAIL — `asis scan: not yet implemented`.

- [ ] **Step 6: Implement in `lib/commands/asis.sh`.** Add helpers near the top (after the sourcing in `cmd_asis` is fine to keep them as standalone functions in the file) and replace `_asis_scan`:

```bash
_asis_require_init() {
  local root
  if ! root="$(cdd_root_project 2>/dev/null)"; then
    log_error "no .cdd/ found — run 'cdd init' first"; exit 1
  fi
  if [[ ! -f "$root/$ASIS_STATE_FILE" ]]; then
    log_error "asis not initialized — run 'cdd asis init' first"; exit 1
  fi
  echo "$root"
}

# asis_require_docker — returns 0 if docker usable; else emits a config error.
asis_require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    emit_error config "docker not found — asis scan needs Docker Desktop" \
      --suggestion "Install Docker Desktop and ensure 'docker' is on PATH" || true
    return 1
  fi
  if ! docker info >/dev/null 2>&1; then
    emit_error config "docker daemon not reachable" \
      --suggestion "Start Docker Desktop, then retry 'cdd asis scan'" || true
    return 1
  fi
  return 0
}

# asis_run_engine <source_dir> <artifacts_dir> — the single scan seam.
# Test/headless override: ASIS_ENGINE_CMD. Otherwise build+run the Docker image
# with the kit's safety flags (read-only, no network, tmpfs /tmp).
asis_run_engine() {
  local src="$1" art="$2"
  mkdir -p "$art"
  if [[ -n "${ASIS_ENGINE_CMD:-}" ]]; then
    "$ASIS_ENGINE_CMD" "$src" "$art"
    return $?
  fi
  asis_require_docker || return 1
  if ! docker image inspect cdd-asis:latest >/dev/null 2>&1; then
    log_info "building asis toolbelt image (one-time)…"
    docker build -t cdd-asis:latest "$CDD_ROOT/lib/engines/asis-docker" >&2 || return 1
  fi
  docker run --rm \
    --network none --read-only --tmpfs /tmp:rw,exec,size=512m \
    -v "$src:/source:ro" -v "$art:/artifacts" \
    cdd-asis:latest >&2
}

_asis_scan() {
  local json_out=0
  while [[ $# -gt 0 ]]; do case "$1" in --json) json_out=1; shift ;; *) shift ;; esac; done

  local root; root="$(_asis_require_init)"
  local json; json="$(asis_load "$root")"
  local scan_mode; scan_mode="$(echo "$json" | jq -r '.config.scan_mode // "mounted"')"

  asis_set_phase "$root" "scanning"

  local art="$root/artifacts"
  # Retain previous artifacts for drift before overwriting
  if [[ -d "$art" ]]; then rm -rf "$root/.cdd/asis/prev-artifacts"; cp -r "$art" "$root/.cdd/asis/prev-artifacts" 2>/dev/null || true; fi
  rm -rf "$art"; mkdir -p "$art"

  local src="$root"
  if [[ "$scan_mode" == "mirror" ]]; then
    src="$root/.cdd/asis/source-mirror"
    rm -rf "$src"; git clone --local --no-hardlinks "$root" "$src" >/dev/null 2>&1 || cp -r "$root" "$src"
  fi

  if ! asis_run_engine "$src" "$art"; then
    asis_set_phase "$root" "idle"
    if [[ $json_out -eq 1 ]]; then emit_error internal "scan engine failed — see artifacts/run.log" || true
    else log_error "scan engine failed"; fi
    exit 1
  fi

  local summary
  summary="$(python3 "$CDD_ROOT/lib/helpers/asis_normalize.py" "$art")"
  if [[ -z "$summary" ]]; then summary='{}'; fi

  local commit; commit="$(git -C "$root" rev-parse --short HEAD 2>/dev/null || echo "unknown")"
  local engine="docker:cdd-asis"; [[ -n "${ASIS_ENGINE_CMD:-}" ]] && engine="fake:${ASIS_ENGINE_CMD##*/}"
  asis_record_scan "$root" "$commit" "$engine" "$summary"
  asis_set_phase "$root" "discovering"

  if [[ $json_out -eq 1 ]]; then
    emit_success "$(jq -nc --argjson s "$summary" --arg c "$commit" '{scanned:true, commit:$c, summary:$s}')"
  else
    log_success "scan complete (commit $commit)"
    echo "$summary" | jq -r '"  functions: \(.functions)  dup%: \(.clones.dup_pct)  debt: \(.debt_markers)  commits: \(.commits)"'
  fi
}
```

- [ ] **Step 7: Run, see pass.**

Run: `bats tests/bats/40_asis.bats -f "scan"`
Expected: PASS.

- [ ] **Step 8: Commit.**

```bash
git add lib/commands/asis.sh lib/helpers/asis_normalize.py tests/bats/fixtures/asis tests/bats/40_asis.bats
git commit -m "feat(asis): scan via engine seam + python normalizer; Docker run with safety flags"
```

---

## Task 4: `asis drift` — deterministic delta

**Files:**
- Create: `lib/helpers/asis_drift.py`
- Modify: `lib/commands/asis.sh` (replace `_asis_drift`)
- Test: `tests/bats/40_asis.bats` (append)

- [ ] **Step 1: Write `lib/helpers/asis_drift.py`:**

```python
#!/usr/bin/env python3
"""asis_drift.py <curr_summary.json> <prev_summary.json> [curr_debt.txt] [prev_debt.txt]
Print a drift delta JSON to stdout."""
import sys, json, os

curr = json.load(open(sys.argv[1]))
prev = json.load(open(sys.argv[2]))

def num(d, *keys):
    for k in keys:
        d = d.get(k, {}) if isinstance(d, dict) else 0
    return d if isinstance(d, (int, float)) else 0

drift = {
    "baseline": False,
    "delta": {
        "functions": curr.get("functions", 0) - prev.get("functions", 0),
        "dup_pct": round(num(curr, "clones", "dup_pct") - num(prev, "clones", "dup_pct"), 1),
        "debt_markers": curr.get("debt_markers", 0) - prev.get("debt_markers", 0),
        "commits": curr.get("commits", 0) - prev.get("commits", 0),
    },
    "new_debt": [],
    "removed_debt": [],
    "new_offenders": [],
}

if len(sys.argv) >= 5 and os.path.exists(sys.argv[3]) and os.path.exists(sys.argv[4]):
    c = set(l.rstrip("\n") for l in open(sys.argv[3], errors="ignore") if l.strip())
    p = set(l.rstrip("\n") for l in open(sys.argv[4], errors="ignore") if l.strip())
    drift["new_debt"] = sorted(c - p)[:50]
    drift["removed_debt"] = sorted(p - c)[:50]

prev_names = {o.get("name") for o in prev.get("complexity", {}).get("top_offenders", [])}
drift["new_offenders"] = [
    o for o in curr.get("complexity", {}).get("top_offenders", [])
    if o.get("name") not in prev_names
][:10]

print(json.dumps(drift))
```

- [ ] **Step 2: Write failing test** (append):

```bash
@test "cdd asis drift on a single snapshot reports baseline" {
  export ASIS_ENGINE_CMD="$CDD_ROOT/tests/bats/fixtures/asis/fake-engine.sh"
  bash -c "source '$CDD_ROOT/lib/core/shared.sh'; export CDD_ROOT='$CDD_ROOT'; source '$CDD_ROOT/lib/core/asis_state.sh'; asis_seed_defaults '$PWD'"
  "$CDD_BIN" asis scan >/dev/null
  run "$CDD_BIN" asis drift --json
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.data.baseline == true'
}

@test "cdd asis drift between two scans computes deltas + new debt" {
  export ASIS_ENGINE_CMD="$CDD_ROOT/tests/bats/fixtures/asis/fake-engine.sh"
  bash -c "source '$CDD_ROOT/lib/core/shared.sh'; export CDD_ROOT='$CDD_ROOT'; source '$CDD_ROOT/lib/core/asis_state.sh'; asis_seed_defaults '$PWD'"
  "$CDD_BIN" asis scan >/dev/null         # snapshot 1
  # second engine adds a debt line
  cat > "$CDD_TEST_DIR/engine2.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
src="\$1"; art="\$2"; mkdir -p "\$art/clones"
cp -r "$CDD_ROOT/tests/bats/fixtures/asis/artifacts/." "\$art/"
echo "src/d.cs:99: TODO new debt" >> "\$art/debt-fingerprints.txt"
EOF
  chmod +x "$CDD_TEST_DIR/engine2.sh"
  ASIS_ENGINE_CMD="$CDD_TEST_DIR/engine2.sh" "$CDD_BIN" asis scan >/dev/null   # snapshot 2
  run "$CDD_BIN" asis drift --json
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.data.baseline == false'
  echo "$output" | jq -e '.data.delta.debt_markers == 1'
  echo "$output" | jq -e '[.data.new_debt[] | select(test("new debt"))] | length >= 1'
}
```

- [ ] **Step 3: Run, see fail.**

Run: `bats tests/bats/40_asis.bats -f "drift"`
Expected: FAIL — not implemented.

- [ ] **Step 4: Implement `_asis_drift`** (replace stub):

```bash
_asis_drift() {
  local json_out=0
  while [[ $# -gt 0 ]]; do case "$1" in --json) json_out=1; shift ;; *) shift ;; esac; done
  local root; root="$(_asis_require_init)"
  asis_set_phase "$root" "drifting"
  local json; json="$(asis_load "$root")"

  local n; n="$(echo "$json" | jq '.snapshots | length')"
  local slug; slug="$(asis_slug)"
  mkdir -p "$root/.cdd/asis"
  local drift_json drift_file="$root/.cdd/asis/drift-$slug.json" drift_md="$root/.cdd/asis/drift-$slug.md"

  if [[ "${n:-0}" -lt 2 ]]; then
    drift_json='{"baseline":true,"delta":{},"new_debt":[],"removed_debt":[],"new_offenders":[]}'
  else
    local curr_f="$root/.cdd/asis/_curr-summary.json" prev_f="$root/.cdd/asis/_prev-summary.json"
    echo "$json" | jq '.snapshots[-1].summary' > "$curr_f"
    echo "$json" | jq '.snapshots[-2].summary' > "$prev_f"
    local curr_debt="$root/artifacts/debt-fingerprints.txt" prev_debt="$root/.cdd/asis/prev-artifacts/debt-fingerprints.txt"
    drift_json="$(python3 "$CDD_ROOT/lib/helpers/asis_drift.py" "$curr_f" "$prev_f" "$curr_debt" "$prev_debt")"
    rm -f "$curr_f" "$prev_f"
  fi

  printf '%s\n' "$drift_json" > "$drift_file"
  asis_emit_drift_md "$drift_json" "$drift_md"
  asis_set_phase "$root" "synthesizing"

  if [[ $json_out -eq 1 ]]; then
    emit_success "$(echo "$drift_json" | jq --arg f "$drift_file" '. + {report:$f}')"
  else
    log_success "drift report → $drift_file"
    echo "$drift_json" | jq -r 'if .baseline then "  (baseline — first snapshot)" else "  Δfunctions: \(.delta.functions)  Δdup%: \(.delta.dup_pct)  Δdebt: \(.delta.debt_markers)  new debt: \(.new_debt|length)" end'
  fi
}
```

(`asis_emit_drift_md` is defined in Task 6's emitter; add a temporary no-op now so this task's tests pass without the markdown: append to `lib/core/asis_emitter.sh`:)

```bash
asis_emit_drift_md() { :; }   # replaced in Task 6
```

- [ ] **Step 5: Run, see pass.**

Run: `bats tests/bats/40_asis.bats -f "drift"`
Expected: both PASS.

- [ ] **Step 6: Commit.**

```bash
git add lib/commands/asis.sh lib/core/asis_emitter.sh lib/helpers/asis_drift.py tests/bats/40_asis.bats
git commit -m "feat(asis): deterministic drift delta (summary deltas + new/removed debt + new offenders)"
```

---

## Task 5: `asis synthesize` — narrative scaffold

**Files:**
- Create: `templates/asis-scaffold.md.tmpl`
- Modify: `lib/commands/asis.sh` (replace `_asis_synthesize`)
- Test: `tests/bats/40_asis.bats` (append)

- [ ] **Step 1: Create `templates/asis-scaffold.md.tmpl`** (mirrors `journey-scaffold.md.tmpl`):

```markdown
# As-Is Narrative — __SLUG__
<!-- FILL: Write the human-readable as-is narrative from the deterministic inputs below. -->
<!-- Required sections: ## Summary, ## What Changed, ## Risks & Recommendations -->
<!-- CDD-ASIS-MARKER: pending -->

## Structured Inputs (do not edit)
### Metrics
__SUMMARY__

### Drift since last scan
__DRIFT__

## Summary
<!-- FILL: 2-4 sentences describing the codebase as it stands today. -->

## What Changed
<!-- FILL: bullet list interpreting the drift above in plain English.
     If baseline, say so and describe the starting point. -->
- _(replace this placeholder)_

## Risks & Recommendations
<!-- FILL: bullet list. Each bullet: an observed risk (debt spike, complexity,
     duplication, churn hotspot) and a concrete recommendation. -->
- _(replace this placeholder)_
```

- [ ] **Step 2: Write failing test** (append):

```bash
@test "cdd asis synthesize scaffolds a pending prompt with the marker" {
  export ASIS_ENGINE_CMD="$CDD_ROOT/tests/bats/fixtures/asis/fake-engine.sh"
  bash -c "source '$CDD_ROOT/lib/core/shared.sh'; export CDD_ROOT='$CDD_ROOT'; source '$CDD_ROOT/lib/core/asis_state.sh'; asis_seed_defaults '$PWD'"
  "$CDD_BIN" asis scan >/dev/null
  "$CDD_BIN" asis drift >/dev/null
  run "$CDD_BIN" asis synthesize --json
  [ "$status" -eq 0 ]
  local f
  f="$(echo "$output" | jq -r '.data.scaffold')"
  [ -f "$f" ]
  grep -q "CDD-ASIS-MARKER: pending" "$f"
  grep -q "## Summary" "$f"
  # structured inputs injected (metric value present)
  grep -q '"functions": 3' "$f"
  # checkpoint instructions present for the agent
  echo "$output" | jq -e '.data.agent_instructions | test("fill")'
}
```

- [ ] **Step 3: Run, see fail.**

Run: `bats tests/bats/40_asis.bats -f "synthesize"`
Expected: FAIL — not implemented.

- [ ] **Step 4: Implement `_asis_synthesize`** (replace stub):

```bash
_asis_synthesize() {
  local json_out=0
  while [[ $# -gt 0 ]]; do case "$1" in --json) json_out=1; shift ;; *) shift ;; esac; done
  local root; root="$(_asis_require_init)"
  asis_set_phase "$root" "synthesizing"
  local json; json="$(asis_load "$root")"

  local slug; slug="$(asis_slug)"
  asis_ensure_dir "$root"
  local scaffold="$root/.cdd/asis/_pending/synthesis_${slug}.prompt.md"

  local summary_pretty drift_pretty
  summary_pretty="$(echo "$json" | jq '.summary')"
  local latest_drift; latest_drift="$(ls -1t "$root"/.cdd/asis/drift-*.json 2>/dev/null | head -1)"
  if [[ -n "$latest_drift" ]]; then drift_pretty="$(cat "$latest_drift")"; else drift_pretty='{"baseline":true}'; fi

  # Render template with placeholders. Use python to avoid sed escaping pain.
  SLUG="$slug" SUMMARY="$summary_pretty" DRIFT="$drift_pretty" \
  python3 - "$CDD_ROOT/templates/asis-scaffold.md.tmpl" "$scaffold" <<'PY'
import os, sys
tmpl, out = sys.argv[1], sys.argv[2]
t = open(tmpl).read()
t = t.replace("__SLUG__", os.environ["SLUG"])
t = t.replace("__SUMMARY__", "```json\n" + os.environ["SUMMARY"] + "\n```")
t = t.replace("__DRIFT__", "```json\n" + os.environ["DRIFT"] + "\n```")
open(out, "w").write(t)
PY

  local data
  data="$(jq -nc --arg f "$scaffold" --arg slug "$slug" \
    '{scaffold:$f, slug:$slug, checkpoint:"fill-narrative",
      next_action:"Edit the scaffold to replace every FILL section, then it auto-finalizes",
      agent_instructions:("Open " + $f + " and fill the ## Summary, ## What Changed, and ## Risks & Recommendations sections from the structured inputs. Replace every <!-- FILL --> placeholder. Saving the file triggers finalize automatically.")}')"

  if [[ $json_out -eq 1 ]]; then emit_success "$data"
  else
    log_success "as-is narrative scaffold → $scaffold"
    log_info "fill the FILL sections; saving auto-finalizes"
  fi
}
```

- [ ] **Step 5: Run, see pass.**

Run: `bats tests/bats/40_asis.bats -f "synthesize"`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add lib/commands/asis.sh templates/asis-scaffold.md.tmpl tests/bats/40_asis.bats
git commit -m "feat(asis): synthesize — narrative prompt-scaffold with structured inputs + checkpoint"
```

---

## Task 6: `asis finalize` + emitter + PostToolUse auto-finalize

**Files:**
- Modify: `lib/core/asis_emitter.sh` (real `asis_emit_doc` + `asis_emit_drift_md`)
- Modify: `lib/commands/asis.sh` (replace `_asis_finalize`)
- Modify: `.claude-plugin/hooks/post-tool-use.sh` (add asis scaffold branch)
- Test: `tests/bats/40_asis.bats` (append)

- [ ] **Step 1: Write `lib/core/asis_emitter.sh`** (replace placeholder + the no-op from Task 4):

```bash
# CDD asis emitter — render living docs from state + narrative.
# shellcheck shell=bash

# asis_emit_drift_md <drift_json> <out_file>
asis_emit_drift_md() {
  local drift="$1" out="$2"
  {
    echo "# As-Is Drift Report"
    echo ""
    if [[ "$(echo "$drift" | jq -r '.baseline')" == "true" ]]; then
      echo "_Baseline scan — no prior snapshot to compare._"
    else
      echo "| Metric | Δ |"
      echo "|---|---|"
      echo "$drift" | jq -r '.delta | to_entries[] | "| \(.key) | \(.value) |"'
      echo ""
      echo "## New debt markers"
      echo "$drift" | jq -r 'if (.new_debt|length)>0 then (.new_debt[] | "- " + .) else "- none" end'
      echo ""
      echo "## Removed debt markers"
      echo "$drift" | jq -r 'if (.removed_debt|length)>0 then (.removed_debt[] | "- " + .) else "- none" end'
      echo ""
      echo "## New complexity offenders"
      echo "$drift" | jq -r 'if (.new_offenders|length)>0 then (.new_offenders[] | "- \(.name) (CCN \(.ccn))") else "- none" end'
    fi
  } > "$out"
}

# asis_emit_doc <state_json> <out_file> <narrative_file>
asis_emit_doc() {
  local state="$1" out="$2" narrative="$3"
  mkdir -p "$(dirname "$out")"
  {
    echo "# As-Is Snapshot"
    echo ""
    local commit ts
    commit="$(echo "$state" | jq -r '.last_scan.commit // "unknown"')"
    ts="$(echo "$state" | jq -r '.last_scan.finished_at // "n/a"')"
    echo "_Generated from commit \`$commit\` at $ts. Do not edit by hand — \`cdd asis regenerate\`._"
    echo ""
    echo "## Metrics"
    echo "$state" | jq -r '.summary |
      "- Functions: \(.functions)",
      "- Duplication: \(.clones.dup_pct)% (\(.clones.count) clones)",
      "- Debt markers: \(.debt_markers)",
      "- Commits: \(.commits)",
      "- Complexity: median CCN \(.complexity.median_ccn), mean \(.complexity.mean_ccn)",
      "- Stacks: \(.stacks | join(", "))"'
    echo ""
    echo "## Top complexity offenders"
    echo "$state" | jq -r '.summary.complexity.top_offenders[]? | "- \(.name) — CCN \(.ccn), \(.nloc) lines"'
    echo ""
    if [[ -f "$narrative" ]]; then
      # Append the agent's narrative sections (everything from "## Summary" onward)
      awk '/^## Summary/{p=1} p' "$narrative"
    fi
  } > "$out"
}
```

- [ ] **Step 2: Write failing test** (append):

```bash
@test "cdd asis finalize promotes a filled scaffold and renders the living doc" {
  export ASIS_ENGINE_CMD="$CDD_ROOT/tests/bats/fixtures/asis/fake-engine.sh"
  bash -c "source '$CDD_ROOT/lib/core/shared.sh'; export CDD_ROOT='$CDD_ROOT'; source '$CDD_ROOT/lib/core/asis_state.sh'; asis_seed_defaults '$PWD'"
  "$CDD_BIN" asis scan >/dev/null
  "$CDD_BIN" asis drift >/dev/null
  out="$("$CDD_BIN" asis synthesize --json)"
  f="$(echo "$out" | jq -r '.data.scaffold')"
  slug="$(echo "$out" | jq -r '.data.slug')"
  # simulate the agent filling it: remove FILL comments + placeholders, add content
  cat > "$f" <<EOF
# As-Is Narrative — $slug
<!-- CDD-ASIS-MARKER: pending -->
## Summary
The codebase is a mid-size dotnet+node app with moderate duplication.
## What Changed
- Baseline snapshot established.
## Risks & Recommendations
- Duplication at 26% is high; recommend a clone-reduction pass.
EOF
  run "$CDD_BIN" asis finalize "$slug" --json
  [ "$status" -eq 0 ]
  [ -f ".cdd/asis/synthesis_${slug}.md" ]
  [ -f "dist/asis/as-is.md" ]
  grep -q "clone-reduction" "dist/asis/as-is.md"
  grep -q "Functions: 3" "dist/asis/as-is.md"
  jq -e '.pipeline.phase == "watching"' .cdd/state/asis.json
}

@test "cdd asis finalize refuses a scaffold that still has FILL placeholders" {
  export ASIS_ENGINE_CMD="$CDD_ROOT/tests/bats/fixtures/asis/fake-engine.sh"
  bash -c "source '$CDD_ROOT/lib/core/shared.sh'; export CDD_ROOT='$CDD_ROOT'; source '$CDD_ROOT/lib/core/asis_state.sh'; asis_seed_defaults '$PWD'"
  "$CDD_BIN" asis scan >/dev/null; "$CDD_BIN" asis drift >/dev/null
  out="$("$CDD_BIN" asis synthesize --json)"; slug="$(echo "$out" | jq -r '.data.slug')"
  run "$CDD_BIN" asis finalize "$slug" --json
  [ "$status" -ne 0 ]
  echo "$output" | jq -e '.error.category == "validation"'
}
```

- [ ] **Step 3: Run, see fail.**

Run: `bats tests/bats/40_asis.bats -f "finalize"`
Expected: FAIL — not implemented.

- [ ] **Step 4: Implement `_asis_finalize`** (replace stub):

```bash
_asis_finalize() {
  local slug="" json_out=0
  while [[ $# -gt 0 ]]; do case "$1" in --json) json_out=1; shift ;; *) [[ -z "$slug" ]] && slug="$1"; shift ;; esac; done
  local root; root="$(_asis_require_init)"
  local pending="$root/.cdd/asis/_pending/synthesis_${slug}.prompt.md"
  if [[ ! -f "$pending" ]]; then
    if [[ $json_out -eq 1 ]]; then emit_error not_found "no pending scaffold for slug: $slug" || true
    else log_error "no pending scaffold for slug: $slug"; fi
    exit 1
  fi

  # Readiness gate: no FILL comments and no leftover placeholder bullets.
  if grep -q "<!-- FILL" "$pending" || grep -q "_(replace this placeholder)_" "$pending"; then
    asis_set_phase "$root" "synthesizing"
    if [[ $json_out -eq 1 ]]; then
      emit_error validation "scaffold still has unfilled FILL/placeholder sections" \
        --suggestion "Replace every <!-- FILL --> block and placeholder bullet, then save again" || true
    else log_error "scaffold not ready — fill remaining sections"; fi
    exit 1
  fi

  asis_set_phase "$root" "rendering"
  local final="$root/.cdd/asis/synthesis_${slug}.md"
  mv "$pending" "$final"

  local json; json="$(asis_load "$root")"
  asis_emit_doc "$json" "$root/dist/asis/as-is.md" "$final"

  # record narrative pointer + advance to steady state
  json="$(asis_load "$root")"
  json="$(echo "$json" | jq --arg n "$final" '.last_scan.narrative = $n')"
  asis_save "$root" "$json"
  asis_set_phase "$root" "watching"

  if [[ $json_out -eq 1 ]]; then
    emit_success "$(jq -nc --arg n "$final" --arg d "$root/dist/asis/as-is.md" '{finalized:true, narrative:$n, doc:$d}')"
  else
    log_success "living doc rendered → dist/asis/as-is.md"
  fi
}
```

- [ ] **Step 5: Run, see pass.**

Run: `bats tests/bats/40_asis.bats -f "finalize"`
Expected: both PASS.

- [ ] **Step 6: Extend the PostToolUse hook.** In `.claude-plugin/hooks/post-tool-use.sh`, add a new `case "$FILE"` branch **before** the final `*)` catch-all (after the journey branch ~line 77):

```bash
  *"/.cdd/asis/_pending/synthesis_"*.prompt.md)
    fname="$(basename "$FILE")"
    slug="${fname#synthesis_}"
    slug="${slug%.prompt.md}"
    if [[ -n "$slug" ]] && command -v cdd >/dev/null 2>&1; then
      out="$(cd "$project_root" && cdd asis finalize "$slug" --json 2>&1 || true)"
      st="$(jq -r '.status // "unknown"' <<< "$out" 2>/dev/null || echo unknown)"
      if [[ "$st" = "success" ]]; then
        echo "[CDD asis] ✓ narrative '$slug' finalized — dist/asis/as-is.md updated"
      else
        msg="$(jq -r '.error.message // "scaffold not yet ready"' <<< "$out" 2>/dev/null || echo "scaffold not yet ready")"
        echo "[CDD asis] scaffold '$slug' awaiting fill — $msg"
      fi
    fi
    ;;
```

- [ ] **Step 7: Add a hook test** (append to `40_asis.bats`):

```bash
@test "PostToolUse finalizes a filled asis scaffold" {
  export ASIS_ENGINE_CMD="$CDD_ROOT/tests/bats/fixtures/asis/fake-engine.sh"
  bash -c "source '$CDD_ROOT/lib/core/shared.sh'; export CDD_ROOT='$CDD_ROOT'; source '$CDD_ROOT/lib/core/asis_state.sh'; asis_seed_defaults '$PWD'"
  "$CDD_BIN" asis scan >/dev/null; "$CDD_BIN" asis drift >/dev/null
  out="$("$CDD_BIN" asis synthesize --json)"; f="$(echo "$out" | jq -r '.data.scaffold')"; slug="$(echo "$out" | jq -r '.data.slug')"
  cat > "$f" <<EOF
# As-Is Narrative — $slug
## Summary
Filled.
## What Changed
- ok
## Risks & Recommendations
- ok
EOF
  # cdd must be on PATH for the hook; skip if not installed
  command -v cdd >/dev/null 2>&1 || skip "cdd not on PATH"
  echo "{\"tool_name\":\"Edit\",\"cwd\":\"$PWD\",\"tool_input\":{\"file_path\":\"$f\"}}" \
    | "$CDD_ROOT/.claude-plugin/hooks/post-tool-use.sh"
  [ -f "dist/asis/as-is.md" ]
}
```

- [ ] **Step 8: Run, see pass.**

Run: `bats tests/bats/40_asis.bats -f "PostToolUse"`
Expected: PASS (or skip if `cdd` not linked).

- [ ] **Step 9: Commit.**

```bash
git add lib/core/asis_emitter.sh lib/commands/asis.sh .claude-plugin/hooks/post-tool-use.sh tests/bats/40_asis.bats
git commit -m "feat(asis): finalize + emitter (living doc + drift md) + PostToolUse auto-finalize"
```

---

## Task 7: `asis discover` — map command surface from reality

**Files:**
- Modify: `lib/commands/asis.sh` (replace `_asis_discover`)
- Test: `tests/bats/40_asis.bats` (append)

- [ ] **Step 1: Write failing test** (append):

```bash
@test "cdd asis discover chains suggest|seed to populate the catalog" {
  cat > Justfile <<'EOF'
build:
	echo build
test:
	echo test
EOF
  bash -c "source '$CDD_ROOT/lib/core/shared.sh'; export CDD_ROOT='$CDD_ROOT'; source '$CDD_ROOT/lib/core/asis_state.sh'; asis_seed_defaults '$PWD'"
  run "$CDD_BIN" asis discover --json
  [ "$status" -eq 0 ]
  echo "$output" | jq -e '.data.discovered >= 1'
  [ -f ".cdd/domains/build.cli.yaml" ] || [ -f ".cdd/domains/test.cli.yaml" ]
}
```

- [ ] **Step 2: Run, see fail.**

Run: `bats tests/bats/40_asis.bats -f "discover"`
Expected: FAIL — not implemented.

- [ ] **Step 3: Implement `_asis_discover`** (replace stub):

```bash
_asis_discover() {
  local json_out=0
  while [[ $# -gt 0 ]]; do case "$1" in --json) json_out=1; shift ;; *) shift ;; esac; done
  local root; root="$(_asis_require_init)"
  asis_set_phase "$root" "discovering"

  local before after discovered
  before="$( "$CDD_BIN" catalog --json 2>/dev/null | jq '.data.commands | length' 2>/dev/null || echo 0 )"
  # Chain the existing discovery pipeline against the project root.
  ( cd "$root" && "$CDD_BIN" suggest --scan . --json 2>/dev/null | "$CDD_BIN" seed --stdin >/dev/null 2>&1 ) || true
  after="$( "$CDD_BIN" catalog --json 2>/dev/null | jq '.data.commands | length' 2>/dev/null || echo 0 )"
  discovered=$(( after - before )); [[ $discovered -lt 0 ]] && discovered=0

  asis_set_phase "$root" "drifting"
  if [[ $json_out -eq 1 ]]; then
    emit_success "$(jq -nc --argjson d "$discovered" --argjson t "$after" '{discovered:$d, total:$t}')"
  else
    log_success "discovered $discovered new command(s); catalog now has $after"
  fi
}
```

- [ ] **Step 4: Run, see pass.**

Run: `bats tests/bats/40_asis.bats -f "discover"`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib/commands/asis.sh tests/bats/40_asis.bats
git commit -m "feat(asis): discover — chain cdd suggest|seed to map surface from scanned reality"
```

---

## Task 8: State machine — `asis tick` + `asis init`

**Files:**
- Modify: `lib/commands/asis.sh` (replace `_asis_tick`, `_asis_init`; add `_asis_provision`, `_asis_install_hook`)
- Test: `tests/bats/40_asis.bats` (append)

- [ ] **Step 1: Write failing tests** (append):

```bash
@test "cdd asis init seeds state, installs pre-push hook, runs first cycle" {
  git init -q .
  export ASIS_ENGINE_CMD="$CDD_ROOT/tests/bats/fixtures/asis/fake-engine.sh"
  run "$CDD_BIN" asis init --json
  [ "$status" -eq 0 ]
  [ -f ".cdd/state/asis.json" ]
  [ -f ".git/hooks/pre-push" ]
  # first cycle produced a scan + a pending scaffold for the agent
  jq -e '.snapshots | length >= 1' .cdd/state/asis.json
  echo "$output" | jq -e '.data.checkpoint == "fill-narrative"'
}

@test "cdd asis tick advances scanning->discovering->drifting->synthesizing" {
  git init -q .
  export ASIS_ENGINE_CMD="$CDD_ROOT/tests/bats/fixtures/asis/fake-engine.sh"
  bash -c "source '$CDD_ROOT/lib/core/shared.sh'; export CDD_ROOT='$CDD_ROOT'; source '$CDD_ROOT/lib/core/asis_state.sh'; asis_seed_defaults '$PWD'"
  run "$CDD_BIN" asis tick --json
  [ "$status" -eq 0 ]
  # one tick runs a full cycle ending at a synthesize checkpoint
  [ -f ".cdd/state/asis.json" ]
  ls .cdd/asis/_pending/synthesis_*.prompt.md >/dev/null 2>&1
}
```

- [ ] **Step 2: Run, see fail.**

Run: `bats tests/bats/40_asis.bats -f "init"`
Expected: FAIL — not implemented.

- [ ] **Step 3: Implement provisioning + hook install + init + tick** (replace stubs):

```bash
_asis_provision() {
  # Idempotent: ensure docker image exists (skipped under fake engine / no docker).
  [[ -n "${ASIS_ENGINE_CMD:-}" ]] && return 0
  command -v docker >/dev/null 2>&1 || return 0   # doctor surfaces missing docker
  docker info >/dev/null 2>&1 || return 0
  if ! docker image inspect cdd-asis:latest >/dev/null 2>&1; then
    log_info "building asis toolbelt image (one-time, ~5 min)…"
    docker build -t cdd-asis:latest "$CDD_ROOT/lib/engines/asis-docker" >&2 || true
  fi
}

_asis_install_hook() {
  local root="$1"
  [[ -d "$root/.git" ]] || return 0
  mkdir -p "$root/.git/hooks"
  local hook="$root/.git/hooks/pre-push"
  cat > "$hook" <<'HOOK'
#!/usr/bin/env bash
# CDD asis pre-push hook — refresh as-is docs without blocking the push.
# Fail-open: never break git.
command -v cdd >/dev/null 2>&1 || exit 0
( cdd asis tick --hook >/dev/null 2>&1 & ) || true
exit 0
HOOK
  chmod +x "$hook"
}

# Run one full deterministic cycle, stopping at the synthesize checkpoint.
_asis_run_cycle() {
  local root="$1"
  ( cd "$root" && "$CDD_BIN" asis scan >/dev/null 2>&1 ) || return 1
  ( cd "$root" && "$CDD_BIN" asis discover >/dev/null 2>&1 ) || true
  ( cd "$root" && "$CDD_BIN" asis drift >/dev/null 2>&1 ) || true
  ( cd "$root" && "$CDD_BIN" asis synthesize --json 2>/dev/null )
}

_asis_init() {
  local json_out=0
  while [[ $# -gt 0 ]]; do case "$1" in --json) json_out=1; shift ;; *) shift ;; esac; done
  local root
  if ! root="$(cdd_root_project 2>/dev/null)"; then
    log_error "no .cdd/ found — run 'cdd init' first"; exit 1
  fi
  asis_seed_defaults "$root"
  asis_set_phase "$root" "provisioning"
  _asis_provision
  _asis_install_hook "$root"

  local cyc; cyc="$(_asis_run_cycle "$root")"
  if [[ $json_out -eq 1 ]]; then
    # surface the synthesize checkpoint so the agent fills the narrative now
    emit_success "$(echo "${cyc:-{}}" | jq '(.data // {}) | . + {initialized:true, hook:".git/hooks/pre-push"}')"
  else
    log_success "asis initialized — first scan done, narrative scaffold awaiting fill"
    log_info "pre-push hook installed; future pushes refresh docs automatically"
  fi
}

_asis_tick() {
  local hook=0 json_out=0
  while [[ $# -gt 0 ]]; do case "$1" in --hook) hook=1; shift ;; --json) json_out=1; shift ;; *) shift ;; esac; done
  local root; root="$(_asis_require_init)"
  local cyc; cyc="$(_asis_run_cycle "$root")"
  if [[ $json_out -eq 1 ]]; then
    emit_success "$(echo "${cyc:-{}}" | jq '(.data // {}) | . + {ticked:true}')"
  else
    log_success "asis tick complete — narrative scaffold awaiting fill"
  fi
}
```

Note: `emit_success`'s data must be valid JSON; `_asis_run_cycle` returns the synthesize envelope, so `.data` is extracted. If the cycle failed (empty), it falls back to `{}`.

- [ ] **Step 4: Run, see pass.**

Run: `bats tests/bats/40_asis.bats -f "init"` then `-f "tick"`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib/commands/asis.sh tests/bats/40_asis.bats
git commit -m "feat(asis): autopilot-style init + tick (provision, hook install, one-trigger first cycle)"
```

---

## Task 9: SessionStart surfacing + pre-push hook template asset

**Files:**
- Modify: `.claude-plugin/hooks/session-start.sh` (surface pending asis narrative)
- Create: `.claude-plugin/hooks/git/pre-push` (canonical hook asset, mirrors what `init` installs)
- Test: `tests/bats/40_asis.bats` (append)

- [ ] **Step 1: Create `.claude-plugin/hooks/git/pre-push`** (the shippable asset; `_asis_install_hook` writes the same body, this is the reference copy + lets advanced users symlink it):

```bash
#!/usr/bin/env bash
# CDD asis pre-push hook — refresh as-is docs without blocking the push.
command -v cdd >/dev/null 2>&1 || exit 0
( cdd asis tick --hook >/dev/null 2>&1 & ) || true
exit 0
```
Then `chmod +x .claude-plugin/hooks/git/pre-push`.

- [ ] **Step 2: Write failing test** (append):

```bash
@test "SessionStart surfaces a pending asis narrative" {
  git init -q .
  export ASIS_ENGINE_CMD="$CDD_ROOT/tests/bats/fixtures/asis/fake-engine.sh"
  bash -c "source '$CDD_ROOT/lib/core/shared.sh'; export CDD_ROOT='$CDD_ROOT'; source '$CDD_ROOT/lib/core/asis_state.sh'; asis_seed_defaults '$PWD'"
  "$CDD_BIN" asis scan >/dev/null; "$CDD_BIN" asis drift >/dev/null; "$CDD_BIN" asis synthesize >/dev/null
  out="$(echo "{\"cwd\":\"$PWD\"}" | "$CDD_ROOT/.claude-plugin/hooks/session-start.sh")"
  [[ "$out" == *"as-is narrative"* ]] || [[ "$out" == *"asis"* ]]
}
```

- [ ] **Step 3: Run, see fail.**

Run: `bats tests/bats/40_asis.bats -f "SessionStart"`
Expected: FAIL — no asis line yet.

- [ ] **Step 4: Extend `.claude-plugin/hooks/session-start.sh`.** Inside the `if project_root=...` block, before the closing `cat <<EOF ... EOF`, add a pending-scaffold probe and include it in the output. Insert after the `cmd_lines` loop (~line 47):

```bash
  asis_pending=""
  if ls "$project_root"/.cdd/asis/_pending/synthesis_*.prompt.md >/dev/null 2>&1; then
    asis_pending="⚠ as-is narrative pending — a synthesis scaffold in .cdd/asis/_pending/ awaits filling (run the FILL sections; it auto-finalizes to dist/asis/as-is.md)."
  fi
```

Then add a line inside the heredoc body (before `Useful:`):

```
${asis_pending}
```

- [ ] **Step 5: Run, see pass.**

Run: `bats tests/bats/40_asis.bats -f "SessionStart"`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add .claude-plugin/hooks/session-start.sh .claude-plugin/hooks/git/pre-push tests/bats/40_asis.bats
git commit -m "feat(asis): SessionStart surfaces pending narrative; ship canonical pre-push asset"
```

---

## Task 10: status / doctor / regenerate / export / import / reset + docs

**Files:**
- Modify: `lib/commands/asis.sh` (replace remaining stubs)
- Create: `skills/cdd/references/asis.md`
- Modify: `README.md`, `ARCHITECTURE.md`
- Modify: `install.sh` (Windows/Git-Bash `dep_hint` branch)
- Test: `tests/bats/40_asis.bats` (unskip the Task-2 status test; add doctor/reset)

- [ ] **Step 1: Implement the remaining verbs** (replace stubs). These mirror `secrets`:

```bash
_asis_status() {
  local json_out=0
  while [[ $# -gt 0 ]]; do case "$1" in --json) json_out=1; shift ;; *) shift ;; esac; done
  local root
  if ! root="$(cdd_root_project 2>/dev/null)"; then log_error "no .cdd/ found — run 'cdd init' first"; exit 1; fi
  local json
  if [[ -f "$root/$ASIS_STATE_FILE" ]]; then json="$(asis_load "$root")"; else json="$(cat "$ASIS_DEFAULT_TMPL")"; fi
  local phase; phase="$(echo "$json" | jq -r '.pipeline.phase // "idle"')"
  if [[ $json_out -eq 1 ]]; then
    emit_success "$(echo "$json" | jq '{phase: .pipeline.phase, last_scan: .last_scan, summary: .summary}')"
  else
    printf '%basis status%b\n' "$CDD_BOLD" "$CDD_RESET"
    printf '  phase: %s\n' "$phase"
    echo "$json" | jq -r '"  functions: \(.summary.functions)  dup%: \(.summary.clones.dup_pct)  debt: \(.summary.debt_markers)  commits: \(.summary.commits)"'
  fi
}

_asis_doctor() {
  local json_out=0
  while [[ $# -gt 0 ]]; do case "$1" in --json) json_out=1; shift ;; *) shift ;; esac; done
  local root; root="$(_asis_require_init)"
  local json; json="$(asis_load "$root")"
  local issues=()
  asis_validate "$json" >/dev/null 2>&1 || issues+=("state file invalid")
  if [[ -z "${ASIS_ENGINE_CMD:-}" ]]; then
    command -v docker >/dev/null 2>&1 || issues+=("docker not installed (asis scan unavailable)")
    if command -v docker >/dev/null 2>&1 && ! docker info >/dev/null 2>&1; then issues+=("docker daemon not running"); fi
  fi
  [[ "$(echo "$json" | jq -r '.last_scan // "null"')" == "null" ]] && issues+=("no scan recorded yet — run 'cdd asis scan'")
  if [[ ${#issues[@]} -eq 0 ]]; then
    if [[ $json_out -eq 1 ]]; then emit_success "$(jq -nc '{healthy:true}')"; else log_success "asis doctor: all checks passed"; fi
  else
    if [[ $json_out -eq 1 ]]; then
      emit_error validation "asis doctor found ${#issues[@]} issue(s): $(printf '%s; ' "${issues[@]}")" || true
    else
      log_error "asis doctor: ${#issues[@]} issue(s):"; for i in "${issues[@]}"; do log_error "  $i"; done
    fi
    exit 1
  fi
}

_asis_regenerate() {
  local json_out=0
  while [[ $# -gt 0 ]]; do case "$1" in --json) json_out=1; shift ;; *) shift ;; esac; done
  local root; root="$(_asis_require_init)"
  local json; json="$(asis_load "$root")"
  local narrative; narrative="$(echo "$json" | jq -r '.last_scan.narrative // empty')"
  asis_emit_doc "$json" "$root/dist/asis/as-is.md" "$narrative"
  if [[ $json_out -eq 1 ]]; then emit_success "$(jq -nc '{regenerated:true, doc:"dist/asis/as-is.md"}')"
  else log_success "regenerated dist/asis/as-is.md"; fi
}

_asis_export() {
  local file="" json_out=0
  while [[ $# -gt 0 ]]; do case "$1" in --json) json_out=1; shift ;; --file) file="$2"; shift 2 ;; --file=*) file="${1#--file=}"; shift ;; *) shift ;; esac; done
  local root; root="$(_asis_require_init)"; local json; json="$(asis_load "$root")"
  if [[ -n "$file" ]]; then printf '%s\n' "$json" > "$file"
    if [[ $json_out -eq 1 ]]; then emit_success "$(jq -nc --arg f "$file" '{exported:true, file:$f}')"; else log_success "exported to $file"; fi
  else
    if [[ $json_out -eq 1 ]]; then emit_success "$json"; else echo "$json"; fi
  fi
}

_asis_import() {
  local file="" json_out=0
  while [[ $# -gt 0 ]]; do case "$1" in --json) json_out=1; shift ;; *) [[ -z "$file" ]] && file="$1"; shift ;; esac; done
  [[ -z "$file" ]] && { log_error "asis import: file path required"; exit 64; }
  [[ -f "$file" ]] || { if [[ $json_out -eq 1 ]]; then emit_error not_found "file not found: $file" || true; else log_error "file not found: $file"; fi; exit 1; }
  jq empty "$file" 2>/dev/null || { if [[ $json_out -eq 1 ]]; then emit_error parse "invalid JSON: $file" || true; else log_error "invalid JSON: $file"; fi; exit 1; }
  local root
  if ! root="$(cdd_root_project 2>/dev/null)"; then log_error "no .cdd/ found — run 'cdd init' first"; exit 1; fi
  asis_save "$root" "$(cat "$file")"
  if [[ $json_out -eq 1 ]]; then emit_success "$(jq -nc --arg f "$file" '{imported:true, file:$f}')"; else log_success "imported from $file"; fi
}

_asis_reset() {
  local json_out=0
  while [[ $# -gt 0 ]]; do case "$1" in --json) json_out=1; shift ;; *) shift ;; esac; done
  local root
  if ! root="$(cdd_root_project 2>/dev/null)"; then log_error "no .cdd/ found — run 'cdd init' first"; exit 1; fi
  asis_seed_defaults "$root"
  if [[ $json_out -eq 1 ]]; then emit_success "$(jq -nc '{reset:true}')"; else log_success "asis state reset"; fi
}
```

- [ ] **Step 2: Unskip the Task-2 status test** (remove the `skip` line) and add:

```bash
@test "cdd asis doctor flags missing scan on a fresh state" {
  bash -c "source '$CDD_ROOT/lib/core/shared.sh'; export CDD_ROOT='$CDD_ROOT'; source '$CDD_ROOT/lib/core/asis_state.sh'; asis_seed_defaults '$PWD'"
  export ASIS_ENGINE_CMD="x"   # bypass docker checks
  run "$CDD_BIN" asis doctor --json
  [ "$status" -ne 0 ]
  echo "$output" | jq -e '.error.message | test("no scan recorded")'
}

@test "cdd asis reset restores empty state" {
  export ASIS_ENGINE_CMD="$CDD_ROOT/tests/bats/fixtures/asis/fake-engine.sh"
  bash -c "source '$CDD_ROOT/lib/core/shared.sh'; export CDD_ROOT='$CDD_ROOT'; source '$CDD_ROOT/lib/core/asis_state.sh'; asis_seed_defaults '$PWD'"
  "$CDD_BIN" asis scan >/dev/null
  "$CDD_BIN" asis reset >/dev/null
  jq -e '.snapshots | length == 0' .cdd/state/asis.json
}
```

- [ ] **Step 3: Run the full asis suite, see pass.**

Run: `bats tests/bats/40_asis.bats`
Expected: all PASS.

- [ ] **Step 4: Add `install.sh` Windows/Git-Bash branch.** In `dep_hint()`, add a case before the `*)` default:

```bash
    MINGW*|MSYS*|CYGWIN*)
      case "$cmd" in
        jq)      echo "winget install jqlang.jq   (or: choco install jq)" ;;
        yq)      echo "winget install MikeFarah.yq (or: choco install yq)" ;;
        python3) echo "winget install Python.Python.3.13" ;;
        git)     echo "winget install Git.Git" ;;
        docker)  echo "install Docker Desktop: https://www.docker.com/products/docker-desktop/" ;;
        *)       echo "install '$cmd' (Windows)" ;;
      esac
      ;;
```

- [ ] **Step 5: Write `skills/cdd/references/asis.md`** — a concise reference (≤120 lines): purpose, the one-trigger flow (`cdd asis init`), verb table, state shape, the pre-push loop, the scaffold→finalize narrative mechanism, Docker requirement, and the `ASIS_ENGINE_CMD` test seam. Follow the structure of an existing `skills/cdd/references/secrets.md`.

- [ ] **Step 6: Update `README.md` and `ARCHITECTURE.md`.**
  - README "Native Subsystems": add a row — `asis | Living as-is documentation — Docker structural scan + drift + agent-written narrative, refreshed on git push`.
  - ARCHITECTURE: add `asis` to the Layer-4 list and a short "two-speed model" note (fast heuristic `suggest`/`verify` loop vs. deep deterministic `asis` scan on push).

- [ ] **Step 7: Run the entire suite to confirm no regressions.**

Run: `bats tests/bats/`
Expected: all green (existing + new `40_asis.bats`).

- [ ] **Step 8: Commit.**

```bash
git add lib/commands/asis.sh install.sh skills/cdd/references/asis.md README.md ARCHITECTURE.md tests/bats/40_asis.bats
git commit -m "feat(asis): status/doctor/regenerate/export/import/reset + docs + Windows dep hints"
```

---

## Self-Review

**1. Spec coverage:**
- §4.1 native subsystem (state+emitter+verbs+default+engine) → Tasks 1,2,3,6.
- §4.2 autopilot state machine (phases, tick, init) → Task 8 (phases set throughout Tasks 3–6).
- §4.3 canonical state shape → Task 2.
- §4.4 drift delta → Task 4.
- §4.5 prompt-scaffold narrative → Tasks 5,6.
- §4.6 living doc output + docs subsystem → Task 6 (emitter) + Task 10 (regenerate, README). _Note: deep `docs` subsystem page registration is documented in `asis.md`/README rather than code-coupled, matching the spec's "register/document the integration point."_
- §5 data flow (scan→discover→drift→synthesize→finalize→render) → Tasks 3,7,4,5,6,8.
- §6 self-provisioning (`init`, image build, hook install, Windows hints) → Tasks 8,10.
- §7 error handling (envelope categories, fail-open hooks, docker config errors) → Tasks 3,6,8,9.
- §8 testing (mocked engine via `ASIS_ENGINE_CMD`, opt-in IT) → Task 3 fixtures used throughout. _Add the opt-in real-Docker integration test (`ASIS_DOCKER_IT=1`) as a follow-up; the fake-engine seam covers CI._
- §9 file manifest → all created/modified files map to tasks.

**2. Placeholder scan:** No "TBD"/"add error handling" placeholders; every code step has complete code. The Task-2 `status` test is explicitly created-then-unskipped in Task 10 (intentional, not a gap).

**3. Type/name consistency:** `asis_run_engine`, `asis_record_scan`, `asis_set_phase`, `asis_emit_doc`, `asis_emit_drift_md`, `_asis_require_init`, `ASIS_ENGINE_CMD`, slug filenames (`synthesis_<slug>.prompt.md` → `synthesis_<slug>.md`, `drift-<slug>.{json,md}`), phase names, and `cdd-asis:latest` are used identically across tasks. Verbs in `cmd_asis` dispatch match every `_asis_<verb>` implementation.

**Two deferred (spec-sanctioned, not gaps):** the opt-in real-Docker integration test, and deep `docs`-subsystem page coupling (documented integration point per §4.6). Both are noted above.
