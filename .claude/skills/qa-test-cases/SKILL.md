---
name: qa-test-cases
description: Generates comprehensive QA test cases from project spec/planning documents and produces a self-contained filterable HTML report. Use this skill whenever a QA tester asks to generate test cases, create a test plan, write test cases from a spec, or produce a QA report for any project. Trigger even when the request is informal — "give me test cases for X", "what should I test for Y", "create a test report", "test the timer feature", "test the API", "check permissions". The skill reads the repo's spec and planning docs automatically, applies professional QA testing principles (equivalence partitioning, boundary value analysis, negative testing, happy path), and outputs a beautiful self-contained HTML file with filtering and print support that works immediately by double-clicking.
---

## What this skill produces

A single self-contained HTML file (`qa-test-report-YYYY-MM-DD.html`) containing all generated test cases — filterable by category and priority, searchable, and print-ready. No external dependencies.

---

## Step 1 — Discover spec documents

Search the repo for planning/spec material in this priority order. Read **all** that exist:

1. `docs/planning-artifacts/` or `docs/planning/` — look for PRDs, architecture, epics, addenda
2. `docs/` — any `.md` files
3. `README.md` in the project root
4. Any file matching `*prd*`, `*spec*`, `*architecture*`, `*api*` anywhere in the repo

From these documents, extract:
- Full feature list (FR-N references where present)
- REST API routes and MCP tools with their inputs/outputs
- Data model entities and field-level constraints (types, nullability, unique, decimal precision)
- User roles and the exact permission rules for each role
- Business rules and state machine transitions
- Error codes and validation constraints
- Acceptance criteria and non-functional requirements

---

## Step 2 — Generate test cases across 8 categories

Apply the right testing technique per category. Aim for depth over breadth — a few well-written test cases beat many vague ones.

### Category: Functional
One test case per major happy path. Apply **equivalence partitioning** — find the distinct input classes and test one from each (valid class AND invalid class). Each feature from the spec needs at minimum: one success case, one validation-failure case.

### Category: API-REST
Per REST endpoint:
- Valid payload → correct HTTP status + response body shape
- Missing required field → 422/400 with error body
- Wrong data type → 422/400
- Not authenticated → 401
- Authenticated but wrong role/resource → 403
- Resource does not exist → 404

### Category: API-MCP
Per MCP tool:
- Tool appears in `tools/list` discovery
- Valid inputs → correct structured response
- Invalid inputs → structured error (not an unhandled exception)
- Bearer token scopes the response to the correct user

### Category: Database
Validate data integrity after operations — these are run via DB client or SQL, not the UI:
- Created record has correct field values (especially Decimal precision, never float drift)
- Unique constraints block duplicate inserts
- Foreign key constraints prevent orphaned records
- Timestamps (`created_at`, `updated_at`) are set/updated correctly
- State-machine constraints enforced (e.g., only one `is_running=true` timer per user)

### Category: UI/UX
- Required fields blocked on submit when empty; error shown inline
- API error surfaces as user-readable message (not raw JSON)
- Form resets/clears after successful submit
- Loading indicator shown during async calls
- Keyboard navigation (Tab order, Enter to submit, Esc to cancel)

### Category: Security
- Unauthenticated request to any endpoint → 401
- User A's token cannot read/write User B's private data → 403
- SQL-injection attempt in text input is handled safely (no DB error, no data leak)
- XSS attempt (`<script>alert(1)</script>`) in notes/text fields is escaped at output

### Category: Permissions
Per role (Admin, Manager/PM, Member — use actual role names from spec):
- What Admin can do that Member cannot
- What PM can do on their own project vs. another project
- Member cannot read other users' private entries
- Archived/inactive resources blocked from creation but history accessible

