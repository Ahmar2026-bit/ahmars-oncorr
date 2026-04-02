import React, { useMemo } from 'react';
import { INVESTIGATORS, PUBLIC_DATASETS } from '../data/investigators';
import type { NotebookEntry } from '../types/notebook';

interface InvestigatorPanelProps {
  geneA: string;
  geneB: string;
  cancerType: string;
  onPin: (entry: Omit<NotebookEntry, 'id'>) => void;
}

function seededPick<T>(arr: T[], seed: number, count: number): T[] {
  let s = seed;
  const indices: number[] = [];
  const used = new Set<number>();
  while (indices.length < Math.min(count, arr.length)) {
    s = (s * 9301 + 49297) % 233280;
    const idx = Math.floor((s / 233280) * arr.length);
    if (!used.has(idx)) {
      indices.push(idx);
      used.add(idx);
    }
  }
  return indices.map(i => arr[i]);
}

function strSeed(s: string): number {
  return s.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

const BADGE_COLORS: Record<string, string> = {
  'RNA-seq': 'bg-blue-800 text-blue-200',
  'scRNA-seq': 'bg-purple-800 text-purple-200',
  'ChIP-seq': 'bg-green-800 text-green-200',
  'ATAC-seq': 'bg-red-800 text-red-200',
};

const InvestigatorPanel: React.FC<InvestigatorPanelProps> = ({
  geneA,
  geneB,
  cancerType,
  onPin,
}) => {
  const seed = strSeed(geneA + geneB + cancerType);
  const pis = useMemo(() => seededPick(INVESTIGATORS, seed, 3), [seed]);
  const datasets = useMemo(() => seededPick(PUBLIC_DATASETS, seed + 7, 4), [seed]);

  const pinPIs = () => {
    const content = pis
      .map(
        p =>
          `**${p.name}** (${p.institution})\nFocus: ${p.focus}\nh-index: ${p.h_index} | Grants: ${p.grants.join(', ')}`,
      )
      .join('\n\n');
    onPin({
      type: 'Investigators',
      content,
      timestamp: new Date().toLocaleString(),
      geneA,
      geneB,
      cancerType,
    });
  };

  return (
    <div className="p-4 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Investigators */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-yellow-300 uppercase tracking-widest">
              🏛️ Leading Investigators &amp; Active Grants
            </h4>
            <button
              onClick={pinPIs}
              className="text-[9px] bg-yellow-900 hover:bg-yellow-700 text-yellow-200 px-1.5 py-0.5 rounded"
            >
              📌 Pin
            </button>
          </div>
          <div className="space-y-3">
            {pis.map(pi => (
              <div
                key={pi.name}
                className="bg-gray-900 border border-gray-700 rounded-lg p-3 space-y-1"
              >
                <div className="text-xs font-semibold text-white">{pi.name}</div>
                <div className="text-[11px] text-gray-400">🏛️ {pi.institution}</div>
                <div className="text-[11px] text-gray-300 italic">{pi.focus}</div>
                <div className="flex items-center gap-3 text-[10px] text-gray-400 flex-wrap">
                  <span>
                    h-index: <span className="text-white font-semibold">{pi.h_index}</span>
                  </span>
                  <span>Grants:</span>
                  {pi.grants.map(g => (
                    <span
                      key={g}
                      className="bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded font-mono"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Datasets */}
        <div>
          <h4 className="text-xs font-semibold text-cyan-300 uppercase tracking-widest mb-3">
            📦 Relevant Public Datasets
          </h4>
          <div className="space-y-3">
            {datasets.map(ds => (
              <div
                key={ds.gse_id}
                className="bg-gray-900 border border-gray-700 rounded-lg p-3 space-y-1"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${BADGE_COLORS[ds.type] ?? 'bg-gray-700 text-gray-300'}`}
                  >
                    {ds.type}
                  </span>
                  <span className="text-xs font-semibold text-white font-mono">{ds.gse_id}</span>
                </div>
                <div className="text-[11px] text-gray-300">{ds.description}</div>
                <div className="flex items-center gap-3 text-[10px] text-gray-400 flex-wrap">
                  <span>🖥️ {ds.platform}</span>
                  <span>👥 {ds.samples.toLocaleString()} samples</span>
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/${ds.pmid}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    PMID: {ds.pmid}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(InvestigatorPanel);
