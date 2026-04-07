import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Layers, Loader2, AlertCircle, Info, Download, RefreshCw } from 'lucide-react';
import { getCancerById } from '../data/cancerTypes';
import { askAI, activeProvider } from '../services/aiService';
import { renderMarkdown } from '../utils/markdown';
import ProviderBadge from './ProviderBadge';
import type { AIProvider } from '../services/aiService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MatrixCell {
  r: number;
  pValue: number;
}

interface GeneMatrix {
  genes: string[];
  cells: MatrixCell[][]; // cells[i][j] = correlation between genes[i] and genes[j]
}

interface CorrelationPair {
  geneA: string;
  geneB: string;
  r: number;
  pValue: number;
}

interface SignatureCluster {
  name: string;
  genes: string[];
  avgCorrelation: number;
  function: string;
}

interface SignatureDriver {
  gene: string;
  role: string;
  clinicalRelevance: string;
}

interface SignatureData {
  clusters: SignatureCluster[];
  keyDrivers: SignatureDriver[];
  biomarkerPotential: 'high' | 'moderate' | 'low';
  signatureType: string;
  clinicalInterpretation: string;
}

interface BarEntry {
  name: string;
  r: number;
  pValue: number;
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

const MAX_GENES = 12;

function parseGenes(input: string): string[] {
  return input
    .split(/[,;\s\n]+/)
    .map((g) => g.trim().toUpperCase())
    .filter((g) => /^[A-Z][A-Z0-9-]{0,19}$/.test(g));
}

/** Abramowitz & Stegun normal CDF approximation (max error 7.5e-8). */
function normalCDF(x: number): number {
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.2316419 * ax);
  const d = 0.3989423 * Math.exp((-ax * ax) / 2);
  const upperTail =
    d *
    t *
    (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.821256 + t * 1.3302744))));
  return x >= 0 ? 1 - upperTail : upperTail;
}

function pValueFromR(r: number, n: number): number {
  if (n <= 2) return 1;
  const t = (r * Math.sqrt(n - 2)) / Math.sqrt(Math.max(1e-10, 1 - r * r));
  return 2 * normalCDF(-Math.abs(t));
}

/**
 * Compute Pearson r between two genes using the same deterministic RNG as
 * GeneCorrelation.tsx so values are cross-component consistent.
 * Gene names are sorted before seeding to guarantee a symmetric matrix.
 */
function computePearsonR(geneA: string, geneB: string, cancerType: string, n = 60): MatrixCell {
  if (geneA === geneB) return { r: 1.0, pValue: 0 };
  const [a, b] = [geneA, geneB].sort();
  const seed = [...(a + b + cancerType)].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  let s = seed;
  const rng = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
  const baseR = ((seed % 200) - 100) / 100;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const x = rng() * 10 + 1;
    const noise = (rng() - 0.5) * (1 - Math.abs(baseR)) * 8;
    const y = Math.max(0, baseR * x + (rng() * 3 + 1) + noise);
    pts.push({ x, y });
  }
  const mx = pts.reduce((acc, p) => acc + p.x, 0) / n;
  const my = pts.reduce((acc, p) => acc + p.y, 0) / n;
  const num = pts.reduce((acc, p) => acc + (p.x - mx) * (p.y - my), 0);
  const den = Math.sqrt(
    pts.reduce((acc, p) => acc + (p.x - mx) ** 2, 0) *
      pts.reduce((acc, p) => acc + (p.y - my) ** 2, 0),
  );
  const r = den === 0 ? 0 : num / den;
  return { r: +r.toFixed(3), pValue: +pValueFromR(r, n).toFixed(4) };
}

function buildMatrix(genes: string[], cancerType: string): GeneMatrix {
  return {
    genes,
    cells: genes.map((gA) => genes.map((gB) => computePearsonR(gA, gB, cancerType))),
  };
}

