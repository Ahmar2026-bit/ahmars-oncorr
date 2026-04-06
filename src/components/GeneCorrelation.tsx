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
import { TrendingUp, RefreshCw, ChevronDown } from 'lucide-react';
import { CANCER_TYPES, getCancerById } from '../data/cancerTypes';

interface CorrelationPoint {
  x: number;
  y: number;
  sample: string;
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

  function analyse() {
    const a = localA.trim().toUpperCase();
    const b = localB.trim().toUpperCase();
    if (!a || !b) return;
    const result = generateSyntheticData(a, b, cancerType);
    setData(result);
    onGenesChange(a, b);
    onCorrelation(result.r);
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
          {/* Pearson r badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-mono font-semibold">
              Pearson r = <span className={label!.color}>{data.r}</span>
            </span>
            <span className={`text-xs font-medium ${label!.color}`}>{label!.text}</span>
            <span className="text-xs text-gray-400 ml-auto">
              Synthetic TCGA-like data · {cancer.shortName} · {data.points.length} samples
            </span>
          </div>

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
                <Scatter data={data.points} fill="#0ea5e9" fillOpacity={0.65} r={4} />
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
