import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { extractArxiv, extractText, extractUpload, type ExtractResponse } from '../lib/extractApi';

type TabId = 'equation' | 'arxiv' | 'pdf';

interface InputTabsProps {
  onResult(r: ExtractResponse, title: string): void;
  onInlineError(msg: string): void;
  busy: boolean;
  onBusy(b: boolean): void;
  defaultSample(): void;
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'equation', label: 'Equation' },
  { id: 'arxiv', label: 'arXiv' },
  { id: 'pdf', label: 'PDF' },
];

const HINTS: Record<TabId, string> = {
  equation: 'Enter an equation first.',
  arxiv: 'Enter an arXiv ID or URL first.',
  pdf: 'Choose a PDF first.',
};

export function InputTabs({ onResult, onInlineError, busy, onBusy, defaultSample }: InputTabsProps) {
  const [tab, setTab] = useState<TabId>('equation');
  const [eqText, setEqText] = useState('');
  const [arxiv, setArxiv] = useState('');
  const [pdf, setPdf] = useState<File | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const valid =
    tab === 'equation' ? eqText.trim().length > 0 : tab === 'arxiv' ? arxiv.trim().length > 0 : pdf !== null;

  function onTabKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === tab);
    const next = e.key === 'ArrowRight' ? (i + 1) % TABS.length : (i - 1 + TABS.length) % TABS.length;
    const id = TABS[next]?.id;
    if (id) {
      setTab(id);
      document.getElementById(`inputtabs-tab-${id}`)?.focus();
    }
  }

  function onPdfChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setPdf(f);
    setInlineError(null);
  }

  async function onSubmit() {
    if (busy) return;
    if (!valid) {
      const msg = HINTS[tab];
      setInlineError(msg);
      onInlineError(msg);
      return;
    }
    setInlineError(null);
    onBusy(true);
    try {
      if (tab === 'equation') {
        const res = await extractText(eqText.trim());
        onResult(res, 'Pasted equation');
      } else if (tab === 'arxiv') {
        const res = await extractArxiv(arxiv.trim());
        onResult(res, arxiv.trim());
      } else {
        const res = await extractUpload(pdf as File);
        onResult(res, (pdf as File).name);
      }
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : 'Extract failed. Check input and retry.';
      setInlineError(msg);
      onInlineError(msg);
    } finally {
      onBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-surface p-4 tabular-nums">
      <div role="tablist" aria-label="Input source" className="mb-4 flex gap-1 rounded-full bg-black p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`inputtabs-tab-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`inputtabs-panel-${t.id}`}
            onClick={() => {
              setTab(t.id);
              setInlineError(null);
            }}
            onKeyDown={onTabKeyDown}
            className={`min-h-[44px] flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              tab === t.id ? 'bg-white/10 text-white' : 'text-gray-300 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'equation' && (
        <div id="inputtabs-panel-equation" role="tabpanel" aria-labelledby="inputtabs-tab-equation">
          <textarea
            id="inputtabs-field"
            aria-label="Equation text"
            placeholder="y = sin(k*x)"
            value={eqText}
            onChange={(e) => setEqText(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-sm tabular-nums text-white placeholder-zinc-500 outline-none transition-colors duration-200 focus:border-white focus:ring-1 focus:ring-white"
          />
        </div>
      )}

      {tab === 'arxiv' && (
        <div id="inputtabs-panel-arxiv" role="tabpanel" aria-labelledby="inputtabs-tab-arxiv">
          <input
            id="inputtabs-field"
            type="text"
            aria-label="arXiv ID or URL"
            placeholder="2401.00001 or https://arxiv.org/abs/2401.00001"
            value={arxiv}
            onChange={(e) => setArxiv(e.target.value)}
            className="min-h-[44px] w-full rounded-full border border-white/10 bg-black px-3 py-2 text-sm tabular-nums text-white placeholder-zinc-500 outline-none transition-colors duration-200 focus:border-white focus:ring-1 focus:ring-white"
          />
        </div>
      )}

      {tab === 'pdf' && (
        <div id="inputtabs-panel-pdf" role="tabpanel" aria-labelledby="inputtabs-tab-pdf">
          <input
            id="inputtabs-field"
            type="file"
            accept=".pdf"
            aria-label="Upload PDF"
            onChange={onPdfChange}
            className="min-h-[44px] w-full rounded-full border border-white/10 bg-black px-3 py-2 text-sm text-white outline-none transition-colors duration-200 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:text-white focus:border-white focus:ring-1 focus:ring-white"
          />
          {pdf && (
            <div className="mt-2 flex min-h-[44px] items-center justify-between gap-2 text-sm text-gray-300">
              <span className="truncate">{pdf.name}</span>
              <button
                type="button"
                onClick={() => setPdf(null)}
                className="min-h-[44px] min-w-[44px] rounded-full border border-white/20 px-3 text-sm text-white transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[.98]"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      {inlineError && (
        <p role="alert" className="mt-2 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {inlineError}
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!valid || busy}
        className="mt-4 min-h-[44px] w-full rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-all duration-200 hover:-translate-y-px hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Extracting…
          </span>
        ) : (
          'Extract equations'
        )}
      </button>
      <button
        type="button"
        onClick={defaultSample}
        disabled={busy}
        className="mt-2 min-h-[44px] w-full rounded-full border border-white/20 px-4 py-2 text-sm text-white transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Use sample
      </button>
    </div>
  );
}
