export interface DataPoint {
  x: number;
  y: number;
  type: 'MUTANT' | 'WILDTYPE' | 'NORMAL';
  patientId: string;
  stage: 'I' | 'II' | 'III' | 'IV';
  subtype: string;
}

function generateData(): DataPoint[] {
  const data: DataPoint[] = [];
  const subtypes = ['Luminal A', 'Luminal B', 'HER2+', 'TNBC', 'Other'];
  const stages: Array<'I' | 'II' | 'III' | 'IV'> = ['I', 'II', 'III', 'IV'];
  const types: Array<'MUTANT' | 'WILDTYPE' | 'NORMAL'> = ['MUTANT', 'WILDTYPE', 'NORMAL'];

  let seed = 42;
  function rand() {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  }

  for (let i = 0; i < 452; i++) {
    const type = types[Math.floor(rand() * 3)];
    let baseX = rand() * 80 + 10;
    let baseY = rand() * 80 + 10;

    if (type === 'MUTANT') {
      baseX = baseX * 0.8 + 15;
      baseY = baseX * 0.7 + rand() * 20;
    } else if (type === 'WILDTYPE') {
      baseY = baseX * 0.5 + rand() * 30 + 10;
    } else {
      baseX = rand() * 40 + 30;
      baseY = rand() * 40 + 30;
    }

    data.push({
      x: Math.min(Math.max(baseX, 1), 99),
      y: Math.min(Math.max(baseY, 1), 99),
      type,
      patientId: `TCGA-${String(i + 1).padStart(4, '0')}`,
      stage: stages[Math.floor(rand() * 4)],
      subtype: subtypes[Math.floor(rand() * 5)],
    });
  }
  return data;
}

export const mockData = generateData();

export const geneList = [
  'KRAS', 'NRF2', 'TP53', 'EGFR', 'BRCA1', 'BRCA2', 'PIK3CA', 'PTEN',
  'AKT1', 'BRAF', 'RAS', 'MYC', 'VEGFA', 'HER2', 'ALK', 'RET',
  'FGFR1', 'FGFR2', 'FGFR3', 'CDK4', 'CDK6', 'CDKN2A', 'RB1', 'MDM2',
  'SMAD4', 'STK11', 'KEAP1', 'NFE2L2', 'ARID1A', 'FBXW7', 'NOTCH1',
  'IDH1', 'IDH2', 'DNMT3A', 'TET2', 'JAK2', 'FLT3', 'NPM1', 'KIT',
  'PDGFRA', 'VHL', 'PBRM1', 'BAP1', 'KDM5C', 'SETD2', 'TSC1', 'TSC2',
  'NF1', 'NF2', 'CTNNB1', 'APC', 'AXIN1', 'PTCH1', 'SMO', 'GLI1',
  'GATA3', 'FOXA1', 'ESR1', 'PGR', 'AR', 'NCOR1', 'RUNX1', 'CEBPA',
  'EZH2', 'KMT2A', 'KMT2B', 'KMT2C', 'KMT2D', 'CREBBP', 'EP300',
  'ASXL1', 'ASXL2', 'ASXL3', 'PHF6', 'BCOR', 'BCORL1', 'KDM6A',
  'MAP2K1', 'MAP2K2', 'MAP3K1', 'MAP3K4', 'MAPK1', 'MAPK3', 'NRAS',
  'HRAS', 'RAF1', 'ARAF', 'SPRY1', 'SPRY2', 'DUSP6', 'DUSP4',
  'MET', 'HGF', 'RON', 'AXL', 'TYRO3', 'MERTK', 'DDR1', 'DDR2',
  'ERBB2', 'ERBB3', 'ERBB4', 'GAS6', 'PROS1', 'TULP3', 'IFT88',
  'HSP90AA1', 'HSP90AB1', 'STUB1', 'BAG3', 'DNAJB1', 'HSF1',
  'GATA6', 'GATA4', 'GATA1', 'GATA2', 'SOX9', 'SOX17', 'SOX2',
];

export const cancerTypes = [
  'Pancreatic Adenocarcinoma (PAAD)',
  'Lung Adenocarcinoma (LUAD)',
  'Lung Squamous Cell Carcinoma (LUSC)',
  'Breast Invasive Carcinoma (BRCA)',
  'Colorectal Adenocarcinoma (COAD)',
  'Glioblastoma (GBM)',
  'Hepatocellular Carcinoma (HCC)',
  'Ovarian Serous Cystadenocarcinoma (OV)',
  'Prostate Adenocarcinoma (PRAD)',
  'Kidney Renal Clear Cell Carcinoma (KIRC)',
  'Bladder Urothelial Carcinoma (BLCA)',
  'Melanoma (SKCM)',
  'Thyroid Carcinoma (THCA)',
  'Cervical Squamous Cell Carcinoma (CESC)',
  'Stomach Adenocarcinoma (STAD)',
  'Esophageal Carcinoma (ESCA)',
  'Head & Neck Squamous Cell Carcinoma (HNSC)',
  'Acute Myeloid Leukemia (LAML)',
  'Diffuse Large B-Cell Lymphoma (DLBC)',
  'Mesothelioma (MESO)',
];

export const analysisTools = [
  { id: 'advanced', label: 'ADVANCED TOOLS', icon: '⚡' },
  { id: 'comparative', label: 'COMPARATIVE ANALYSIS', icon: '📊' },
  { id: 'multiomics', label: 'MULTI-OMICS SYNTHESIS', icon: '🧬' },
  { id: 'advisor', label: 'ADVISOR LAB', icon: '🔬' },
  { id: 'conflict', label: 'CONFLICT ENGINE', icon: '⚔️' },
  { id: 'grants', label: 'PIs & GRANTS', icon: '💰' },
  { id: 'references', label: 'REFERENCES', icon: '📚', count: 47 },
];

export const analysisTabs = [
  'MOLECULAR INSIGHTS',
  'PATHWAY ANALYSIS',
  'SIGNATURE EXPLORER',
  'GO ENRICHMENT',
  'IMMUNE & TME',
  'CLINICAL & TRANSLATIONAL',
  'SURVIVAL ANALYSIS',
  'THERAPEUTIC WINDOW',
  'CLINICAL TRIALS',
  'SEQUENCING DATA',
];

export const intelligenceModels = [
  { id: '31pro', label: '3.1PRO', description: 'Gemini 3.1 Pro - High reasoning', rpm: 2 },
  { id: '3flash', label: '3 FLASH', description: 'Gemini 3 Flash - Fast inference', rpm: 15 },
  { id: 'mockoff', label: 'MOCK OFF', description: 'Disable mock data mode', rpm: null },
  { id: 'standard', label: 'STANDARD', description: 'Standard model', rpm: 10 },
];
