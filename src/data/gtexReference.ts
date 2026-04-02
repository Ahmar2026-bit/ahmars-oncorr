export interface GtexTissue {
  tissue: string;
  geneA_normal: number;
  geneB_normal: number;
}

export const GTEX_REFERENCES: Record<string, GtexTissue[]> = {
  'TCGA-BRCA': [
    { tissue: 'Breast - Mammary Tissue', geneA_normal: 4.2, geneB_normal: 3.8 },
    { tissue: 'Breast - Adipose', geneA_normal: 3.9, geneB_normal: 3.5 },
  ],
  'TCGA-LUAD': [
    { tissue: 'Lung', geneA_normal: 5.1, geneB_normal: 4.7 },
    { tissue: 'Trachea', geneA_normal: 4.8, geneB_normal: 4.3 },
  ],
  'TCGA-PAAD': [
    { tissue: 'Pancreas', geneA_normal: 6.2, geneB_normal: 5.9 },
  ],
  'TCGA-COAD': [
    { tissue: 'Colon - Sigmoid', geneA_normal: 4.5, geneB_normal: 4.1 },
    { tissue: 'Colon - Transverse', geneA_normal: 4.3, geneB_normal: 3.9 },
  ],
  'TCGA-OV': [
    { tissue: 'Ovary', geneA_normal: 3.7, geneB_normal: 3.3 },
  ],
};
