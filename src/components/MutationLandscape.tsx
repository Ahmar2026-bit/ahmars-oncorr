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
  Legend,
} from 'recharts';
import { Dna, Loader2, ExternalLink, AlertCircle, Database } from 'lucide-react';
import { getCancerById } from '../data/cancerTypes';
import { askAI } from '../services/aiService';
import { renderMarkdown } from '../utils/markdown';
import ProviderBadge from './ProviderBadge';
import type { AIProvider } from '../services/aiService';

const CBIO_API = 'https://www.cbioportal.org/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MutationRecord {
  sampleId: string;
  mutationType: string;
  proteinChange: string;
  chr: string;
  startPosition: number;
}

interface CnvRecord {
  sampleId: string;
  value: number; // GISTIC: -2 deep del, -1 shallow del, 0 diploid, 1 low gain, 2 amp
}

interface MutationStats {
  totalMutated: number;
  totalSamples: number;
  frequency: number;
  byType: { type: string; count: number; color: string }[];
  topMutations: { change: string; count: number }[];
}

interface CnvStats {
  totalSamples: number;
  byCnv: { label: string; short: string; count: number; freq: number; color: string }[];
}

// ── cBioPortal helpers ────────────────────────────────────────────────────────

async function getEntrezId(geneSymbol: string): Promise<number> {
  const res = await fetch(`${CBIO_API}/genes/${encodeURIComponent(geneSymbol)}`);
  if (!res.ok) throw new Error(`Gene not found: ${geneSymbol}`);
  const data = await res.json();
  return (data as { entrezGeneId: number }).entrezGeneId;
}

async function fetchMutations(
  studyId: string,
  entrezId: number,
): Promise<MutationRecord[]> {
  const profileId = `${studyId}_mutations`;
  const res = await fetch(
    `${CBIO_API}/molecular-profiles/${profileId}/mutations/fetch`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleListId: `${studyId}_all`,
        entrezGeneIds: [entrezId],
      }),
    },
  );
  if (!res.ok) throw new Error(`Mutation profile not available for ${studyId}`);
  return (await res.json()) as MutationRecord[];
}

async function fetchCnvData(
  studyId: string,
  entrezId: number,
): Promise<CnvRecord[]> {
  const profileId = `${studyId}_gistic`;
  const res = await fetch(
    `${CBIO_API}/molecular-profiles/${profileId}/molecular-data/fetch`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleListId: `${studyId}_all`,
        entrezGeneIds: [entrezId],
      }),
    },
  );
  if (!res.ok) return []; // CNV not always available — non-fatal
  const data = await res.json();
  return (data as { sampleId: string; value: number }[]).map((d) => ({
    sampleId: d.sampleId,
    value: d.value,
  }));
}

async function fetchStudySampleCount(studyId: string): Promise<number> {
  const res = await fetch(
    `${CBIO_API}/studies/${studyId}/samples?projection=META`,
  );
  if (!res.ok) return 0;
  const totalCount = res.headers.get('X-Total-Count');
  return totalCount ? parseInt(totalCount, 10) : 0;
}

// ── Statistical helpers ───────────────────────────────────────────────────────

const MUTATION_TYPE_COLORS: Record<string, string> = {
  Missense_Mutation: '#f59e0b',
  Nonsense_Mutation: '#ef4444',
  Frame_Shift_Del: '#8b5cf6',
  Frame_Shift_Ins: '#6d28d9',
  Splice_Site: '#0ea5e9',
  In_Frame_Del: '#10b981',
  In_Frame_Ins: '#34d399',
  Translation_Start_Site: '#f97316',
  Nonstop_Mutation: '#dc2626',
  Other: '#9ca3af',
};

function categorizeMutationType(type: string): string {
  if (MUTATION_TYPE_COLORS[type]) return type;
  return 'Other';
}

function computeMutationStats(mutations: MutationRecord[], totalSamples: number): MutationStats {
  const mutatedSamples = new Set(mutations.map((m) => m.sampleId)).size;
  const typeCounts: Record<string, number> = {};
  const changeCounts: Record<string, number> = {};

  for (const m of mutations) {
    const t = categorizeMutationType(m.mutationType);
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
    if (m.proteinChange) {
      changeCounts[m.proteinChange] = (changeCounts[m.proteinChange] ?? 0) + 1;
    }
  }

  const byType = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type: type.replace(/_/g, ' '),
      count,
      color: MUTATION_TYPE_COLORS[type] ?? '#9ca3af',
    }));

  const topMutations = Object.entries(changeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([change, count]) => ({ change, count }));

  return {
    totalMutated: mutatedSamples,
    totalSamples,
    frequency: totalSamples > 0 ? +((mutatedSamples / totalSamples) * 100).toFixed(1) : 0,
    byType,
    topMutations,
  };
}

