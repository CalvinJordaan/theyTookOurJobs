---
name: qa-test-runner
description: Executes QA test cases against a live URL using the Playwright browser and generates a colour-coded pass/fail execution report. Use this skill whenever a QA tester wants to run, execute, or validate test cases against the app — even when phrased casually. Trigger on: "run the test cases", "execute tests", "test the app", "run QA tests", "test against URL", "execute test cases", "run tests on the app", "validate the test cases", "check what's passing", "which tests fail", "test against http://...", or any request to see pass/fail results. Automatically runs /qa-test-cases first if no test case report exists yet. Always use this skill when the user wants live test results from a running application.
---

## What this skill produces

A single self-contained HTML execution report (`qa-execution-report-YYYY-MM-DD.html`) showing each test case as PASS, FAIL, or SKIP, with failure notes, a summary, and filter/search support.

---

## Step 1 — Check for existing test cases

Search the **current working directory** for a file matching `qa-test-report-*.html`.

- **Found**: continue to Step 2.
- **Not found**: tell the user — "No test case report found. Running /qa-test-cases first to generate your test cases." Then invoke the `/qa-test-cases` skill before continuing. Once that skill finishes and the HTML file exists, continue to Step 2.

---

## Step 2 — Ask the user for the target URL

Ask exactly this:

> "What is the URL you want to test against? (e.g. http://localhost:3000)"

Wait for their response. Save it as `TARGET_URL`. Do not proceed until you have a URL.

---

## Step 3 — Extract test cases from the report

Open the `qa-test-report-*.html` file and extract the JSON array assigned to `const TC = ...` inside the `<script>` block. Parse this into a list of test case objects. Each has:
- `id`, `title`, `category`, `priority`, `preconditions`, `steps` (array of `{action, expected}`), `expectedResult`

---

## Step 4 — Categorise test cases by execution mode

Split the test cases into two groups before executing anything:

**Browser-executable** (run with Playwright): `Functional`, `UI/UX`, `Security`, `Edge Cases`, and any `API-REST` test that can be performed via the browser's network layer or a visible form submission.

**Manual/Skip** (cannot be run via browser): `Database` tests (require a SQL client), `API-MCP` tests (require an MCP client), and any test whose preconditions require direct DB seeding or server-side state that cannot be reached from the URL alone. Mark these as `SKIP` with the note: "Requires direct DB/API access — execute manually."

---

## Step 5 — Execute browser tests with Playwright

For each **browser-executable** test case, work through it step by step:

1. **Navigate** to `TARGET_URL` (or the specific sub-path implied by the preconditions).
2. **Set up preconditions**: if the test requires a logged-in user, fill the login form and submit. If it requires specific data to exist, note it — if achievable via the UI do it; otherwise mark the test SKIP with reason "Precondition requires seeded data".
3. **Execute steps** in order: interpret each `action` literally and use the appropriate Playwright tool:
   - "Click [element]" → `browser_click`
   - "Type / Enter [value] in [field]" → `browser_type` or `browser_fill_form`
   - "Submit / Press Enter" → `browser_press_key` or `browser_click` on the submit button
   - "Navigate to [path]" → `browser_navigate`
   - "Verify / Check [condition]" → `browser_snapshot` then inspect the accessibility tree or DOM
   - "Select [option]" → `browser_select_option`
4. **Evaluate the expected result**: after the final step, take a `browser_snapshot` and check whether the `expectedResult` criterion is satisfied.
   - If the page/state matches the expected result → **PASS**
   - If it does not match, or an error/unexpected state is observed → **FAIL** — record a short, specific failure note (what you expected vs. what actually happened)
   - If you cannot complete setup or a step is ambiguous → **SKIP** — record the reason

**Efficiency tip**: group tests by the same precondition (e.g., same login state) and reuse the browser session rather than re-navigating from scratch for every test.

---

## Step 6 — Compile results

Build a results array. Each entry:

```json
{
  "id": "TC-001",
  "title": "...",
  "category": "...",
  "priority": "...",
  "status": "PASS",
  "failureNote": ""
}
```

`status` is one of: `PASS`, `FAIL`, `SKIP`.  
`failureNote` is empty for PASS, a brief description for FAIL, and the skip reason for SKIP.

---

## Step 7 — Build the HTML execution report

