import { useState } from 'react';
import { api, resetBackendCheck } from '../lib/api';
import { classifyVizMode } from '../lib/vizClassifier';
import type { Equation, ExtractResponse } from '../types';

interface ExtractPayload {
  source: string;
  url?: string;
  text?: string;
  file?: File;
}

export function useExtract() {
  const [equations, setEquations] = useState<Equation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendDown, setBackendDown] = useState(false);
  const [lastPayload, setLastPayload] = useState<ExtractPayload | null>(null);

  const extract = async (source: string, url?: string, text?: string) => {
    setLoading(true);
    setError(null);
    setBackendDown(false);
    setLastPayload({ source, url, text });
    resetBackendCheck();
    try {
      const res = await api.extract({ source, url, text });
      setEquations(res.equations.map(eq => ({
        ...eq,
        vizMode: classifyVizMode(eq.latex, eq.type),
      })));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Extraction failed';
      if (msg.includes('BACKEND_OFFLINE') || msg.includes('not available')) {
        setBackendDown(true);
        setEquations([]);
        setError(null);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const extractUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setBackendDown(false);
    setLastPayload({ source: 'pdf', file });
    resetBackendCheck();
    try {
      const res = (await api.extractUpload(file)) as ExtractResponse & { error?: string };
      if (!res.equations) throw new Error(res.error || 'Extraction failed');
      setEquations(res.equations.map(eq => ({
        ...eq,
        vizMode: classifyVizMode(eq.latex, eq.type),
      })));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Extraction failed';
      if (msg.includes('BACKEND_OFFLINE') || msg.includes('not available')) {
        setBackendDown(true);
        setEquations([]);
        setError(null);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    if (lastPayload?.file) extractUpload(lastPayload.file);
    else if (lastPayload) extract(lastPayload.source, lastPayload.url, lastPayload.text);
  };

  return { equations, loading, error, extract, extractUpload, retry, backendDown, setEquations };
}
