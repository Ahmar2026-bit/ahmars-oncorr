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
} from 'recharts';
import { TrendingUp, RefreshCw, ChevronDown, Download, Settings2 } from 'lucide-react';
import { CANCER_TYPES, getCancerById } from '../data/cancerTypes';

interface CorrelationPoint {
  x: number;
  y: number;
  sample: string;
  cancerTypeId: string;
}

const PALETTES = {
  ocean:    { fill: '#0ea5e9', label: '🔵 Ocean Blue' },
  crimson:  { fill: '#ef4444', label: '🔴 Crimson' },
  emerald:  { fill: '#10b981', label: '🟢 Emerald' },
  violet:   { fill: '#8b5cf6', label: '🟣 Violet' },
  contrast: { fill: '#1a1a2e', label: '⚫ High Contrast' },
  cb:       { fill: '#e69f00', label: '🟡 Colorblind-safe' },
} as const;

type PaletteKey = keyof typeof PALETTES;

const PAN_CANCER_COHORTS = [
  'BRCA', 'LUAD', 'COAD', 'GBM', 'OV', 'KIRC', 'PRAD', 'UCEC', 'SKCM', 'STAD',
];

function normalCDF(x: number): number {
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.2316419 * ax);
  const d = 0.3989423 * Math.exp(-ax * ax / 2);
  const upperTail = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  return x >= 0 ? 1 - upperTail : upperTail;
}

function pValueFromR(r: number, n: number): number {
  if (n <= 2) return 1;
  const t = r * Math.sqrt(n - 2) / Math.sqrt(Math.max(1e-10, 1 - r * r));
  return 2 * normalCDF(-Math.abs(t));
}

function formatP(p: number): string {
  if (p < 0.001) return 'p < 0.001';
  if (p < 0.01) return `p = ${p.toFixed(3)}`;
  return `p = ${p.toFixed(3)}`;
}

function generateSyntheticData(
  geneA: string,
  geneB: string,
  cancerType = 'BRCA',
  n = 60,
): { points: CorrelationPoint[]; r: number } {
  // Deterministic seed from gene names + cancer type so results are reproducible per cohort
  const seed = [...(geneA + geneB + cancerType)].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  let s = seed;
  const rng = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };

  // Base correlation coefficient (-1 to 1) derived from gene names
  const baseR = ((seed % 200) - 100) / 100;
  const points: CorrelationPoint[] = [];

  for (let i = 0; i < n; i++) {
    const x = rng() * 10 + 1;
    const noise = (rng() - 0.5) * (1 - Math.abs(baseR)) * 8;
    const y = baseR * x + (rng() * 3 + 1) + noise;
    points.push({ x: +x.toFixed(2), y: +Math.max(0, y).toFixed(2), sample: `TCGA-${i + 1}` });
  }

  // Compute Pearson r from generated points
  const n2 = points.length;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n2;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n2;
  const num = points.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0);
  const den = Math.sqrt(
    points.reduce((s, p) => s + (p.x - meanX) ** 2, 0) *
      points.reduce((s, p) => s + (p.y - meanY) ** 2, 0),
  );
  const r = den === 0 ? 0 : num / den;

  return { points, r: +r.toFixed(3) };
}

function rLabel(r: number): { text: string; color: string } {
  const abs = Math.abs(r);
  const dir = r >= 0 ? 'positive' : 'negative';
  if (abs >= 0.7) return { text: `Strong ${dir}`, color: r >= 0 ? 'text-green-600' : 'text-red-600' };
  if (abs >= 0.4) return { text: `Moderate ${dir}`, color: 'text-yellow-600' };
  return { text: 'Weak / no correlation', color: 'text-gray-500' };
}

