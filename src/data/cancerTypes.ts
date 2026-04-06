export interface CancerType {
  id: string;
  shortName: string;
  label: string;
  samples: number;
  /** cBioPortal TCGA study ID, e.g. "brca_tcga" */
  cbioStudyId?: string;
}

export const CANCER_TYPES: CancerType[] = [
  // ── Pan-Cancer ───────────────────────────────────────────────────────────────
  { id: 'PanCancer', shortName: 'Pan-Cancer', label: 'Pan-Cancer (All Types)',                          samples: 10967 },

  // ── Solid Tumours (TCGA) ─────────────────────────────────────────────────────
  { id: 'BRCA',      shortName: 'BRCA',       label: 'BRCA — Breast Invasive Carcinoma',                samples: 1097,  cbioStudyId: 'brca_tcga'        },
  { id: 'LUAD',      shortName: 'LUAD',       label: 'LUAD — Lung Adenocarcinoma',                      samples: 567,   cbioStudyId: 'luad_tcga'        },
  { id: 'LUSC',      shortName: 'LUSC',       label: 'LUSC — Lung Squamous Cell Carcinoma',             samples: 501,   cbioStudyId: 'lusc_tcga'        },
  { id: 'GBM',       shortName: 'GBM',        label: 'GBM — Glioblastoma Multiforme',                   samples: 160,   cbioStudyId: 'gbm_tcga'         },
  { id: 'COAD',      shortName: 'COAD',       label: 'COAD — Colon Adenocarcinoma',                     samples: 461,   cbioStudyId: 'coadread_tcga'    },
  { id: 'PRAD',      shortName: 'PRAD',       label: 'PRAD — Prostate Adenocarcinoma',                  samples: 500,   cbioStudyId: 'prad_tcga'        },
  { id: 'KIRC',      shortName: 'KIRC',       label: 'KIRC — Kidney Renal Clear Cell Carcinoma',        samples: 539,   cbioStudyId: 'kirc_tcga'        },
  { id: 'KIRP',      shortName: 'KIRP',       label: 'KIRP — Kidney Renal Papillary Cell Carcinoma',    samples: 291,   cbioStudyId: 'kirp_tcga'        },
  { id: 'UCEC',      shortName: 'UCEC',       label: 'UCEC — Uterine Corpus Endometrial Carcinoma',     samples: 552,   cbioStudyId: 'ucec_tcga'        },
  { id: 'OV',        shortName: 'OV',         label: 'OV — Ovarian Serous Cystadenocarcinoma',          samples: 311,   cbioStudyId: 'ov_tcga'          },
  { id: 'HNSC',      shortName: 'HNSC',       label: 'HNSC — Head and Neck Squamous Cell Carcinoma',    samples: 522,   cbioStudyId: 'hnsc_tcga'        },
  { id: 'STAD',      shortName: 'STAD',       label: 'STAD — Stomach Adenocarcinoma',                   samples: 415,   cbioStudyId: 'stad_tcga'        },
  { id: 'BLCA',      shortName: 'BLCA',       label: 'BLCA — Bladder Urothelial Carcinoma',             samples: 411,   cbioStudyId: 'blca_tcga'        },
  { id: 'LIHC',      shortName: 'LIHC',       label: 'LIHC — Liver Hepatocellular Carcinoma',           samples: 374,   cbioStudyId: 'lihc_tcga'        },
  { id: 'SKCM',      shortName: 'SKCM',       label: 'SKCM — Skin Cutaneous Melanoma',                  samples: 470,   cbioStudyId: 'skcm_tcga'        },
  { id: 'THCA',      shortName: 'THCA',       label: 'THCA — Thyroid Carcinoma',                        samples: 507,   cbioStudyId: 'thca_tcga'        },
  { id: 'LGG',       shortName: 'LGG',        label: 'LGG — Brain Lower Grade Glioma',                  samples: 516,   cbioStudyId: 'lgg_tcga'         },
  { id: 'PAAD',      shortName: 'PAAD',       label: 'PAAD — Pancreatic Adenocarcinoma',                samples: 185,   cbioStudyId: 'paad_tcga'        },
  { id: 'CESC',      shortName: 'CESC',       label: 'CESC — Cervical Squamous Cell Carcinoma',         samples: 307,   cbioStudyId: 'cesc_tcga'        },
  { id: 'READ',      shortName: 'READ',       label: 'READ — Rectum Adenocarcinoma',                    samples: 166,   cbioStudyId: 'coadread_tcga'    },
  { id: 'PCPG',      shortName: 'PCPG',       label: 'PCPG — Pheochromocytoma & Paraganglioma',         samples: 179,   cbioStudyId: 'pcpg_tcga'        },
  { id: 'SARC',      shortName: 'SARC',       label: 'SARC — Sarcoma',                                  samples: 261,   cbioStudyId: 'sarc_tcga'        },
  { id: 'TGCT',      shortName: 'TGCT',       label: 'TGCT — Testicular Germ Cell Tumours',             samples: 150,   cbioStudyId: 'tgct_tcga'        },
  { id: 'ESCA',      shortName: 'ESCA',       label: 'ESCA — Esophageal Carcinoma',                     samples: 185,   cbioStudyId: 'esca_tcga'        },
  { id: 'MESO',      shortName: 'MESO',       label: 'MESO — Mesothelioma',                             samples: 87,    cbioStudyId: 'meso_tcga'        },
  { id: 'UVM',       shortName: 'UVM',        label: 'UVM — Uveal Melanoma',                            samples: 80,    cbioStudyId: 'uvm_tcga'         },

  // ── B-Cell Lymphomas ─────────────────────────────────────────────────────────
  { id: 'DLBCL',     shortName: 'DLBCL',      label: 'DLBCL — Diffuse Large B-Cell Lymphoma',           samples: 48,    cbioStudyId: 'dlbc_tcga'        },
  { id: 'FL',        shortName: 'FL',         label: 'FL — Follicular Lymphoma',                        samples: 122,   cbioStudyId: 'fl_tcga_2018'     },
  { id: 'BL',        shortName: 'BL',         label: 'BL — Burkitt Lymphoma',                           samples: 119,   cbioStudyId: 'burkitt_broad_2019'},
  { id: 'MCL',       shortName: 'MCL',        label: 'MCL — Mantle Cell Lymphoma',                      samples: 56,    cbioStudyId: 'mcl_idibips_2018' },
  { id: 'CLL',       shortName: 'CLL',        label: 'CLL — Chronic Lymphocytic Leukaemia',             samples: 107,   cbioStudyId: 'cll_iuopa_2015'   },
  { id: 'PMBCL',     shortName: 'PMBCL',      label: 'PMBCL — Primary Mediastinal B-Cell Lymphoma',     samples: 77,    cbioStudyId: 'pmbcl_broad_2019' },

  // ── T-Cell Lymphomas / Leukaemias ────────────────────────────────────────────
  { id: 'PTCL',      shortName: 'PTCL',       label: 'PTCL — Peripheral T-Cell Lymphoma (NOS)',         samples: 74,    cbioStudyId: 'ptcl_mskcc_2021'  },
  { id: 'ALCL',      shortName: 'ALCL',       label: 'ALCL — Anaplastic Large Cell Lymphoma',           samples: 55,    cbioStudyId: 'alcl_mskcc_2015'  },
  { id: 'AITL',      shortName: 'AITL',       label: 'AITL — Angioimmunoblastic T-Cell Lymphoma',       samples: 105,   cbioStudyId: 'aitl_nat_2015'    },
  { id: 'CTCL',      shortName: 'CTCL',       label: 'CTCL — Cutaneous T-Cell Lymphoma (MF/SS)',        samples: 101,   cbioStudyId: 'ctcl_columbia_2015'},
  { id: 'TALL',      shortName: 'T-ALL',      label: 'T-ALL — T-Cell Acute Lymphoblastic Leukaemia',    samples: 174,   cbioStudyId: 'all_stjude_2016'  },
  { id: 'ENKTL',     shortName: 'ENKTL',      label: 'ENKTL — Extranodal NK/T-Cell Lymphoma',           samples: 68,    cbioStudyId: 'nktcl_ntu_2022'   },

  // ── Other Haematologic Malignancies ──────────────────────────────────────────
  { id: 'LAML',      shortName: 'AML',        label: 'AML — Acute Myeloid Leukaemia',                   samples: 200,   cbioStudyId: 'laml_tcga'        },
  { id: 'BALL',      shortName: 'B-ALL',      label: 'B-ALL — B-Cell Acute Lymphoblastic Leukaemia',    samples: 207,   cbioStudyId: 'all_phase2_target_2018_pub'},
  { id: 'CML',       shortName: 'CML',        label: 'CML — Chronic Myeloid Leukaemia',                 samples: 84,    cbioStudyId: 'cml_dfci_2013'    },
  { id: 'MM',        shortName: 'MM',         label: 'MM — Multiple Myeloma',                           samples: 205,   cbioStudyId: 'mm_broad'         },
  { id: 'MDS',       shortName: 'MDS',        label: 'MDS — Myelodysplastic Syndrome',                  samples: 200,   cbioStudyId: 'mds_mskcc_2020'   },
  { id: 'MPN',       shortName: 'MPN',        label: 'MPN — Myeloproliferative Neoplasm',               samples: 197,   cbioStudyId: 'mpn_stm_2022'     },
];

export const DEFAULT_CANCER_ID = 'BRCA';

export function getCancerById(id: string): CancerType {
  return CANCER_TYPES.find((c) => c.id === id) ?? CANCER_TYPES.find((c) => c.id === DEFAULT_CANCER_ID)!;
}
