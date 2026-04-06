import { useState } from 'react';
import { Beaker, Loader2, Play, ChevronDown } from 'lucide-react';
import { askAI } from '../services/aiService';
import { getCancerById } from '../data/cancerTypes';
import ProviderBadge from './ProviderBadge';
import ChatChart from './ChatChart';
import type { AIProvider } from '../services/aiService';

type PerturbationType = 'knockout' | 'overexpression' | 'inhibitor' | 'activator';
type TargetGene = 'geneA' | 'geneB' | 'both';

interface SimResult {
  raw: string;
  provider: AIProvider;
}

type ContentPart = { type: 'text'; content: string } | { type: 'chart'; content: string };

function parseContent(raw: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const regex = /```chart\n([\s\S]*?)\n?```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: raw.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'chart', content: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < raw.length) {
    parts.push({ type: 'text', content: raw.slice(lastIndex) });
  }
  return parts.length ? parts : [{ type: 'text', content: raw }];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="font-semibold text-sm mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-semibold text-base mt-4 mb-1">$2</h2>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/^(?!<[hlp])(.+)$/gm, '$1');
}

const PERTURBATION_LABELS: Record<PerturbationType, string> = {
  knockout:       'Gene Knockout (KO)',
  overexpression: 'Gene Overexpression (OE)',
  inhibitor:      'Pharmacologic Inhibitor',
  activator:      'Pharmacologic Activator',
};

const PERTURBATION_EMOJI: Record<PerturbationType, string> = {
  knockout:       '🔇',
  overexpression: '📢',
  inhibitor:      '🔴',
  activator:      '🟢',
};

export default function VirtualLab({
  geneA,
  geneB,
  cancerType,
}: {
  geneA: string;
  geneB: string;
  cancerType: string;
}) {
  const [perturbation, setPerturbation] = useState<PerturbationType>('knockout');
  const [targetGene, setTargetGene] = useState<TargetGene>('geneA');
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);

  const cancer = getCancerById(cancerType);

  const targetLabel =
    targetGene === 'geneA' ? geneA || 'Gene A' :
    targetGene === 'geneB' ? geneB || 'Gene B' :
    `${geneA || 'Gene A'} + ${geneB || 'Gene B'}`;

  async function runSimulation() {
    if (loading) return;
    setLoading(true);
    setResult(null);

    const CHART_FENCE = '```';
    const prompt =
      `You are simulating a virtual perturbation experiment in a ${cancer.label} (TCGA) cell line model.\n\n` +
      `Perturbation: ${PERTURBATION_LABELS[perturbation]} of ${targetLabel}` +
      (geneA && geneB ? ` (co-expression pair: ${geneA} / ${geneB})` : '') + `.\n\n` +
      `Please provide the following in your response:\n\n` +
      `1. A bar chart showing predicted log2 fold-change in 8 key downstream pathway genes after this perturbation. ` +
      `Use this exact format:\n` +
      CHART_FENCE + `chart\n` +
      `{"type":"bar","title":"Predicted Downstream Expression Changes (log2FC)","xLabel":"Gene","yLabel":"log2 Fold-Change","data":[{"name":"GENE1","value":1.5},...]}\n` +
      CHART_FENCE + `\n` +
      `Fill in realistic gene names and biologically-plausible values (positive = upregulated, negative = downregulated).\n\n` +
      `2. **Predicted Cell Viability**: X% (relative to control)\n\n` +
      `3. **Predicted Apoptosis Index**: X% increase/decrease\n\n` +
      `4. ## Pathway Impact\n` +
      `Describe which signalling pathways are most affected and how.\n\n` +
      `5. ## Clinical Interpretation\n` +
      `Discuss therapeutic implications, known drug sensitivities, and clinical relevance in ${cancer.shortName}.`;

    try {
      const response = await askAI(prompt);
      setResult({ raw: response.text, provider: response.provider });
    } catch {
      setResult({
        raw: '⚠️ Simulation failed. Please check your AI provider configuration.',
        provider: 'demo',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Beaker size={15} className="text-brand-600" />
          Virtual Lab — Perturbation Modeler
        </h2>
        <p className="text-xs text-gray-500">
          Simulate gene perturbations in a virtual {cancer.shortName} cell model and predict downstream pathway effects using AI.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Perturbation type */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Perturbation Type</label>
          <div className="relative">
            <select
              value={perturbation}
              onChange={(e) => setPerturbation(e.target.value as PerturbationType)}
              className="appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              disabled={loading}
            >
              {(Object.keys(PERTURBATION_LABELS) as PerturbationType[]).map((p) => (
                <option key={p} value={p}>
                  {PERTURBATION_EMOJI[p]} {PERTURBATION_LABELS[p]}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Target gene */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Target Gene</label>
          <div className="relative">
            <select
              value={targetGene}
              onChange={(e) => setTargetGene(e.target.value as TargetGene)}
              className="appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer font-mono"
              disabled={loading}
            >
              <option value="geneA">{geneA || 'Gene A'}</option>
              <option value="geneB">{geneB || 'Gene B'}</option>
              <option value="both">Both ({geneA || 'A'} + {geneB || 'B'})</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Cancer context badge */}
        <div className="flex flex-col gap-1">
          <label className="block text-xs font-medium text-gray-600">Cancer Model</label>
          <span className="inline-flex items-center px-2.5 py-2 rounded-lg bg-brand-50 border border-brand-200 text-xs font-semibold text-brand-700">
            {cancer.shortName}
          </span>
        </div>

        <button
          onClick={runSimulation}
          disabled={loading || (!geneA && !geneB)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
        >
          {loading ? (
            <><Loader2 size={14} className="animate-spin" /> Simulating…</>
          ) : (
            <><Play size={14} /> Run Simulation</>
          )}
        </button>
      </div>

      {!geneA && !geneB && !result && (
        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          💡 Enter gene symbols in the Correlation tab first to enable targeted simulations.
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="flex-1 overflow-y-auto space-y-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="font-semibold text-gray-700">
              {PERTURBATION_EMOJI[perturbation]} {PERTURBATION_LABELS[perturbation]} of {targetLabel} in {cancer.shortName}
            </span>
            <ProviderBadge provider={result.provider} />
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 leading-relaxed">
            {parseContent(result.raw).map((part, i) =>
              part.type === 'chart' ? (
                <ChatChart key={i} specJson={part.content} />
              ) : (
                <div key={i} dangerouslySetInnerHTML={{ __html: renderMarkdown(part.content) }} />
              ),
            )}
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-xl">
          <div className="text-center">
            <Beaker size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Configure a perturbation and click Run Simulation</p>
          </div>
        </div>
      )}
    </div>
  );
}
