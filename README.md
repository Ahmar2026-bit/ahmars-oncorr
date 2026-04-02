# OncoCorr — Interactive Gene Correlation Engine

**OncoCorr** is a production-ready, AI-augmented translational oncology research platform for visualizing and analyzing gene expression correlations across patient cohorts.

## Phase 1: Interactive Correlation Engine

### Features

- **Interactive Scatter Plot** — visualize gene-gene expression correlations across 700 mock TCGA samples per cancer type, color-coded by mutation status (MUTANT / WILDTYPE / NORMAL)
- **Gene Selector** — autocomplete search over 150+ oncology genes (Gene A & Gene B), with a one-click swap button and popular gene-pair quick-select buttons (GATA6 vs HSF1, KRAS vs NRF2, TP53 vs MYC, BRCA1 vs BRCA2, PD-L1 vs CD8A, and more)
- **Precision Filters** — real-time filtering by Pearson |R| threshold (slider), P-value significance (dropdown), minimum sample size (slider), molecular subtype (checkboxes), and GTEx normal-tissue overlay toggle
- **Cancer Type Selector** — TCGA-BRCA (Breast), TCGA-LUAD (Lung), TCGA-PAAD (Pancreatic), TCGA-COAD (Colorectal), TCGA-OV (Ovarian)
- **Analysis Metrics Box** — Pearson R with 95% CI, P-value with significance stars (\*, \*\*, \*\*\*), effect size label, and sample count
- **Statistics Panel** — mean expression, expression range, coefficient of variation, outlier detection, and subtype breakdown
- **Export** — download filtered data as CSV or copy stats to clipboard
- **Dark Professional Theme** — navy background (#0f172a), blue/red/green accents, smooth Framer Motion transitions

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Animations | Framer Motion |
| Data | Mock TCGA/GTEx data (no backend required) |

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# → http://localhost:5173

# Production build
npm run build
```

### Deploy to Vercel

The repository includes a `vercel.json` configuration. Simply import the repository at https://vercel.com/new and click **Deploy** — no additional configuration needed.

### Project Structure

```
src/
├── components/      # Header, LeftSidebar, MainCanvas, CorrelationPlot,
│                    # FilterPanel, GeneSelector, MetricsBox, StatsPanel, ExportButtons
├── hooks/           # useCorrelationData, useFilters, useSelection
├── data/            # mockTCGAData, geneDatabase, popularPairs, gtexReference
├── types/           # correlation.ts, patient.ts
├── utils/           # statistics.ts, dataGeneration.ts, filtering.ts
└── App.tsx
```
