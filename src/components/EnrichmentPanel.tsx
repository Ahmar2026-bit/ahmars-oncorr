import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { getEnrichmentForGenes } from '../data/enrichmentData';
import type { NotebookEntry } from '../types/notebook';

interface EnrichmentPanelProps {
  geneA: string;
  geneB: string;
  onPin: (entry: Omit<NotebookEntry, 'id'>) => void;
  cancerType: string;
}

const TABLE_HEAD = 'text-[10px] text-gray-400 font-semibold uppercase tracking-wider py-1 px-2 text-left';
const TABLE_CELL = 'text-[11px] text-gray-300 py-1 px-2 border-t border-gray-800';

const FDR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#64748b', '#a78bfa',
];

const EnrichmentPanel: React.FC<EnrichmentPanelProps> = ({ geneA, geneB, onPin, cancerType }) => {
  const { biologicalProcess, molecularFunction, pathways } = useMemo(
    () => getEnrichmentForGenes(geneA, geneB),
    [geneA, geneB],
  );

  const bubbleData = useMemo(
    () =>
      pathways.map(p => ({
        name: p.name,
        db: p.db,
        geneCount: p.geneCount,
        negLogFdr: -Math.log10(parseFloat(p.fdr)),
      })),
    [pathways],
  );

  const pin = (label: string, content: string) => {
    onPin({
      type: label,
      content,
      timestamp: new Date().toLocaleString(),
      geneA,
      geneB,
      cancerType,
    });
  };

  const bpSummary = biologicalProcess
    .slice(0, 5)
    .map(t => `- ${t.id}: ${t.term} (FDR=${t.fdr})`)
    .join('\n');

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-200 uppercase tracking-widest">
          🧬 GO &amp; Pathway Enrichment
        </h3>
        <span className="text-[10px] text-gray-500">
          {geneA} × {geneB}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Biological Process */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-blue-300">Biological Process (GO)</span>
            <button
              onClick={() => pin('GO Enrichment', bpSummary)}
              className="text-[9px] bg-blue-900 hover:bg-blue-700 text-blue-200 px-1.5 py-0.5 rounded"
            >
              📌 Pin
            </button>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800">
                  <th className={TABLE_HEAD}>GO ID</th>
                  <th className={TABLE_HEAD}>Term</th>
                  <th className={TABLE_HEAD}>FDR</th>
                </tr>
              </thead>
              <tbody>
                {biologicalProcess.map(t => (
                  <tr key={t.id} className="hover:bg-gray-800/40">
                    <td className={`${TABLE_CELL} font-mono text-blue-400`}>{t.id}</td>
                    <td className={TABLE_CELL}>{t.term}</td>
                    <td className={`${TABLE_CELL} font-mono text-red-300`}>{t.fdr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Molecular Function */}
        <div>
          <div className="mb-1">
            <span className="text-xs font-semibold text-green-300">Molecular Function (GO)</span>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800">
                  <th className={TABLE_HEAD}>GO ID</th>
                  <th className={TABLE_HEAD}>Term</th>
                  <th className={TABLE_HEAD}>FDR</th>
                </tr>
              </thead>
              <tbody>
                {molecularFunction.map(t => (
                  <tr key={t.id} className="hover:bg-gray-800/40">
                    <td className={`${TABLE_CELL} font-mono text-green-400`}>{t.id}</td>
                    <td className={TABLE_CELL}>{t.term}</td>
                    <td className={`${TABLE_CELL} font-mono text-red-300`}>{t.fdr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pathways */}
        <div>
          <div className="mb-1">
            <span className="text-xs font-semibold text-purple-300">KEGG / Reactome Pathways</span>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800">
                  <th className={TABLE_HEAD}>DB</th>
                  <th className={TABLE_HEAD}>Pathway</th>
                  <th className={TABLE_HEAD}>Ratio</th>
                  <th className={TABLE_HEAD}>FDR</th>
                </tr>
              </thead>
              <tbody>
                {pathways.map(p => (
                  <tr key={p.id} className="hover:bg-gray-800/40">
                    <td className={`${TABLE_CELL} font-mono text-purple-400`}>{p.db}</td>
                    <td className={TABLE_CELL}>{p.name}</td>
                    <td className={`${TABLE_CELL} font-mono text-gray-400`}>{p.ratio}</td>
                    <td className={`${TABLE_CELL} font-mono text-red-300`}>{p.fdr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bubble chart */}
      <div>
        <h4 className="text-xs font-semibold text-gray-300 mb-2">
          📊 Pathway Enrichment Bubble Chart
          <span className="text-gray-500 font-normal ml-2">(size = gene count, color = -log₁₀ FDR)</span>
        </h4>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-2" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                type="number"
                dataKey="geneCount"
                name="Gene Count"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                label={{ value: 'Gene Count', position: 'insideBottom', offset: -3, fill: '#6b7280', fontSize: 10 }}
              />
              <YAxis
                type="number"
                dataKey="negLogFdr"
                name="-log₁₀ FDR"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                label={{ value: '-log₁₀ FDR', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 10 }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 6, fontSize: 11 }}
  
                labelFormatter={() => ''}
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const d = payload[0]?.payload as (typeof bubbleData)[0];
                  return (
                    <div className="bg-gray-900 border border-gray-700 rounded p-2 text-xs">
                      <div className="text-white font-semibold">{d.name}</div>
                      <div className="text-gray-400">{d.db}</div>
                      <div>Gene count: <span className="text-blue-300">{d.geneCount}</span></div>
                      <div>-log₁₀ FDR: <span className="text-red-300">{d.negLogFdr.toFixed(2)}</span></div>
                    </div>
                  );
                }}
              />
              <Scatter data={bubbleData} shape="circle">
                {bubbleData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={FDR_COLORS[index % FDR_COLORS.length]}
                    fillOpacity={0.8}
                    r={Math.max(5, bubbleData[index].geneCount / 2)}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default React.memo(EnrichmentPanel);