Write a **100% self-contained** file: `qa-execution-report-YYYY-MM-DD.html` (today's real date).

Escape all `</` as `<\/` inside any `<script>` block before embedding JSON.

Use this exact template — replace `PROJECT_NAME`, `EXEC_DATE`, `TARGET_URL_VALUE`, `TOTAL`, `PASSED`, `FAILED`, `SKIPPED`, and `__RESULTS_JSON__`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>QA Execution Report — PROJECT_NAME</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f0f2f5;color:#1d1d1f;padding:24px}
header{background:#fff;border-radius:14px;padding:28px 36px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,.07)}
h1{font-size:1.6rem;font-weight:700;color:#111;margin-bottom:4px}
.subtitle{color:#666;font-size:.9rem;margin-bottom:4px}
.url-line{color:#0071e3;font-size:.88rem;font-family:'SF Mono',Consolas,monospace;margin-bottom:16px}
.summary{display:flex;gap:12px;flex-wrap:wrap;margin-top:12px}
.sum-box{padding:10px 20px;border-radius:10px;font-weight:700;font-size:1rem;min-width:90px;text-align:center}
.sum-total{background:#e8e8ed;color:#333}
.sum-pass{background:#d4edda;color:#155724}
.sum-fail{background:#f8d7da;color:#721c24}
.sum-skip{background:#fff3cd;color:#856404}
.progress-bar{width:100%;height:10px;background:#eee;border-radius:6px;overflow:hidden;margin-top:16px}
.progress-inner{height:100%;border-radius:6px;transition:width .4s}
.controls{background:#fff;border-radius:14px;padding:14px 24px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,.07);display:flex;flex-wrap:wrap;gap:10px;align-items:center}
#search{flex:0 0 260px;padding:8px 14px;border:1.5px solid #d2d2d7;border-radius:8px;font-size:.9rem;outline:none}
#search:focus{border-color:#0071e3}
.filter-group{display:flex;gap:5px;flex-wrap:wrap;align-items:center}
.filter-label{font-size:.75rem;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.04em;margin-right:4px}
.filter{padding:5px 14px;border-radius:20px;border:1.5px solid #d2d2d7;background:#fff;cursor:pointer;font-size:.8rem;color:#555;transition:all .15s}
.filter:hover{border-color:#0071e3;color:#0071e3}
.filter.active{background:#0071e3;color:#fff;border-color:#0071e3}
.filter.f-pass.active{background:#28a745;border-color:#28a745}
.filter.f-fail.active{background:#dc3545;border-color:#dc3545}
.filter.f-skip.active{background:#ffc107;border-color:#ffc107;color:#333}
#result-count{font-size:.83rem;color:#888;margin-left:auto}
#tc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(600px,1fr));gap:14px}
.tc-card{background:#fff;border-radius:12px;padding:20px 24px;box-shadow:0 2px 8px rgba(0,0,0,.07);border-left:5px solid #ccc}
.tc-card.hidden{display:none!important}
.tc-card.s-PASS{border-left-color:#28a745}
.tc-card.s-FAIL{border-left-color:#dc3545;background:#fffafa}
.tc-card.s-SKIP{border-left-color:#ffc107}
.tc-top{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px}
.tc-id{font-family:'SF Mono',Consolas,monospace;font-size:.85rem;font-weight:700;color:#0071e3;background:#e8f0fe;padding:3px 10px;border-radius:6px;white-space:nowrap;flex-shrink:0}
.tc-title{font-size:.95rem;font-weight:600;color:#111;flex:1;line-height:1.4}
.badges{display:flex;gap:5px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end}
.badge{font-size:.72rem;padding:2px 10px;border-radius:10px;font-weight:700;white-space:nowrap}
.badge-cat{background:#f0f0f5;color:#555}
.badge-PASS{background:#d4edda;color:#155724}
.badge-FAIL{background:#f8d7da;color:#721c24}
.badge-SKIP{background:#fff3cd;color:#856404}
.failure-note{margin-top:10px;background:#fff0f0;border:1px solid #f5c2c7;border-radius:8px;padding:10px 14px;font-size:.85rem;color:#721c24;line-height:1.5}
.failure-note strong{display:block;margin-bottom:2px;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:#dc3545}
.skip-note{margin-top:10px;background:#fffbea;border:1px solid #ffc107;border-radius:8px;padding:10px 14px;font-size:.85rem;color:#856404;line-height:1.5}
.skip-note strong{display:block;margin-bottom:2px;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em}
#no-results{display:none;text-align:center;padding:60px 20px;color:#888;font-size:1rem}
@media print{
  body{background:#fff;padding:0}
  header{box-shadow:none;border:1px solid #ddd}
  .controls{display:none}
  #tc-grid{grid-template-columns:1fr}
  .tc-card{break-inside:avoid;box-shadow:none;border:1px solid #ccc;margin-bottom:10px}
  .tc-card.hidden{display:none!important}
  @page{margin:1.5cm}
}
</style>
</head>
<body>
<header>
  <h1>QA Execution Report &mdash; PROJECT_NAME</h1>
  <div class="subtitle">Executed: EXEC_DATE</div>
  <div class="url-line">&#127760; TARGET_URL_VALUE</div>
  <div class="summary">
    <div class="sum-box sum-total">Total<br>TOTAL</div>
    <div class="sum-box sum-pass">Passed<br>PASSED</div>
    <div class="sum-box sum-fail">Failed<br>FAILED</div>
    <div class="sum-box sum-skip">Skipped<br>SKIPPED</div>
  </div>
  <div class="progress-bar"><div class="progress-inner" id="prog"></div></div>
</header>
<div class="controls">
  <input type="text" id="search" placeholder="&#128269; Search test cases…" oninput="applyFilters()">
  <div class="filter-group">
    <span class="filter-label">Status</span>
    <button class="filter active" onclick="setStatus('all',this)">All</button>
    <button class="filter f-pass" onclick="setStatus('PASS',this)">Pass</button>
    <button class="filter f-fail" onclick="setStatus('FAIL',this)">Fail</button>
    <button class="filter f-skip" onclick="setStatus('SKIP',this)">Skip</button>
  </div>
  <div class="filter-group">
    <span class="filter-label">Category</span>
    <div id="cat-filters"></div>
  </div>
  <span id="result-count"></span>
</div>
<div id="tc-grid"></div>
<div id="no-results">No test cases match your filters.</div>
<script>
const RES = __RESULTS_JSON__;
const passed=RES.filter(r=>r.status==='PASS').length;
const total=RES.length;
const pct=total?Math.round(passed/total*100):0;
document.getElementById('prog').style.cssText=`width:${pct}%;background:${pct>=80?'#28a745':pct>=50?'#ffc107':'#dc3545'}`;
let activeSt='all',activeCat='all';
function buildCatFilters(){
  const cats=['all',...new Set(RES.map(r=>r.category))];
  document.getElementById('cat-filters').innerHTML=cats.map(c=>
    `<button class="filter${c==='all'?' active':''}" onclick="setCat('${c}',this)">${c==='all'?'All':c}</button>`
  ).join('');
}
function render(){
  document.getElementById('tc-grid').innerHTML=RES.map(r=>`
<div class="tc-card s-${r.status}" data-st="${r.status}" data-cat="${r.category}" data-search="${r.id.toLowerCase()} ${r.title.toLowerCase()} ${r.category.toLowerCase()} ${r.status.toLowerCase()}">
  <div class="tc-top">
    <span class="tc-id">${r.id}</span>
    <span class="tc-title">${r.title}</span>
    <div class="badges"><span class="badge badge-cat">${r.category}</span><span class="badge badge-${r.status}">${r.status}</span></div>
  </div>
  ${r.status==='FAIL'&&r.failureNote?`<div class="failure-note"><strong>Failure Detail</strong>${r.failureNote}</div>`:''}
  ${r.status==='SKIP'&&r.failureNote?`<div class="skip-note"><strong>Skip Reason</strong>${r.failureNote}</div>`:''}
</div>`).join('');
}
function setStatus(v,btn){activeSt=v;document.querySelectorAll('.filter.f-pass,.filter.f-fail,.filter.f-skip,[onclick^="setStatus(\'all"]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');applyFilters();}
function setCat(v,btn){activeCat=v;document.querySelectorAll('#cat-filters .filter').forEach(b=>b.classList.remove('active'));btn.classList.add('active');applyFilters();}
function applyFilters(){
  const q=document.getElementById('search').value.toLowerCase();
  let vis=0;
  document.querySelectorAll('.tc-card').forEach(card=>{
    const ok=(activeSt==='all'||card.dataset.st===activeSt)&&(activeCat==='all'||card.dataset.cat===activeCat)&&(!q||card.dataset.search.includes(q));
    card.classList.toggle('hidden',!ok);
    if(ok)vis++;
  });
  document.getElementById('result-count').textContent=`Showing ${vis} of ${RES.length}`;
  document.getElementById('no-results').style.display=vis===0?'block':'none';
}
buildCatFilters();render();applyFilters();
</script>
</body>
</html>
```

---

## Step 8 — Save and report to the user

1. Write the file as `qa-execution-report-YYYY-MM-DD.html` in the current working directory.
2. Close the browser when done.
3. Tell the user:
   - Exact file path
   - Total / Passed / Failed / Skipped counts and pass-rate %
   - A brief bullet list of any FAILED test case IDs and their failure note (so they get the key findings immediately without opening the file)
   - "Open by double-clicking the file — works in any browser, no internet needed."
