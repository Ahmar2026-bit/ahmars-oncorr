import React, { useCallback } from 'react';
import type { PatientSample } from '../types/patient';
import type { CorrelationResult } from '../types/correlation';
import { formatPValue, getSignificanceStars, getEffectSizeLabel } from '../utils/statistics';

interface ExportButtonsProps {
  samples: PatientSample[];
  result: CorrelationResult;
  geneA: string;
  geneB: string;
  cancerType: string;
  onResetView: () => void;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({
  samples, result, geneA, geneB, cancerType, onResetView,
}) => {
  const exportCSV = useCallback(() => {
    const header = 'id,geneA_expression,geneB_expression,mutation_status,subtype,cancer_type,age,stage,gtex_reference\n';
    const rows = samples.map(s =>
      `${s.id},${s.geneA_expression},${s.geneB_expression},${s.mutation_status},${s.subtype},${s.cancer_type},${s.age},${s.stage},${s.gtex_reference}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oncorr_${geneA}_${geneB}_${cancerType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [samples, geneA, geneB, cancerType]);

  const copyStats = useCallback(() => {
    const text = [
      `OncoCorr Analysis: ${geneA} vs ${geneB} (${cancerType})`,
      `Pearson R: ${result.pearson_r.toFixed(4)}`,
      `95% CI: [${result.ci_lower}, ${result.ci_upper}]`,
      `P-value: ${formatPValue(result.p_value)} ${getSignificanceStars(result.p_value)}`,
      `Effect size: ${getEffectSizeLabel(result.pearson_r)}`,
      `N samples: ${result.n_samples}`,
      `Mean ${geneA}: ${result.mean_geneA.toFixed(3)}`,
      `Mean ${geneB}: ${result.mean_geneB.toFixed(3)}`,
    ].join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
  }, [result, geneA, geneB, cancerType]);

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-800 bg-[#0f172a]">
      <button
        onClick={exportCSV}
        className="flex items-center gap-1.5 bg-[#1e293b] hover:bg-[#334155] border border-gray-700 text-gray-300 hover:text-white text-xs px-3 py-1.5 rounded transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        Export CSV
      </button>

      <button
        onClick={copyStats}
        className="flex items-center gap-1.5 bg-[#1e293b] hover:bg-[#334155] border border-gray-700 text-gray-300 hover:text-white text-xs px-3 py-1.5 rounded transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
        </svg>
        Copy Stats
      </button>

      <button
        onClick={onResetView}
        className="flex items-center gap-1.5 bg-[#1e293b] hover:bg-[#334155] border border-gray-700 text-gray-300 hover:text-white text-xs px-3 py-1.5 rounded transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
        Reset View
      </button>
    </div>
  );
};

export default React.memo(ExportButtons);
