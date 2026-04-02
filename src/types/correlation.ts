export interface CorrelationResult {
  pearson_r: number;
  p_value: number;
  n_samples: number;
  ci_lower: number;
  ci_upper: number;
  mean_geneA: number;
  mean_geneB: number;
  outliers: string[];
}

export interface FilterState {
  pearsonThreshold: number;
  pValueThreshold: number;
  sampleSizeMin: number;
  selectedSubtypes: string[];
  showGtex: boolean;
  cancerType: string;
}