export default function GeneCorrelation({
  geneA,
  geneB,
  cancerType,
  onGenesChange,
  onCancerChange,
  onCorrelation,
}: {
  geneA: string;
  geneB: string;
  cancerType: string;
  onGenesChange: (a: string, b: string) => void;
  onCancerChange: (c: string) => void;
  onCorrelation: (r: number) => void;
}) {
  const [localA, setLocalA] = useState(geneA);
  const [localB, setLocalB] = useState(geneB);
  const [data, setData] = useState<{ points: CorrelationPoint[]; r: number } | null>(null);
  const [pointSize, setPointSize] = useState(4);
  const [palette, setPalette] = useState<PaletteKey>('ocean');
  const [showControls, setShowControls] = useState(false);

  function analyse() {
    const a = localA.trim().toUpperCase();
    const b = localB.trim().toUpperCase();
    if (!a || !b) return;
    const result = generateSyntheticData(a, b, cancerType);
    setData(result);
    onGenesChange(a, b);
    onCorrelation(result.r);
  }

  function downloadCSV() {
    if (!data) return;
    const lines = [
      `# OncoCorr export — ${localA} vs ${localB} · ${cancerType} · Pearson r = ${data.r}`,
      `sample,${localA}_expression,${localB}_expression`,
      ...data.points.map((p) => `${p.sample},${p.x},${p.y}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `oncorr_${localA}_${localB}_${cancerType}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const label = data ? rLabel(data.r) : null;

  const cancer = getCancerById(cancerType);

  return (
    <div className="space-y-4">
      {/* Cancer type selector */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">TCGA Cancer Cohort</label>
        <div className="relative inline-block w-full max-w-sm">
          <select
            value={cancerType}
            onChange={(e) => {
              onCancerChange(e.target.value);
              if (data) {
                const a = localA.trim().toUpperCase();
                const b = localB.trim().toUpperCase();
                if (a && b) {
                  const result = generateSyntheticData(a, b, e.target.value);
                  setData(result);
                  onCorrelation(result.r);
                }
              }
            }}
            className="w-full appearance-none border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
          >
            {CANCER_TYPES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.samples.toLocaleString()} samples)
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Gene inputs */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Gene A</label>
          <input
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. TP53"
            value={localA}
            onChange={(e) => setLocalA(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && analyse()}
          />
        </div>
        <span className="text-gray-400 mb-2 text-sm">vs</span>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Gene B</label>
          <input
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. BRCA1"
            value={localB}
            onChange={(e) => setLocalB(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && analyse()}
          />
        </div>
        <button
          onClick={analyse}
          disabled={!localA.trim() || !localB.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
        >
          <TrendingUp size={14} />
          Analyse
        </button>
        {data && (
          <button
            onClick={analyse}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-500"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {/* Chart */}
      {data && (
        <>
          {/* Pearson r badge + actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-mono font-semibold">
              Pearson r = <span className={label!.color}>{data.r}</span>
            </span>
            <span className={`text-xs font-medium ${label!.color}`}>{label!.text}</span>
            <span className="text-xs text-gray-400">
              Synthetic TCGA-like · {cancer.shortName} · {data.points.length} samples
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setShowControls((v) => !v)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                title="Chart options"
              >
                <Settings2 size={12} />
                Options
              </button>
              <button
                onClick={downloadCSV}
                className="flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                title="Download CSV"
              >
                <Download size={12} />
                CSV
              </button>
            </div>
          </div>

          {/* Chart controls panel */}
          {showControls && (
            <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
              <div className="flex items-center gap-2">
                <label className="font-medium text-gray-600">Point size</label>
                <input
                  type="range"
                  min={2}
                  max={10}
                  step={1}
                  value={pointSize}
                  onChange={(e) => setPointSize(Number(e.target.value))}
                  className="w-20 accent-brand-600"
                />
                <span className="text-gray-500 w-4">{pointSize}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="font-medium text-gray-600">Color</label>
                <div className="relative">
                  <select
                    value={palette}
                    onChange={(e) => setPalette(e.target.value as PaletteKey)}
                    className="appearance-none border border-gray-300 rounded-md pl-2 pr-6 py-1 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                  >
                    {(Object.entries(PALETTES) as [PaletteKey, { fill: string; label: string }][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>
          )}

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 4, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="x"
                  name={localA}
                  label={{ value: `${localA} expression`, position: 'insideBottom', offset: -4, fontSize: 11 }}
                  tick={{ fontSize: 10 }}
                  type="number"
                />
                <YAxis
                  dataKey="y"
                  name={localB}
                  label={{ value: `${localB} expression`, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }}
                  tick={{ fontSize: 10 }}
                  type="number"
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const p = payload[0].payload as CorrelationPoint;
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow">
                        <p className="font-medium">{p.sample}</p>
                        <p>{localA}: {p.x}</p>
                        <p>{localB}: {p.y}</p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  stroke="#e5e7eb"
                  strokeDasharray="4 4"
                  segment={[
                    { x: Math.min(...data.points.map((d) => d.x)), y: data.r * Math.min(...data.points.map((d) => d.x)) + 1 },
                    { x: Math.max(...data.points.map((d) => d.x)), y: data.r * Math.max(...data.points.map((d) => d.x)) + 1 },
                  ]}
                />
                <Scatter
                  data={data.points}
                  fill={PALETTES[palette].fill}
                  fillOpacity={0.65}
                  r={pointSize}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {!data && (
        <div className="h-48 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-xl">
          <div className="text-center">
            <TrendingUp size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Enter two gene symbols and click Analyse</p>
          </div>
        </div>
      )}
    </div>
  );
}
