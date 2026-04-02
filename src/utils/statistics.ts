import type { PatientSample } from '../types/patient';
import type { CorrelationResult } from '../types/correlation';

export function calculatePearsonR(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  return Math.max(-1, Math.min(1, num / den));
}

export function calculatePValue(r: number, n: number): number {
  if (n <= 2) return 1;
  const t = r * Math.sqrt((n - 2) / (1 - r * r + 1e-10));
  // Approximation of two-tailed p-value from t distribution
  const df = n - 2;
  const x = df / (df + t * t);
  // Regularized incomplete beta function approximation
  const p = betaIncomplete(df / 2, 0.5, x);
  return Math.min(1, Math.max(0, p));
}

function betaIncomplete(a: number, b: number, x: number): number {
  // Simple numerical approximation
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  return front * betaCF(a, b, x);
}

function betaCF(a: number, b: number, x: number): number {
  const maxIter = 200;
  const eps = 3e-7;
  let qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
}

function lgamma(x: number): number {
  // Lanczos approximation
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

export function calculateCI(r: number, n: number, confidence = 0.95): { lower: number; upper: number } {
  if (n <= 3) return { lower: -1, upper: 1 };
  const z = Math.atanh(r);
  const se = 1 / Math.sqrt(n - 3);
  const zCrit = confidence === 0.95 ? 1.96 : 2.576;
  return {
    lower: parseFloat(Math.max(-1, Math.tanh(z - zCrit * se)).toFixed(3)),
    upper: parseFloat(Math.min(1, Math.tanh(z + zCrit * se)).toFixed(3)),
  };
}

export function calculateCorrelationResult(samples: PatientSample[]): CorrelationResult {
  if (samples.length === 0) {
    return { pearson_r: 0, p_value: 1, n_samples: 0, ci_lower: -1, ci_upper: 1, mean_geneA: 0, mean_geneB: 0, outliers: [] };
  }
  const x = samples.map(s => s.geneA_expression);
  const y = samples.map(s => s.geneB_expression);
  const r = calculatePearsonR(x, y);
  const p = calculatePValue(r, samples.length);
  const ci = calculateCI(r, samples.length);
  const meanA = x.reduce((a, b) => a + b, 0) / x.length;
  const meanB = y.reduce((a, b) => a + b, 0) / y.length;

  // Detect outliers: points > 2.5 std from regression line
  const outliers: string[] = [];
  const residuals = samples.map(s => s.geneB_expression - (r * (s.geneA_expression - meanA) + meanB));
  const residStd = Math.sqrt(residuals.reduce((a, b) => a + b * b, 0) / residuals.length);
  samples.forEach((s, i) => {
    if (Math.abs(residuals[i]) > 2.5 * residStd) outliers.push(s.id);
  });

  return {
    pearson_r: parseFloat(r.toFixed(4)),
    p_value: parseFloat(p.toFixed(6)),
    n_samples: samples.length,
    ci_lower: ci.lower,
    ci_upper: ci.upper,
    mean_geneA: parseFloat(meanA.toFixed(3)),
    mean_geneB: parseFloat(meanB.toFixed(3)),
    outliers: outliers.slice(0, 20),
  };
}

export function formatPValue(p: number): string {
  if (p < 0.001) return '< 0.001';
  if (p < 0.01) return '< 0.01';
  if (p < 0.05) return '< 0.05';
  return p.toFixed(3);
}

export function getSignificanceStars(p: number): string {
  if (p < 0.001) return '***';
  if (p < 0.01) return '**';
  if (p < 0.05) return '*';
  return 'ns';
}

export function getEffectSizeLabel(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.5) return 'Large';
  if (abs >= 0.3) return 'Medium';
  return 'Small';
}
