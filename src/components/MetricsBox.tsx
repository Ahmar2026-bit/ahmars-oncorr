import React from 'react';
import type { CorrelationResult } from '../types/correlation';
import { formatPValue, getSignificanceStars, getEffectSizeLabel } from '../utils/statistics';

interface MetricsBoxProps {
  result: CorrelationResult;
  geneA: string;
  geneB: string;
  cancerType: string;
}

const MetricsBox: React.FC<MetricsBoxProps> = ({ result, geneA, geneB, cancerType }) => {
  const rColor = result.pearson_r >= 0 ? '#10B981' : '#EF4444';
  const stars = getSignificanceStars(result.p_value);

  return (
    <div
      className="absolute top-3 right-3 z-10 rounded-xl border border-gray-700 shadow-2xl p-4 space-y-2"
      style={{ background: 'rgba(15, 23, 42, 0.92)', minWidth: 180, backdropFilter: 'blur(8px)' }}
    >
      <div className="text-center mb-1">
        <div className="text-4xl font-bold font-mono" style={{ color: rColor }}>
          {result.pearson_r >= 0 ? '+' : ''}{result.pearson_r.toFixed(3)}
        </div>
        <div className="text-xs text-gray-400">Pearson R</div>
      </div>

      <div className="flex justify-between text-xs">
        <span className="text-gray-400">95% CI</span>
        <span className="text-gray-200 font-mono">[{result.ci_lower}, {result.ci_upper}]</span>
      </div>

      <div className="flex justify-between text-xs">
        <span className="text-gray-400">P-value</span>
        <span className="text-yellow-300 font-mono">{formatPValue(result.p_value)} <span className="text-green-400">{stars}</span></span>
      </div>

      <div className="flex justify-between text-xs">
        <span className="text-gray-400">Effect</span>
        <span className="text-blue-400 font-semibold">{getEffectSizeLabel(result.pearson_r)}</span>
      </div>

      <div className="flex justify-between text-xs">
        <span className="text-gray-400">N</span>
        <span className="text-white font-semibold">{result.n_samples}</span>
      </div>

      <div className="border-t border-gray-700 pt-2 text-[10px] text-gray-500">
        <div>{cancerType}</div>
        <div>{geneA} vs {geneB}</div>
      </div>
    </div>
  );
};

export default React.memo(MetricsBox);
