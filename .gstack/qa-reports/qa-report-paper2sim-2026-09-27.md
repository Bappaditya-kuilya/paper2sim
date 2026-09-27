# QA Report — Paper2Sim

| | |
|---|---|
| Date | 2026-09-27 |
| Targets | `http://localhost:5173` (Vite dev, no `.env`) · `http://localhost:5173` (with `VITE_API_URL`) · `https://paper2sim.vercel.app` |
| API | local `uvicorn api:app:8000` and `https://paper2sim.onrender.com` |
| Tool | Playwright 1.63 / Chromium (screenshots in `screenshots/`) |
| Framework | React 19 + Vite 8 (Vercel) → FastAPI (Render) |
| Duration | ~40 min · 16 scripted sessions · 33 screenshots |
| **Health score** | **81 / 100** |

| Category | Score | Weight |
|---|---|---|
| Console | 100 | 15% |
| Links / requests | 100 | 10% |
| Visual | 92 | 10% |
| Functional | 37 | 20% |
| UX | 81 | 15% |
| Performance | 80 | 10% |
| Content | 97 | 5% |
| Accessibility | 95 | 15% |

**Verdict: CRITICAL** — the two headline input paths (arXiv, PDF) extract successfully and then render no plot at all, and a fresh clone cannot run the frontend without an undocumented env var.

---

## What works

- Sample flow: `Use sample` → 2 equations → 2D plot renders (both local and prod).
- Plain typed input `y = x^2`, `y = \sin(x)`, `f(x) = e^{-x^2}`, `z = x + y` → plots.
- 3D toggle → three.js canvas + full param panel (X range, resolution, grid, axes, wireframe).
- arXiv extraction itself: `1706.03762` → 65 equations; `1512.03385` → 20; full `https://arxiv.org/abs/...` URLs accepted.
- PDF extraction: `sample.pdf` → 2 equations.
- Error states are clear: empty textarea disables the button, garbage text → "No extractable math detected", bad arXiv id → `arXiv extraction failed (400): invalid_id`, non-PDF upload → `only PDF files supported`.
- Mobile 375×812: 0 px horizontal overflow. Tab roving focus + ArrowRight/Left works, 44 px targets, aria labels on every control.
- Tooling green: `pytest` 56 passed, `vitest` 162 passed, `tsc -b` clean, `oxlint` warnings only (fast-refresh), `vite build` OK.

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
| Suites | pytest **58 passed** (was 56) · vitest **199 passed / 12 files** (was 162/9) · `tsc -b` clean · oxlint 10 warnings, all pre-existing · `vite build` OK |

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

**Known-open (not fixed):**
- `GET /api/arxiv?url=2006.11239` → 502 `arxiv_unavailable`: `download_source` hits its 5 MB cap and `ValueError("too_large")` escapes uncaught at `api.py:156` (only `URLError`/`OSError` handled). Separate bug, needs a catch + clear detail.
- Legacy ids are case-sensitive: `HEP-TH/9901001` still 400s (canonical arXiv form is lowercase).
- Single 1.49 MB JS chunk (pre-existing build warning).
