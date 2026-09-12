import { Toaster } from 'react-hot-toast'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { MainContent } from './components/MainContent'
import { PaperInput } from './components/PaperInput'
import { EquationList } from './components/EquationList'
import { ProgressTracker } from './components/ProgressTracker'

const DEMO_EQUATIONS = [
  { latex: 'E = mc^2', type: 'Energy-Mass', template: 'Classical' },
  { latex: 'i\\hbar\\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi', type: 'Quantum', template: 'Schrödinger' },
]

export default function App() {
  return (
    <div className="flex h-screen flex-col bg-zinc-900 text-zinc-100">
      <Toaster position="top-right" />
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainContent>
          <div className="mx-auto max-w-4xl space-y-6">
            <ProgressTracker
              currentStep={0}
              steps={['Extract', 'Classify', 'Visualize', 'Render']}
            />
            <PaperInput
              onAnalyze={(p) => console.log('Analyze:', p)}
              loading={false}
            />
            <EquationList
              equations={DEMO_EQUATIONS}
              loading={false}
              onSelect={(eq) => console.log('Selected:', eq)}
            />
          </div>
        </MainContent>
      </div>
    </div>
  )
}
