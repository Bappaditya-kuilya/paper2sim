import { useState } from 'react';
import { api } from '../lib/api';
import type { Equation } from '../types';

export function useExtract() {
  const [equations, setEquations] = useState<Equation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extract = async (source: string, url?: string, text?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.extract({ source, url, text });
      setEquations(res.equations);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Extraction failed');
    } finally {
      setLoading(false);
    }
  };

  return { equations, loading, error, extract, setEquations };
}
