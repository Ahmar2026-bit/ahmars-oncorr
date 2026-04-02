'use client';
import React, { useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { mockData, DataPoint } from '@/data/mockData';
import { FiFilter, FiDownload } from 'react-icons/fi';

type FilterType = 'ALL' | 'MUTANT' | 'WILDTYPE' | 'NORMAL';

const TYPE_COLORS: Record<string, string> = {
  MUTANT: '#EF4444',
  WILDTYPE: '#3B82F6',
  NORMAL: '#10B981',
};

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (active && payload && payload.length > 0) {
    const d = payload[0]?.payload as DataPoint;
    if (!d) return null;
    return (
      <div className="bg-[#0a0f1e] border border-[#1a2540] rounded p-2 text-[10px]">
        <div className="text-[#00d4ff] font-bold">{d.patientId}</div>
        <div className="text-[#8899aa] mt-0.5">
          <span style={{ color: TYPE_COLORS[d.type] }}>{d.type}</span> · Stage {d.stage}
        </div>
        <div className="text-[#8899aa]">{d.subtype}</div>
        <div className="text-[#e2e8f0] mt-0.5">
          X: {d.x.toFixed(2)} · Y: {d.y.toFixed(2)}
        </div>
      </div>
    );
  }
  return null;
}

export default function CorrelationMatrix() {
  const [filter, setFilter] = useState<FilterType>('ALL');

  const filtered = filter === 'ALL' ? mockData : mockData.filter((d) => d.type === filter);

  const mutantData = filtered.filter((d) => d.type === 'MUTANT');
  const wildtypeData = filtered.filter((d) => d.type === 'WILDTYPE');
  const normalData = filtered.filter((d) => d.type === 'NORMAL');

  return (
    <div className="bg-[#060c18] border border-[#1a2540] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-bold tracking-widest text-[#e2e8f0] uppercase">
            Expression Correlation Matrix
          </div>
          <div className="text-[9px] text-[#4a6080] tracking-wide mt-0.5">
            KRAS vs NRF2 · N={filtered.length} samples
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1 bg-[#0a0f1e] border border-[#1a2540] rounded text-[9px] font-bold tracking-widest text-[#8899aa] hover:border-[#00d4ff] hover:text-[#00d4ff] transition-colors uppercase">
            <FiFilter size={9} />
            Filter
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1 bg-[#0a0f1e] border border-[#1a2540] rounded text-[9px] font-bold tracking-widest text-[#8899aa] hover:border-[#10B981] hover:text-[#10B981] transition-colors uppercase">
            <FiDownload size={9} />
            Export
          </button>
        </div>
      </div>

      {/* Type filter tabs */}
      <div className="flex items-center gap-1 mb-3">
        {(['ALL', 'MUTANT', 'WILDTYPE', 'NORMAL'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 text-[9px] font-bold tracking-widest rounded transition-colors uppercase ${
              filter === f
                ? 'bg-[#1a2540] text-[#00d4ff] border border-[#00d4ff]'
                : 'bg-[#0a0f1e] text-[#4a6080] border border-[#1a2540] hover:text-[#8899aa]'
            }`}
          >
            {f}
            {f !== 'ALL' && (
              <span
                className="ml-1 inline-block w-1.5 h-1.5 rounded-full align-middle"
                style={{ backgroundColor: TYPE_COLORS[f] }}
              />
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 text-[9px] text-[#4a6080]">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
              <span className="tracking-wide">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 5, right: 10, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" strokeOpacity={0.5} />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 100]}
              tick={{ fill: '#4a6080', fontSize: 9 }}
              tickLine={false}
              axisLine={{ stroke: '#1a2540' }}
              label={{ value: 'KRAS log₂ Expression', position: 'bottom', fill: '#4a6080', fontSize: 9, offset: 5 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, 100]}
              tick={{ fill: '#4a6080', fontSize: 9 }}
              tickLine={false}
              axisLine={{ stroke: '#1a2540' }}
              label={{ value: 'NRF2 log₂ Expression', angle: -90, position: 'insideLeft', fill: '#4a6080', fontSize: 9, offset: -5 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#1a2540' }} />
            {(filter === 'ALL' || filter === 'MUTANT') && mutantData.length > 0 && (
              <Scatter data={mutantData} fill={TYPE_COLORS.MUTANT} fillOpacity={0.7} r={3} />
            )}
            {(filter === 'ALL' || filter === 'WILDTYPE') && wildtypeData.length > 0 && (
              <Scatter data={wildtypeData} fill={TYPE_COLORS.WILDTYPE} fillOpacity={0.7} r={3} />
            )}
            {(filter === 'ALL' || filter === 'NORMAL') && normalData.length > 0 && (
              <Scatter data={normalData} fill={TYPE_COLORS.NORMAL} fillOpacity={0.7} r={3} />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
