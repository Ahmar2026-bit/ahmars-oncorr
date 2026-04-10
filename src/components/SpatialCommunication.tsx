import { useState, useCallback, useMemo, useRef, type ChangeEvent } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import {
  Network,
  Upload,
  Download,
  Info,
  Play,
  RefreshCw,
  BarChart3,
  Map as MapIcon,
  Layers,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SpatialCell {
  id: number;
  x: number;
  y: number;
  cellType: string;
  geneAExpr: number;
  geneBExpr: number;
}

interface WhisperResult {
  cellTypes: string[];
  zScores: number[][];
  pValues: number[][];
  observedCounts: number[][];
}

export interface SpatialCommunicationProps {
  geneA: string;
  geneB: string;
  cancerType: string;
}

type AdjList = Map<number, number[]>;
type AnalysisMode = 'iid' | 'non_iid';
type TabId = 'matrix' | 'network' | 'violin' | 'spatial';

interface ViolinDatum {
  cellType: string;
  geneAMean: number;
  geneBMean: number;
}

interface ScatterDatum {
  x: number;
  y: number;
  cellType: string;
  strength: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CELL_TYPES: string[] = [
  'Epithelial', 'Fibroblast', 'T Cell', 'B Cell',
  'Macrophage', 'Endothelial', 'Tumor', 'NK Cell',
];

const CELL_TYPE_COLORS: Record<string, string> = {
  'Epithelial':  '#16a34a',
  'Fibroblast':  '#d97706',
  'T Cell':      '#2563eb',
  'B Cell':      '#7c3aed',
  'Macrophage':  '#dc2626',
  'Endothelial': '#0891b2',
  'Tumor':       '#78350f',
  'NK Cell':     '#c2410c',
};

// Cluster centres with dominant cell type index
const CLUSTER_CONFIGS: { cx: number; cy: number; r: number; dominantType: number }[] = [
  { cx: 200, cy: 200, r: 60, dominantType: 0 }, // Epithelial
  { cx: 450, cy: 150, r: 55, dominantType: 2 }, // T Cell
  { cx: 650, cy: 300, r: 65, dominantType: 6 }, // Tumor
  { cx: 150, cy: 450, r: 50, dominantType: 1 }, // Fibroblast
  { cx: 500, cy: 500, r: 60, dominantType: 4 }, // Macrophage
  { cx: 750, cy: 500, r: 45, dominantType: 5 }, // Endothelial
  { cx: 350, cy: 700, r: 55, dominantType: 3 }, // B Cell
  { cx: 650, cy: 700, r: 50, dominantType: 7 }, // NK Cell
];

const GENE_A_BIAS: Record<string, number> = {
  Epithelial: 6.5, Fibroblast: 4.5, 'T Cell': 3.5, 'B Cell': 3.0,
  Macrophage: 5.0, Endothelial: 4.0, Tumor: 7.0, 'NK Cell': 3.5,
};

const GENE_B_BIAS: Record<string, number> = {
  Epithelial: 4.0, Fibroblast: 6.0, 'T Cell': 5.5, 'B Cell': 6.5,
  Macrophage: 5.5, Endothelial: 5.0, Tumor: 5.0, 'NK Cell': 5.5,
};

// ── Seeded RNG ─────────────────────────────────────────────────────────────────

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Mock Data Generator ────────────────────────────────────────────────────────

function generateMockCells(geneA: string, geneB: string, cancerType: string): SpatialCell[] {
  const rng = mulberry32(hashSeed(`${geneA}|${geneB}|${cancerType}`));
  const cells: SpatialCell[] = [];

  for (let i = 0; i < 500; i++) {
    const clusterIdx = Math.floor(rng() * CLUSTER_CONFIGS.length);
    const cluster = CLUSTER_CONFIGS[clusterIdx];
    const angle = rng() * 2 * Math.PI;
    const radius = rng() * cluster.r;
    const x = Math.max(0, Math.min(900, cluster.cx + radius * Math.cos(angle) + (rng() - 0.5) * 20));
    const y = Math.max(0, Math.min(900, cluster.cy + radius * Math.sin(angle) + (rng() - 0.5) * 20));
    const typeIdx = rng() < 0.70 ? cluster.dominantType : Math.floor(rng() * CELL_TYPES.length);
    const cellType = CELL_TYPES[typeIdx] ?? 'Epithelial';
    const geneAExpr = Math.max(0, Math.min(10, (GENE_A_BIAS[cellType] ?? 5) + (rng() - 0.5) * 4));
    const geneBExpr = Math.max(0, Math.min(10, (GENE_B_BIAS[cellType] ?? 5) + (rng() - 0.5) * 4));
    cells.push({ id: i, x, y, cellType, geneAExpr, geneBExpr });
  }
  return cells;
}

// ── CellWHISPER Algorithms ─────────────────────────────────────────────────────

function buildNeighborNetwork(cells: SpatialCell[], k: number): AdjList {
  const adj: AdjList = new Map();
  cells.forEach((cell, i) => {
    const dists: [number, number][] = cells.map((other, j) => {
      const dx = cell.x - other.x;
      const dy = cell.y - other.y;
      return [dx * dx + dy * dy, j] as [number, number];
    });
    dists.sort((a, b) => a[0] - b[0]);
    // Skip index 0 (self, distance 0)
    adj.set(i, dists.slice(1, k + 1).map(d => d[1]));
  });
  return adj;
}

function computePercentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)] ?? 0;
}

