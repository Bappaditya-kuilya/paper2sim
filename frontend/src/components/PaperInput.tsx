import { useState, useCallback, useRef } from 'react'

type InputMode = 'arxiv' | 'equation' | 'pdf'

interface PaperInputProps {
  onAnalyze?: (payload: { mode: InputMode; value: string | File }) => void
  loading?: boolean
}

export function PaperInput({ onAnalyze, loading = false }: PaperInputProps) {
  const [mode, setMode] = useState<InputMode>('arxiv')
  const [arxivUrl, setArxivUrl] = useState('')
  const [equation, setEquation] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') setPdfFile(file)
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setPdfFile(file)
  }, [])

  const handleAnalyze = () => {
    if (loading) return
    if (mode === 'arxiv' && arxivUrl.trim()) {
      onAnalyze?.({ mode, value: arxivUrl.trim() })
    } else if (mode === 'equation' && equation.trim()) {
      onAnalyze?.({ mode, value: equation.trim() })
    } else if (mode === 'pdf' && pdfFile) {
      onAnalyze?.({ mode, value: pdfFile })
    }
  }

  const canSubmit =
    (mode === 'arxiv' && arxivUrl.trim()) ||
    (mode === 'equation' && equation.trim()) ||
    (mode === 'pdf' && pdfFile)

  const tabs = [
    { id: 'arxiv' as const, label: 'arXiv URL' },
    { id: 'equation' as const, label: 'Equation' },
    { id: 'pdf' as const, label: 'PDF Upload' },
  ]

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 md:p-6">
      <div className="mb-4 flex gap-1 rounded-md bg-zinc-900 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === tab.id
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === 'arxiv' && (
        <input
          type="url"
          placeholder="https://arxiv.org/abs/2401.00001"
          value={arxivUrl}
          onChange={(e) => setArxivUrl(e.target.value)}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
        />
      )}

      {mode === 'equation' && (
        <textarea
          placeholder="E = mc^2"
          value={equation}
          onChange={(e) => setEquation(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 resize-none font-mono"
        />
      )}

      {mode === 'pdf' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 transition-colors ${
            dragOver
              ? 'border-zinc-400 bg-zinc-800/50'
              : 'border-zinc-700 hover:border-zinc-500'
          }`}
        >
          <svg className="h-8 w-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {pdfFile ? (
            <span className="text-sm text-zinc-300">{pdfFile.name}</span>
          ) : (
            <>
              <span className="text-sm text-zinc-400">Drop a PDF here or click to browse</span>
              <span className="text-xs text-zinc-600">Max 50MB</span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={!canSubmit || loading}
        className="mt-4 w-full rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing...
          </span>
        ) : (
          'Analyze'
        )}
      </button>
    </div>
  )
}