const CNV_LABELS: Record<number, { label: string; short: string; color: string }> = {
  '-2': { label: 'Deep Deletion', short: 'Deep Del', color: '#1e40af' },
  '-1': { label: 'Shallow Deletion', short: 'Shallow Del', color: '#60a5fa' },
  '0':  { label: 'Diploid', short: 'Diploid', color: '#9ca3af' },
  '1':  { label: 'Low-level Gain', short: 'Low Gain', color: '#fb923c' },
  '2':  { label: 'Amplification', short: 'Amp', color: '#dc2626' },
};

function computeCnvStats(cnvData: CnvRecord[]): CnvStats {
  const counts: Record<number, number> = { '-2': 0, '-1': 0, 0: 0, 1: 0, 2: 0 };
  for (const d of cnvData) {
    const v = Math.round(d.value);
    if (v in counts) counts[v]++;
  }
  const total = cnvData.length;
  const byCnv = [-2, -1, 0, 1, 2].map((v) => ({
    ...CNV_LABELS[v],
    count: counts[v],
    freq: total > 0 ? +((counts[v] / total) * 100).toFixed(1) : 0,
  }));
  return { totalSamples: total, byCnv };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MutationLandscape({
  geneA,
  cancerType,
}: {
  geneA: string;
  geneB: string;
  cancerType: string;
}) {
  const cancer = getCancerById(cancerType);
  const [gene, setGene] = useState(geneA || '');
  const [mutStats, setMutStats] = useState<MutationStats | null>(null);
  const [cnvStats, setCnvStats] = useState<CnvStats | null>(null);
  const [aiText, setAiText] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>('demo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysed, setAnalysed] = useState(false);
  const studyId = cancer.cbioStudyId ?? 'brca_tcga';

  async function analyse() {
    const g = gene.trim().toUpperCase();
    if (!g || loading) return;
    setLoading(true);
    setError('');
    setAnalysed(true);
    setMutStats(null);
    setCnvStats(null);
    setAiText('');

    try {
      const [entrezId, totalSamples] = await Promise.all([
        getEntrezId(g),
        fetchStudySampleCount(studyId),
      ]);

      const [mutations, cnvData] = await Promise.all([
        fetchMutations(studyId, entrezId),
        fetchCnvData(studyId, entrezId),
      ]);

      const ms = computeMutationStats(mutations, totalSamples);
      const cs = cnvData.length > 0 ? computeCnvStats(cnvData) : null;
      setMutStats(ms);
      setCnvStats(cs);

      // Build AI prompt
      const topTypes = ms.byType.slice(0, 5).map((t) => `${t.type}: n=${t.count}`).join(', ');
      const topHotspots = ms.topMutations.slice(0, 5).map((m) => `${m.change} (n=${m.count})`).join(', ');
      const ampFreq = cs ? `${cs.byCnv.find((b) => b.label === 'Amplification')?.freq ?? 0}%` : 'N/A';
      const delFreq = cs ? `${cs.byCnv.find((b) => b.label === 'Deep Deletion')?.freq ?? 0}%` : 'N/A';

      const prompt =
        `Mutation landscape for ${g} in ${cancer.label} (TCGA, cBioPortal):\n` +
        `- Mutation frequency: ${ms.frequency}% (${ms.totalMutated}/${ms.totalSamples} samples)\n` +
        `- Top mutation types: ${topTypes}\n` +
        `- Hotspot mutations: ${topHotspots}\n` +
        `- Amplification frequency: ${ampFreq}\n` +
        `- Deep deletion frequency: ${delFreq}\n\n` +
        `Please provide a clinical mutation analysis:\n\n` +
        `## Mutation Frequency & Clinical Significance\n` +
        `Interpret the mutation rate and its importance in ${cancer.shortName}.\n\n` +
        `## Hotspot Mutations & Oncogenicity\n` +
        `Discuss the specific hotspot mutations and whether they are activating/inactivating.\n\n` +
        `## Copy Number Alterations\n` +
        `Discuss amplification/deletion frequency and therapeutic implications.\n\n` +
        `## Targeted Therapy Opportunities\n` +
        `Which mutations in ${g} can be targeted with approved or investigational drugs?\n\n` +
        `## Prognostic Impact\n` +
        `How does ${g} mutation status affect prognosis in ${cancer.shortName}?\n\n` +
        `Use markdown with bold key terms. Include specific drug names where applicable.`;

      const response = await askAI(prompt);
      setAiText(response.text);
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
          <Dna size={15} className="text-brand-600" />
          Mutation Landscape & Copy Number Analysis
        </h2>
        <p className="text-xs text-gray-500">
          Somatic mutations (SNVs, indels) and copy number alterations (GISTIC2) from TCGA via cBioPortal.
        </p>
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Gene Symbol</label>
          <input
            className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. TP53"
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
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Dna size={14} />}
          {loading ? 'Fetching data…' : 'Analyse Mutations'}
        </button>
        {analysed && (
          <a
            href={`https://www.cbioportal.org/results/mutations?study_id=${studyId}&gene_list=${encodeURIComponent(gene.trim().toUpperCase())}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-brand-500 hover:underline ml-auto"
          >
            View on cBioPortal <ExternalLink size={11} />
          </a>
        )}
      </div>

      <p className="text-xs text-gray-400 flex items-center gap-1">
        <Database size={11} />
        Somatic mutations and GISTIC2 CNV from{' '}
        <a href="https://www.cbioportal.org" target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">
          cBioPortal
        </a>{' '}
        — TCGA · {cancer.shortName}{mutStats ? ` · n=${mutStats.totalSamples}` : ''}
      </p>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-5">
        {/* Mutation frequency summary */}
        {mutStats && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="text-center min-w-16">
                <p className="text-2xl font-bold text-amber-600">{mutStats.frequency}%</p>
                <p className="text-xs text-gray-500">Mutation rate</p>
              </div>
              <div className="h-8 border-l border-amber-200" />
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {mutStats.totalMutated} / {mutStats.totalSamples} samples mutated
                </p>
                <p className="text-xs text-gray-500">
                  {mutStats.byType.length} mutation types · {mutStats.topMutations.length} unique changes
                </p>
              </div>
            </div>

            {/* Mutation types chart */}
            {mutStats.byType.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Mutation Types</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={mutStats.byType.slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 110, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="type"
                      tick={{ fontSize: 9 }}
                      width={110}
                    />
                    <Tooltip formatter={(v: unknown) => [v as number, 'Count']} />
                    <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                      {mutStats.byType.slice(0, 8).map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top hotspots */}
            {mutStats.topMutations.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Top Mutation Hotspots</p>
                <div className="flex flex-wrap gap-1.5">
                  {mutStats.topMutations.map((m, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium font-mono border border-amber-200"
                    >
                      {m.change}
                      <span className="bg-amber-200 text-amber-700 px-1 rounded-full text-xs">{m.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CNV Section */}
        {cnvStats && cnvStats.totalSamples > 0 && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-medium text-gray-600">Copy Number Alterations (GISTIC2)</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={cnvStats.byCnv}
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="short" tick={{ fontSize: 10 }} />
                <YAxis
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Frequency (%)', angle: -90, position: 'insideLeft', fontSize: 10 }}
                />
                <Tooltip
                  formatter={(v: unknown, _name: unknown, props: { payload?: { label?: string } }) => [
                    `${v as number}%`,
                    props.payload?.label ?? '',
                  ]}
                />
                <Legend />
                <Bar dataKey="freq" name="Frequency (%)" radius={[3, 3, 0, 0]}>
                  {cnvStats.byCnv.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {cnvStats.byCnv.map((b) => (
                <div key={b.label} className="bg-gray-50 border rounded-lg p-1.5">
                  <p className="text-xs font-bold" style={{ color: b.color }}>
                    {b.freq}%
                  </p>
                  <p className="text-xs text-gray-500">{b.short}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Report */}
        {aiText && (
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-gray-600">Clinical Mutation Analysis</p>
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
              <Dna size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Enter a gene to analyse its mutation landscape.</p>
              <p className="text-xs mt-1">
                Fetches real somatic mutation and CNV data from TCGA via cBioPortal.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