/** Abramowitz & Stegun normal CDF approximation */
function normalCDF(z: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

function pValueFromZ(z: number): number {
  return 2 * (1 - normalCDF(Math.abs(z)));
}

/**
 * Compute co-expression z-scores for all cell-type pairs.
 * For each directed edge (i→j): cell i expresses geneA > threshA,
 * cell j expresses geneB > threshB (ligand–receptor model).
 */
function computeZScores(
  cells: SpatialCell[],
  adjList: AdjList,
  threshA: number,
  threshB: number,
  mode: AnalysisMode,
): WhisperResult {
  const cellTypeSet = new Set(cells.map(c => c.cellType));
  const cellTypes = Array.from(cellTypeSet).sort();
  const n = cellTypes.length;
  const typeIdx = new Map<string, number>(cellTypes.map((ct, i) => [ct, i]));

  // Per-type probabilities of expressing geneA / geneB above threshold
  const pA = new Array<number>(n).fill(0);
  const pB = new Array<number>(n).fill(0);
  const typeCounts = new Array<number>(n).fill(0);

  cells.forEach(cell => {
    const i = typeIdx.get(cell.cellType)!;
    typeCounts[i]++;
    if (cell.geneAExpr > threshA) pA[i]++;
    if (cell.geneBExpr > threshB) pB[i]++;
  });
  for (let i = 0; i < n; i++) {
    if (typeCounts[i] > 0) { pA[i] /= typeCounts[i]; pB[i] /= typeCounts[i]; }
  }

  // Count directed edges and co-expressing pairs
  const edgeCounts: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const observedCounts: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));

  cells.forEach((cell, idx) => {
    const ci = typeIdx.get(cell.cellType)!;
    const neighbors = adjList.get(idx) ?? [];
    neighbors.forEach(nIdx => {
      const neighbor = cells[nIdx];
      const cj = typeIdx.get(neighbor.cellType)!;
      edgeCounts[ci][cj]++;
      if (cell.geneAExpr > threshA && neighbor.geneBExpr > threshB) {
        observedCounts[ci][cj]++;
      }
    });
  });

  const zScores: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const pValues: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(1));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const edges = edgeCounts[i][j];
      if (edges === 0) continue;
      // Non-iid accounts for spatial clustering of same-type cells
      const overlapFactor = i === j ? 0.2 : 0.05;
      const mean = mode === 'iid'
        ? edges * pA[i] * pB[j]
        : edges * pA[i] * pB[j] * (1 + overlapFactor);
      const variance = mode === 'iid'
        ? Math.max(mean * (1 - pA[i] * pB[j]), 1e-10)
        : Math.max(mean * 1.2, 1e-10);
      const z = (observedCounts[i][j] - mean) / Math.sqrt(variance);
      zScores[i][j] = z;
      pValues[i][j] = pValueFromZ(z);
    }
  }

  return { cellTypes, zScores, pValues, observedCounts };
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function zScoreToColor(z: number, maxZ: number): string {
  if (maxZ === 0) return 'rgb(255,255,255)';
  const t = Math.min(Math.abs(z) / maxZ, 1);
  if (z >= 0) {
    const gb = Math.round(255 * (1 - t));
    return `rgb(255,${gb},${gb})`;
  }
  const rg = Math.round(255 * (1 - t));
  return `rgb(${rg},${rg},255)`;
}

