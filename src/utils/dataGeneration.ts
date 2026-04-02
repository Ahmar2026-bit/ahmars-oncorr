import type { PatientSample } from '../types/patient';

class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  normal(mean: number, std: number): number {
    const u1 = Math.max(this.next(), 1e-10);
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * std;
  }
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function generateDataForPair(
  geneA: string,
  geneB: string,
  cancerType: string,
  baseData: PatientSample[]
): PatientSample[] {
  const seed = hashString(`${geneA}-${geneB}-${cancerType}`) % 1000000;
  const rng = new SeededRandom(seed + 1);

  const geneAMean = 7 + (hashString(geneA) % 400) / 100;
  const geneBMean = 7 + (hashString(geneB) % 400) / 100;
  const correlationFactor = 0.4 + (hashString(`${geneA}${geneB}`) % 300) / 1000;

  return baseData.map(sample => {
    const isNormal = sample.mutation_status === 'NORMAL';
    const baseA = isNormal ? geneAMean - 2 : geneAMean;
    const geneA_val = Math.max(1, Math.min(16, rng.normal(baseA, 1.5)));
    const noise = rng.normal(0, Math.sqrt(1 - correlationFactor * correlationFactor) * 1.5);
    const geneB_val = Math.max(1, Math.min(16,
      correlationFactor * (geneA_val - baseA) + (isNormal ? geneBMean - 2 : geneBMean) + noise
    ));
    return {
      ...sample,
      geneA_expression: parseFloat(geneA_val.toFixed(3)),
      geneB_expression: parseFloat(geneB_val.toFixed(3)),
    };
  });
}
