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
import { Shield, Loader2, AlertCircle, Database, Info } from 'lucide-react';
import { getCancerById } from '../data/cancerTypes';
import { askAI } from '../services/aiService';
import { renderMarkdown } from '../utils/markdown';
import ProviderBadge from './ProviderBadge';
import type { AIProvider } from '../services/aiService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ImmuneCorrelation {
  cellType: string;
  r: number;
  pValue: number;
  direction: 'positive' | 'negative' | 'neutral';
  interpretation: string;
}

interface ImmuneResult {
  correlations: ImmuneCorrelation[];
  tmb: { level: string; correlation: string; pValue: string };
  msi: { status: string; correlation: string };
  immuneScore: string;
}

// ── Parse AI structured output ────────────────────────────────────────────────

function parseImmuneData(text: string): ImmuneResult | null {
  const m = text.match(/```immune\n([\s\S]*?)```/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as ImmuneResult;
  } catch {
    return null;
  }
}

function removeImmuneFence(text: string): string {
  return text.replace(/```immune\n[\s\S]*?```/g, '').trim();
}

// ── Component ─────────────────────────────────────────────────────────────────

function correlationColor(r: number): string {
  if (r >= 0.3) return '#16a34a';
  if (r >= 0.1) return '#65a30d';
  if (r <= -0.3) return '#dc2626';
  if (r <= -0.1) return '#f97316';
  return '#9ca3af';
}

function pValueBadge(p: number): { label: string; cls: string } {
  if (p < 0.001) return { label: 'p < 0.001', cls: 'bg-green-100 text-green-700' };
  if (p < 0.01) return { label: `p = ${p.toFixed(3)}`, cls: 'bg-green-100 text-green-700' };
  if (p < 0.05) return { label: `p = ${p.toFixed(3)}`, cls: 'bg-yellow-100 text-yellow-700' };
  return { label: `p = ${p.toFixed(3)}`, cls: 'bg-gray-100 text-gray-500' };
}

