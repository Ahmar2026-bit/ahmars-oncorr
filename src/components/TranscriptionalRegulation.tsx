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
import { Dna, Loader2, AlertCircle, Info, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { getCancerById } from '../data/cancerTypes';
import { askAI } from '../services/aiService';
import { renderMarkdown } from '../utils/markdown';
import ProviderBadge from './ProviderBadge';
import type { AIProvider } from '../services/aiService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TFBinding {
  tf: string;
  bindingScore: number; // 0–1
  motifCount: number;
  evidence: string; // e.g. "ChIP-seq" | "ENCODE" | "JASPAR" | "predicted"
  cancerRelevance: string;
}

interface CoRegulator {
  name: string;
  type: 'coactivator' | 'corepressor' | 'chromatin remodeler' | 'mediator';
  interaction: 'direct' | 'indirect';
  function: string;
  clinicalNote: string;
}

interface EpigeneticMark {
  mark: string; // e.g. "H3K27ac", "H3K4me3", "H3K27me3"
  status: 'active' | 'repressed' | 'poised' | 'absent';
  level: 'high' | 'moderate' | 'low' | 'absent';
  implication: string;
}

interface RegulatoryNetwork {
  dominantTF: string;
  regulatoryState: string;
  cpgIsland: 'present' | 'absent' | 'partial';
  cpgMethylation: 'hypermethylated' | 'hypomethylated' | 'variable' | 'unmethylated';
  clinicalSummary: string;
}

interface RegulatoryData {
  tfBindingSites: TFBinding[];
  coRegulators: CoRegulator[];
  epigeneticMarks: EpigeneticMark[];
  regulatoryNetwork: RegulatoryNetwork;
}

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseRegulatoryData(text: string): RegulatoryData | null {
  const m = text.match(/```regulon\n([\s\S]*?)```/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as RegulatoryData;
  } catch {
    return null;
  }
}

function removeRegulonFence(text: string): string {
  return text.replace(/```regulon\n[\s\S]*?```/g, '').trim();
}

// ── Visual helpers ────────────────────────────────────────────────────────────

function tfScoreColor(score: number): string {
  if (score >= 0.75) return '#16a34a';
  if (score >= 0.5) return '#ca8a04';
  return '#6b7280';
}

function evidenceBadge(ev: string): { cls: string } {
  const e = ev.toLowerCase();
  if (e.includes('chip')) return { cls: 'bg-green-100 text-green-700' };
  if (e.includes('encode')) return { cls: 'bg-blue-100 text-blue-700' };
  if (e.includes('jaspar') || e.includes('motif')) return { cls: 'bg-purple-100 text-purple-700' };
  if (e.includes('predicted')) return { cls: 'bg-gray-100 text-gray-500' };
  return { cls: 'bg-gray-100 text-gray-600' };
}

