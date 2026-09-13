import React, { useState, useCallback } from 'react';

export interface EquationDetailPanelProps {
  equation: {
    id: string;
    latex: string;
    type: string;
    confidence?: number;
    parameters?: Record<string, number>;
  };
  onRender?: (equationId: string) => void;
  onCopy?: (latex: string) => void;
  onParameterChange?: (param: string, value: number) => void;
}

export function EquationDetailPanel({
  equation,
  onRender,
  onCopy,
  onParameterChange,
}: EquationDetailPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(equation.latex).then(() => {
      setCopied(true);
      onCopy?.(equation.latex);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [equation.latex, onCopy]);

  const typeColors: Record<string, string> = {
    trigonometric: 'bg-blue-500/20 text-blue-400',
    polynomial: 'bg-green-500/20 text-green-400',
    exponential: 'bg-purple-500/20 text-purple-400',
    logarithmic: 'bg-yellow-500/20 text-yellow-400',
    ode: 'bg-red-500/20 text-red-400',
    physics: 'bg-cyan-500/20 text-cyan-400',
    matrix: 'bg-orange-500/20 text-orange-400',
    probability: 'bg-pink-500/20 text-pink-400',
    statistical: 'bg-indigo-500/20 text-indigo-400',
    calculus: 'bg-teal-500/20 text-teal-400',
    function: 'bg-zinc-500/20 text-zinc-400',
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[equation.type] || typeColors.function}`}>
            {equation.type}
          </span>
          {equation.confidence !== undefined && (
            <span className="text-xs text-zinc-500">
              {Math.round(equation.confidence * 100)}% confidence
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-2 py-1 text-xs text-zinc-400 border border-zinc-700 rounded hover:bg-zinc-800"
          >
            {copied ? 'Copied!' : 'Copy LaTeX'}
          </button>
          {onRender && (
            <button
              onClick={() => onRender(equation.id)}
              className="px-2 py-1 text-xs text-blue-400 border border-blue-500/30 rounded hover:bg-blue-500/10"
            >
              Render 3D
            </button>
          )}
        </div>
      </div>

      <div className="bg-zinc-950 rounded p-3 mb-3 font-mono text-sm text-zinc-200 overflow-x-auto">
        {equation.latex}
      </div>

      {equation.parameters && Object.keys(equation.parameters).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Parameters</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(equation.parameters).map(([param, value]) => (
              <div key={param} className="flex items-center gap-2">
                <label className="text-xs text-zinc-500 w-16">{param}</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => onParameterChange?.(param, parseFloat(e.target.value) || 0)}
                  className="flex-1 px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-200"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
