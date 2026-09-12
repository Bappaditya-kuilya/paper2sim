export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const STEPS = ['Extract', 'Classify', 'Visualize', 'Render'] as const;
export const EQUATION_TYPES = ['trigonometric', 'polynomial', 'exponential', 'logarithmic', 'physics', 'ode', 'matrix', 'probability', 'statistical', 'function'] as const;
export const TYPE_COLORS: Record<string, string> = {
  trigonometric: 'bg-blue-500',
  polynomial: 'bg-green-500',
  exponential: 'bg-red-500',
  logarithmic: 'bg-yellow-500',
  physics: 'bg-purple-500',
  ode: 'bg-pink-500',
  matrix: 'bg-indigo-500',
  probability: 'bg-orange-500',
  statistical: 'bg-cyan-500',
  function: 'bg-gray-500',
};
