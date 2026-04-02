export interface GenePair {
  geneA: string;
  geneB: string;
  description: string;
}

export const POPULAR_PAIRS: GenePair[] = [
  { geneA: 'GATA6', geneB: 'HSF1', description: 'Transcriptional regulation in PAAD' },
  { geneA: 'KRAS', geneB: 'NRF2', description: 'Oncogenic stress response' },
  { geneA: 'TP53', geneB: 'MYC', description: 'Classic tumor suppressor/oncogene' },
  { geneA: 'BRCA1', geneB: 'BRCA2', description: 'DNA repair pathway' },
  { geneA: 'PD-L1', geneB: 'CD8A', description: 'Immune checkpoint interaction' },
  { geneA: 'EGFR', geneB: 'KRAS', description: 'EGFR-RAS signaling axis' },
  { geneA: 'MYC', geneB: 'BCL2', description: 'Proliferation vs survival' },
  { geneA: 'PIK3CA', geneB: 'PTEN', description: 'PI3K pathway regulation' },
  { geneA: 'VEGFA', geneB: 'HIF1A', description: 'Angiogenesis in hypoxia' },
  { geneA: 'CDK4', geneB: 'CCND1', description: 'Cell cycle regulation' },
];
