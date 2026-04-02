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

const CANCER_SUBTYPES: Record<string, string[]> = {
  'TCGA-BRCA': ['Luminal A', 'Luminal B', 'Basal-like', 'Her2+', 'Normal-like'],
  'TCGA-LUAD': ['Adenocarcinoma', 'Squamous', 'Small-cell', 'Large-cell'],
  'TCGA-PAAD': ['Basal-like', 'Classical', 'Squamous', 'Immunogenic'],
  'TCGA-COAD': ['MSI-High', 'CMS1', 'CMS2', 'CMS3', 'CMS4'],
  'TCGA-OV': ['Immunoreactive', 'Differentiated', 'Proliferative', 'Mesenchymal'],
};

const STAGES = ['Stage I', 'Stage II', 'Stage III', 'Stage IV'];
const STAGE_WEIGHTS = [0.20, 0.30, 0.35, 0.15];

function pickWeighted(rng: SeededRandom, options: string[], weights: number[]): string {
  const r = rng.next();
  let cumulative = 0;
  for (let i = 0; i < options.length; i++) {
    cumulative += weights[i];
    if (r < cumulative) return options[i];
  }
  return options[options.length - 1];
}

function generateCancerData(cancerType: string, seed: number): PatientSample[] {
  const rng = new SeededRandom(seed);
  const subtypes = CANCER_SUBTYPES[cancerType];
  const samples: PatientSample[] = [];

  for (let i = 0; i < 700; i++) {
    const isMutant = rng.next();
    let mutation_status: 'MUTANT' | 'WILDTYPE' | 'NORMAL';
    if (isMutant < 0.50) mutation_status = 'MUTANT';
    else if (isMutant < 0.85) mutation_status = 'WILDTYPE';
    else mutation_status = 'NORMAL';

    const isNormal = mutation_status === 'NORMAL';
    const geneA_base = isNormal ? rng.normal(5.5, 1.0) : rng.normal(9.0, 1.5);
    const noise = rng.normal(0, 1.2);
    const geneB_expression = Math.max(1, Math.min(16, geneA_base * 0.6 + noise + rng.normal(3.5, 0.8)));
    const geneA_expression = Math.max(1, Math.min(16, geneA_base + rng.normal(0, 0.5)));

    const subtypeIdx = Math.floor(rng.next() * subtypes.length);
    const stage = pickWeighted(rng, STAGES, STAGE_WEIGHTS);
    const age = Math.floor(rng.next() * 55) + 25;
    const gtex_reference = isNormal ? geneA_expression * 0.9 : rng.normal(4.5, 0.8);

    samples.push({
      id: `${cancerType}-${i.toString().padStart(4, '0')}`,
      geneA_expression: parseFloat(geneA_expression.toFixed(3)),
      geneB_expression: parseFloat(geneB_expression.toFixed(3)),
      mutation_status,
      subtype: subtypes[subtypeIdx],
      cancer_type: cancerType,
      age,
      stage,
      gtex_reference: parseFloat(Math.max(1, gtex_reference).toFixed(3)),
    });
  }
  return samples;
}

export const MOCK_TCGA_DATA: Record<string, PatientSample[]> = {
  'TCGA-BRCA': generateCancerData('TCGA-BRCA', 42001),
  'TCGA-LUAD': generateCancerData('TCGA-LUAD', 42002),
  'TCGA-PAAD': generateCancerData('TCGA-PAAD', 42003),
  'TCGA-COAD': generateCancerData('TCGA-COAD', 42004),
  'TCGA-OV':   generateCancerData('TCGA-OV',   42005),
};

export const CANCER_SUBTYPES_MAP = CANCER_SUBTYPES;
