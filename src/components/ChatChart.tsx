import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  LineChart,
  Line,
} from 'recharts';

/* ── Type definitions ──────────────────────────────────────────────────── */

interface BarSpec {
  type: 'bar';
  title?: string;
  xLabel?: string;
  yLabel?: string;
  data: { name: string; value: number }[];
}

interface LineSpec {
  type: 'line';
  title?: string;
  xLabel?: string;
  yLabel?: string;
  data: { name: string; value: number }[];
}

interface ScatterSpec {
  type: 'scatter';
  title?: string;
  xLabel?: string;
  yLabel?: string;
  data: { x: number; y: number }[];
}

interface HeatmapSpec {
  type: 'heatmap';
  title?: string;
  genes: string[];
  data: {
    row: string;
    col: string;
    value: number;
    pValue?: number;
    sampleSize?: number;
    cancerTypes?: string[];
  }[];
}

type ChartSpec = BarSpec | LineSpec | ScatterSpec | HeatmapSpec;

/* ── Color helpers ──────────────────────────────────────────────────────── */

/** Blue → White → Red diverging scale (norm ∈ [0,1]) */
function heatColor(norm: number): string {
  const n = Math.max(0, Math.min(1, norm));
  const r = n <= 0.5 ? Math.round(59 + (255 - 59) * n * 2) : 255;
  const g =
    n <= 0.5
      ? Math.round(130 + (255 - 130) * n * 2)
      : Math.round(255 - (255 - 68) * (n - 0.5) * 2);
  const b =
    n <= 0.5
      ? Math.round(246 + (255 - 246) * n * 2)
      : Math.round(255 - (255 - 68) * (n - 0.5) * 2);
  return `rgb(${r},${g},${b})`;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function formatP(p: number): string {
  if (p < 0.001) return 'p < 0.001';
  if (p < 0.01) return `p = ${p.toFixed(3)}`;
  return `p = ${p.toFixed(3)}`;
}

/* ── Heatmap sub-component ──────────────────────────────────────────────── */

function HeatmapChart({ spec }: { spec: HeatmapSpec }) {
  const { genes, data, title } = spec;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const norm = (v: number) => (max === min ? 0.5 : (v - min) / (max - min));
  const cellPx = Math.max(28, Math.min(44, Math.floor(220 / Math.max(genes.length, 1))));

  const [tooltip, setTooltip] = useState<{
    row: string;
    col: string;
    value: number;
    pValue?: number;
    sampleSize?: number;
    cancerTypes?: string[];
    top: number;
    left: number;
  } | null>(null);

  return (
    <div className="my-2">
      {title && <p className="text-xs font-semibold text-gray-600 mb-1">{title}</p>}
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs select-none">
          <thead>
            <tr>
              <th style={{ minWidth: 48 }} />
              {genes.map((g) => (
                <th
                  key={g}
                  style={{ width: cellPx, maxWidth: cellPx, paddingBottom: 4 }}
                  className="text-center font-medium text-gray-500"
                >
                  <span
                    style={{
                      display: 'inline-block',
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      maxHeight: 60,
                      overflow: 'hidden',
                    }}
                  >
                    {g}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {genes.map((row) => (
              <tr key={row}>
                <td className="text-right font-medium text-gray-500 pr-1 whitespace-nowrap text-xs">
                  {row}
                </td>
                {genes.map((col) => {
                  const cell = data.find((d) => d.row === row && d.col === col);
                  const v = cell?.value ?? 0;
                  return (
                    <td
                      key={col}
                      style={{
                        width: cellPx,
                        height: cellPx,
                        backgroundColor: heatColor(norm(v)),
                        border: '1px solid rgba(255,255,255,0.6)',
                        cursor: 'default',
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          row,
                          col,
                          value: v,
                          pValue: cell?.pValue,
                          sampleSize: cell?.sampleSize,
                          cancerTypes: cell?.cancerTypes,
                          top: rect.bottom + 4,
                          left: rect.left,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="text-xs text-gray-400">{min.toFixed(2)}</span>
        <div
          style={{
            height: 8,
            width: 80,
            background: 'linear-gradient(to right, rgb(59,130,246), white, rgb(255,68,68))',
            borderRadius: 4,
          }}
        />
        <span className="text-xs text-gray-400">{max.toFixed(2)}</span>
      </div>
      {/* Rich hover tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-xs pointer-events-none"
          style={{ top: tooltip.top, left: tooltip.left }}
        >
          <p className="font-semibold text-gray-800">
            {tooltip.row} × {tooltip.col}
          </p>
          <p className="mt-0.5">
            <span className="text-gray-500">Value:</span>{' '}
            <span className="font-mono font-medium">{tooltip.value.toFixed(2)}</span>
          </p>
          {tooltip.pValue !== undefined && (
            <p className={tooltip.pValue < 0.05 ? 'text-green-600 font-medium' : 'text-gray-500'}>
              {formatP(tooltip.pValue)}
            </p>
          )}
          {tooltip.sampleSize !== undefined && (
            <p>
              <span className="text-gray-500">n =</span> {tooltip.sampleSize} samples
            </p>
          )}
          {tooltip.cancerTypes && tooltip.cancerTypes.length > 0 && (
            <p>
              <span className="text-gray-500">Cohorts:</span>{' '}
              {tooltip.cancerTypes.slice(0, 5).join(', ')}
              {tooltip.cancerTypes.length > 5 && `, +${tooltip.cancerTypes.length - 5} more`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main export ────────────────────────────────────────────────────────── */

const PRIMARY = '#3b82f6';
const CHART_MARGIN = { top: 4, right: 8, bottom: 24, left: 0 };

export default function ChatChart({ specJson }: { specJson: string }) {
  let spec: ChartSpec;
  try {
    spec = JSON.parse(specJson) as ChartSpec;
  } catch {
    return (
      <p className="text-xs text-red-500 italic my-1">⚠ Could not render chart (invalid data)</p>
    );
  }

  if (spec.type === 'heatmap') {
    return <HeatmapChart spec={spec} />;
  }

  const xLabelProps = spec.xLabel
    ? { value: spec.xLabel, position: 'insideBottom' as const, offset: -12, fontSize: 10 }
    : undefined;
  const yLabelProps = spec.yLabel
    ? { value: spec.yLabel, angle: -90, position: 'insideLeft' as const, fontSize: 10 }
    : undefined;

  if (spec.type === 'bar') {
    return (
      <div className="my-2">
        {spec.title && (
          <p className="text-xs font-semibold text-gray-600 mb-1">{spec.title}</p>
        )}
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={spec.data} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} label={xLabelProps} />
            <YAxis tick={{ fontSize: 10 }} label={yLabelProps} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Bar dataKey="value" fill={PRIMARY} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (spec.type === 'line') {
    return (
      <div className="my-2">
        {spec.title && (
          <p className="text-xs font-semibold text-gray-600 mb-1">{spec.title}</p>
        )}
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={spec.data} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} label={xLabelProps} />
            <YAxis tick={{ fontSize: 10 }} label={yLabelProps} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={PRIMARY}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (spec.type === 'scatter') {
    return (
      <div className="my-2">
        {spec.title && (
          <p className="text-xs font-semibold text-gray-600 mb-1">{spec.title}</p>
        )}
        <ResponsiveContainer width="100%" height={180}>
          <ScatterChart margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="x"
              name={spec.xLabel ?? 'x'}
              tick={{ fontSize: 10 }}
              label={xLabelProps}
            />
            <YAxis
              dataKey="y"
              name={spec.yLabel ?? 'y'}
              tick={{ fontSize: 10 }}
              label={yLabelProps}
            />
            <ZAxis range={[25, 25]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ fontSize: 11 }}
            />
            <Scatter data={spec.data} fill={PRIMARY} opacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <p className="text-xs text-red-500 italic my-1">⚠ Unknown chart type</p>
  );
}
