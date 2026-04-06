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
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { TrendingUp, RefreshCw, Download, BarChart2 } from 'lucide-react';

interface CorrelationPoint {
  x: number;
  y: number;
  sample: string;
}

const CANCER_TYPES = [
  { code: 'PAN',  label: 'Pan-Cancer' },
  { code: 'BRCA', label: 'Breast (BRCA)' },
  { code: 'LUAD', label: 'Lung Adeno (LUAD)' },
  { code: 'LUSC', label: 'Lung Squam (LUSC)' },
  { code: 'COAD', label: 'Colon (COAD)' },
  { code: 'GBM',  label: 'Glioblastoma (GBM)' },
  { code: 'OV',   label: 'Ovarian (OV)' },
  { code: 'PRAD', label: 'Prostate (PRAD)' },
  { code: 'SKCM', label: 'Melanoma (SKCM)' },
  { code: 'STAD', label: 'Stomach (STAD)' },
  { code: 'BLCA', label: 'Bladder (BLCA)' },
  { code: 'KIRC', label: 'Kidney cc (KIRC)' },
  { code: 'LIHC', label: 'Liver (LIHC)' },
  { code: 'PAAD', label: 'Pancreas (PAAD)' },
];

const HEATMAP_CANCERS = ['BRCA', 'LUAD', 'COAD', 'GBM', 'OV', 'PRAD', 'SKCM', 'STAD', 'BLCA', 'KIRC'];

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateSyntheticData(
  geneA: string,
  geneB: string,
  cancerType: string,
  n = 60,
): { points: CorrelationPoint[]; r: number } {
  const seed = [...(geneA + geneB + cancerType)].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rng = seededRng(seed);

  const baseR = ((seed % 200) - 100) / 100;
  const points: CorrelationPoint[] = [];

  for (let i = 0; i < n; i++) {
    const x = rng() * 10 + 1;
    const noise = (rng() - 0.5) * (1 - Math.abs(baseR)) * 8;
    const y = baseR * x + (rng() * 3 + 1) + noise;
    points.push({ x: +x.toFixed(2), y: +Math.max(0, y).toFixed(2), sample: `TCGA-${i + 1}` });
  }

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

function generateHeatmapData(gene: string): Array<{ cancer: string; expr: number }> {
  return HEATMAP_CANCERS.map((cancer) => {
    const seed = [...(gene + cancer)].reduce((a, c) => a + c.charCodeAt(0), 0);
    const rng = seededRng(seed);
    const expr = +(rng() * 8 + 1).toFixed(2);
    return { cancer, expr };
  });
}

function rLabel(r: number): { text: string; color: string } {
  const abs = Math.abs(r);
  const dir = r >= 0 ? 'positive' : 'negative';
  if (abs >= 0.7) return { text: `Strong ${dir}`, color: r >= 0 ? 'text-green-600' : 'text-red-600' };
  if (abs >= 0.4) return { text: `Moderate ${dir}`, color: 'text-yellow-600' };
  return { text: 'Weak / no correlation', color: 'text-gray-500' };
}

function exprColor(v: number): string {
  if (v >= 7) return '#16a34a';
  if (v >= 4) return '#d97706';
  return '#9ca3af';
}

function downloadCSV(
  geneA: string,
  geneB: string,
  cancerType: string,
  points: CorrelationPoint[],
  r: number,
) {
  const header = `gene_a,gene_b,cancer_type,pearson_r,sample,${geneA}_expr,${geneB}_expr\n`;
  const rows = points
    .map((p) => `${geneA},${geneB},${cancerType},${r},${p.sample},${p.x},${p.y}`)
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `oncorr_${geneA}_${geneB}_${cancerType}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GeneCorrelation({
  geneA,
  geneB,
  onGenesChange,
}: {
  geneA: string;
  geneB: string;
  onGenesChange: (a: string, b: string) => void;
}) {
  const [localA, setLocalA] = useState(geneA);
  const [localB, setLocalB] = useState(geneB);
  const [cancerType, setCancerType] = useState('PAN');
  const [data, setData] = useState<{ points: CorrelationPoint[]; r: number } | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  function analyse() {
    const a = localA.trim().toUpperCase();
    const b = localB.trim().toUpperCase();
    if (!a || !b) return;
    setData(generateSyntheticData(a, b, cancerType));
    onGenesChange(a, b);
  }

  const label = data ? rLabel(data.r) : null;
  const activeGeneA = (localA || geneA).trim().toUpperCase();
  const heatmapData = activeGeneA ? generateHeatmapData(activeGeneA) : [];

  return (
    <div className="space-y-4">
      {/* Gene inputs + cancer type selector */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Gene A</label>
          <input
            className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
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
            className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. BRCA1"
            value={localB}
            onChange={(e) => setLocalB(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && analyse()}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cancer Type</label>
          <select
            className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            value={cancerType}
            onChange={(e) => setCancerType(e.target.value)}
          >
            {CANCER_TYPES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
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
          <>
            <button
              onClick={analyse}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-500"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() =>
                downloadCSV(
                  localA.trim().toUpperCase(),
                  localB.trim().toUpperCase(),
                  cancerType,
                  data.points,
                  data.r,
                )
              }
              className="flex items-center gap-1 px-2 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-500 text-xs"
              title="Export CSV"
            >
              <Download size={14} /> CSV
            </button>
          </>
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
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
              {cancerType}
            </span>
            <span className="text-xs text-gray-400 ml-auto">
              Synthetic TCGA-like · {data.points.length} samples
            </span>
          </div>

          <div className="h-56">
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

      {/* Expression Heatmap toggle */}
      {activeGeneA && (
        <div>
          <button
            onClick={() => setShowHeatmap((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
          >
            <BarChart2 size={13} />
            {showHeatmap ? 'Hide' : 'Show'} cross-cancer expression for{' '}
            <span className="font-mono">{activeGeneA}</span>
          </button>

          {showHeatmap && (
            <div className="mt-2 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heatmapData} margin={{ top: 4, right: 8, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="cancer" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    label={{ value: 'Expr (log2)', angle: -90, position: 'insideLeft', offset: 14, fontSize: 10 }}
                  />
                  <Tooltip formatter={(v: unknown) => [`${v}`, 'Expression']} />
                  <Bar dataKey="expr" radius={[4, 4, 0, 0]}>
                    {heatmapData.map((entry, i) => (
                      <Cell key={i} fill={exprColor(entry.expr)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {!data && (
        <div className="h-40 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-xl">
          <div className="text-center">
            <TrendingUp size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Enter two gene symbols and click Analyse</p>
          </div>
        </div>
      )}
    </div>
  );
}
