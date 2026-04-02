export interface GoTerm {
  id: string;
  term: string;
  fdr: string;
}

export interface Pathway {
  id: string;
  db: string;
  name: string;
  ratio: string;
  fdr: string;
  geneCount: number;
}

export const GO_BIOLOGICAL_PROCESS: GoTerm[] = [
  { id: 'GO:0000082', term: 'G1/S transition of mitotic cell cycle', fdr: '2.3e-12' },
  { id: 'GO:0006260', term: 'DNA replication', fdr: '4.1e-11' },
  { id: 'GO:0007049', term: 'Cell cycle', fdr: '1.2e-10' },
  { id: 'GO:0043066', term: 'Negative regulation of apoptosis', fdr: '3.4e-9' },
  { id: 'GO:0008283', term: 'Cell population proliferation', fdr: '6.7e-9' },
  { id: 'GO:0006954', term: 'Inflammatory response', fdr: '1.1e-8' },
  { id: 'GO:0042127', term: 'Regulation of cell proliferation', fdr: '2.3e-8' },
  { id: 'GO:0016477', term: 'Cell migration', fdr: '4.5e-8' },
  { id: 'GO:0030154', term: 'Cell differentiation', fdr: '7.8e-8' },
  { id: 'GO:0006351', term: 'DNA-templated transcription', fdr: '1.2e-7' },
];

export const GO_MOLECULAR_FUNCTION: GoTerm[] = [
  { id: 'GO:0003677', term: 'DNA binding', fdr: '1.1e-14' },
  { id: 'GO:0004672', term: 'Protein kinase activity', fdr: '2.2e-12' },
  { id: 'GO:0005515', term: 'Protein binding', fdr: '3.3e-11' },
  { id: 'GO:0003700', term: 'DNA-binding transcription factor activity', fdr: '4.4e-10' },
  { id: 'GO:0004871', term: 'Signal transducer activity', fdr: '5.5e-9' },
  { id: 'GO:0016301', term: 'Kinase activity', fdr: '6.6e-8' },
  { id: 'GO:0016787', term: 'Hydrolase activity', fdr: '7.7e-8' },
  { id: 'GO:0004842', term: 'Ubiquitin-protein transferase activity', fdr: '8.8e-8' },
  { id: 'GO:0003682', term: 'Chromatin binding', fdr: '9.9e-8' },
  { id: 'GO:0042802', term: 'Identical protein binding', fdr: '1.1e-7' },
];

export const PATHWAYS: Pathway[] = [
  { id: 'hsa05210', db: 'KEGG', name: 'Colorectal cancer', ratio: '18/142', fdr: '1.2e-9', geneCount: 18 },
  { id: 'hsa04110', db: 'KEGG', name: 'Cell cycle', ratio: '22/125', fdr: '3.4e-11', geneCount: 22 },
  { id: 'hsa04115', db: 'KEGG', name: 'p53 signaling pathway', ratio: '15/69', fdr: '2.1e-10', geneCount: 15 },
  { id: 'hsa04151', db: 'KEGG', name: 'PI3K-Akt signaling pathway', ratio: '31/354', fdr: '4.5e-9', geneCount: 31 },
  { id: 'R-HSA-1640170', db: 'Reactome', name: 'Cell Cycle', ratio: '25/490', fdr: '1.1e-8', geneCount: 25 },
  { id: 'R-HSA-611105', db: 'Reactome', name: 'Transcriptional regulation by small RNAs', ratio: '12/93', fdr: '3.2e-8', geneCount: 12 },
  { id: 'R-HSA-3700989', db: 'Reactome', name: 'Transcriptional Regulation by TP53', ratio: '20/178', fdr: '5.6e-8', geneCount: 20 },
  { id: 'hsa04012', db: 'KEGG', name: 'ErbB signaling pathway', ratio: '14/87', fdr: '7.8e-8', geneCount: 14 },
  { id: 'R-HSA-69278', db: 'Reactome', name: 'Cell Cycle, Mitotic', ratio: '19/387', fdr: '9.1e-8', geneCount: 19 },
  { id: 'hsa04310', db: 'KEGG', name: 'Wnt signaling pathway', ratio: '16/151', fdr: '1.3e-7', geneCount: 16 },
];

const GENE_INTERACTORS: Record<string, string[]> = {
  KRAS: ['TP53', 'SMAD4', 'CDKN2A', 'STK11', 'ERBB2'],
  TP53: ['MDM2', 'CDKN1A', 'BAX', 'BCL2', 'PUMA'],
  EGFR: ['ERBB2', 'MET', 'KRAS', 'PIK3CA', 'AKT1'],
  MYC: ['MAX', 'E2F1', 'CDK4', 'CCND1', 'FOXM1'],
  BRAF: ['MEK1', 'MEK2', 'ERK1', 'ERK2', 'NRAS'],
  GATA6: ['FOXA1', 'CDX2', 'HNF4A', 'PROX1', 'NKX2-1'],
  HSF1: ['HSP90', 'HSP70', 'HSPA1A', 'TRAP1', 'CDC37'],
  PIK3CA: ['AKT1', 'PTEN', 'mTOR', 'S6K1', '4EBP1'],
  BRCA1: ['RAD51', 'PALB2', 'BARD1', 'TP53', 'ATM'],
  STAT3: ['JAK1', 'JAK2', 'IL6', 'VEGF', 'BCL2'],
};

export function getGeneInteractors(gene: string): string[] {
  return GENE_INTERACTORS[gene.toUpperCase()] ?? [];
}

/** Simple seeded PRNG for reproducible shuffles. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getEnrichmentForGenes(geneA: string, geneB: string) {
  const seed = (geneA + geneB).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return {
    biologicalProcess: seededShuffle(GO_BIOLOGICAL_PROCESS, seed),
    molecularFunction: seededShuffle(GO_MOLECULAR_FUNCTION, seed + 7),
    pathways: seededShuffle(PATHWAYS, seed + 13),
  };
}
