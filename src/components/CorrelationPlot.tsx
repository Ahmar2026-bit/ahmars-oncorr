import React, { useMemo, useCallback } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import type { PatientSample } from '../types/patient';
import type { CorrelationResult } from '../types/correlation';
import { GTEX_REFERENCES } from '../data/gtexReference';

const MUTATION_COLORS: Record<string, string> = {
  MUTANT: '#EF4444',
  WILDTYPE: '#3B82F6',
  NORMAL: '#10B981',
};

interface CorrelationPlotProps {
  samples: PatientSample[];
  result: CorrelationResult;
  geneA: string;
  geneB: string;
  cancerType: string;
  showGtex: boolean;
  isLoading: boolean;
  onHover: (id: string | null) => void;
  selectedSamples: string[];
}

interface TooltipPayload {
  id: string;
  geneA_expression: number;
  geneB_expression: number;
  mutation_status: string;
  subtype: string;
  stage: string;
  age: number;
}

const CustomTooltip: React.FC<{ active?: boolean; payload?: { payload: TooltipPayload }[] }> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1e293b] border border-gray-600 rounded-lg p-3 shadow-xl text-xs space-y-1">
      <div className="font-mono font-semibold text-white text-sm">{d.id}</div>
      <div className="text-gray-400">Gene A: <span className="text-blue-400">{d.geneA_expression?.toFixed(3)}</span></div>
      <div className="text-gray-400">Gene B: <span className="text-green-400">{d.geneB_expression?.toFixed(3)}</span></div>
      <div className="text-gray-400">Status: <span style={{ color: MUTATION_COLORS[d.mutation_status] }}>{d.mutation_status}</span></div>
      <div className="text-gray-400">Subtype: <span className="text-white">{d.subtype}</span></div>
      <div className="text-gray-400">Stage: <span className="text-yellow-400">{d.stage}</span></div>
      <div className="text-gray-400">Age: <span className="text-white">{d.age}</span></div>
    </div>
  );
};

const CorrelationPlot: React.FC<CorrelationPlotProps> = ({
  samples, result, geneA, geneB, cancerType, showGtex, isLoading, onHover, selectedSamples,
}) => {
  const byStatus = useMemo(() => {
    const groups: Record<string, PatientSample[]> = { MUTANT: [], WILDTYPE: [], NORMAL: [] };
    samples.forEach(s => groups[s.mutation_status]?.push(s));
    return groups;
  }, [samples]);

  // Trend line points
  const trendLine = useMemo(() => {
    if (samples.length < 2) return null;
    const xs = samples.map(s => s.geneA_expression);
    const ys = samples.map(s => s.geneB_expression);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
    const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
    let num = 0, den = 0;
    xs.forEach((x, i) => { num += (x - meanX) * (ys[i] - meanY); den += (x - meanX) ** 2; });
    const slope = den !== 0 ? num / den : 0;
    const intercept = meanY - slope * meanX;
    return {
      x1: minX, y1: slope * minX + intercept,
      x2: maxX, y2: slope * maxX + intercept,
    };
  }, [samples]);

  const gtexRefs = showGtex ? GTEX_REFERENCES[cancerType] : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseEnter = useCallback((data: any) => {
    if (data?.id) onHover(data.id as string);
  }, [onHover]);

  const handleMouseLeave = useCallback(() => onHover(null), [onHover]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1e293b] rounded-xl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Computing correlation…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            type="number"
            dataKey="geneA_expression"
            name={geneA}
            label={{ value: `${geneA} expression (log2)`, position: 'insideBottom', offset: -10, fill: '#9ca3af', fontSize: 11 }}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            domain={['auto', 'auto']}
          />
          <YAxis
            type="number"
            dataKey="geneB_expression"
            name={geneB}
            label={{ value: `${geneB} expression (log2)`, angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: 8, fontSize: 11 }}
            formatter={(value) => <span style={{ color: '#d1d5db' }}>{value}</span>}
          />

          {/* GTEx reference lines */}
          {gtexRefs?.map(ref => (
            <React.Fragment key={ref.tissue}>
              <ReferenceLine x={ref.geneA_normal} stroke="#f59e0b" strokeDasharray="5 3" label={{ value: `GTEx ${ref.tissue} A`, fill: '#f59e0b', fontSize: 9 }} />
              <ReferenceLine y={ref.geneB_normal} stroke="#f59e0b" strokeDasharray="5 3" label={{ value: `GTEx B`, fill: '#f59e0b', fontSize: 9 }} />
            </React.Fragment>
          ))}

          {/* Trend line as scatter */}
          {trendLine && (
            <Scatter
              name="Trend"
              data={[
                { geneA_expression: trendLine.x1, geneB_expression: trendLine.y1 },
                { geneA_expression: trendLine.x2, geneB_expression: trendLine.y2 },
              ]}
              fill="transparent"
              line={{ stroke: '#f59e0b', strokeWidth: 1.5, strokeDasharray: '6 3' }}
              legendType="line"
              shape={() => <></>}
            />
          )}

          {Object.entries(byStatus).map(([status, pts]) => (
            <Scatter
              key={status}
              name={status}
              data={pts}
              fill={MUTATION_COLORS[status]}
              fillOpacity={0.7}
              r={4}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              shape={(props: React.SVGProps<SVGCircleElement> & { cx?: number; cy?: number; payload?: PatientSample }) => {
                const isSelected = selectedSamples.includes(props.payload?.id ?? '');
                return (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={isSelected ? 6 : 4}
                    fill={MUTATION_COLORS[status]}
                    fillOpacity={isSelected ? 1 : 0.7}
                    stroke={isSelected ? '#fff' : 'none'}
                    strokeWidth={isSelected ? 1.5 : 0}
                  />
                );
              }}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      {/* Sample count footer */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-gray-400">
        Showing <span className="text-white font-semibold">{samples.length}</span> / <span className="text-gray-300">{result.n_samples}</span> samples
      </div>
    </div>
  );
};

export default React.memo(CorrelationPlot);