### Category: Edge Cases
Apply **boundary value analysis** — test at the boundary, one below, one above:
- Hours field: 0.0, 0.25 (valid min), 23.99 (valid max), 24.0 (invalid), -1 (invalid)
- Empty string vs whitespace-only for required text fields
- Very long text in notes (e.g., 2000 characters)
- Concurrent duplicate operations (two timers started simultaneously for same user)
- Operations on archived/inactive entities
- Timer started, server restarts, timer stopped — elapsed must be correct (server-authoritative)
- Date edge: entry for Dec 31 / Jan 1 boundary

---

## Step 3 — Format each test case

Use this exact format for every test case:

**TC-NNN** — sequential numbers across all categories, starting TC-001.

Required fields:
- `id`: "TC-001" format
- `title`: verb + object, specific enough to be unique. **Good**: "Member cannot start timer on unassigned project". **Bad**: "Test timer permissions"
- `category`: one of the 8 above
- `priority`: High (core flow / security), Medium (validation / roles), Low (edge cases / UX polish)
- `preconditions`: list of required system state before the test starts (user logged in as X role, data seeded, etc.)
- `steps`: array of `{action, expected}` pairs — each step is ONE atomic action
- `expectedResult`: overall pass criterion, including any DB state to verify

**Never** combine multiple actions in one step. Split "click X and verify Y" into two steps.

---

## Step 4 — Build the HTML report

