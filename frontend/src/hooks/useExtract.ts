import { useState } from 'react';
import { api } from '../lib/api';
import type { Equation } from '../types';

const DEMO_EQUATIONS: Equation[] = [
  { latex: 'E = mc^2', type: 'physics', template: 'ForceField' },
  { latex: 'sin(x) + cos(y)', type: 'trigonometric', template: 'TrigSurface' },
  { latex: 'F = -kx', type: 'physics', template: 'ForceField' },
  { latex: 'y = mx + b', type: 'polynomial', template: 'PolySurface' },
  { latex: 'e^{i\\pi} + 1 = 0', type: 'exponential', template: 'ExpSurface' },
];

export function useExtract() {
  const [equations, setEquations] = useState<Equation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const extract = async (source: string, url?: string, text?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.extract({ source, url, text });
      setEquations(res.equations);
      setDemoMode(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Extraction failed';
      if (msg.includes('BACKEND_OFFLINE') || msg.includes('not available')) {
        setDemoMode(true);
        setEquations(DEMO_EQUATIONS);
        setError(null);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return { equations, loading, error, extract, setEquations, demoMode };
}
