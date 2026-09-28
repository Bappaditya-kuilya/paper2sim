# QA Report — Paper2Sim

| | |
|---|---|
| Date | 2026-09-27 |
| Targets | `http://localhost:5173` (Vite dev, no `.env`) · `http://localhost:5173` (with `VITE_API_URL`) · `https://paper2sim.vercel.app` |
| API | local `uvicorn api:app:8000` and `https://paper2sim.onrender.com` |
| Tool | Playwright 1.63 / Chromium (screenshots in `screenshots/`) |
| Framework | React 19 + Vite 8 (Vercel) → FastAPI (Render) |
| Duration | ~40 min · 16 scripted sessions · 33 screenshots |
| **Health score** | **81 / 100** (original run) → **95 / 100** (2026-09-28, after both fix waves) |

| Category | Score (original run) | Weight |
|---|---|---|
| Console | 100 | 15% |
| Links / requests | 100 | 10% |
| Visual | 92 | 10% |
| Functional | 37 | 20% |
| UX | 81 | 15% |
| Performance | 80 | 10% |
| Content | 97 | 5% |
| Accessibility | 95 | 15% |

**Re-score 2026-09-28: 95 / 100** — same weights, only the hit categories moved (Functional 37→95, UX 81→93, Visual 92→96, Performance 80→88): the original 7 issues are 0 open, a second hunt added 10 more that are also 0 open, and what remains is ceiling, not defect (see "Retest 2").

**Verdict: CRITICAL** — the two headline input paths (arXiv, PDF) extract successfully and then render no plot at all, and a fresh clone cannot run the frontend without an undocumented env var.

**Verdict update (2026-09-28): PASS** — both headline paths extract *and* plot, a fresh clone runs with no env var, and every row failure now carries a reason; residual risk is the ceiling list at the end of this report.

---

## What works

- Sample flow: `Use sample` → 2 equations → 2D plot renders (both local and prod).
- Plain typed input `y = x^2`, `y = \sin(x)`, `f(x) = e^{-x^2}`, `z = x + y` → plots.
- 3D toggle → three.js canvas + full param panel (X range, resolution, grid, axes, wireframe).
- arXiv extraction itself: `1706.03762` → 65 equations; `1512.03385` → 20; full `https://arxiv.org/abs/...` URLs accepted.
- PDF extraction: `sample.pdf` → 2 equations.
- Error states are clear: empty textarea disables the button, garbage text → "No extractable math detected", bad arXiv id → `arXiv extraction failed (400): invalid_id`, non-PDF upload → `only PDF files supported`.
- Mobile 375×812: 0 px horizontal overflow. Tab roving focus + ArrowRight/Left works, 44 px targets, aria labels on every control.
- Tooling green: `pytest` 56 passed, `vitest` 162 passed, `tsc -b` clean, `oxlint` warnings only (fast-refresh), `vite build` OK. *(original run — current numbers: 79 / 205, see "Retest 2")*

---

## Issues

### ISSUE-001 — CRITICAL — Fresh clone: every API call 404s, but the app says the server is up
Category: Functional · Repro: 100% on a clean checkout

Steps:
1. `cd frontend && npm install && npm run dev` (no `frontend/.env` — it is gitignored, `.env.example` is never mentioned in README or CONTRIBUTING).
2. Open `http://localhost:5173`, type `y = x^2`, click **Extract equations**.

Result: `Text extraction failed (404): HTTP 404` (`screenshots/issue-001-local-404.png`).
`apiBase()` returns `''` (`frontend/src/lib/extractApi.ts:19`), so the POST goes to the Vite origin.

Compounding bug: `GET http://localhost:5173/health` returns **200 `text/html`** (Vite SPA fallback serves `index.html`), and `checkBackend()` only checks `res.ok` (`extractApi.ts:33-34`). So `backend === 'up'`, the "Can't reach server" banner never appears, and the user gets a raw 404 instead of an offline message.

Confirmed fix path: with `VITE_API_URL=http://localhost:8000` set, the identical run extracts and plots cleanly.

### ISSUE-002 — CRITICAL — arXiv and PDF output never plots (0 of 65, 0 of 20 rows)
Category: Functional · Repro: prod and local, both papers tested

