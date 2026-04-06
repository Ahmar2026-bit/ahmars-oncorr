import { useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { BarChart2, Loader2, TrendingUp } from 'lucide-react';
import { askAI } from '../services/aiService';
import { getCancerById } from '../data/cancerTypes';
import { renderMarkdown } from '../utils/markdown';
import ProviderBadge from './ProviderBadge';
import type { AIProvider } from '../services/aiService';

interface VolcanoPoint {
  gene: string;
  logFC: number;
  negLog10P: number;
  sig: 'up' | 'down' | 'ns';
}

function pointColor(sig: VolcanoPoint['sig']): string {
  if (sig === 'up') return '#ef4444';
  if (sig === 'down') return '#3b82f6';
  return '#9ca3af';
}

/** Parse AI response to extract volcano plot data embedded as JSON fence */
function parseVolcanoData(text: string): VolcanoPoint[] | null {
  const m = text.match(/```volcano\n([\s\S]*?)```/);
  if (!m) return null;
  try {
    const raw = JSON.parse(m[1]) as { gene: string; logFC: number; pAdj: number }[];
    return raw.map((r) => ({
      gene: r.gene,
      logFC: r.logFC,
      negLog10P: r.pAdj > 0 ? -Math.log10(r.pAdj) : 0,
      sig: r.pAdj < 0.05 && r.logFC > 1 ? 'up' : r.pAdj < 0.05 && r.logFC < -1 ? 'down' : 'ns',
    }));
  } catch {
    return null;
  }
}

/** Remove the ```volcano…``` fence from displayed text */
function stripVolcanoFence(text: string): string {
  return text.replace(/```volcano\n[\s\S]*?```/g, '').trim();
}

export default function RNASeqAnalysis({
  geneA,
  geneB,
  cancerType,
}: {
  geneA: string;
  geneB: string;
  cancerType: string;
}) {
  const cancer = getCancerById(cancerType);
  const [geneInput, setGeneInput] = useState(
    geneA && geneB ? `${geneA}, ${geneB}` : geneA || ''
  );
  const [aiText, setAiText] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>('demo');
  const [volcanoData, setVolcanoData] = useState<VolcanoPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function analyse() {
    const genes = geneInput
      .split(/[,\s]+/)
      .map((g) => g.trim().toUpperCase())
      .filter(Boolean);
    if (genes.length === 0 || loading) return;
    setLoading(true);
    setError('');
    setSearched(true);
    setAiText('');
    setVolcanoData(null);

    const prompt =
      `RNA-seq differential expression analysis for genes: ${genes.join(', ')} in ${cancer.label}.\n\n` +
      `Please provide:\n\n` +
      `## Differential Expression Summary\n` +
      `Summarise known tumour vs normal differential expression for these genes based on TCGA, GTEx and GEO RNA-seq studies. Include log2 fold-change direction and statistical significance where known.\n\n` +
      `## Pathway Enrichment Context\n` +
      `Which pathways are enriched when these genes are up/down-regulated in ${cancer.shortName}?\n\n` +
      `## Splicing & Isoform Notes\n` +
      `Any clinically relevant alternative splicing events?\n\n` +
      `## Prognostic Association\n` +
      `How do expression levels (high vs low) associate with survival in ${cancer.label}?\n\n` +
      `## Volcano Plot Data\n` +
      `After your text analysis, output a simulated volcano plot for the top 20 differentially expressed genes ` +
      `(including ${genes.slice(0, 3).join(', ')}) in this cancer type. Use biologically plausible values.\n` +
      `Format it EXACTLY as:\n` +
      `\`\`\`volcano\n` +
      `[{"gene":"TP53","logFC":-1.8,"pAdj":0.001},{"gene":"EGFR","logFC":2.1,"pAdj":0.0001}]\n` +
      `\`\`\`\n` +
      `Include at least 15 genes. Mix up/down/non-significant points.`;

    try {
      const response = await askAI(prompt);
      const points = parseVolcanoData(response.text);
      setVolcanoData(points);
      setAiText(stripVolcanoFence(response.text));
      setAiProvider(response.provider);
    } catch (e) {
      setError('RNA-seq analysis failed. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const upCount = volcanoData?.filter((p) => p.sig === 'up').length ?? 0;
  const downCount = volcanoData?.filter((p) => p.sig === 'down').length ?? 0;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <BarChart2 size={15} className="text-brand-600" />
          RNA-seq Analysis
        </h2>
        <p className="text-xs text-gray-500">
          Differential expression, pathway enrichment, splicing insights and volcano plot for your genes in the selected cancer.
        </p>
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Gene(s) — comma or space separated
          </label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. TP53, BRCA1, EGFR"
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
          {loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
          {loading ? 'Analysing…' : 'Run Analysis'}
        </button>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}

      {/* Volcano Plot */}
      {volcanoData && volcanoData.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <p className="text-xs font-medium text-gray-600">Volcano Plot — Tumour vs Normal</p>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                Up-regulated ({upCount})
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
                Down-regulated ({downCount})
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" />
                NS
              </span>
            </div>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  dataKey="logFC"
                  name="log₂FC"
                  label={{ value: 'log₂ Fold Change', position: 'insideBottom', offset: -12, fontSize: 10 }}
                  tick={{ fontSize: 10 }}
                  domain={['auto', 'auto']}
                />
                <YAxis
                  type="number"
                  dataKey="negLog10P"
                  name="-log₁₀(p)"
                  label={{ value: '-log₁₀(p)', angle: -90, position: 'insideLeft', fontSize: 10 }}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0].payload as VolcanoPoint;
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs">
                        <p className="font-mono font-bold text-brand-700">{d.gene}</p>
                        <p>log₂FC: <strong>{d.logFC.toFixed(2)}</strong></p>
                        <p>-log₁₀(p): <strong>{d.negLog10P.toFixed(2)}</strong></p>
                      </div>
                    );
                  }}
                />
                {/* Significance thresholds */}
                <ReferenceLine x={1} stroke="#ef4444" strokeDasharray="4 2" strokeOpacity={0.5} />
                <ReferenceLine x={-1} stroke="#3b82f6" strokeDasharray="4 2" strokeOpacity={0.5} />
                <ReferenceLine y={-Math.log10(0.05)} stroke="#6b7280" strokeDasharray="4 2" strokeOpacity={0.4} />
                <Scatter data={volcanoData} isAnimationActive={false}>
                  {volcanoData.map((entry, i) => (
                    <Cell key={i} fill={pointColor(entry.sig)} fillOpacity={0.75} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {aiText && (
        <div className="flex-1 overflow-y-auto space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-gray-600">AI RNA-seq Report</p>
            <ProviderBadge provider={aiProvider} />
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 leading-relaxed">
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(aiText) }} />
          </div>
        </div>
      )}

      {!searched && !loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-xl">
          <div className="text-center">
            <BarChart2 size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Enter gene(s) to run RNA-seq differential expression analysis.</p>
            <p className="text-xs mt-1">Includes volcano plot, pathway enrichment & survival correlation.</p>
          </div>
        </div>
      )}
    </div>
  );
}
