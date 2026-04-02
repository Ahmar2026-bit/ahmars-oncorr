import React, { useMemo } from 'react';
import type { PatientSample } from '../types/patient';
import type { CorrelationResult } from '../types/correlation';

interface StatsPanelProps {
  samples: PatientSample[];
  result: CorrelationResult;
  geneA: string;
  geneB: string;
}

const Bar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => (
  <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
    <div
      className="h-1.5 rounded-full transition-all duration-300"
      style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }}
    />
  </div>
);

const StatsPanel: React.FC<StatsPanelProps> = ({ samples, result, geneA, geneB }) => {
  const stats = useMemo(() => {
    if (samples.length === 0) return null;
    const aVals = samples.map(s => s.geneA_expression);
    const bVals = samples.map(s => s.geneB_expression);
    const minA = Math.min(...aVals), maxA = Math.max(...aVals);
    const minB = Math.min(...bVals), maxB = Math.max(...bVals);
    const stdA = Math.sqrt(aVals.reduce((acc, v) => acc + (v - result.mean_geneA) ** 2, 0) / aVals.length);
    const stdB = Math.sqrt(bVals.reduce((acc, v) => acc + (v - result.mean_geneB) ** 2, 0) / bVals.length);
    const cvA = result.mean_geneA !== 0 ? (stdA / result.mean_geneA) * 100 : 0;
    const cvB = result.mean_geneB !== 0 ? (stdB / result.mean_geneB) * 100 : 0;

    // Subtype breakdown
    const subtypeCounts: Record<string, number> = {};
    samples.forEach(s => { subtypeCounts[s.subtype] = (subtypeCounts[s.subtype] ?? 0) + 1; });

    return { minA, maxA, minB, maxB, stdA, stdB, cvA, cvB, subtypeCounts };
  }, [samples, result]);

  return (
    <aside
      className="flex flex-col overflow-y-auto border-l border-gray-800 p-4 space-y-5"
      style={{ width: 240, minWidth: 240, background: '#0f172a' }}
    >
      <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-widest">Statistics</h3>

      {stats ? (
        <>
          {/* Gene A */}
          <div>
            <div className="text-xs text-blue-400 font-semibold mb-1">{geneA}</div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Mean</span>
              <span className="text-white font-mono">{result.mean_geneA.toFixed(3)}</span>
            </div>
            <Bar value={result.mean_geneA} max={16} color="#3B82F6" />
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span>Range</span>
              <span className="text-gray-200 font-mono">{stats.minA.toFixed(1)} – {stats.maxA.toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>CV</span>
              <span className="text-gray-200 font-mono">{stats.cvA.toFixed(1)}%</span>
            </div>
          </div>

          {/* Gene B */}
          <div>
            <div className="text-xs text-green-400 font-semibold mb-1">{geneB}</div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Mean</span>
              <span className="text-white font-mono">{result.mean_geneB.toFixed(3)}</span>
            </div>
            <Bar value={result.mean_geneB} max={16} color="#10B981" />
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span>Range</span>
              <span className="text-gray-200 font-mono">{stats.minB.toFixed(1)} – {stats.maxB.toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>CV</span>
              <span className="text-gray-200 font-mono">{stats.cvB.toFixed(1)}%</span>
            </div>
          </div>

          {/* Outliers */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Outliers</span>
              <span className="text-red-400 font-semibold">{result.outliers.length}</span>
            </div>
            {result.outliers.length > 0 && (
              <div className="max-h-24 overflow-y-auto space-y-0.5">
                {result.outliers.slice(0, 10).map(id => (
                  <div key={id} className="text-[10px] font-mono text-gray-500 truncate">{id}</div>
                ))}
                {result.outliers.length > 10 && (
                  <div className="text-[10px] text-gray-600">+{result.outliers.length - 10} more</div>
                )}
              </div>
            )}
          </div>

          {/* Subtype breakdown */}
          <div>
            <div className="text-xs text-gray-400 mb-2 uppercase tracking-widest">Subtypes</div>
            <div className="space-y-1.5">
              {Object.entries(stats.subtypeCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([subtype, count]) => {
                  const pct = (count / samples.length) * 100;
                  return (
                    <div key={subtype}>
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span className="truncate">{subtype}</span>
                        <span className="text-gray-300 ml-2">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1 mt-0.5">
                        <div
                          className="h-1 rounded-full bg-purple-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-gray-500">No data</p>
      )}
    </aside>
  );
};

export default React.memo(StatsPanel);