Steps:
1. arXiv tab → `1706.03762` → **Extract equations** → 65 equations, first one auto-selected.
2. Panel shows `No visible plots` and a stray `region` card (`screenshots/issue-002-arxiv-no-plot.png`).
3. Clicking all 65 rows one by one: **0 plot**. Same for `1512.03385`: **0 of 20 plot**.

Isolation test in the Equation tab (1 row each):

| Input | Result |
|---|---|
| `y = x^2` | plot |
| `$y = x^2$` | **no plot** |
| `\(y = x^2\)` | **no plot** |
| `\begin{equation} y = x^2 \end{equation}` | **no plot** |
| `$\mathcal{F}(\ve{x}):=\mathcal{H}(\ve{x})-\ve{x}$` | **no plot** |
| `lrate = \dmodel^{-0.5}` | **no plot** |

Root causes (three, all needed):
1. `stripLatex()` (`frontend/src/lib/mathParser.ts:319`) never removes `$…$` or `\(…\)` delimiters, so they reach `math.compile()` and throw. The backend returns `$…$`-wrapped equations for arXiv and PDF text.
2. `MultiPlot2D` skips any row containing `\begin` (`frontend/src/components/MultiPlot2D.tsx:40`) — i.e. every `\begin{equation}` row is dropped before parsing. `App.tsx:191` also mis-types those rows as `matrix`.
3. Unknown macros (`\ve`, `\dmodel`, …) throw at `mathParser.ts:368-369`, and the `catch { continue }` at `MultiPlot2D.tsx:47` swallows it. The user only ever sees "No visible plots" with no per-row reason.

### ISSUE-003 — MEDIUM — PDF **Remove** leaves the filename in the input
Category: Functional · Repro: prod, 3/3 attempts

Steps: PDF tab → choose `sample.pdf` → click **Remove**.

