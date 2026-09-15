import { useState, useCallback, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { MainContent } from './components/MainContent'
import { PaperInput } from './components/PaperInput'
import { EquationList } from './components/EquationList'
import { ProgressTracker } from './components/ProgressTracker'
import { Sandbox3D, MathSurface } from './components/sandbox'
import { EquationInfo } from './components/EquationInfo'
import { SettingsPanel, ExportMenu } from './components/ui/ExportMenu'
import { classifyExpression } from './lib/mathParser'
import { getSampleEquations } from './lib/sampleData'
import { showToast } from './components/Toast'
import { useExtract } from './hooks/useExtract'
import type { Equation } from './types'

const API_BASE = import.meta.env.VITE_API_URL || ''

const STEPS = ['Extract', 'Classify', 'Visualize', 'Render']

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeView, setActiveView] = useState<'extract' | 'render' | 'settings'>('extract')
  const [renderingEquation, setRenderingEquation] = useState<Equation | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  const { equations, loading: extractLoading, error: extractError, extract, extractUpload, retry, backendDown, setEquations } = useExtract()

  useEffect(() => {
    if (API_BASE) {
      fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(15000) }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (extractError) showToast(extractError, 'error')
  }, [extractError])

  useEffect(() => {
    if (equations.length > 0) setCurrentStep(1) // eslint-disable-line react/set-state-in-effect
  }, [equations])

  const handleAnalyze = useCallback((payload: { mode: string; value: string | File }) => {
    setCurrentStep(0)
    setRenderingEquation(null)
    setActiveView('extract')
    if (payload.mode === 'pdf' && payload.value instanceof File) {
      extractUpload(payload.value)
      return
    }
    const mode = payload.mode === 'arxiv' ? 'url' : 'text'
    const url = mode === 'url' ? (payload.value as string) : undefined
    const text = mode === 'text' ? String(payload.value) : undefined
    extract(mode, url, text)
  }, [extract, extractUpload])

  const handleSample = useCallback(() => {
    setCurrentStep(1)
    setRenderingEquation(null)
    setActiveView('extract')
    setEquations(getSampleEquations())
    showToast('Sample loaded — no backend needed')
  }, [setEquations])

  const handleSelectEquation = useCallback((eq: Equation) => {
    setRenderingEquation(eq)
    setCurrentStep(2)
    setActiveView('render')
    showToast(`Visualizing: ${eq.type}`)
  }, [])

  const handleExport = useCallback((format: 'svg' | 'png' | 'json') => {
    if (!renderingEquation) return
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(renderingEquation, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'equation.json'
      a.click()
      URL.revokeObjectURL(url)
    } else if (format === 'png') {
      const canvas = document.querySelector('#equation-viewport canvas')
      if (canvas instanceof HTMLCanvasElement) {
        const a = document.createElement('a')
        a.href = canvas.toDataURL('image/png')
        a.download = 'visualization.png'
        a.click()
      } else {
        showToast('3D view not available for PNG export', 'error')
      }
    }
  }, [renderingEquation])

  const modelType = renderingEquation ? classifyExpression(renderingEquation.latex) : 'function'

  return (
    <div className="flex h-screen flex-col bg-zinc-900 text-zinc-100">
      <Toaster position="top-right" />
      <Header mobileOpen={mobileOpen} onToggleMobile={() => setMobileOpen((o) => !o)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          mobileOpen={mobileOpen}
          activeItem={activeView}
          onNavigate={(id) => setActiveView(id as 'extract' | 'render' | 'settings')}
          onClose={() => setMobileOpen(false)}
        />
        <MainContent>
          {activeView === 'settings' ? (
            <div className="mx-auto max-w-lg space-y-6">
              <SettingsPanel
                onSettingsChange={(s) => showToast(`Settings: ${JSON.stringify(s)}`)}
                onCameraReset={() => showToast('Camera reset')}
              />
            </div>
          ) : activeView === 'render' && renderingEquation ? (
            <div className="mx-auto max-w-4xl space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-zinc-400">Equation Details</h2>
                <div className="flex items-center gap-2">
                  <ExportMenu
                    formats={['png', 'json']}
                    onExport={handleExport}
                  />
                  <button
                    onClick={() => setActiveView('extract')}
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Back to equations
                  </button>
                </div>
              </div>
              <EquationInfo equation={renderingEquation} />
              {renderingEquation.vizMode === '3d' && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">Interactive 3D</h3>
                  <div id="equation-viewport" className="h-96">
                    <Sandbox3D>
                      <MathSurface
                        expression={renderingEquation.latex}
                        modelType={modelType}
                      />
                    </Sandbox3D>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-6">
              <ProgressTracker currentStep={currentStep} steps={STEPS} />
              <PaperInput onAnalyze={handleAnalyze} onSample={handleSample} loading={extractLoading} />
              {backendDown && !extractLoading ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-red-900/60 bg-red-950/30 py-12 text-center">
                  <p className="text-sm font-medium text-red-200">Can&apos;t reach the analysis server</p>
                  <p className="mt-1 max-w-md text-xs text-zinc-400">
                    Nothing from your paper yet. The free-tier backend sleeps when idle — first load can take about a minute.
                  </p>
                  <button
                    onClick={retry}
                    className="mt-4 rounded-md bg-zinc-100 px-4 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <EquationList
                  equations={equations}
                  loading={extractLoading}
                  onSelect={handleSelectEquation}
                />
              )}
            </div>
          )}
        </MainContent>
      </div>
    </div>
  )
}