function getOffDiagonalPairs(matrix: GeneMatrix): CorrelationPair[] {
  const pairs: CorrelationPair[] = [];
  for (let i = 0; i < matrix.genes.length; i++) {
    for (let j = i + 1; j < matrix.genes.length; j++) {
      pairs.push({
        geneA: matrix.genes[i],
        geneB: matrix.genes[j],
        r: matrix.cells[i][j].r,
        pValue: matrix.cells[i][j].pValue,
      });
    }
  }
  return pairs;
}

/** Diverging color scale: blue (r = −1) → white (r = 0) → red (r = +1). */
function corrColor(r: number): string {
  const norm = (r + 1) / 2;
  const n = Math.max(0, Math.min(1, norm));
  const rv = n <= 0.5 ? Math.round(59 + (255 - 59) * n * 2) : 255;
  const g =
    n <= 0.5
      ? Math.round(130 + (255 - 130) * n * 2)
      : Math.round(255 - (255 - 68) * (n - 0.5) * 2);
  const bv =
    n <= 0.5
      ? Math.round(246 + (255 - 246) * n * 2)
      : Math.round(255 - (255 - 68) * (n - 0.5) * 2);
  return `rgb(${rv},${g},${bv})`;
}

function rStrength(r: number): { label: string; cls: string } {
  const abs = Math.abs(r);
  if (abs >= 0.7)
    return {
      label: r > 0 ? 'Strong positive' : 'Strong negative',
      cls: r > 0 ? 'text-green-600' : 'text-red-600',
    };
  if (abs >= 0.4)
    return {
      label: r > 0 ? 'Moderate positive' : 'Moderate negative',
      cls: 'text-yellow-600',
    };
  if (abs >= 0.2)
    return { label: r > 0 ? 'Weak positive' : 'Weak negative', cls: 'text-gray-500' };
  return { label: 'Negligible', cls: 'text-gray-400' };
}

function formatP(p: number): string {
  if (p === 0) return 'p = 0';
  if (p < 0.001) return 'p < 0.001';
  if (p < 0.01) return `p = ${p.toFixed(3)}`;
  return `p = ${p.toFixed(3)}`;
}

function potentialBadge(level: 'high' | 'moderate' | 'low'): { cls: string; label: string } {
  if (level === 'high')
    return { cls: 'bg-green-100 text-green-700 border-green-300', label: 'High biomarker potential' };
  if (level === 'moderate')
    return { cls: 'bg-yellow-100 text-yellow-700 border-yellow-300', label: 'Moderate potential' };
  return { cls: 'bg-gray-100 text-gray-500 border-gray-300', label: 'Low potential' };
}

function parseSignatureData(text: string): SignatureData | null {
  const m = text.match(/```signature\n([\s\S]*?)```/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as SignatureData;
  } catch {
    return null;
  }
}

