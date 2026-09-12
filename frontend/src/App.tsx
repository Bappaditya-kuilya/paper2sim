import { useState, useCallback, useRef, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { MainContent } from './components/MainContent'
import { PaperInput } from './components/PaperInput'
import { EquationList } from './components/EquationList'
import { VideoPlayer } from './components/VideoPlayer'
import { ProgressTracker } from './components/ProgressTracker'
import { showToast } from './components/Toast'
import { useExtract } from './hooks/useExtract'
import { useRender } from './hooks/useRender'
import type { Equation } from './types'

const STEPS = ['Extract', 'Classify', 'Visualize', 'Render']

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [renderingEquation, setRenderingEquation] = useState<Equation | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const { equations, loading: extractLoading, error: extractError, extract } = useExtract()
  const { job, error: renderError, startRender, pollStatus } = useRender()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (extractError) showToast(extractError, 'error')
  }, [extractError])

  useEffect(() => {
    if (renderError) showToast(renderError, 'error')
  }, [renderError])

  useEffect(() => {
    if (equations.length > 0) setCurrentStep(1)
  }, [equations])

  useEffect(() => {
    if (!job) return
    if (job.status === 'rendering' && currentStep < 2) setCurrentStep(2)
    if (job.status === 'complete') {
      setCurrentStep(3)
      if (job.video_path) setVideoUrl(job.video_path)
      showToast('Render complete!')
    }
    if (job.status === 'failed') showToast(job.error || 'Render failed', 'error')
  }, [job, currentStep])

  useEffect(() => {
    if (job?.status === 'queued' || job?.status === 'rendering') {
      pollRef.current = setInterval(() => pollStatus(job.job_id), 2000)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [job?.status, job?.job_id, pollStatus])

  const handleAnalyze = useCallback((payload: { mode: string; value: string | File }) => {
    setCurrentStep(0)
    setRenderingEquation(null)
    setVideoUrl(null)
    const mode = payload.mode === 'arxiv' ? 'url' : 'text'
    const url = mode === 'url' ? (payload.value as string) : undefined
    const text = mode === 'text' ? String(payload.value) : undefined
    extract(mode, url, text)
  }, [extract])

  const handleSelectEquation = useCallback((eq: Equation) => {
    setRenderingEquation(eq)
    setCurrentStep(2)
    startRender(eq.template || 'Classical', eq.latex)
    showToast(`Rendering: ${eq.type}`)
  }, [startRender])

  const handleDownload = useCallback(() => {
    if (!videoUrl) return
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = 'simulation.mp4'
    a.click()
  }, [videoUrl])

  return (
    <div className="flex h-screen flex-col bg-zinc-900 text-zinc-100">
      <Toaster position="top-right" />
      <Header mobileOpen={mobileOpen} onToggleMobile={() => setMobileOpen((o) => !o)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar mobileOpen={mobileOpen} />
        <MainContent>
          <div className="mx-auto max-w-4xl space-y-6">
            <ProgressTracker currentStep={currentStep} steps={STEPS} />
            <PaperInput onAnalyze={handleAnalyze} loading={extractLoading} />
            <EquationList
              equations={equations}
              loading={extractLoading}
              onSelect={handleSelectEquation}
            />
            {job && (job.status === 'queued' || job.status === 'rendering') && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center">
                {renderingEquation && (
                  <p className="mb-2 font-mono text-xs text-zinc-500">{renderingEquation.latex}</p>
                )}
                <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-zinc-400 transition-all duration-500"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                <p className="text-sm text-zinc-400">
                  {job.status === 'queued' ? 'Queued...' : `Rendering ${job.progress}%`}
                </p>
              </div>
            )}
            {job?.status === 'complete' && videoUrl && (
              <VideoPlayer src={videoUrl} onDownload={handleDownload} />
            )}
          </div>
        </MainContent>
      </div>
    </div>
  )
}
