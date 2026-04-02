import React from 'react';
import type { FilterState } from '../types/correlation';
import { CANCER_SUBTYPES_MAP } from '../data/mockTCGAData';

interface FilterPanelProps {
  filters: FilterState;
  cancerType: string;
  setFilter: (key: keyof FilterState, value: FilterState[keyof FilterState]) => void;
  resetFilters: () => void;
}

const P_VALUE_OPTIONS = [
  { label: 'All', value: 1 },
  { label: '< 0.05', value: 0.05 },
  { label: '< 0.01', value: 0.01 },
  { label: '< 0.001', value: 0.001 },
];

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, cancerType, setFilter, resetFilters }) => {
  const subtypes = CANCER_SUBTYPES_MAP[cancerType] ?? [];

  const toggleSubtype = (subtype: string) => {
    const current = filters.selectedSubtypes;
    const next = current.includes(subtype)
      ? current.filter(s => s !== subtype)
      : [...current, subtype];
    setFilter('selectedSubtypes', next);
  };

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-widest">Precision Filters</h3>
        <button
          onClick={resetFilters}
          className="text-[10px] text-gray-400 hover:text-white bg-[#334155] hover:bg-[#475569] px-2 py-1 rounded transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Pearson threshold */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <label className="text-gray-400">Pearson |R| ≥</label>
          <span className="text-blue-400 font-mono">{filters.pearsonThreshold.toFixed(2)}</span>
        </div>
        <input
          type="range" min={0} max={1} step={0.05}
          value={filters.pearsonThreshold}
          onChange={e => setFilter('pearsonThreshold', parseFloat(e.target.value))}
          className="w-full accent-blue-500"
        />
      </div>

      {/* P-value */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">P-Value Threshold</label>
        <select
          value={filters.pValueThreshold}
          onChange={e => setFilter('pValueThreshold', parseFloat(e.target.value))}
          className="w-full bg-[#0f172a] border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
        >
          {P_VALUE_OPTIONS.map(opt => (
            <option key={opt.label} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Sample size */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <label className="text-gray-400">Min Sample Size</label>
          <span className="text-blue-400 font-mono">{filters.sampleSizeMin}</span>
        </div>
        <input
          type="range" min={50} max={500} step={10}
          value={filters.sampleSizeMin}
          onChange={e => setFilter('sampleSizeMin', parseInt(e.target.value))}
          className="w-full accent-blue-500"
        />
      </div>

      {/* GTEx overlay */}
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400">GTEx Reference Overlay</label>
        <button
          onClick={() => setFilter('showGtex', !filters.showGtex)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            filters.showGtex ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            filters.showGtex ? 'translate-x-4' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {/* Subtypes */}
      <div>
        <h4 className="text-xs text-gray-400 mb-2 uppercase tracking-widest">Subtypes</h4>
        <div className="space-y-1.5">
          {subtypes.map(subtype => {
            const checked = filters.selectedSubtypes.includes(subtype);
            return (
              <label key={subtype} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSubtype(subtype)}
                  className="accent-blue-500 w-3.5 h-3.5"
                />
                <span className={`text-xs transition-colors ${checked ? 'text-white' : 'text-gray-400'} group-hover:text-gray-200`}>
                  {subtype}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default React.memo(FilterPanel);
