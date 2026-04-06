import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, Loader2, ExternalLink, AlertCircle, Database, Info } from 'lucide-react';
import { getCancerById } from '../data/cancerTypes';
import { askAI, activeProvider } from '../services/aiService';
import { renderMarkdown } from '../utils/markdown';
import ProviderBadge from './ProviderBadge';
import type { AIProvider } from '../services/aiService';

const CBIO_API = 'https://www.cbioportal.org/api';

// Survival patient record
interface SurvivalPatient {
  sampleId: string;
  expression: number;
  osMonths: number;
  osStatus: number; // 1 = event (deceased), 0 = censored
}

// KM curve point
interface KMPoint {
  time: number;
  high: number;
  low: number;
}

// ── Statistical helpers ──────────────────────────────────────────────────────

function normalCDF(x: number): number {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

function chiSquarePValue1df(chi2: number): number {
  if (chi2 <= 0) return 1;
  return 2 * (1 - normalCDF(Math.sqrt(chi2)));
}

function kaplanMeierCurve(patients: SurvivalPatient[]): { time: number; prob: number }[] {
  const sorted = [...patients].sort((a, b) => a.osMonths - b.osMonths);
  const curve: { time: number; prob: number }[] = [{ time: 0, prob: 1 }];
  let n = sorted.length;
  let s = 1;
  for (const p of sorted) {
    if (p.osStatus === 1) {
      s = s * ((n - 1) / n);
      curve.push({ time: +p.osMonths.toFixed(1), prob: +s.toFixed(4) });
    }
    n--;
  }
  return curve;
}

function logRankTest(
  g1: SurvivalPatient[],
  g2: SurvivalPatient[],
): { pValue: number; chi2: number } {
  const eventTimes = [
    ...new Set(
      [...g1, ...g2]
        .filter((p) => p.osStatus === 1)
        .map((p) => p.osMonths),
    ),
  ].sort((a, b) => a - b);

  let oMinusE = 0;
  let variance = 0;

  for (const t of eventTimes) {
    const n1 = g1.filter((p) => p.osMonths >= t).length;
    const n2 = g2.filter((p) => p.osMonths >= t).length;
    const d1 = g1.filter((p) => p.osMonths === t && p.osStatus === 1).length;
    const d2 = g2.filter((p) => p.osMonths === t && p.osStatus === 1).length;
    const n = n1 + n2;
    const d = d1 + d2;
    if (n === 0) continue;
    const e1 = (d * n1) / n;
    oMinusE += d1 - e1;
    if (n > 1) variance += (d * n1 * n2 * (n - d)) / (n * n * (n - 1));
  }

  if (variance === 0) return { pValue: 1, chi2: 0 };
  const chi2 = (oMinusE * oMinusE) / variance;
  return { pValue: chiSquarePValue1df(chi2), chi2: +chi2.toFixed(2) };
}

function hazardRatio(
  high: SurvivalPatient[],
  low: SurvivalPatient[],
): { hr: number; ciLow: number; ciHigh: number } {
  const events1 = high.filter((p) => p.osStatus === 1).length;
  const totalTime1 = high.reduce((s, p) => s + p.osMonths, 0);
  const events2 = low.filter((p) => p.osStatus === 1).length;
  const totalTime2 = low.reduce((s, p) => s + p.osMonths, 0);
  const lambda1 = totalTime1 > 0 ? events1 / totalTime1 : 0;
  const lambda2 = totalTime2 > 0 ? events2 / totalTime2 : 0;
  const hr = lambda2 > 0 ? lambda1 / lambda2 : 0;
  // Approximate 95% CI using Poisson variance
  const logHR = Math.log(hr);
  const se = Math.sqrt(1 / (events1 + 0.5) + 1 / (events2 + 0.5));
  return {
    hr: +hr.toFixed(2),
    ciLow: +(Math.exp(logHR - 1.96 * se)).toFixed(2),
    ciHigh: +(Math.exp(logHR + 1.96 * se)).toFixed(2),
  };
}

// ── cBioPortal data fetchers ──────────────────────────────────────────────────

async function getEntrezId(geneSymbol: string): Promise<number> {
  const res = await fetch(`${CBIO_API}/genes/${encodeURIComponent(geneSymbol)}`);
  if (!res.ok) throw new Error(`Gene not found: ${geneSymbol}`);
  const data = await res.json();
  return (data as { entrezGeneId: number }).entrezGeneId;
}

async function fetchExpressionData(
  studyId: string,
  entrezId: number,
): Promise<{ sampleId: string; value: number }[]> {
  // Try rna_seq_v2_mrna first, fall back to rna_seq_mrna
  const profiles = [`${studyId}_rna_seq_v2_mrna`, `${studyId}_rna_seq_mrna`, `${studyId}_mrna`];
  for (const profileId of profiles) {
    try {
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
      if (!res.ok) continue;
      const data = (await res.json()) as { sampleId: string; value: number }[];
      if (Array.isArray(data) && data.length > 0) return data;
    } catch {
      continue;
    }
  }
  throw new Error('No RNA expression profile found for this study.');
}

async function fetchClinicalAttribute(
  studyId: string,
  attributeId: string,
): Promise<{ sampleId: string; value: string }[]> {
  const res = await fetch(
    `${CBIO_API}/studies/${studyId}/clinical-data` +
      `?clinicalAttributeId=${attributeId}&projection=SUMMARY&pageSize=10000`,
  );
  if (!res.ok) throw new Error(`Clinical attribute ${attributeId} not available`);
  return (await res.json()) as { sampleId: string; value: string }[];
}

async function loadSurvivalData(
  studyId: string,
  entrezId: number,
): Promise<SurvivalPatient[]> {
  const [expressionData, osMonthsData, osStatusData] = await Promise.all([
    fetchExpressionData(studyId, entrezId),
    fetchClinicalAttribute(studyId, 'OS_MONTHS'),
    fetchClinicalAttribute(studyId, 'OS_STATUS'),
  ]);

  const monthsMap = new Map(osMonthsData.map((d) => [d.sampleId, parseFloat(d.value)]));
  const statusMap = new Map(
    osStatusData.map((d) => [
      d.sampleId,
      d.value.includes('DECEASED') || d.value === '1' ? 1 : 0,
    ]),
  );

  return expressionData
    .filter(
      (e) =>
        monthsMap.has(e.sampleId) &&
        statusMap.has(e.sampleId) &&
        !isNaN(e.value) &&
        !isNaN(monthsMap.get(e.sampleId)!),
    )
    .map((e) => ({
      sampleId: e.sampleId,
      expression: e.value,
      osMonths: monthsMap.get(e.sampleId)!,
      osStatus: statusMap.get(e.sampleId)!,
    }));
}

// ── Chart helpers ─────────────────────────────────────────────────────────────

function buildKMChartData(highCurve: { time: number; prob: number }[], lowCurve: { time: number; prob: number }[]): KMPoint[] {
  // Merge all time points from both curves
  const allTimes = [...new Set([...highCurve.map((p) => p.time), ...lowCurve.map((p) => p.time)])].sort(
    (a, b) => a - b,
  );

  let lastHigh = 1;
  let lastLow = 1;
  const hiMap = new Map(highCurve.map((p) => [p.time, p.prob]));
  const loMap = new Map(lowCurve.map((p) => [p.time, p.prob]));

  return allTimes.map((t) => {
    if (hiMap.has(t)) lastHigh = hiMap.get(t)!;
    if (loMap.has(t)) lastLow = loMap.get(t)!;
    return { time: t, high: lastHigh, low: lastLow };
  });
}

function pValueLabel(p: number): string {
  if (p < 0.0001) return 'p < 0.0001';
  if (p < 0.001) return 'p < 0.001';
  if (p < 0.01) return `p = ${p.toFixed(4)}`;
  return `p = ${p.toFixed(3)}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SurvivalResult {
  high: SurvivalPatient[];
  low: SurvivalPatient[];
  kmData: KMPoint[];
  pValue: number;
  chi2: number;
  hr: number;
  ciLow: number;
  ciHigh: number;
  studyId: string;
  n: number;
}

export default function SurvivalAnalysis({
  geneA,
  geneB: _geneB,
  cancerType,
}: {
  geneA: string;
  geneB: string;
  cancerType: string;
}) {
  const cancer = getCancerById(cancerType);
  const [gene, setGene] = useState(geneA || '');
  const [result, setResult] = useState<SurvivalResult | null>(null);
  const [aiText, setAiText] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>(activeProvider);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysed, setAnalysed] = useState(false);

  async function analyse() {
    const g = gene.trim().toUpperCase();
    if (!g || loading) return;
    setLoading(true);
    setError('');
    setAnalysed(true);
    setResult(null);
    setAiText('');

    try {
      const studyId = cancer.cbioStudyId ?? 'brca_tcga';
      const entrezId = await getEntrezId(g);
      const patients = await loadSurvivalData(studyId, entrezId);

      if (patients.length < 20) {
        throw new Error(`Insufficient survival data (n=${patients.length}) for ${g} in ${cancer.shortName}.`);
      }

      // Stratify by median expression
      const sorted = [...patients].sort((a, b) => a.expression - b.expression);
      const median = sorted[Math.floor(sorted.length / 2)].expression;
      const high = patients.filter((p) => p.expression >= median);
      const low = patients.filter((p) => p.expression < median);

      const highCurve = kaplanMeierCurve(high);
      const lowCurve = kaplanMeierCurve(low);
      const kmData = buildKMChartData(highCurve, lowCurve);
      const { pValue, chi2 } = logRankTest(high, low);
      const { hr, ciLow, ciHigh } = hazardRatio(high, low);

      setResult({ high, low, kmData, pValue, chi2, hr, ciLow, ciHigh, studyId, n: patients.length });

      // AI interpretation
      const prompt =
        `Kaplan-Meier survival analysis result for gene ${g} in ${cancer.label} (TCGA, n=${patients.length}):\n` +
        `- High expression group: n=${high.length}, ${high.filter((p) => p.osStatus === 1).length} events\n` +
        `- Low expression group: n=${low.length}, ${low.filter((p) => p.osStatus === 1).length} events\n` +
        `- Log-rank test: χ²=${chi2}, ${pValueLabel(pValue)}\n` +
        `- Hazard Ratio (high vs. low): ${hr} (95% CI: ${ciLow}–${ciHigh})\n\n` +
        `Please provide a clinical interpretation:\n\n` +
        `## Prognostic Significance\n` +
        `Interpret the survival difference and its clinical meaning.\n\n` +
        `## Biological Basis\n` +
        `Explain why ${g} expression level may drive this survival difference.\n\n` +
        `## Therapeutic Implications\n` +
        `What targeted therapies or treatment strategies are relevant for ${g}-high vs ${g}-low tumors?\n\n` +
        `## Biomarker Potential\n` +
        `Assess ${g} as a prognostic or predictive biomarker in ${cancer.shortName}.\n\n` +
        `Use markdown formatting. Bold key terms and statistics.`;

      const response = await askAI(prompt);
      setAiText(response.text);
      setAiProvider(response.provider);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Survival analysis failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const sig = result && result.pValue < 0.05;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <TrendingUp size={15} className="text-brand-600" />
          Kaplan-Meier Survival Plotter
        </h2>
        <p className="text-xs text-gray-500">
          Real TCGA patient survival stratified by gene expression (high vs. low). Log-rank p-value,
          hazard ratio, and 95% CI from cBioPortal.
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
          {loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
          {loading ? 'Fetching TCGA data…' : 'Plot Survival'}
        </button>
        {result && (
          <a
            href={`https://www.cbioportal.org/study/summary?id=${result.studyId}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-brand-500 hover:underline ml-auto"
          >
            View on cBioPortal <ExternalLink size={11} />
          </a>
        )}
      </div>

      {/* Data source badge */}
      <p className="text-xs text-gray-400 flex items-center gap-1">
        <Database size={11} />
        Survival data from{' '}
        <a href="https://www.cbioportal.org" target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">
          cBioPortal
        </a>{' '}
        — TCGA{cancer.cbioStudyId ? ` · ${cancer.shortName}` : ''}{result ? ` · n=${result.n} patients` : ''}
      </p>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Stats row */}
        {result && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'Log-rank p',
                value: pValueLabel(result.pValue),
                sub: `χ² = ${result.chi2}`,
                color: sig ? 'text-green-600' : 'text-yellow-600',
                bg: sig ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200',
              },
              {
                label: 'Hazard Ratio',
                value: `${result.hr}`,
                sub: `95% CI: ${result.ciLow}–${result.ciHigh}`,
                color: 'text-brand-600',
                bg: 'bg-brand-50 border-brand-200',
              },
              {
                label: 'High expression',
                value: `n = ${result.high.length}`,
                sub: `${result.high.filter((p) => p.osStatus === 1).length} events`,
                color: 'text-red-600',
                bg: 'bg-red-50 border-red-200',
              },
              {
                label: 'Low expression',
                value: `n = ${result.low.length}`,
                sub: `${result.low.filter((p) => p.osStatus === 1).length} events`,
                color: 'text-blue-600',
                bg: 'bg-blue-50 border-blue-200',
              },
            ].map((s) => (
              <div key={s.label} className={`border rounded-xl p-3 ${s.bg}`}>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400">{s.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* KM Plot */}
        {result && result.kmData.length > 1 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-600">
                Kaplan-Meier Overall Survival — {gene.trim().toUpperCase()} · {cancer.shortName}
              </p>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  sig
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {sig ? '✓ Significant' : '✗ Not significant'} ({pValueLabel(result.pValue)})
              </span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={result.kmData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickCount={8}
                  label={{ value: 'Months', position: 'insideBottom', offset: -2, fontSize: 11 }}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  domain={[0, 1]}
                  tickCount={6}
                  tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Survival probability', angle: -90, position: 'insideLeft', fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [
                    `${((value as number) * 100).toFixed(1)}%`,
                    name === 'high' ? `High ${gene} expression` : `Low ${gene} expression`,
                  ]}
                  labelFormatter={(label: unknown) => `Month ${label as number}`}
                />
                <Legend
                  formatter={(value) =>
                    value === 'high'
                      ? `High expression (n=${result.high.length})`
                      : `Low expression (n=${result.low.length})`
                  }
                />
                <ReferenceLine y={0.5} stroke="#9ca3af" strokeDasharray="4 2" />
                <Line
                  type="stepAfter"
                  dataKey="high"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="stepAfter"
                  dataKey="low"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Info size={10} />
              Median expression cutoff used for stratification. Dashed line = 50% survival.
            </p>
          </div>
        )}

        {/* AI interpretation */}
        {aiText && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-gray-600">Clinical Interpretation</p>
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
              <TrendingUp size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Enter a gene to plot Kaplan-Meier survival curves.</p>
              <p className="text-xs mt-1">
                Uses real TCGA patient data from cBioPortal — no API key required.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