Write the complete file to `qa-test-report-YYYY-MM-DD.html` (use today's actual date). The file must be **100% self-contained** — no CDN links, no separate files.

**CRITICAL — escape HTML-breaking sequences before embedding JSON:** Any test case whose text contains `</` (e.g. XSS tests with `<script>alert(1)</script>`, SQL with `</table>`, etc.) will break the browser's HTML parser if embedded raw inside a `<script>` block. Before inserting the JSON array, replace every `</` with `<\/` throughout the entire JSON string. For example: `"<script>alert(1)</script>"` → `"<script>alert(1)<\/script>"`. Skip this and the browser will dump raw JSON/JS source as visible text on screen.

Use this complete HTML template, filling in `PROJECT_NAME`, `GENERATED_DATE`, and replacing `__TEST_CASES_JSON__` with the actual JSON array (with `</` escaped as `<\/`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>QA Test Cases — PROJECT_NAME</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f0f2f5;color:#1d1d1f;padding:24px}
header{background:#fff;border-radius:14px;padding:28px 36px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,.07)}
h1{font-size:1.6rem;font-weight:700;color:#111;margin-bottom:4px}
.subtitle{color:#666;font-size:.9rem;margin-bottom:16px}
.stats{display:flex;gap:10px;flex-wrap:wrap}
.stat{padding:5px 16px;border-radius:20px;font-size:.83rem;font-weight:600}
.stat-total{background:#e8e8ed;color:#333}
.stat-high{background:#ffe0e0;color:#c0392b}
.stat-medium{background:#fff3cd;color:#856404}
.stat-low{background:#d1f2d1;color:#155724}
.stat-functional{background:#e0f0ff;color:#0055aa}
.controls{background:#fff;border-radius:14px;padding:16px 24px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,.07);display:flex;flex-wrap:wrap;gap:10px;align-items:center}
#search{flex:0 0 260px;padding:8px 14px;border:1.5px solid #d2d2d7;border-radius:8px;font-size:.9rem;outline:none}
#search:focus{border-color:#0071e3}
.filter-group{display:flex;gap:5px;flex-wrap:wrap;align-items:center}
.filter-label{font-size:.75rem;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.04em;margin-right:4px}
.filter{padding:5px 14px;border-radius:20px;border:1.5px solid #d2d2d7;background:#fff;cursor:pointer;font-size:.8rem;color:#555;transition:all .15s}
.filter:hover{border-color:#0071e3;color:#0071e3}
.filter.active{background:#0071e3;color:#fff;border-color:#0071e3}
.filter.active.pri-high{background:#e74c3c;border-color:#e74c3c}
.filter.active.pri-medium{background:#e67e22;border-color:#e67e22}
.filter.active.pri-low{background:#27ae60;border-color:#27ae60}
#result-count{font-size:.83rem;color:#888;margin-left:auto}
#tc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(640px,1fr));gap:16px}
.tc-card{background:#fff;border-radius:12px;padding:24px 28px;box-shadow:0 2px 8px rgba(0,0,0,.07);border-left:5px solid #0071e3;transition:box-shadow .2s}
.tc-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.12)}
.tc-card.hidden{display:none!important}
.tc-card.pri-High{border-left-color:#e74c3c}
.tc-card.pri-Medium{border-left-color:#e67e22}
.tc-card.pri-Low{border-left-color:#27ae60}
.tc-top{display:flex;align-items:flex-start;gap:10px;margin-bottom:14px}
.tc-id{font-family:'SF Mono',Consolas,monospace;font-size:.85rem;font-weight:700;color:#0071e3;background:#e8f0fe;padding:3px 10px;border-radius:6px;white-space:nowrap;flex-shrink:0}
.tc-title{font-size:.98rem;font-weight:600;color:#111;flex:1;line-height:1.4}
.badges{display:flex;gap:5px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end}
.badge{font-size:.72rem;padding:2px 10px;border-radius:10px;font-weight:700;white-space:nowrap}
.badge-cat{background:#f0f0f5;color:#555}
.badge-High{background:#ffe0e0;color:#c0392b}
.badge-Medium{background:#fff3cd;color:#8a6800}
.badge-Low{background:#d1f2d1;color:#155724}
.section-lbl{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#999;margin:12px 0 5px}
.preconditions{list-style:none}
.preconditions li{padding:2px 0 2px 16px;position:relative;font-size:.86rem;color:#444;line-height:1.5}
.preconditions li::before{content:'▸';position:absolute;left:0;color:#0071e3;font-size:.7rem;top:4px}
table.steps{width:100%;border-collapse:collapse}
table.steps th{background:#f5f5f7;padding:7px 12px;text-align:left;font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#777;border-bottom:1.5px solid #e5e5e7}
table.steps td{padding:8px 12px;font-size:.86rem;color:#333;border-bottom:1px solid #f0f0f5;vertical-align:top;line-height:1.5}
table.steps tr:last-child td{border-bottom:none}
table.steps td:first-child{width:28px;color:#aaa;font-family:monospace;font-size:.78rem;font-weight:700}
table.steps td:nth-child(2){width:52%}
.expected-result{background:#f0faf6;border:1px solid #a8dcc4;border-radius:8px;padding:10px 16px;font-size:.86rem;color:#1a6651;line-height:1.5;margin-top:4px}
#no-results{display:none;text-align:center;padding:60px 20px;color:#888;font-size:1rem}
@media print{
  body{background:#fff;padding:0}
  header{box-shadow:none;border:1px solid #ddd}
  .controls{display:none}
  #tc-grid{grid-template-columns:1fr}
  .tc-card{break-inside:avoid;box-shadow:none;border:1px solid #ccc;border-left:4px solid #333;margin-bottom:12px}
  .tc-card.hidden{display:none!important}
  @page{margin:1.5cm}
}
</style>
</head>
<body>
<header>
  <h1>QA Test Cases &mdash; PROJECT_NAME</h1>
  <div class="subtitle">Generated GENERATED_DATE</div>
  <div class="stats" id="stats"></div>
</header>
<div class="controls">
  <input type="text" id="search" placeholder="&#128269; Search test cases…" oninput="applyFilters()">
  <div class="filter-group">
    <span class="filter-label">Category</span>
    <div id="cat-filters"></div>
  </div>
  <div class="filter-group">
    <span class="filter-label">Priority</span>
    <button class="filter active" onclick="setPriority('all',this)">All</button>
    <button class="filter pri-high" onclick="setPriority('High',this)">High</button>
    <button class="filter pri-medium" onclick="setPriority('Medium',this)">Medium</button>
    <button class="filter pri-low" onclick="setPriority('Low',this)">Low</button>
  </div>
  <span id="result-count"></span>
</div>
<div id="tc-grid"></div>
<div id="no-results">No test cases match your filters.</div>
<script>
const TC = __TEST_CASES_JSON__;
let activeCat='all', activePri='all';
function buildStats(){
  const el=document.getElementById('stats');
  const hi=TC.filter(t=>t.priority==='High').length;
  const me=TC.filter(t=>t.priority==='Medium').length;
  const lo=TC.filter(t=>t.priority==='Low').length;
  const cats=[...new Set(TC.map(t=>t.category))];
  el.innerHTML=`<span class="stat stat-total">Total: ${TC.length}</span><span class="stat stat-high">High: ${hi}</span><span class="stat stat-medium">Medium: ${me}</span><span class="stat stat-low">Low: ${lo}</span>`
    +cats.map(c=>`<span class="stat stat-functional">${c}: ${TC.filter(t=>t.category===c).length}</span>`).join('');
}
function buildCatFilters(){
  const cats=['all',...new Set(TC.map(t=>t.category))];
  document.getElementById('cat-filters').innerHTML=cats.map(c=>
    `<button class="filter${c==='all'?' active':''}" onclick="setCat('${c}',this)">${c==='all'?'All':c}</button>`
  ).join('');
}
function render(){
  const grid=document.getElementById('tc-grid');
  grid.innerHTML=TC.map(tc=>`
<div class="tc-card pri-${tc.priority}" data-cat="${tc.category}" data-pri="${tc.priority}" data-search="${tc.id.toLowerCase()} ${tc.title.toLowerCase()} ${tc.category.toLowerCase()}">
  <div class="tc-top">
    <span class="tc-id">${tc.id}</span>
    <span class="tc-title">${tc.title}</span>
    <div class="badges"><span class="badge badge-cat">${tc.category}</span><span class="badge badge-${tc.priority}">${tc.priority}</span></div>
  </div>
  <div class="section-lbl">Preconditions</div>
  <ul class="preconditions">${tc.preconditions.map(p=>`<li>${p}</li>`).join('')}</ul>
  <div class="section-lbl">Test Steps</div>
  <table class="steps"><thead><tr><th>#</th><th>Action</th><th>Expected Result</th></tr></thead>
  <tbody>${tc.steps.map((s,i)=>`<tr><td>${i+1}</td><td>${s.action}</td><td>${s.expected}</td></tr>`).join('')}</tbody></table>
  <div class="section-lbl">Overall Expected Result</div>
  <div class="expected-result">${tc.expectedResult}</div>
</div>`).join('');
}
function setCat(v,btn){activeCat=v;document.querySelectorAll('#cat-filters .filter').forEach(b=>b.classList.remove('active'));btn.classList.add('active');applyFilters();}
function setPriority(v,btn){activePri=v;document.querySelectorAll('.filter.pri-high,.filter.pri-medium,.filter.pri-low,[onclick^="setPriority(\'all"]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');applyFilters();}
function applyFilters(){
  const q=document.getElementById('search').value.toLowerCase();
  let vis=0;
  document.querySelectorAll('.tc-card').forEach(card=>{
    const ok=(activeCat==='all'||card.dataset.cat===activeCat)&&(activePri==='all'||card.dataset.pri===activePri)&&(!q||card.dataset.search.includes(q));
    card.classList.toggle('hidden',!ok);
    if(ok)vis++;
  });
  document.getElementById('result-count').textContent=`Showing ${vis} of ${TC.length}`;
  document.getElementById('no-results').style.display=vis===0?'block':'none';
}
buildStats();buildCatFilters();render();applyFilters();
</script>
</body>
</html>
```

---

## Step 5 — Save and report to the user

1. Write the file as `qa-test-report-YYYY-MM-DD.html` (use today's real date) in the current working directory.
2. Tell the user:
   - Exact file path
   - Total test case count
   - Breakdown by category and by priority
   - "Open by double-clicking the file — works in any browser, no internet needed."
