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
} from 'recharts';
import { Activity, TrendingUp } from 'lucide-react';

interface KMPoint {
  time: number;
  high: number;
  low: number;
}

const CANCER_TYPES = [
  'BRCA', 'LUAD', 'COAD', 'GBM', 'OV', 'PRAD', 'SKCM', 'STAD', 'BLCA', 'KIRC',
];

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateKMData(gene: string, cancerType: string): { points: KMPoint[]; medianHigh: number; medianLow: number } {
  const seed = [...(gene + cancerType)].reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = seededRng(seed);

  const n = 50;
  const maxTime = 60; // months

  // Hazard ratio loosely derived from gene name seed
  const hr = 0.5 + rng() * 1.5; // 0.5 – 2.0
  const baseMedian = 20 + rng() * 20; // 20-40 months for low expressors

  // Generate exponential survival times for both groups
  function expTime(rate: number) {
    return -Math.log(1 - rng()) / rate;
  }

  const highTimes = Array.from({ length: n }, () => expTime(hr / baseMedian) * baseMedian).sort((a, b) => a - b);
  const lowTimes  = Array.from({ length: n }, () => expTime(1 / baseMedian) * baseMedian).sort((a, b) => a - b);

  function kmCurve(times: number[], steps = 30): Array<{ time: number; survival: number }> {
    const pts: Array<{ time: number; survival: number }> = [{ time: 0, survival: 1 }];
    let alive = n;
    for (let i = 0; i < steps; i++) {
      const t = (i + 1) * (maxTime / steps);
      const events = times.filter((x) => x <= t).length;
      const prevEvents = i === 0 ? 0 : times.filter((x) => x <= (i * (maxTime / steps))).length;
      const newEvents = events - prevEvents;
      alive -= newEvents;
      pts.push({ time: +t.toFixed(1), survival: +(alive / n).toFixed(3) });
    }
    return pts;
  }

  const highCurve = kmCurve(highTimes);
  const lowCurve  = kmCurve(lowTimes);

  const points: KMPoint[] = highCurve.map((p, i) => ({
    time: p.time,
    high: p.survival,
    low: lowCurve[i]?.survival ?? 0,
  }));

  const medianHigh = highTimes[Math.floor(n / 2)];
  const medianLow  = lowTimes[Math.floor(n / 2)];

  return { points, medianHigh: +medianHigh.toFixed(1), medianLow: +medianLow.toFixed(1) };
}

export default function SurvivalAnalysis({
  geneA,
  geneB,
}: {
  geneA: string;
  geneB: string;
}) {
  const presets = [geneA, geneB].filter(Boolean);
  const [gene, setGene] = useState(geneA || '');
  const [cancerType, setCancerType] = useState('BRCA');
  const [data, setData] = useState<ReturnType<typeof generateKMData> | null>(null);

  function analyse() {
    const g = gene.trim().toUpperCase();
    if (!g) return;
    setData(generateKMData(g, cancerType));
  }

  const hr =
    data
      ? (data.medianLow / data.medianHigh).toFixed(2)
      : null;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Gene
            {presets.length > 0 && (
              <span className="ml-2 font-normal text-gray-400">
                {presets.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGene(g)}
                    className="ml-1 font-mono text-brand-500 hover:underline"
                  >
                    {g}
                  </button>
                ))}
              </span>
            )}
          </label>
          <input
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. TP53"
            value={gene}
            onChange={(e) => setGene(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && analyse()}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cancer Type</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            value={cancerType}
            onChange={(e) => setCancerType(e.target.value)}
          >
            {CANCER_TYPES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <button
          onClick={analyse}
          disabled={!gene.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
        >
          <Activity size={14} />
          Plot Survival
        </button>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
        ⚠️ Synthetic KM curves — simulated for demonstration. Real TCGA survival data requires portal access.
      </p>

      {data && (
        <>
          {/* Stats row */}
          <div className="flex gap-4 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-red-500 inline-block" />
              <span className="text-gray-700">High <strong>{gene}</strong> expressors</span>
              <span className="text-gray-400 text-xs">median {data.medianHigh} mo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-brand-500 inline-block" />
              <span className="text-gray-700">Low <strong>{gene}</strong> expressors</span>
              <span className="text-gray-400 text-xs">median {data.medianLow} mo</span>
            </div>
            {hr && (
              <div className="ml-auto flex items-center gap-1 text-xs text-gray-500">
                <TrendingUp size={12} />
                HR ≈ {hr} · {cancerType}
              </div>
            )}
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.points} margin={{ top: 4, right: 16, bottom: 16, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="time"
                  label={{ value: 'Months', position: 'insideBottom', offset: -4, fontSize: 11 }}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Survival', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    `${(v * 100).toFixed(1)}%`,
                    name === 'high' ? `High ${gene}` : `Low ${gene}`,
                  ]}
                  labelFormatter={(l) => `Month ${l}`}
                />
                <Legend
                  formatter={(v) => (v === 'high' ? `High ${gene} expression` : `Low ${gene} expression`)}
                />
                <Line type="stepAfter" dataKey="high" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="stepAfter" dataKey="low"  stroke="#0ea5e9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {!data && (
        <div className="h-52 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-xl">
          <div className="text-center">
            <Activity size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Enter a gene and select a cancer type to plot survival curves</p>
          </div>
        </div>
      )}
    </div>
  );
}