function parseSpatialCSV(text: string): Partial<SpatialCell>[] {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim());
    const get = (k: string) => vals[headers.indexOf(k)] ?? '';
    return {
      id: parseInt(get('cell_id'), 10) || 0,
      x: parseFloat(get('x')) || 0,
      y: parseFloat(get('y')) || 0,
      cellType: get('cell_type') || 'Unknown',
    };
  }).filter(c => !isNaN(c.x!) && !isNaN(c.y!));
}

function parseExprCSV(text: string): Map<number, { geneAExpr: number; geneBExpr: number }> {
  const map = new Map<number, { geneAExpr: number; geneBExpr: number }>();
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return map;
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  lines.slice(1).forEach(line => {
    const vals = line.split(',').map(v => v.trim());
    const get = (k: string) => vals[headers.indexOf(k)] ?? '';
    const id = parseInt(get('cell_id'), 10);
    const geneAExpr = parseFloat(get('genea_expr'));
    const geneBExpr = parseFloat(get('geneb_expr'));
    if (!isNaN(id)) {
      map.set(id, {
        geneAExpr: isNaN(geneAExpr) ? 0 : geneAExpr,
        geneBExpr: isNaN(geneBExpr) ? 0 : geneBExpr,
      });
    }
  });
  return map;
}