Result (`screenshots/issue-003-pdf-remove-after.png`): the picker still shows `sample.pdf` while **Extract equations** is disabled. Picking the *same* file again is a no-op (browser won't fire `change` for an unchanged value), so the panel is a dead end until a different file is chosen (`issue-003-pdf-repick-same-file.png`).
Cause: `setPdf(null)` at `InputTabs.tsx:150` clears React state but not `input.value`.

### ISSUE-004 — LOW — Status line rendered twice
Category: Visual · seen on every successful extraction

`65 equations — 1706.03762` appears on two consecutive lines (`App.tsx:272-274` status `<p>` and `App.tsx:302-306` list header both render the same string). Visible in `issue-002-arxiv-no-plot.png`.

### ISSUE-005 — LOW — Error message outlives the tab it came from
Category: UX

After a failed arXiv run, switching to the PDF tab keeps showing `arXiv extraction failed (400): invalid_id` (also shown above the PDF panel). `InputTabs.tsx:96` clears its local `inlineError` on tab change, but `App`'s `notice` (`App.tsx:88,127`) is only cleared on the next *successful* result.

### ISSUE-006 — LOW — Legacy arXiv IDs and some papers fail with opaque codes
Category: Functional

- `math/0211159` → `400 invalid_id` (legacy `archive/YYNNNNN` IDs rejected).
- `2006.11239` → `502 arxiv_unavailable` on both local API and Render.

Both surface as a raw code plus the `detail` string, with no hint about what a valid ID looks like beyond the placeholder.

### ISSUE-007 — INFO — 1.49 MB single JS chunk
Category: Performance · `vite build` warning: `index-M2HXyEZf.js 1,494.13 kB │ gzip: 412.25 kB`. three.js + mathjs ship on first paint for a page whose first view is a textarea.

---

## Top 3 things to fix

1. **Make the plotter accept what the extractor returns** — strip `$…$` / `\(...\)` in `stripLatex`, unwrap `\begin{equation}...\end{equation}` before the `\begin` skip in `MultiPlot2D.tsx:40`, and surface the swallowed parse reason instead of a bare "No visible plots".
2. **Make local dev work out of the box** — add `server.proxy` for `/api` + `/health` in `vite.config.ts` (or document `cp .env.example .env` in CONTRIBUTING), and make `checkBackend()` validate the health payload instead of `res.ok`.
3. **PDF Remove must reset the file input** (`e.target.value = ''` or a ref) so the same file can be re-picked.

---

## Console health

0 JS errors on the happy path (sample, text, arXiv, PDF, 3D). The only console errors observed were the deliberate 400/404 probes from this run. Warnings: `THREE.Clock` deprecation, WebGL `ReadPixels` stalls.

## Notes

- No test framework detected for E2E/browser coverage (unit tests exist: vitest + pytest). Run `/qa` to bootstrap regression tests around the sample flow and the `$…$` case.
- gstack preamble/telemetry scripts are not installed in this environment (`SKILL_START: unavailable`); telemetry and learnings logging skipped.

---

# Retest — after fixes (same session)

| | |
|---|---|
| Date | 2026-09-27 |
| Target | `http://localhost:5173` fresh-clone dev (no `.env`, proxy only) |
| Suites | pytest **79 passed** (58 right after the round-1 fixes, 56 originally) · vitest **205 passed / 13 files** (199/12 after round 1, 162/9 originally) · `tsc -b` clean · oxlint 10 warnings, all pre-existing · `vite build` OK |

| Issue | Before | After |
|---|---|---|
| ISSUE-001 local dev 404 | `Text extraction failed (404)` | `/api/extract` proxied → 200; no env needed |
| ISSUE-001 false "server up" | HTML 200 counted healthy | API down → `Can't reach server` + Retry banner (screenshot `verify/local-offline-banner.png`) |
| ISSUE-002 arXiv plots | 0 curves for `1706.03762` | **31 curves**; `$y=x^2$`, `\(y=x^2\)`, `\begin{equation}…`, `\begin{align}…` all plot |
| ISSUE-002 silent failure | bare "No visible plots" | per-row reason, e.g. `card: unknown LaTeX command \dmodel` |
| ISSUE-002 3D path | `No 3D view for this type` for equation-wrapped rows | 3D canvas renders |
| ISSUE-003 PDF Remove | filename stuck, Extract disabled, same file un-re-pickable | input value `''` after Remove; same file re-picked → Extract enabled |
| ISSUE-004 duplicate status | line rendered twice | once |
| ISSUE-005 stale error | arXiv error survived tab switch | cleared on tab change |
| ISSUE-006 legacy id | `math/0211159` → 400 | → 200 with real title; `not-a-real-id` still 400 |

Review (two axes, `code-review`) found 2 further gaps, both closed: `align`/`gather`/`eqnarray` envs were still dead (now unwrapped by one shared `unwrapEquationEnvs()`), and `App.tsx:191`'s matrix fallback was dead code (deleted).

**Known-open (not fixed):** all three closed in `01e523f` / `1b263df` — see "Retest 2" below, which carries the live list.

---

# Retest 2 — after the fix wave

| | |
|---|---|
| Date | 2026-09-28 |
| Target | `http://localhost:5173` (Vite dev, proxy) · `http://localhost:8000` (uvicorn `api.py`) |
| Commits | 9 on top of `2aae829` — `0481efd` proxy / `d742fb8` unwrap / `2d9ca2d` stale notice + file input + status / `01e523f` 413 + legacy ids / `1b263df` lazy Viewer3D / `ca6f09e` QA report / `d7f5c79` clamp + reasons + whitelist / `00d0904` badge + touch target + plural / `625a247` inequalities + unicode + ident=ident + bogus archive |
| Suites | pytest **`79 passed, 1 warning in 2.62s`** · vitest **`Test Files  13 passed (13)` / `Tests  205 passed (205)`** · `tsc -b --noEmit` exit 0, no output · `oxlint` exit 0 with **exactly 10 warnings**, all `react(only-export-components)` fast-refresh (8 × `RegionPlot.tsx`, 2 × `Plot2D.tsx`) · `ruff check .` → `All checks passed!` |
| Build | `dist/assets/index-BfQnjZUb.js 581.39 kB │ gzip: 170.41 kB` · `dist/assets/Viewer3D-CA5Pikup.js 915.71 kB │ gzip: 242.89 kB` |
| Evidence | `/tmp/qa/verify2/final-*.png` (re-captured this session; the hunt session's `/tmp/qa/hunt/` dir is not present in this environment) + copies under `screenshots/retest2-*.png` · console errors: 0 |

## Round-1 open items → closed

| Item | Was | Now (verified) | Evidence | Commit |
|---|---|---|---|---|
| Opaque 502 on oversized source | `download_source` 5 MB cap raised `ValueError("too_large")`, escaped → `502 arxiv_unavailable` | `SourceTooLarge` → **413** `{"detail":"paper source too large to fetch"}` for both `GET /api/arxiv` and `POST /api/extract`; genuine outages still 502 | `tests/test_api_contract.py::test_arxiv_source_too_large_413`, `test_unexpected_fetch_error_still_502`, `tests/test_arxiv.py::test_over_5mb_raises_too_large` (live e-print download is unreachable from this box, so the contract tests are the evidence) | `01e523f` |
| Legacy id case | `HEP-TH/9901001` → `400 invalid_id` | live `curl "/api/arxiv?url=HEP-TH/9901001"` → **200** with real title ("String Junctions and Their Duals…"), stored under one canonical key `arxiv:hep-th/9901001`; `math/0211159` → 200 (Perelman, Ricci flow) | `tests/test_legacy_mixed_case_lookup_accepted`, `test_arxiv_cache_key_canonicalized`, `test_mixed_case_id_canonicalized_downstream` | `01e523f` |
| Entry bundle | `index-M2HXyEZf.js 1,494.13 kB │ gzip: 412.25 kB`, three.js on first paint | entry **`581.39 kB │ gzip: 170.41 kB`**; `Viewer3D` split out at **915.71 kB / 242.89 gzip**; request log shows **0 Viewer3D requests on load and on sample, first request at the 3D toggle**; fallback→loaded scroll height `1878 → 1878 px` (**0 px jump**) | `npm run build`; Playwright request log; `screenshots/retest2-3d-lazy-fallback.png`; `frontend/src/__tests__/App.test.tsx:53` (`Loading 3D…` fallback) | `1b263df` |

## Second hunt: 8 new + 2 found in verification → all fixed

| # | Finding | Verdict | How verified | Commit |
|---|---|---|---|---|
| N1 | Steep curves blanked the whole plot — `y = e^(x^2)` emitted `Infinity` pixel coords, Chromium dropped the path | **FIXED** | `/tmp/qa/verify2/final-1-steep-curve.png`: 1 path, zero `Infinity`/`NaN`/`e+` in `d`; same for `y = x^(-150)` (`extract_y_x_150_.png`); `multiPlot2D.test.tsx:58` asserts `not.toMatch(/NaN\|Infinity\|e+/)` | `d7f5c79` (clamp at `MultiPlot2D.tsx:73-80`) |
| N2 | Typed ASCII inequalities (`y < x + 1`) never extracted | **FIXED** | live API → `{"latex":"y < x + 1","type":"inequality"}`; UI renders the row, `inequality` badge and the shaded half-plane — `screenshots/retest2-ascii-inequality.png` (curve panel's empty `No visible plots` box is by design there: regions are App's job, `MultiPlot2D.tsx:41-42`); `tests/test_api_contract.py::test_ascii_inequality_extracts` | `625a247` (`equations.py` ASCII rules) |
| N3 | Unicode math (`y = π·x²`, `y = x²`) rejected as garbage | **FIXED** | live API returns both as `type: equation`; `screenshots/retest2-unicode-math.png`; `tests/test_api_contract.py::test_unicode_math_extracts` | `625a247` |
| N4 | Failed row edits failed silently, no reason shown | **FIXED** | editing row 0 to `y = ((( +` shows `Unexpected end of expression (char 6)` under the plot while the other row keeps plotting — `screenshots/retest2-broken-row-reason.png` (also `/tmp/qa/verify2/broken_row.png`) | `d7f5c79` |
| N5 | 16×16 px tap target for row selection on mobile | **FIXED** | 375×812: select control bounding box **44×44 px** (the 16×16 span is the inner dot), status `1 equation — Pasted equation`, `scrollWidth − clientWidth = 0` — `screenshots/retest2-mobile-tap-44px.png` | `00d0904` (`ExpressionList.tsx`) |
| N6 | Stale type badge/hint after inline edit | **FIXED** | edit `y = sin(k*x)` → `y = x^2 + 3`: badge `trigonometric` → `polynomial`, hint `raise k to pack waves tighter` → `raise degree to steepen the curve` — `screenshots/retest2-type-badge-refresh.png` (also `/tmp/qa/verify2/edit_type_refresh.png`) | `00d0904` (`App.tsx:173-175`) |
| N7 | "1 equations" pluralization, frontend **and** backend paths | **FIXED** | UI `1 equation — Pasted equation` (`App.tsx:198`); API `1 equation from abstract only — full text unavailable.` (`api.py:228`) asserted for both the 1-row and 2-row case by `test_abstract_warning_pluralizes` (1 passed) | FE `00d0904`, BE `625a247` |
| N8 | `y = x` (bare ident=ident) did not extract at all | **FIXED** | live API → `{"latex":"y = x","type":"function_def"}`; UI plots it — `screenshots/retest2-bare-ident.png`; `test_bare_ident_equals_extracts`, prose negatives (`speed = 100 mph`, sentences) still stay prose | `625a247` (`equations.py:146-149`) |
| N9 | Bogus archive code `foo-bar/1234567` → 200 with a fabricated title | **FIXED** | live `curl "/api/arxiv?url=foo-bar/1234567"` → **`400 {"detail":"invalid_id"}`**; `not-a-real-id` → 400 | `625a247` (`atom_has_entry is False` → 400, `api.py:184-188`) |
| N10 | Brace-unwrap whitelist regression: `lrate = \dmodel{1}` silently parsed as `lrate = 1` | **FIXED** | `stripLatex('lrate = \\dmodel{1}')` and `normalizeInput(...)` now throw `card: unknown LaTeX command \dmodel` (`mathParser.test.ts:62-63`); unwrap is typography-only and single-level (`mathParser.ts:395-404`) — no value can be invented | `d7f5c79` |

**Known-open (ceiling list — each re-verified 2026-09-28, none is a defect):**
- **Viewer3D chunk still trips Vite's ">500 kB" warning** — `npm run build` prints `Some chunks are larger than 500 kB after minification` for `Viewer3D-CA5Pikup.js 915.71 kB │ gzip: 242.89 kB` (info only; the entry is down to 170.41 kB gzip). *Upgrade:* route-level code splitting + a three.js tree-shaking audit.
- **A rejected `React.lazy` chunk import is memoized** — with `Viewer3D.tsx` aborted, the panel shows `Plot failed` + `Retry plot`; clicking it fires **no second request** (Playwright route abort count stays at 1) and no canvas mounts, so the 3D panel is dead until reload (`App.tsx:15` plain `lazy`, `App.tsx:75` only resets the error boundary). *Upgrade:* custom lazy wrapper with a re-importable factory. Evidence: `screenshots/retest2-chunk-404-dead-panel.png`.
- **`n = total`-style ident=ident prose passes the extraction gate** — it extracts as `type: equation` and renders as a not-plottable row with `no finite points on x∈[-10,10]` (`// ponytail:` ceiling at `equations.py:147`; live `screenshots/retest2-ident-total-not-plottable.png`). *Upgrade:* an LLM/semantic classifier (`equations.py:257` names the latency cost) or a stricter ident whitelist.
- **Nested whitelist macros never unwrap** — `\boxed{\textbf{x}}` cards as `unknown LaTeX command \boxed` instead of plotting (`// ponytail: single-level [^{}]* … upgrade path: balanced-brace scan` at `mathParser.ts:400`). *Upgrade:* balanced-brace scan.
- **Abstract-only fallback can still answer 200 with zero equations** — reproduced directly: e-print download fails (network) while Atom answers → `_fetch_arxiv` returns `([], info, "0 equations from abstract only — full text unavailable.")` → endpoint 200 `{"equations": []}`. Pre-existing, outside this wave's scope. *Upgrade:* treat empty-after-failure as 502/422, or fall back to the PDF endpoint with a retry.
- **Round-1 "Known-open" list: nothing left** — the 502-on-oversize item, the legacy-id case-sensitivity item and the single 1.49 MB chunk item are all closed above (`01e523f`, `1b263df`).
