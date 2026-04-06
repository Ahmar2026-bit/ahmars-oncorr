export interface CancerType {
  id: string;
  shortName: string;
  label: string;
  samples: number;
  /** cBioPortal TCGA study ID, e.g. "brca_tcga" */
  cbioStudyId?: string;
}

export const CANCER_TYPES: CancerType[] = [
  { id: 'PanCancer', shortName: 'Pan-Cancer', label: 'Pan-Cancer (All Types)',                       samples: 10967 },
  { id: 'BRCA',      shortName: 'BRCA',       label: 'BRCA — Breast Invasive Carcinoma',             samples: 1097,  cbioStudyId: 'brca_tcga'        },
  { id: 'LUAD',      shortName: 'LUAD',       label: 'LUAD — Lung Adenocarcinoma',                   samples: 567,   cbioStudyId: 'luad_tcga'        },
  { id: 'LUSC',      shortName: 'LUSC',       label: 'LUSC — Lung Squamous Cell Carcinoma',          samples: 501,   cbioStudyId: 'lusc_tcga'        },
  { id: 'GBM',       shortName: 'GBM',        label: 'GBM — Glioblastoma Multiforme',                samples: 160,   cbioStudyId: 'gbm_tcga'         },
  { id: 'COAD',      shortName: 'COAD',       label: 'COAD — Colon Adenocarcinoma',                  samples: 461,   cbioStudyId: 'coadread_tcga'    },
  { id: 'PRAD',      shortName: 'PRAD',       label: 'PRAD — Prostate Adenocarcinoma',               samples: 500,   cbioStudyId: 'prad_tcga'        },
  { id: 'KIRC',      shortName: 'KIRC',       label: 'KIRC — Kidney Renal Clear Cell Carcinoma',     samples: 539,   cbioStudyId: 'kirc_tcga'        },
  { id: 'UCEC',      shortName: 'UCEC',       label: 'UCEC — Uterine Corpus Endometrial Carcinoma',  samples: 552,   cbioStudyId: 'ucec_tcga'        },
  { id: 'OV',        shortName: 'OV',         label: 'OV — Ovarian Serous Cystadenocarcinoma',       samples: 311,   cbioStudyId: 'ov_tcga'          },
  { id: 'HNSC',      shortName: 'HNSC',       label: 'HNSC — Head and Neck Squamous Cell Carcinoma', samples: 522,   cbioStudyId: 'hnsc_tcga'        },
  { id: 'STAD',      shortName: 'STAD',       label: 'STAD — Stomach Adenocarcinoma',                samples: 415,   cbioStudyId: 'stad_tcga'        },
  { id: 'BLCA',      shortName: 'BLCA',       label: 'BLCA — Bladder Urothelial Carcinoma',          samples: 411,   cbioStudyId: 'blca_tcga'        },
  { id: 'LIHC',      shortName: 'LIHC',       label: 'LIHC — Liver Hepatocellular Carcinoma',        samples: 374,   cbioStudyId: 'lihc_tcga'        },
  { id: 'SKCM',      shortName: 'SKCM',       label: 'SKCM — Skin Cutaneous Melanoma',               samples: 470,   cbioStudyId: 'skcm_tcga'        },
  { id: 'THCA',      shortName: 'THCA',       label: 'THCA — Thyroid Carcinoma',                     samples: 507,   cbioStudyId: 'thca_tcga'        },
  { id: 'LGG',       shortName: 'LGG',        label: 'LGG — Brain Lower Grade Glioma',               samples: 516,   cbioStudyId: 'lgg_tcga'         },
];

export const DEFAULT_CANCER_ID = 'BRCA';

export function getCancerById(id: string): CancerType {
  return CANCER_TYPES.find((c) => c.id === id) ?? CANCER_TYPES.find((c) => c.id === DEFAULT_CANCER_ID)!;
}
