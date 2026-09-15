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
import { SettingsPanel } from './components/ui/ExportMenu'
import { classifyExpression } from './lib/mathParser'
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

  const { equations, loading: extractLoading, error: extractError, extract, demoMode } = useExtract()

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
    const mode = payload.mode === 'arxiv' ? 'url' : 'text'
    const url = mode === 'url' ? (payload.value as string) : undefined
    const text = mode === 'text' ? String(payload.value) : undefined
    extract(mode, url, text)
  }, [extract])

  const handleSelectEquation = useCallback((eq: Equation) => {
    setRenderingEquation(eq)
    setCurrentStep(2)
    setActiveView('render')
    showToast(`Visualizing: ${eq.type}`)
  }, [])

  const modelType = renderingEquation ? classifyExpression(renderingEquation.latex) : 'function'

  return (
    <div className="flex h-screen flex-col bg-zinc-900 text-zinc-100">
      <Toaster position="top-right" />
      {demoMode && (
        <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg border border-yellow-700 bg-yellow-900/90 p-4 text-yellow-200 backdrop-blur">
          <p className="text-sm">
            <strong>Demo Mode:</strong> Backend server is not connected. Showing sample equations.
            To use full functionality, start the backend server with <code className="rounded bg-yellow-800 px-1">python api.py</code>
          </p>
        </div>
      )}
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
                <button
                  onClick={() => setActiveView('extract')}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Back to equations
                </button>
              </div>
              <EquationInfo equation={renderingEquation} />
              {renderingEquation.vizMode === '3d' && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">Interactive 3D</h3>
                  <div className="h-96">
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
              <PaperInput onAnalyze={handleAnalyze} loading={extractLoading} />
              <EquationList
                equations={equations}
                loading={extractLoading}
                onSelect={handleSelectEquation}
              />
            </div>
          )}
        </MainContent>
      </div>
    </div>
  )
}