export default function ImmuneInfiltration({
  geneA,
  geneB,
  cancerType,
}: {
  geneA: string;
  geneB: string;
  cancerType: string;
}) {
  const cancer = getCancerById(cancerType);
  const [gene, setGene] = useState(geneA || '');
  const [result, setResult] = useState<ImmuneResult | null>(null);
  const [aiText, setAiText] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>('demo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysed, setAnalysed] = useState(false);

  async function analyse() {
    const g = gene.trim().toUpperCase();
    const g2 = geneB.trim().toUpperCase();
    if (!g || loading) return;
    setLoading(true);
    setError('');
    setAnalysed(true);
    setResult(null);
    setAiText('');

    try {
      const prompt =
        `You are analysing immune cell infiltration correlations for gene ${g}` +
        (g2 ? ` (paired with ${g2})` : '') +
        ` in ${cancer.label} (TCGA).\n\n` +
        `Based on published TIMER2 / CIBERSORT data and known biology of ${g}, ` +
        `provide structured immune infiltration correlations.\n\n` +
        `IMPORTANT: You MUST output a \`\`\`immune JSON block with this exact schema:\n` +
        `\`\`\`immune\n` +
        `{\n` +
        `  "correlations": [\n` +
        `    { "cellType": "CD8+ T cells", "r": 0.42, "pValue": 0.001, "direction": "positive", "interpretation": "Brief clinical note" },\n` +
        `    { "cellType": "CD4+ T cells", "r": 0.28, "pValue": 0.01, "direction": "positive", "interpretation": "..." },\n` +
        `    { "cellType": "M1 Macrophages", "r": 0.15, "pValue": 0.08, "direction": "positive", "interpretation": "..." },\n` +
        `    { "cellType": "M2 Macrophages", "r": -0.31, "pValue": 0.002, "direction": "negative", "interpretation": "..." },\n` +
        `    { "cellType": "NK cells", "r": 0.22, "pValue": 0.03, "direction": "positive", "interpretation": "..." },\n` +
        `    { "cellType": "Regulatory T cells", "r": -0.18, "pValue": 0.05, "direction": "negative", "interpretation": "..." },\n` +
        `    { "cellType": "Neutrophils", "r": 0.08, "pValue": 0.32, "direction": "neutral", "interpretation": "..." },\n` +
        `    { "cellType": "Dendritic cells", "r": 0.19, "pValue": 0.04, "direction": "positive", "interpretation": "..." }\n` +
        `  ],\n` +
        `  "tmb": { "level": "high|moderate|low", "correlation": "positive|negative|none", "pValue": "0.01" },\n` +
        `  "msi": { "status": "enriched in MSI-H|MSS|neutral", "correlation": "Brief note" },\n` +
        `  "immuneScore": "Brief overall immune phenotype (e.g., inflamed, excluded, desert)"\n` +
        `}\n` +
        `\`\`\`\n\n` +
        `After the JSON block, provide a clinical narrative:\n\n` +
        `## Immune Microenvironment Profile\n` +
        `Describe the overall immune phenotype of ${g}-expressing tumors.\n\n` +
        `## TMB & MSI Implications\n` +
        `Discuss TMB level, MSI status, and immunotherapy candidacy.\n\n` +
        `## Immunotherapy Relevance\n` +
        `Which checkpoint inhibitors or immunotherapy strategies are relevant? ` +
        `Reference FDA approvals where applicable.\n\n` +
        `## Combination Strategies\n` +
        `Rational immuno-oncology combinations involving ${g}` +
        (g2 ? ` and ${g2}` : '') + `.\n\n` +
        `Use markdown with bold key terms.`;

      const response = await askAI(prompt);
      const parsed = parseImmuneData(response.text);
      const cleanText = removeImmuneFence(response.text);
      setResult(parsed);
      setAiText(cleanText);
      setAiProvider(response.provider);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Analysis failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Shield size={15} className="text-brand-600" />
          Immune Cell Infiltration & TMB/MSI Analysis
        </h2>
        <p className="text-xs text-gray-500">
          Correlation of gene expression with immune cell fractions (TIMER2/CIBERSORT) and
          FDA-approved immunotherapy biomarkers (TMB, MSI).
        </p>
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Gene Symbol</label>
          <input
            className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. EGFR"
            value={gene}
            onChange={(e) => setGene(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && analyse()}
          />
        </div>
        <button
          onClick={analyse}
          disabled={loading || !gene.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
          {loading ? 'Analysing…' : 'Analyse Immune Infiltration'}
        </button>
      </div>

      <p className="text-xs text-gray-400 flex items-center gap-1">
        <Database size={11} />
        Based on TIMER2 / CIBERSORT immune deconvolution · {cancer.shortName} TCGA cohort
      </p>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-5">
        {/* Immune phenotype summary */}
        {result && (
          <div className="space-y-4">
            {/* Overall immune score */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm">
              <p className="text-xs text-blue-500 font-medium mb-0.5">Immune Phenotype</p>
              <p className="font-semibold text-blue-800">{result.immuneScore}</p>
            </div>

            {/* TMB & MSI */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <p className="text-xs text-purple-500 font-medium">TMB Level</p>
                <p className="text-sm font-bold text-purple-800 capitalize">{result.tmb.level}</p>
                <p className="text-xs text-gray-500">Correlation: {result.tmb.correlation} · p = {result.tmb.pValue}</p>
              </div>
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                <p className="text-xs text-teal-500 font-medium">MSI Status</p>
                <p className="text-sm font-bold text-teal-800 capitalize">{result.msi.status}</p>
                <p className="text-xs text-gray-500">{result.msi.correlation}</p>
              </div>
            </div>

            {/* Immune correlations chart */}
            {result.correlations.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">
                  Immune Cell Infiltration Correlations (Spearman r)
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={result.correlations}
                    layout="vertical"
                    margin={{ top: 0, right: 40, left: 130, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[-0.6, 0.6]}
                      tickCount={7}
                      tick={{ fontSize: 10 }}
                      label={{ value: 'Spearman r', position: 'insideBottom', offset: -2, fontSize: 10 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="cellType"
                      tick={{ fontSize: 9 }}
                      width={130}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as ImmuneCorrelation;
                        const badge = pValueBadge(d.pValue);
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm text-xs">
                            <p className="font-semibold">{d.cellType}</p>
                            <p>r = {d.r.toFixed(2)}</p>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${badge.cls}`}>{badge.label}</span>
                            <p className="mt-1 text-gray-500 max-w-xs">{d.interpretation}</p>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine x={0} stroke="#6b7280" strokeWidth={1} />
                    <Bar dataKey="r" radius={[0, 3, 3, 0]}>
                      {result.correlations.map((entry, i) => (
                        <Cell key={i} fill={correlationColor(entry.r)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                  <Info size={10} />
                  Positive r = higher gene expression → more infiltration. Hover bars for details.
                </p>
              </div>
            )}

            {/* Correlation legend table */}
            <div className="grid grid-cols-2 gap-1.5">
              {result.correlations.map((c, i) => {
                const badge = pValueBadge(c.pValue);
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs"
                  >
                    <span className="font-medium text-gray-700">{c.cellType}</span>
                    <div className="flex items-center gap-1">
                      <span
                        className="font-mono font-bold"
                        style={{ color: correlationColor(c.r) }}
                      >
                        {c.r > 0 ? '+' : ''}{c.r.toFixed(2)}
                      </span>
                      <span className={`px-1 py-0.5 rounded text-xs ${badge.cls}`}>{badge.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI narrative */}
        {aiText && (
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-gray-600">Immuno-Oncology Analysis</p>
              <ProviderBadge provider={aiProvider} />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(aiText) }} />
            </div>
          </div>
        )}

        {!analysed && !loading && (
          <div className="flex-1 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-xl min-h-40">
            <div className="text-center">
              <Shield size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Enter a gene to analyse immune infiltration.</p>
              <p className="text-xs mt-1">
                Correlates gene expression with CD8+ T cells, macrophages, NK cells, TMB, and MSI.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
