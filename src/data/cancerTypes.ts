export interface CancerType {
  id: string;
  shortName: string;
  label: string;
  samples: number;
}

export const CANCER_TYPES: CancerType[] = [
  { id: 'PanCancer', shortName: 'Pan-Cancer', label: 'Pan-Cancer (All Types)',                       samples: 10967 },
  { id: 'BRCA',      shortName: 'BRCA',       label: 'BRCA — Breast Invasive Carcinoma',             samples: 1097  },
  { id: 'LUAD',      shortName: 'LUAD',       label: 'LUAD — Lung Adenocarcinoma',                   samples: 567   },
  { id: 'LUSC',      shortName: 'LUSC',       label: 'LUSC — Lung Squamous Cell Carcinoma',          samples: 501   },
  { id: 'GBM',       shortName: 'GBM',        label: 'GBM — Glioblastoma Multiforme',                samples: 160   },
  { id: 'COAD',      shortName: 'COAD',       label: 'COAD — Colon Adenocarcinoma',                  samples: 461   },
  { id: 'PRAD',      shortName: 'PRAD',       label: 'PRAD — Prostate Adenocarcinoma',               samples: 500   },
  { id: 'KIRC',      shortName: 'KIRC',       label: 'KIRC — Kidney Renal Clear Cell Carcinoma',     samples: 539   },
  { id: 'UCEC',      shortName: 'UCEC',       label: 'UCEC — Uterine Corpus Endometrial Carcinoma',  samples: 552   },
  { id: 'OV',        shortName: 'OV',         label: 'OV — Ovarian Serous Cystadenocarcinoma',       samples: 311   },
  { id: 'HNSC',      shortName: 'HNSC',       label: 'HNSC — Head and Neck Squamous Cell Carcinoma', samples: 522   },
  { id: 'STAD',      shortName: 'STAD',       label: 'STAD — Stomach Adenocarcinoma',                samples: 415   },
  { id: 'BLCA',      shortName: 'BLCA',       label: 'BLCA — Bladder Urothelial Carcinoma',          samples: 411   },
  { id: 'LIHC',      shortName: 'LIHC',       label: 'LIHC — Liver Hepatocellular Carcinoma',        samples: 374   },
  { id: 'SKCM',      shortName: 'SKCM',       label: 'SKCM — Skin Cutaneous Melanoma',               samples: 470   },
  { id: 'THCA',      shortName: 'THCA',       label: 'THCA — Thyroid Carcinoma',                     samples: 507   },
  { id: 'LGG',       shortName: 'LGG',        label: 'LGG — Brain Lower Grade Glioma',               samples: 516   },
];

export const DEFAULT_CANCER_ID = 'BRCA';

export function getCancerById(id: string): CancerType {
  return CANCER_TYPES.find((c) => c.id === id) ?? CANCER_TYPES[1];
}