function removeSignatureFence(text: string): string {
  return text.replace(/```signature\n[\s\S]*?```/g, '').trim();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SignatureExplorer({
  geneA,
  geneB,
  cancerType,
}: {
  geneA: string;
  geneB: string;
  cancerType: string;
}) {
  const cancer = getCancerById(cancerType);
  const defaultInput = [geneA, geneB].filter(Boolean).join(', ');

  const [geneInput, setGeneInput] = useState(defaultInput);
  const [matrix, setMatrix] = useState<GeneMatrix | null>(null);
  const [sigData, setSigData] = useState<SignatureData | null>(null);
  const [aiText, setAiText] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>(activeProvider);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysed, setAnalysed] = useState(false);
  const [pairFilter, setPairFilter] = useState<'all' | 'positive' | 'negative' | 'strong'>('all');
  const [hoveredCell, setHoveredCell] = useState<{
    geneA: string;
    geneB: string;
    r: number;
    pValue: number;
    top: number;
    left: number;
  } | null>(null);

  async function analyse() {
    const genes = parseGenes(geneInput);
    if (genes.length < 2) {
      setError('Enter at least 2 valid gene symbols separated by commas (e.g. TP53, BRCA1, EGFR).');
      return;
    }
    if (genes.length > MAX_GENES) {
      setError(`Please enter at most ${MAX_GENES} genes for a readable matrix.`);
      return;
    }

    setError('');
    setAnalysed(true);
    setAiText('');
    setSigData(null);

    // Build correlation matrix synchronously — no spinner needed for synthetic data
    const mat = buildMatrix(genes, cancerType);
    setMatrix(mat);

    // Top pairs by |r| for AI context
    const topPairs = getOffDiagonalPairs(mat)
      .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
      .slice(0, 15);

    const pairsSummary = topPairs
      .map((p) => `  ${p.geneA}–${p.geneB}: r = ${p.r > 0 ? '+' : ''}${p.r} (${formatP(p.pValue)})`)
      .join('\n');

    setLoading(true);
    try {
      const prompt =
        `Perform a biomarker signature analysis for the following gene panel in ${cancer.label}.\n\n` +
        `Gene panel (${genes.length} genes): ${genes.join(', ')}\n` +
        `Cancer cohort: ${cancer.label} · ${cancer.samples.toLocaleString()} TCGA samples\n\n` +
        `Computed pairwise Pearson correlations (synthetic TCGA-like, n = 60 per pair):\n` +
        `${pairsSummary}\n\n` +
        `IMPORTANT: You MUST output a \`\`\`signature JSON block with this exact schema:\n` +
        '```signature\n' +
        '{\n' +
        '  "clusters": [\n' +
        '    { "name": "DNA Damage Response", "genes": ["TP53", "BRCA1"], "avgCorrelation": 0.65, "function": "Coordinates homologous recombination and apoptosis" },\n' +
        '    { "name": "Proliferation Axis", "genes": ["MYC", "CCND1"], "avgCorrelation": 0.58, "function": "Drives G1/S transition and ribosome biogenesis" }\n' +
        '  ],\n' +
        '  "keyDrivers": [\n' +
        '    { "gene": "TP53", "role": "Master tumour suppressor / hub", "clinicalRelevance": "Mutated in >50% cancers; governs response to DNA-damaging agents" }\n' +
        '  ],\n' +
        '  "biomarkerPotential": "high",\n' +
        '  "signatureType": "DNA damage / cell cycle checkpoint",\n' +
        '  "clinicalInterpretation": "This panel captures the interplay between DNA-repair competence and proliferative drive, with direct implications for PARP inhibitor and CDK4/6 inhibitor sensitivity."\n' +
        '}\n' +
        '```\n\n' +
        'After the JSON block provide a scientific narrative:\n\n' +
        `## Signature Biology\n` +
        `What does this gene set collectively represent biologically in ${cancer.shortName}? ` +
        `Describe the dominant functional theme.\n\n` +
        `## Co-regulation Analysis\n` +
        `Explain the two or three strongest gene pair correlations mechanistically. ` +
        `Why would these genes be co-expressed?\n\n` +
        `## Biomarker Application\n` +
        `How could this signature be applied clinically? Reference published multi-gene panels ` +
        `(e.g. OncotypeDX, PAM50, MammaPrint, Decipher) if related.\n\n` +
        `## Therapeutic Angles\n` +
        `Which genes in this panel are directly targetable? List approved or late-stage drugs ` +
        `and expected patient populations.\n\n` +
        `Use **bold** for gene names, drug names, and key terms.`;

      const response = await askAI(prompt);
      const parsed = parseSignatureData(response.text);
      const cleanText = removeSignatureFence(response.text);
      setSigData(parsed);
      setAiText(cleanText);
      setAiProvider(response.provider);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'AI analysis failed. Matrix is still shown above.');
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    if (!matrix) return;
    const { genes, cells } = matrix;
    const header = ['gene', ...genes].join(',');
    const rows = genes.map((g, i) => [g, ...cells[i].map((c) => c.r)].join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `oncorr_signature_${genes.slice(0, 4).join('_')}_${cancerType}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const allPairs = matrix ? getOffDiagonalPairs(matrix) : [];
  const filteredPairs = allPairs
    .filter((p) => {
      if (pairFilter === 'positive') return p.r > 0.2;
      if (pairFilter === 'negative') return p.r < -0.2;
      if (pairFilter === 'strong') return Math.abs(p.r) >= 0.5;
      return true;
    })
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  const strongPositive = allPairs.filter((p) => p.r >= 0.5).length;
  const strongNegative = allPairs.filter((p) => p.r <= -0.5).length;
  const meanAbsR =
    allPairs.length > 0
      ? (allPairs.reduce((s, p) => s + Math.abs(p.r), 0) / allPairs.length).toFixed(2)
      : '—';

  const barData: BarEntry[] = allPairs
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
    .slice(0, 10)
    .map((p) => ({ name: `${p.geneA}–${p.geneB}`, r: p.r, pValue: p.pValue }));

  const nGenes = matrix?.genes.length ?? 0;
  const cellPx = nGenes <= 4 ? 56 : nGenes <= 8 ? 44 : 36;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Layers size={15} className="text-brand-600" />
          Signature Explorer
        </h2>
        <p className="text-xs text-gray-500">
          Visualise the pairwise correlation matrix for a custom gene panel and discover
          co-regulated biomarker signatures in {cancer.shortName} (TCGA).
        </p>
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Gene Panel{' '}
            <span className="font-normal text-gray-400">(comma-separated, 2–{MAX_GENES} genes)</span>
          </label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. TP53, BRCA1, EGFR, MYC, BCL2"
            value={geneInput}
            onChange={(e) => setGeneInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && analyse()}
          />
        </div>
        <button
          onClick={analyse}
          disabled={loading || !geneInput.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />}
          {loading ? 'Analysing…' : 'Build Signature'}
        </button>
        {matrix && (
          <>
            <button
              onClick={analyse}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-500"
              title="Recompute"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={downloadCSV}
              className="flex items-center gap-1 px-2.5 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 text-xs"
              title="Download correlation matrix as CSV"
            >
              <Download size={13} />
              CSV
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-5">
        {matrix && (
          <div className="space-y-5">
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-center">
                <p className="text-lg font-bold text-gray-700">{matrix.genes.length}</p>
                <p className="text-xs text-gray-500">Genes</p>
              </div>
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-center">
                <p className="text-lg font-bold text-gray-700">{allPairs.length}</p>
                <p className="text-xs text-gray-500">Gene Pairs</p>
              </div>
              <div className="p-2.5 bg-green-50 border border-green-200 rounded-xl text-center">
                <p className="text-lg font-bold text-green-700">{strongPositive}</p>
                <p className="text-xs text-green-600">Strong + (r ≥ 0.5)</p>
              </div>
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-center">
                <p className="text-lg font-bold text-red-700">{strongNegative}</p>
                <p className="text-xs text-red-600">Strong − (r ≤ −0.5)</p>
              </div>
            </div>

            {/* Heatmap */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">
                Pairwise Correlation Matrix · {cancer.shortName} · Pearson r
              </p>
              <div className="overflow-x-auto">
                <table className="border-collapse text-xs select-none">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 56 }} />
                      {matrix.genes.map((g) => (
                        <th
                          key={g}
                          style={{ width: cellPx, maxWidth: cellPx, paddingBottom: 4 }}
                          className="text-center font-medium text-gray-500"
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              writingMode: 'vertical-rl',
                              transform: 'rotate(180deg)',
                              maxHeight: 64,
                              overflow: 'hidden',
                            }}
                          >
                            {g}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.genes.map((rowGene, i) => (
                      <tr key={rowGene}>
                        <td className="text-right font-medium text-gray-600 pr-2 whitespace-nowrap text-xs">
                          {rowGene}
                        </td>
                        {matrix.genes.map((colGene, j) => {
                          const cell = matrix.cells[i][j];
                          const isDiag = i === j;
                          return (
                            <td
                              key={colGene}
                              style={{
                                width: cellPx,
                                height: cellPx,
                                backgroundColor: corrColor(cell.r),
                                border: '1px solid rgba(255,255,255,0.7)',
                                cursor: isDiag ? 'default' : 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                if (isDiag) return;
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoveredCell({
                                  geneA: rowGene,
                                  geneB: colGene,
                                  r: cell.r,
                                  pValue: cell.pValue,
                                  top: rect.bottom + 4,
                                  left: rect.left,
                                });
                              }}
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              {cellPx >= 44 && !isDiag && (
                                <span
                                  className="flex items-center justify-center h-full text-[9px] font-mono leading-none"
                                  style={{
                                    color: Math.abs(cell.r) > 0.55 ? 'white' : '#374151',
                                  }}
                                >
                                  {cell.r.toFixed(2)}
                                </span>
                              )}
                              {isDiag && (
                                <span
                                  className="flex items-center justify-center h-full text-[9px] font-bold leading-none"
                                  style={{ color: 'rgba(0,0,0,0.35)' }}
                                >
                                  1.0
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Color legend */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-400">−1.0</span>
                <div
                  style={{
                    height: 8,
                    width: 120,
                    background:
                      'linear-gradient(to right, rgb(59,130,246), white, rgb(255,68,68))',
                    borderRadius: 4,
                  }}
                />
                <span className="text-xs text-gray-400">+1.0</span>
                <span className="flex items-center gap-1 text-xs text-gray-400 ml-2">
                  <Info size={10} />
                  Hover cells for details
                </span>
              </div>
            </div>

            {/* Top correlations bar chart */}
            {barData.length > 1 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">
                  Top Pairwise Correlations by |r|
                </p>
                <ResponsiveContainer width="100%" height={Math.max(160, barData.length * 26)}>
                  <BarChart
                    data={barData}
                    layout="vertical"
                    margin={{ top: 0, right: 48, left: 110, bottom: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[-1, 1]}
                      tickCount={5}
                      tick={{ fontSize: 10 }}
                      label={{
                        value: 'Pearson r',
                        position: 'insideBottom',
                        offset: -10,
                        fontSize: 10,
                      }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 9 }}
                      width={110}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as BarEntry;
                        const str = rStrength(d.r);
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm text-xs">
                            <p className="font-semibold text-gray-800">{d.name}</p>
                            <p className="mt-0.5">
                              <span className="text-gray-500">r =</span>{' '}
                              <span className={`font-mono font-bold ${str.cls}`}>
                                {d.r > 0 ? '+' : ''}
                                {d.r}
                              </span>
                            </p>
                            <p className={d.pValue < 0.05 ? 'text-green-600' : 'text-gray-500'}>
                              {formatP(d.pValue)}
                            </p>
                            <p className={`font-medium ${str.cls}`}>{str.label}</p>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine x={0} stroke="#9ca3af" strokeWidth={1} />
                    <Bar dataKey="r" radius={[0, 3, 3, 0]}>
                      {barData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.r >= 0 ? '#16a34a' : '#dc2626'}
                          fillOpacity={0.75}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* AI loading indicator */}
            {loading && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                <Loader2 size={13} className="animate-spin" />
                Running AI signature analysis…
              </div>
            )}

            {/* AI structured signature data */}
            {sigData && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-600">AI Signature:</span>
                  <span className="text-xs font-semibold text-gray-700">
                    {sigData.signatureType}
                  </span>
                  {(() => {
                    const b = potentialBadge(sigData.biomarkerPotential);
                    return (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium ${b.cls}`}
                      >
                        {b.label}
                      </span>
                    );
                  })()}
                </div>

                {sigData.clinicalInterpretation && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                    <p className="font-medium text-blue-500 mb-0.5">Clinical Interpretation</p>
                    <p>{sigData.clinicalInterpretation}</p>
                  </div>
                )}

                {sigData.clusters.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1.5">
                      Co-regulated Gene Clusters
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sigData.clusters.map((cluster, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:border-brand-200 hover:bg-brand-50 transition-colors"
                        >
                          <p className="font-semibold text-gray-800 text-xs">{cluster.name}</p>
                          <p className="text-xs font-mono text-brand-600 mt-0.5">
                            {cluster.genes.join(' · ')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{cluster.function}</p>
                          {cluster.avgCorrelation > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              avg r = +{cluster.avgCorrelation.toFixed(2)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sigData.keyDrivers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1.5">Key Driver Genes</p>
                    <div className="space-y-1.5">
                      {sigData.keyDrivers.map((driver, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-brand-200 transition-colors"
                        >
                          <span className="font-mono font-bold text-brand-600 text-sm flex-shrink-0">
                            {driver.gene}
                          </span>
                          <div>
                            <p className="text-xs font-medium text-gray-700">{driver.role}</p>
                            <p className="text-xs text-gray-500">{driver.clinicalRelevance}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pair list with filter */}
            {allPairs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <p className="text-xs font-medium text-gray-600">
                    All Pairs ({allPairs.length})
                  </p>
                  <span className="text-xs text-gray-400">mean |r| = {meanAbsR}</span>
                  <div className="flex gap-1 ml-auto">
                    {(['all', 'strong', 'positive', 'negative'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setPairFilter(f)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          pairFilter === f
                            ? 'bg-brand-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {f === 'all'
                          ? 'All'
                          : f === 'strong'
                          ? '|r| ≥ 0.5'
                          : f === 'positive'
                          ? 'Positive'
                          : 'Negative'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  {filteredPairs.slice(0, 20).map((pair, i) => {
                    const str = rStrength(pair.r);
                    const isSignif = pair.pValue < 0.05;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors text-xs"
                      >
                        <span className="font-mono font-medium text-gray-700">
                          {pair.geneA} · {pair.geneB}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold ${str.cls}`}>
                            {pair.r > 0 ? '+' : ''}
                            {pair.r}
                          </span>
                          {isSignif && (
                            <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                              sig.
                            </span>
                          )}
                          <span className="text-gray-400 hidden sm:inline">{str.label}</span>
                        </div>
                      </div>
                    );
                  })}
                  {filteredPairs.length > 20 && (
                    <p className="text-xs text-gray-400 text-center pt-1">
                      +{filteredPairs.length - 20} more pairs — use CSV export for the full list
                    </p>
                  )}
                  {filteredPairs.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-3">
                      No pairs match the current filter.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI narrative */}
        {aiText && (
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-gray-600">Signature Analysis Report</p>
              <ProviderBadge provider={aiProvider} />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(aiText) }} />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!analysed && !loading && (
          <div className="flex-1 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-xl min-h-40">
            <div className="text-center">
              <Layers size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Enter a gene list and click Build Signature.</p>
              <p className="text-xs mt-1">
                Generates a pairwise correlation matrix and discovers co-regulated biomarker
                clusters using TCGA-like data.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed hover tooltip — position: fixed escapes overflow containers */}
      {hoveredCell && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-xs pointer-events-none min-w-40"
          style={{ top: hoveredCell.top, left: hoveredCell.left }}
        >
          <p className="font-semibold text-gray-800 mb-1">
            {hoveredCell.geneA} × {hoveredCell.geneB}
          </p>
          <p>
            <span className="text-gray-500">Pearson r =</span>{' '}
            <span
              className={`font-mono font-semibold ${
                hoveredCell.r >= 0.5
                  ? 'text-red-600'
                  : hoveredCell.r <= -0.5
                  ? 'text-blue-600'
                  : 'text-gray-700'
              }`}
            >
              {hoveredCell.r > 0 ? '+' : ''}
              {hoveredCell.r}
            </span>
          </p>
          <p className={hoveredCell.pValue < 0.05 ? 'text-green-600 font-medium' : 'text-gray-500'}>
            {formatP(hoveredCell.pValue)}
          </p>
          <p className="text-gray-500 mt-0.5">n = 60 samples · {cancer.shortName}</p>
          <p className={`mt-0.5 font-medium ${rStrength(hoveredCell.r).cls}`}>
            {rStrength(hoveredCell.r).label}
          </p>
        </div>
      )}
    </div>
  );
}