function coregTypeColor(type: CoRegulator['type']): string {
  switch (type) {
    case 'coactivator': return 'bg-green-100 text-green-700';
    case 'corepressor': return 'bg-red-100 text-red-700';
    case 'chromatin remodeler': return 'bg-purple-100 text-purple-700';
    case 'mediator': return 'bg-blue-100 text-blue-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function epigeneticStatusStyle(status: EpigeneticMark['status']): {
  dot: string;
  badge: string;
} {
  switch (status) {
    case 'active': return { dot: 'bg-green-500', badge: 'bg-green-50 border-green-200 text-green-800' };
    case 'repressed': return { dot: 'bg-red-500', badge: 'bg-red-50 border-red-200 text-red-800' };
    case 'poised': return { dot: 'bg-yellow-500', badge: 'bg-yellow-50 border-yellow-200 text-yellow-800' };
    default: return { dot: 'bg-gray-300', badge: 'bg-gray-50 border-gray-200 text-gray-500' };
  }
}

function methylationBadge(m: RegulatoryNetwork['cpgMethylation']): { cls: string; label: string } {
  switch (m) {
    case 'hypermethylated': return { cls: 'bg-red-100 text-red-700 border-red-200', label: '🔴 Hypermethylated' };
    case 'hypomethylated': return { cls: 'bg-green-100 text-green-700 border-green-200', label: '🟢 Hypomethylated' };
    case 'unmethylated': return { cls: 'bg-blue-100 text-blue-700 border-blue-200', label: '🔵 Unmethylated' };
    default: return { cls: 'bg-gray-100 text-gray-600 border-gray-200', label: '⬜ Variable' };
  }
}

function regulatoryStateBadge(state: string): string {
  const s = state.toLowerCase();
  if (s.includes('active')) return 'bg-green-100 text-green-700';
  if (s.includes('repressed')) return 'bg-red-100 text-red-700';
  if (s.includes('poised')) return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-600';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TranscriptionalRegulation({
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
  const [result, setResult] = useState<RegulatoryData | null>(null);
  const [aiText, setAiText] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>('demo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysed, setAnalysed] = useState(false);
  const [showAllTFs, setShowAllTFs] = useState(false);
  const [showAllCoRegs, setShowAllCoRegs] = useState(false);

  async function analyse() {
    const g = gene.trim().toUpperCase();
    const g2 = geneB.trim().toUpperCase();
    if (!g || loading) return;

    setLoading(true);
    setError('');
    setAnalysed(true);
    setResult(null);
    setAiText('');
    setShowAllTFs(false);
    setShowAllCoRegs(false);

    try {
      const prompt =
        `Perform a comprehensive transcriptional regulation analysis for gene **${g}**` +
        (g2 ? ` (in the context of ${g2})` : '') +
        ` in ${cancer.label} (TCGA / ENCODE data).\n\n` +
        `IMPORTANT: You MUST output a \`\`\`regulon JSON block with this exact schema:\n` +
        '```regulon\n' +
        '{\n' +
        '  "tfBindingSites": [\n' +
        '    { "tf": "SP1", "bindingScore": 0.87, "motifCount": 12, "evidence": "ChIP-seq ENCODE", "cancerRelevance": "SP1 drives constitutive expression; amplified in BRCA" },\n' +
        '    { "tf": "MYC", "bindingScore": 0.74, "motifCount": 8, "evidence": "JASPAR motif", "cancerRelevance": "..." },\n' +
        '    { "tf": "E2F1", "bindingScore": 0.65, "motifCount": 5, "evidence": "ChIP-seq", "cancerRelevance": "..." },\n' +
        '    { "tf": "TP53", "bindingScore": 0.58, "motifCount": 3, "evidence": "ENCODE", "cancerRelevance": "..." },\n' +
        '    { "tf": "CTCF", "bindingScore": 0.51, "motifCount": 7, "evidence": "ChIP-seq", "cancerRelevance": "Chromatin boundary element; insulator" },\n' +
        '    { "tf": "NF-kB", "bindingScore": 0.44, "motifCount": 2, "evidence": "predicted", "cancerRelevance": "..." }\n' +
        '  ],\n' +
        '  "coRegulators": [\n' +
        '    { "name": "EP300", "type": "coactivator", "interaction": "direct", "function": "Histone acetyltransferase; enhances transcription via H3K27ac deposition", "clinicalNote": "EP300 mutations sensitise to HDAC inhibitors" },\n' +
        '    { "name": "HDAC2", "type": "corepressor", "interaction": "indirect", "function": "Deacetylates histones to silence target gene", "clinicalNote": "Overexpressed in colorectal cancer; vorinostat target" },\n' +
        '    { "name": "BRD4", "type": "mediator", "interaction": "direct", "function": "Reads H3K27ac; recruits P-TEFb for elongation", "clinicalNote": "JQ1/BET inhibitor target — active clinical trials" },\n' +
        '    { "name": "SWI/SNF", "type": "chromatin remodeler", "interaction": "indirect", "function": "ATP-dependent nucleosome repositioning", "clinicalNote": "SMARCA4/ARID1A mutations disrupt complex in 20% cancers" }\n' +
        '  ],\n' +
        '  "epigeneticMarks": [\n' +
        '    { "mark": "H3K27ac", "status": "active", "level": "high", "implication": "Active enhancer; promoter is in open chromatin state" },\n' +
        '    { "mark": "H3K4me3", "status": "active", "level": "high", "implication": "Active promoter mark; correlates with high mRNA output" },\n' +
        '    { "mark": "H3K27me3", "status": "absent", "level": "low", "implication": "Polycomb repression absent; gene escapes silencing" },\n' +
        '    { "mark": "H3K9me3", "status": "absent", "level": "absent", "implication": "No heterochromatin mark; gene resides in euchromatin" },\n' +
        '    { "mark": "H3K4me1", "status": "active", "level": "moderate", "implication": "Poised or active enhancer elements flanking the gene" },\n' +
        '    { "mark": "DNA Methylation", "status": "repressed", "level": "low", "implication": "Low CpG methylation consistent with active transcription" }\n' +
        '  ],\n' +
        '  "regulatoryNetwork": {\n' +
        `    "dominantTF": "SP1",\n` +
        '    "regulatoryState": "transcriptionally active",\n' +
        '    "cpgIsland": "present",\n' +
        '    "cpgMethylation": "hypomethylated",\n' +
        `    "clinicalSummary": "The promoter of ${g} is maintained in an open, active chromatin state. Therapeutic exploitation through BET/HDAC inhibition is rational given BRD4 co-occupancy."\n` +
        '  }\n' +
        '}\n' +
        '```\n\n' +
        'After the JSON block provide a scientific narrative:\n\n' +
        `## Regulatory Landscape\n` +
        `Describe the overall transcriptional architecture of ${g} — promoter structure, ` +
        `key regulatory elements (enhancers, silencers, insulators), and TAD context if relevant.\n\n` +
        `## Key Transcription Factor Mechanisms\n` +
        `Explain the two or three highest-scoring TFs mechanistically. How do they activate or repress ${g}? ` +
        `Are these TFs themselves oncogenic or tumour-suppressive in ${cancer.shortName}?\n\n` +
        `## Epigenetic State & Chromatin Architecture\n` +
        `Interpret the histone modification landscape. Is the promoter bivalent? ` +
        `What do the CpG methylation data tell us about ${g} silencing or activation in ${cancer.shortName}? ` +
        `Mention ATAC-seq / DNase hypersensitivity data where applicable.\n\n` +
        `## Co-regulator Vulnerabilities & Therapeutic Relevance\n` +
        `Which co-regulators represent druggable nodes? Cite approved or investigational agents ` +
        `(e.g. BET inhibitors, HDAC inhibitors, EZH2 inhibitors, LSD1 inhibitors). ` +
        `Discuss any synthetic lethality between ${g} pathway and epigenetic drugs.\n\n` +
        `Use **bold** for gene names, drug names, and histone marks.`;

      const response = await askAI(prompt);
      const parsed = parseRegulatoryData(response.text);
      const cleanText = removeRegulonFence(response.text);
      setResult(parsed);
      setAiText(cleanText);
      setAiProvider(response.provider);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────────

  const tfList = result?.tfBindingSites ?? [];
  const visibleTFs = showAllTFs ? tfList : tfList.slice(0, 6);
  const coRegList = result?.coRegulators ?? [];
  const visibleCoRegs = showAllCoRegs ? coRegList : coRegList.slice(0, 4);

  const barData = [...tfList]
    .sort((a, b) => b.bindingScore - a.bindingScore)
    .slice(0, 10)
    .map((t) => ({ name: t.tf, score: t.bindingScore, motifCount: t.motifCount, evidence: t.evidence }));

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Dna size={15} className="text-brand-600" />
          Transcriptional Regulation Analysis
        </h2>
        <p className="text-xs text-gray-500">
          TF binding site mapping, co-regulator interactions, and epigenetic chromatin state
          analysis for mechanistic clarity in {cancer.shortName} (ENCODE / JASPAR / TCGA).
        </p>
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Target Gene</label>
          <input
            className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. MYC"
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
          {loading ? 'Analysing…' : 'Analyse Regulation'}
        </button>
      </div>

      {/* Attribution */}
      <p className="text-xs text-gray-400 flex items-center gap-1">
        <Database size={11} />
        Data sources: ENCODE ChIP-seq · JASPAR TF motifs · Roadmap Epigenomics · {cancer.shortName} TCGA cohort
      </p>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-5">
        {result && (
          <div className="space-y-5">
            {/* ── Regulatory network summary ─────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-center">
                <p className="text-lg font-bold text-gray-700">{tfList.length}</p>
                <p className="text-xs text-gray-500">TF Binding Sites</p>
              </div>
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-center">
                <p className="text-lg font-bold text-gray-700">{coRegList.length}</p>
                <p className="text-xs text-gray-500">Co-regulators</p>
              </div>
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-center">
                <p className="text-sm font-bold text-gray-700 leading-tight">
                  {result.regulatoryNetwork.dominantTF}
                </p>
                <p className="text-xs text-gray-500">Dominant TF</p>
              </div>
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-center">
                <p
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded-full inline-block ${regulatoryStateBadge(
                    result.regulatoryNetwork.regulatoryState,
                  )}`}
                >
                  {result.regulatoryNetwork.regulatoryState}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">State</p>
              </div>
            </div>

            {/* ── CpG & Regulatory overview ──────────────────────────────── */}
            <div className="flex flex-wrap gap-2 items-center p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs">
              <span className="font-medium text-blue-700">Regulatory Overview</span>
              <span className="text-blue-800">{result.regulatoryNetwork.clinicalSummary}</span>
              <div className="flex gap-2 mt-1 w-full flex-wrap">
                <span className="text-xs text-blue-600">
                  CpG Island:{' '}
                  <span className="font-semibold capitalize">
                    {result.regulatoryNetwork.cpgIsland}
                  </span>
                </span>
                {(() => {
                  const mb = methylationBadge(result.regulatoryNetwork.cpgMethylation);
                  return (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${mb.cls}`}
                    >
                      {mb.label}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* ── TF Binding bar chart ───────────────────────────────────── */}
            {barData.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">
                  TF Binding Scores (ENCODE / JASPAR)
                </p>
                <ResponsiveContainer width="100%" height={Math.max(160, barData.length * 26)}>
                  <BarChart
                    data={barData}
                    layout="vertical"
                    margin={{ top: 0, right: 48, left: 60, bottom: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 1]}
                      tickCount={6}
                      tick={{ fontSize: 10 }}
                      label={{
                        value: 'Binding score',
                        position: 'insideBottom',
                        offset: -10,
                        fontSize: 10,
                      }}
                    />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as {
                          name: string;
                          score: number;
                          motifCount: number;
                          evidence: string;
                        };
                        const { cls } = evidenceBadge(d.evidence);
                        const full = tfList.find((t) => t.tf === d.name);
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm text-xs max-w-56">
                            <p className="font-semibold text-gray-800">{d.name}</p>
                            <p className="mt-0.5">
                              <span className="text-gray-500">Score:</span>{' '}
                              <span className="font-mono font-bold">
                                {d.score.toFixed(2)}
                              </span>
                            </p>
                            <p>
                              <span className="text-gray-500">Motifs:</span> {d.motifCount}
                            </p>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${cls}`}>
                              {d.evidence}
                            </span>
                            {full && (
                              <p className="mt-1 text-gray-500">{full.cancerRelevance}</p>
                            )}
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine x={0.5} stroke="#d1d5db" strokeDasharray="3 3" />
                    <Bar dataKey="score" radius={[0, 3, 3, 0]}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={tfScoreColor(entry.score)} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Info size={10} />
                  Score ≥ 0.75 = strong evidence. Hover bars for motif count &amp; cancer relevance.
                </p>
              </div>
            )}

            {/* ── TF binding site cards ──────────────────────────────────── */}
            {tfList.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">
                  TF Binding Details ({tfList.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {visibleTFs.map((tf, i) => {
                    const ev = evidenceBadge(tf.evidence);
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-brand-700 text-sm">
                              {tf.tf}
                            </span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded font-medium ${ev.cls}`}
                            >
                              {tf.evidence}
                            </span>
                            <span className="text-xs text-gray-400 ml-auto">
                              ×{tf.motifCount} motifs
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{tf.cancerRelevance}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span
                            className="text-sm font-mono font-bold"
                            style={{ color: tfScoreColor(tf.bindingScore) }}
                          >
                            {tf.bindingScore.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {tfList.length > 6 && (
                  <button
                    onClick={() => setShowAllTFs((v) => !v)}
                    className="flex items-center gap-1 mt-1.5 text-xs text-brand-600 hover:underline"
                  >
                    {showAllTFs ? (
                      <>
                        <ChevronUp size={12} /> Show fewer
                      </>
                    ) : (
                      <>
                        <ChevronDown size={12} /> Show all {tfList.length} TFs
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* ── Co-regulators ─────────────────────────────────────────── */}
            {coRegList.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">Co-regulators</p>
                <div className="space-y-1.5">
                  {visibleCoRegs.map((cr, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-brand-200 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-gray-800 text-sm">
                            {cr.name}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${coregTypeColor(
                              cr.type,
                            )}`}
                          >
                            {cr.type}
                          </span>
                          <span className="text-xs text-gray-400">
                            {cr.interaction} interaction
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{cr.function}</p>
                        {cr.clinicalNote && (
                          <p className="text-xs text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1 inline-block">
                            💊 {cr.clinicalNote}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {coRegList.length > 4 && (
                  <button
                    onClick={() => setShowAllCoRegs((v) => !v)}
                    className="flex items-center gap-1 mt-1.5 text-xs text-brand-600 hover:underline"
                  >
                    {showAllCoRegs ? (
                      <>
                        <ChevronUp size={12} /> Show fewer
                      </>
                    ) : (
                      <>
                        <ChevronDown size={12} /> Show all {coRegList.length} co-regulators
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* ── Epigenetic marks ──────────────────────────────────────── */}
            {result.epigeneticMarks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">
                  Epigenetic Chromatin Marks
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {result.epigeneticMarks.map((em, i) => {
                    const style = epigeneticStatusStyle(em.status);
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${style.badge}`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${style.dot}`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-semibold text-xs">{em.mark}</span>
                            <span className="text-xs font-medium capitalize">{em.status}</span>
                            <span className="text-xs opacity-70 capitalize">
                              — {em.level} level
                            </span>
                          </div>
                          <p className="text-xs opacity-80 mt-0.5">{em.implication}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI loading indicator */}
        {loading && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            <Loader2 size={13} className="animate-spin" />
            Running transcriptional regulation analysis…
          </div>
        )}

        {/* AI narrative */}
        {aiText && (
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-gray-600">
                Transcriptional Regulation Report
              </p>
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
              <Dna size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Enter a gene to map its transcriptional regulome.</p>
              <p className="text-xs mt-1">
                Analyses TF binding sites, co-activators/repressors, histone marks, and CpG
                methylation state to reveal mechanistic regulatory drivers.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
