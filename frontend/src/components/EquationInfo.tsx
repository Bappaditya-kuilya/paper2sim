interface EquationInfoProps {
  equation: {
    latex: string;
    type: string;
    vizMode?: '3d' | 'info';
  };
}

const TYPE_DESCRIPTIONS: Record<string, string> = {
  trigonometric: 'Trigonometric function — describes periodic oscillation',
  polynomial: 'Polynomial expression — algebraic relationship between variables',
  exponential: 'Exponential function — growth or decay relationship',
  logarithmic: 'Logarithmic function — inverse of exponential',
  hyperbolic: 'Hyperbolic function — analog of trigonometric for hyperbolic geometry',
  ode: 'Ordinary differential equation — describes rate of change',
  physics: 'Physics identity — fundamental relationship',
  matrix: 'Matrix operation — linear algebra transformation',
  probability: 'Probability expression — likelihood of events',
  statistical: 'Statistical measure — summary of data distribution',
  calculus: 'Calculus expression — integration or summation',
  function: 'Function — mathematical relationship',
  default: 'Equation',
};

export function EquationInfo({ equation }: EquationInfoProps) {
  const description = TYPE_DESCRIPTIONS[equation.type] ?? TYPE_DESCRIPTIONS.default;

  return (
    <div className="border border-zinc-800 bg-zinc-950 rounded-lg p-4">
      <pre className="font-mono text-sm text-zinc-100 bg-zinc-900 rounded p-3 overflow-x-auto">
        {equation.latex}
      </pre>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-100 capitalize">
          {equation.type}
        </span>
        {equation.vizMode === 'info' && (
          <span className="text-xs text-zinc-400">
            This equation doesn't produce a 3D surface.
          </span>
        )}
        {equation.vizMode === '3d' && (
          <span className="text-xs text-zinc-400">
            This equation can be visualized as a 3D surface.
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-zinc-400">{description}</p>
    </div>
  );
}
