import { useMemo } from 'react';

export interface DistChartProps {
  type: 'gaussian' | 'binomial' | 'poisson' | 'uniform';
  mean?: number;
  std?: number;
  trials?: number;
  probability?: number;
  lambda?: number;
  bins?: number;
  showVariance?: boolean;
}

function gaussianPDF(x: number, mean: number, std: number): number {
  return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / std) ** 2);
}

function binomialPMF(k: number, n: number, p: number): number {
  const coeff = factorial(n) / (factorial(k) * factorial(n - k));
  return coeff * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function poissonPMF(k: number, lambda: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

export function DistChart({
  type = 'gaussian',
  mean = 0,
  std = 1,
  trials = 10,
  probability = 0.5,
  lambda = 5,
  bins = 30,
  showVariance = true,
}: DistChartProps) {
  const bars = useMemo(() => {
    const result: Array<{ x: number; height: number; color: string }> = [];

    switch (type) {
      case 'gaussian': {
        const xMin = mean - 4 * std;
        const xMax = mean + 4 * std;
        for (let i = 0; i < bins; i++) {
          const x = xMin + (i / bins) * (xMax - xMin);
          const height = gaussianPDF(x, mean, std);
          const inVariance = Math.abs(x - mean) <= std;
          result.push({
            x,
            height,
            color: inVariance ? '#3b82f6' : '#60a5fa',
          });
        }
        break;
      }
      case 'binomial': {
        for (let k = 0; k <= trials; k++) {
          const height = binomialPMF(k, trials, probability);
          result.push({
            x: k,
            height,
            color: '#22c55e',
          });
        }
        break;
      }
      case 'poisson': {
        const maxK = Math.max(20, lambda * 3);
        for (let k = 0; k <= maxK; k++) {
          const height = poissonPMF(k, lambda);
          result.push({
            x: k,
            height,
            color: '#a855f7',
          });
        }
        break;
      }
      case 'uniform': {
        for (let i = 0; i < bins; i++) {
          result.push({
            x: i,
            height: 1 / bins,
            color: '#eab308',
          });
        }
        break;
      }
    }
    return result;
  }, [type, mean, std, trials, probability, lambda, bins]);

  const maxH = Math.max(...bars.map((b) => b.height), 0.001);

  return (
    <group>
      {bars.map((bar, i) => {
        const barWidth = 1 / bins;
        const height = (bar.height / maxH) * 5;
        return (
          <mesh key={i} position={[bar.x, height / 2, 0]}>
            <boxGeometry args={[barWidth * 0.8, height, 0.5]} />
            <meshStandardMaterial color={bar.color} />
          </mesh>
        );
      })}
      {showVariance && type === 'gaussian' && (
        <mesh position={[mean, 2.5, 0]}>
          <boxGeometry args={[std * 2, 5, 0.1]} />
          <meshStandardMaterial color="#3b82f6" transparent opacity={0.2} />
        </mesh>
      )}
    </group>
  );
}