function triggerDownload(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CommunicationMatrix({ result }: { result: WhisperResult }) {
  const { cellTypes, zScores, pValues } = result;
  const maxZ = Math.max(...zScores.flat().map(Math.abs), 1);

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse min-w-full">
        <thead>
          <tr>
            <th className="p-2 bg-gray-100 border border-gray-200 text-left font-semibold text-gray-600 whitespace-nowrap">
              Source ↓ / Target →
            </th>
            {cellTypes.map(ct => (
              <th key={ct} className="p-2 bg-gray-100 border border-gray-200 font-semibold text-gray-600 whitespace-nowrap">
                {ct}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cellTypes.map((ctA, i) => (
            <tr key={ctA}>
              <td className="p-2 bg-gray-50 border border-gray-200 font-semibold text-gray-600 whitespace-nowrap">
                {ctA}
              </td>
              {cellTypes.map((ctB, j) => {
                const z = zScores[i][j];
                const pv = pValues[i][j];
                const bg = zScoreToColor(z, maxZ);
                const isSig = Math.abs(z) > 2;
                return (
                  <td
                    key={ctB}
                    className="border border-gray-200 text-center p-1 cursor-default"
                    style={{ backgroundColor: bg, minWidth: 64 }}
                    title={`${ctA} → ${ctB}\nz = ${z.toFixed(3)}\np = ${pv.toFixed(4)}`}
                  >
                    <span
                      className={isSig ? 'font-bold' : 'font-normal'}
                      style={{ color: Math.abs(z) > 1.5 ? '#111' : '#555' }}
                    >
                      {z.toFixed(2)}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span>Color scale:</span>
        <div className="flex items-center gap-1">
          <div className="w-6 h-4 rounded" style={{ backgroundColor: 'rgb(0,0,255)' }} />
          <span>Negative z</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-4 rounded bg-white border border-gray-300" />
          <span>Zero</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-4 rounded" style={{ backgroundColor: 'rgb(255,0,0)' }} />
          <span>Positive z</span>
        </div>
        <span className="ml-2">
          |z| &gt; 2: <strong>bold</strong>
        </span>
      </div>
    </div>
  );
}

function NetworkGraph({ result }: { result: WhisperResult }) {
  const { cellTypes, zScores } = result;
  const n = cellTypes.length;
  const cx = 250, cy = 220, r = 160;
  const svgW = 500, svgH = 440;

  const nodePos = cellTypes.map((_, i) => ({
    x: cx + r * Math.cos((2 * Math.PI * i) / n - Math.PI / 2),
    y: cy + r * Math.sin((2 * Math.PI * i) / n - Math.PI / 2),
  }));

  const edges: { x1: number; y1: number; x2: number; y2: number; z: number }[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const z = (zScores[i][j] + zScores[j][i]) / 2;
      if (Math.abs(z) > 2) {
        edges.push({
          x1: nodePos[i].x, y1: nodePos[i].y,
          x2: nodePos[j].x, y2: nodePos[j].y, z,
        });
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={svgW} height={svgH} className="rounded-lg bg-gray-50 border border-gray-200">
        {edges.map((e, idx) => (
          <line
            key={idx}
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={e.z > 0 ? '#ef4444' : '#3b82f6'}
            strokeWidth={Math.min(Math.abs(e.z) * 0.8, 6)}
            strokeOpacity={0.65}
          />
        ))}
        {nodePos.map((pos, i) => {
          const ct = cellTypes[i] ?? '';
          const color = CELL_TYPE_COLORS[ct] ?? '#6b7280';
          const words = ct.split(' ');
          return (
            <g key={ct}>
              <circle cx={pos.x} cy={pos.y} r={22} fill={color} stroke="#fff" strokeWidth={2} />
              <text textAnchor="middle" fontSize={7} fill="#fff" fontWeight="bold">
                {words.map((w, wi) => (
                  <tspan
                    key={wi}
                    x={pos.x}
                    dy={wi === 0 ? (words.length > 1 ? '-0.5em' : '0.35em') : '1em'}
                  >
                    {w}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-1.5 rounded" style={{ backgroundColor: '#ef4444' }} />
          <span>Positive z (&gt; 2)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-1.5 rounded" style={{ backgroundColor: '#3b82f6' }} />
          <span>Negative z (&lt; −2)</span>
        </div>
        <span className="text-gray-400">Edge thickness ∝ |z-score|</span>
      </div>
      {/* Cell type legend */}
      <div className="flex flex-wrap justify-center gap-2 text-xs">
        {cellTypes.map(ct => (
          <div key={ct} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CELL_TYPE_COLORS[ct] ?? '#6b7280' }} />
            <span>{ct}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpressionViolin({
  result,
  activeCells,
  geneA,
  geneB,
}: {
  result: WhisperResult;
  activeCells: SpatialCell[];
  geneA: string;
  geneB: string;
}) {
  const violinData: ViolinDatum[] = result.cellTypes.map(ct => {
    const ctCells = activeCells.filter(c => c.cellType === ct);
    if (ctCells.length === 0) return { cellType: ct, geneAMean: 0, geneBMean: 0 };
    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    return {
      cellType: ct,
      geneAMean: parseFloat(mean(ctCells.map(c => c.geneAExpr)).toFixed(2)),
      geneBMean: parseFloat(mean(ctCells.map(c => c.geneBExpr)).toFixed(2)),
    };
  });

  const geneALabel = geneA || 'Gene A';
  const geneBLabel = geneB || 'Gene B';

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Mean log₂ expression per cell type (bars colored by cell type for {geneALabel})
      </p>
      <ResponsiveContainer width="100%" height={310}>
        <BarChart data={violinData} margin={{ top: 5, right: 20, bottom: 65, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="cellType"
            tick={{ fontSize: 11 }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            label={{
              value: 'log₂ expr',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              style: { fontSize: 11 },
            }}
          />
          <RechartsTooltip
            formatter={(val, name) => [`${val}`, `${name}`]}
            labelFormatter={(label) => `Cell Type: ${label}`}
          />
          <Bar dataKey="geneAMean" name={geneALabel} opacity={0.85}>
            {violinData.map((entry, idx) => (
              <Cell key={idx} fill={CELL_TYPE_COLORS[entry.cellType] ?? '#6b7280'} />
            ))}
          </Bar>
          <Bar dataKey="geneBMean" name={geneBLabel} fill="#3b82f6" opacity={0.65} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-4 justify-center text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded bg-gray-400" />
          <span>{geneALabel} (cell-type colored)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded" style={{ backgroundColor: '#3b82f6' }} />
          <span>{geneBLabel}</span>
        </div>
      </div>
    </div>
  );
}

function SpatialMapChart({
  result,
  activeCells,
}: {
  result: WhisperResult;
  activeCells: SpatialCell[];
}) {
  const { cellTypes, zScores } = result;

  // Communication strength = sum of |z-scores| for all pairs involving this cell type
  const strengthMap: Record<string, number> = {};
  cellTypes.forEach((ct, i) => {
    let s = 0;
    for (let j = 0; j < cellTypes.length; j++) s += Math.abs(zScores[i][j]);
    strengthMap[ct] = s;
  });
  const maxStrength = Math.max(...Object.values(strengthMap), 1);

  // Build per-cell-type scatter series so we avoid Cell-inside-Scatter issues
  const bucketCount = 5;
  const bucketColors = ['#bfdbfe', '#60a5fa', '#f97316', '#ef4444', '#991b1b'];

  const series: { fill: string; data: ScatterDatum[] }[] = Array.from(
    { length: bucketCount },
    (_, bi) => ({ fill: bucketColors[bi] ?? '#6b7280', data: [] as ScatterDatum[] }),
  );

  activeCells.forEach(cell => {
    const strength = strengthMap[cell.cellType] ?? 0;
    const t = strength / maxStrength;
    const bi = Math.min(Math.floor(t * bucketCount), bucketCount - 1);
    series[bi]?.data.push({
      x: parseFloat(cell.x.toFixed(1)),
      y: parseFloat(cell.y.toFixed(1)),
      cellType: cell.cellType,
      strength,
    });
  });

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Cells colored by communication strength (sum of |z-scores| for cell-type pairs)
      </p>
      <ResponsiveContainer width="100%" height={360}>
        <ScatterChart margin={{ top: 5, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            tick={{ fontSize: 10 }}
            label={{ value: 'X coordinate', position: 'insideBottom', offset: -5, style: { fontSize: 11 } }}
          />
          <YAxis
            type="number"
            dataKey="y"
            tick={{ fontSize: 10 }}
            label={{ value: 'Y coordinate', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
          />
          <RechartsTooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={(props) => {
              if (!props.active || !props.payload?.length) return null;
              const d = props.payload[0]?.payload as ScatterDatum | undefined;
              if (!d) return null;
              return (
                <div className="bg-white border border-gray-200 rounded p-2 text-xs shadow">
                  <p className="font-semibold">{d.cellType}</p>
                  <p>Position: ({d.x}, {d.y})</p>
                  <p>Comm. Strength: {d.strength.toFixed(2)}</p>
                </div>
              );
            }}
          />
          {series.map((s, bi) => (
            <Scatter key={bi} data={s.data} fill={s.fill} isAnimationActive={false} opacity={0.75} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
      <div className="mt-3 flex items-center gap-3 text-xs justify-center">
        <span className="text-gray-500">Communication strength:</span>
        <div
          className="w-24 h-3 rounded"
          style={{ background: 'linear-gradient(to right, #bfdbfe, #ef4444)' }}
        />
        <span className="text-gray-500">Low → High</span>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

const RESULT_TABS: { id: TabId; label: string }[] = [
  { id: 'matrix',  label: '🗺️ Communication Matrix' },
  { id: 'network', label: '🕸️ Network Graph' },
  { id: 'violin',  label: '📊 Expression Violin' },
  { id: 'spatial', label: '📍 Spatial Map' },
];

export default function SpatialCommunication({ geneA, geneB, cancerType }: SpatialCommunicationProps) {
  const [kNeighbors, setKNeighbors] = useState(5);
  const [thresholdPercentile, setThresholdPercentile] = useState(50);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('non_iid');
  const [isComputing, setIsComputing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [whisperResult, setWhisperResult] = useState<WhisperResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('matrix');
  const [uploadedSpatialText, setUploadedSpatialText] = useState<string | null>(null);
  const [uploadedExprText, setUploadedExprText] = useState<string | null>(null);
  const [spatialFileName, setSpatialFileName] = useState('');
  const [exprFileName, setExprFileName] = useState('');

  const spatialInputRef = useRef<HTMLInputElement>(null);
  const exprInputRef = useRef<HTMLInputElement>(null);

  const hasGenes = geneA.trim() !== '' && geneB.trim() !== '';

  const mockCells = useMemo<SpatialCell[]>(
    () => (hasGenes ? generateMockCells(geneA, geneB, cancerType) : []),
    [geneA, geneB, cancerType, hasGenes],
  );

  const activeCells = useMemo<SpatialCell[]>(() => {
    if (!uploadedSpatialText || !uploadedExprText) return mockCells;
    const spatial = parseSpatialCSV(uploadedSpatialText);
    const exprMap = parseExprCSV(uploadedExprText);
    const merged: SpatialCell[] = spatial
      .filter(p => p.id !== undefined && exprMap.has(p.id!))
      .map(p => ({
        id: p.id!,
        x: p.x!,
        y: p.y!,
        cellType: p.cellType!,
        geneAExpr: exprMap.get(p.id!)!.geneAExpr,
        geneBExpr: exprMap.get(p.id!)!.geneBExpr,
      }));
    return merged.length > 0 ? merged : mockCells;
  }, [uploadedSpatialText, uploadedExprText, mockCells]);

  const usingMockData = activeCells === mockCells;

  const runComputation = useCallback(() => {
    if (!hasGenes || activeCells.length === 0) return;
    setIsComputing(true);
    setProgress(0);
    setWhisperResult(null);

    // Stage 1 – build neighbor graph
    setTimeout(() => {
      setProgress(20);
      const adj = buildNeighborNetwork(activeCells, kNeighbors);
      setProgress(50);

      // Stage 2 – compute z-scores
      setTimeout(() => {
        const threshA = computePercentile(activeCells.map(c => c.geneAExpr), thresholdPercentile);
        const threshB = computePercentile(activeCells.map(c => c.geneBExpr), thresholdPercentile);
        setProgress(75);

        // Stage 3 – finalise
        setTimeout(() => {
          const result = computeZScores(activeCells, adj, threshA, threshB, analysisMode);
          setWhisperResult(result);
          setProgress(100);
          setIsComputing(false);
        }, 200);
      }, 200);
    }, 100);
  }, [hasGenes, activeCells, kNeighbors, thresholdPercentile, analysisMode]);

  const handleSpatialFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSpatialFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setUploadedSpatialText((ev.target?.result as string) ?? null);
    reader.readAsText(file);
  };

  const handleExprFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExprFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setUploadedExprText((ev.target?.result as string) ?? null);
    reader.readAsText(file);
  };

  const resetUploads = () => {
    setUploadedSpatialText(null);
    setUploadedExprText(null);
    setSpatialFileName('');
    setExprFileName('');
    if (spatialInputRef.current) spatialInputRef.current.value = '';
    if (exprInputRef.current) exprInputRef.current.value = '';
    setWhisperResult(null);
  };

  const downloadZScoreCSV = () => {
    if (!whisperResult) return;
    const { cellTypes, zScores } = whisperResult;
    const header = ['', ...cellTypes].join(',');
    const rows = cellTypes.map((ct, i) =>
      [ct, ...zScores[i].map(z => z.toFixed(3))].join(','),
    );
    triggerDownload([header, ...rows].join('\n'), 'zscore_matrix.csv', 'text/csv');
  };

  const downloadNetworkJSON = () => {
    if (!whisperResult) return;
    const { cellTypes, zScores, pValues } = whisperResult;
    const edges: { source: string; target: string; zScore: number; pValue: number }[] = [];
    cellTypes.forEach((ctA, i) => {
      cellTypes.forEach((ctB, j) => {
        if (Math.abs(zScores[i][j]) > 2) {
          edges.push({ source: ctA, target: ctB, zScore: zScores[i][j], pValue: pValues[i][j] });
        }
      });
    });
    const data = { nodes: cellTypes.map(ct => ({ id: ct })), edges };
    triggerDownload(JSON.stringify(data, null, 2), 'network_data.json', 'application/json');
  };

  // ── Placeholder when genes are not set ──────────────────────────────────────

  if (!hasGenes) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm gap-2">
        <Info size={16} />
        Enter Gene A and Gene B to begin spatial communication analysis.
      </div>
    );
  }

  // ── Full UI ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Upload Panel ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Upload size={16} className="text-brand-600" />
            Data Input
          </h3>
          {(spatialFileName || exprFileName) && (
            <button
              onClick={resetUploads}
              className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 transition"
            >
              <RefreshCw size={12} /> Reset to mock data
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Spatial CSV */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              📍 Spatial Coordinates (CSV)
            </label>
            <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition">
              <Upload size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-500 truncate">
                {spatialFileName || 'cell_id, x, y, cell_type'}
              </span>
              <input
                ref={spatialInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleSpatialFile}
              />
            </label>
          </div>

          {/* Expression CSV */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              🧬 Gene Expression (CSV)
            </label>
            <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition">
              <Upload size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-500 truncate">
                {exprFileName || 'cell_id, geneA_expr, geneB_expr'}
              </span>
              <input
                ref={exprInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleExprFile}
              />
            </label>
          </div>
        </div>

        {usingMockData && (
          <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-2.5 text-xs text-blue-700">
            <Info size={13} className="mt-0.5 flex-shrink-0" />
            <span>
              Using mock data — deterministic simulation for{' '}
              <strong>{geneA}</strong> × <strong>{geneB}</strong> in{' '}
              <strong>{cancerType || 'unspecified'}</strong> context (
              {activeCells.length} cells, 8 tissue clusters).
            </span>
          </div>
        )}
      </div>

      {/* ── Configuration Panel ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <Network size={16} className="text-brand-600" />
          CellWHISPER Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
          {/* Gene pair display */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Gene Pair</label>
            <div className="flex gap-2 items-center">
              <span className="px-2 py-1 bg-red-50 border border-red-200 rounded text-xs font-mono text-red-700">
                {geneA}
              </span>
              <span className="text-gray-400">×</span>
              <span className="px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs font-mono text-blue-700">
                {geneB}
              </span>
            </div>
          </div>

          {/* k-NN slider */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              k-NN Neighbors: <strong>{kNeighbors}</strong>
            </label>
            <input
              type="range"
              min={3} max={20} step={1}
              value={kNeighbors}
              onChange={e => setKNeighbors(parseInt(e.target.value, 10))}
              className="w-full accent-brand-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>3</span><span>20</span>
            </div>
          </div>

          {/* Threshold percentile slider */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Expression Threshold: <strong>{thresholdPercentile}th percentile</strong>
            </label>
            <input
              type="range"
              min={30} max={90} step={5}
              value={thresholdPercentile}
              onChange={e => setThresholdPercentile(parseInt(e.target.value, 10))}
              className="w-full accent-brand-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>30%</span><span>90%</span>
            </div>
          </div>
        </div>

        {/* Analysis mode */}
        <div className="flex flex-wrap items-center gap-5 mb-4">
          <span className="text-xs font-medium text-gray-600">Analysis Mode:</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="spatial-mode"
              value="non_iid"
              checked={analysisMode === 'non_iid'}
              onChange={() => setAnalysisMode('non_iid')}
              className="accent-brand-600"
            />
            <span className="text-xs">Gap Junction (non-iid)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="spatial-mode"
              value="iid"
              checked={analysisMode === 'iid'}
              onChange={() => setAnalysisMode('iid')}
              className="accent-brand-600"
            />
            <span className="text-xs">Ligand-Receptor (iid)</span>
          </label>
        </div>

        {/* Compute button */}
        <button
          onClick={runComputation}
          disabled={isComputing}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition"
        >
          {isComputing
            ? <RefreshCw size={14} className="animate-spin" />
            : <Play size={14} />
          }
          {isComputing ? `Computing… ${progress}%` : '🔬 Compute Whisper Network'}
        </button>

        {isComputing && (
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-brand-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Results ───────────────────────────────────────────────────────────── */}
      {whisperResult && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">

          {/* Tab switcher */}
          <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-200 pb-2">
            {RESULT_TABS.map(tab => {
              const Icon =
                tab.id === 'matrix'  ? Layers :
                tab.id === 'network' ? Network :
                tab.id === 'violin'  ? BarChart3 : MapIcon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-brand-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="min-h-[320px]">
            {activeTab === 'matrix' && <CommunicationMatrix result={whisperResult} />}
            {activeTab === 'network' && <NetworkGraph result={whisperResult} />}
            {activeTab === 'violin' && (
              <ExpressionViolin
                result={whisperResult}
                activeCells={activeCells}
                geneA={geneA}
                geneB={geneB}
              />
            )}
            {activeTab === 'spatial' && (
              <SpatialMapChart result={whisperResult} activeCells={activeCells} />
            )}
          </div>

          {/* Export */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
            <button
              onClick={downloadZScoreCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs text-gray-700 transition"
            >
              <Download size={13} />
              📥 Download Z-Score Matrix (CSV)
            </button>
            <button
              onClick={downloadNetworkJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs text-gray-700 transition"
            >
              <Download size={13} />
              📥 Download Network Data (JSON)
            </button>
          </div>
        </div>
      )}

      {/* ── Attribution ───────────────────────────────────────────────────────── */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-xs text-gray-600">
        <h4 className="font-semibold text-gray-800 mb-1.5 flex items-center gap-1.5">
          <Info size={13} />
          CellWHISPER Attribution
        </h4>
        <p className="mb-1">This analysis integrates algorithms from:</p>
        <p className="font-medium text-gray-700 mb-0.5">
          CellWHISPER: Disentangling Direct Cell–Cell Communication from Structural Proximity
        </p>
        <p>
          GitHub:{' '}
          <a
            href="https://github.com/anurendra/CellWHISPER"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 hover:underline"
          >
            https://github.com/anurendra/CellWHISPER
          </a>
        </p>
        <p className="mt-1 text-gray-500">
          Core functions adapted: spatial neighbor graph construction, gene-pair-specific whisper
          network generation, analytical null model (mean/variance/z-scores), cell-type pair
          communication statistics.
        </p>
      </div>

    </div>
  );
}
