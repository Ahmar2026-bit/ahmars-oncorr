export interface Investigator {
  name: string;
  institution: string;
  focus: string;
  h_index: number;
  grants: string[];
}

export const INVESTIGATORS: Investigator[] = [
  {
    name: 'Dr. Jennifer A. Pietenpol',
    institution: 'Vanderbilt University Medical Center',
    focus: 'TP53 tumor suppressor, Triple-negative breast cancer',
    h_index: 87,
    grants: ['R35CA197463', 'P50CA098131'],
  },
  {
    name: 'Dr. Channing J. Der',
    institution: 'University of North Carolina at Chapel Hill',
    focus: 'RAS oncogene signaling, KRAS-driven pancreatic cancer',
    h_index: 103,
    grants: ['R01CA042978', 'U01CA199235'],
  },
  {
    name: 'Dr. Lewis C. Cantley',
    institution: 'Weill Cornell Medicine',
    focus: 'PI3K signaling, metabolic reprogramming in cancer',
    h_index: 152,
    grants: ['R35CA197588', 'P01CA120964'],
  },
  {
    name: 'Dr. Todd R. Golub',
    institution: 'Broad Institute of MIT and Harvard',
    focus: 'Cancer genomics, transcriptional regulation in leukemia',
    h_index: 128,
    grants: ['U54HG003067', 'R35CA197568'],
  },
  {
    name: 'Dr. Joan S. Brugge',
    institution: 'Harvard Medical School',
    focus: 'Breast cancer 3D organoids, ERBB2 signaling',
    h_index: 94,
    grants: ['R35CA197529', 'P01CA080111'],
  },
  {
    name: 'Dr. Ronald A. DePinho',
    institution: 'University of Texas MD Anderson Cancer Center',
    focus: 'Telomere biology, KRAS/MYC oncogenic cooperation',
    h_index: 116,
    grants: ['R01CA084628', 'P01CA117969'],
  },
  {
    name: 'Dr. Levi Garraway',
    institution: 'Dana-Farber Cancer Institute',
    focus: 'Tumor heterogeneity, resistance mechanisms, BRAF melanoma',
    h_index: 89,
    grants: ['R01CA193461', 'U01CA176058'],
  },
  {
    name: 'Dr. Eric S. Lander',
    institution: 'Broad Institute of MIT and Harvard',
    focus: 'Cancer genome sequencing, driver gene discovery',
    h_index: 199,
    grants: ['U54HG003067', 'U41HG007000'],
  },
];

export interface PublicDataset {
  gse_id: string;
  type: 'RNA-seq' | 'scRNA-seq' | 'ChIP-seq' | 'ATAC-seq';
  description: string;
  platform: string;
  samples: number;
  pmid: string;
}

export const PUBLIC_DATASETS: PublicDataset[] = [
  {
    gse_id: 'GSE162804',
    type: 'RNA-seq',
    description: 'TCGA Pan-cancer atlas — bulk RNA-seq across 33 tumor types',
    platform: 'Illumina HiSeq',
    samples: 10967,
    pmid: '33030417',
  },
  {
    gse_id: 'GSE148842',
    type: 'scRNA-seq',
    description: 'Single-cell transcriptomics of pancreatic ductal adenocarcinoma',
    platform: '10x Chromium v3',
    samples: 57530,
    pmid: '33159019',
  },
  {
    gse_id: 'GSE119873',
    type: 'ChIP-seq',
    description: 'GATA6 and FOXA1 co-occupancy in pancreatic cancer cell lines',
    platform: 'Illumina NextSeq',
    samples: 24,
    pmid: '30303708',
  },
  {
    gse_id: 'GSE174574',
    type: 'ATAC-seq',
    description: 'Chromatin accessibility landscape in KRAS-mutant lung adenocarcinoma',
    platform: 'Illumina NovaSeq',
    samples: 48,
    pmid: '34145222',
  },
  {
    gse_id: 'GSE215032',
    type: 'RNA-seq',
    description: 'HSF1-regulated transcriptome in breast cancer under proteotoxic stress',
    platform: 'Illumina HiSeq 4000',
    samples: 36,
    pmid: '36446301',
  },
  {
    gse_id: 'GSE196006',
    type: 'scRNA-seq',
    description: 'Tumor microenvironment atlas of colorectal cancer at single-cell resolution',
    platform: '10x Genomics Multiome',
    samples: 371223,
    pmid: '35227310',
  },
  {
    gse_id: 'GSE147082',
    type: 'RNA-seq',
    description: 'TP53/MYC co-amplification in high-grade serous ovarian carcinoma',
    platform: 'Illumina HiSeq 2500',
    samples: 180,
    pmid: '32589940',
  },
  {
    gse_id: 'GSE181919',
    type: 'ATAC-seq',
    description: 'Regulatory element dynamics downstream of EGFR in lung cancer',
    platform: 'Illumina NovaSeq 6000',
    samples: 60,
    pmid: '34795543',
  },
];
