import React, { useState, useRef, useEffect } from 'react';
import { GENE_DATABASE } from '../data/geneDatabase';
import { POPULAR_PAIRS } from '../data/popularPairs';
import type { CorrelationResult } from '../types/correlation';

const CANCER_TYPES = ['TCGA-BRCA', 'TCGA-LUAD', 'TCGA-PAAD', 'TCGA-COAD', 'TCGA-OV'];

interface GeneSelectorProps {
  geneA: string;
  geneB: string;
  cancerType: string;
  result: CorrelationResult;
  onGeneAChange: (g: string) => void;
  onGeneBChange: (g: string) => void;
  onCancerTypeChange: (c: string) => void;
}

interface GeneInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  accentColor: string;
}

const GeneInput: React.FC<GeneInputProps> = ({ label, value, onChange, accentColor }) => {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const suggestions = query.length > 0
    ? GENE_DATABASE.filter(g => g.toLowerCase().startsWith(query.toLowerCase()) && g !== value).slice(0, 8)
    : [];

  const select = (g: string) => {
    onChange(g);
    setQuery(g);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full bg-[#0f172a] border border-gray-600 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500 text-white"
        style={{ borderColor: open ? accentColor : undefined }}
        placeholder="Search gene..."
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-[#1e293b] border border-gray-600 rounded mt-1 max-h-48 overflow-y-auto shadow-xl">
          {suggestions.map(g => (
            <button
              key={g}
              className="w-full text-left px-3 py-1.5 text-sm font-mono hover:bg-[#334155] text-gray-200"
              onMouseDown={() => select(g)}
            >
              {g}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const GeneSelector: React.FC<GeneSelectorProps> = ({
  geneA, geneB, cancerType, result,
  onGeneAChange, onGeneBChange, onCancerTypeChange,
}) => {
  const swap = () => {
    const tmp = geneA;
    onGeneAChange(geneB);
    onGeneBChange(tmp);
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-widest">Gene Pair</h3>

      <GeneInput label="Gene A (Target)" value={geneA} onChange={onGeneAChange} accentColor="#3B82F6" />

      <div className="flex justify-center">
        <button
          onClick={swap}
          className="text-xs bg-[#334155] hover:bg-[#475569] text-gray-300 px-3 py-1 rounded border border-gray-600 transition-colors"
        >
          A ↔ B
        </button>
      </div>

      <GeneInput label="Gene B (Comparator)" value={geneB} onChange={onGeneBChange} accentColor="#10B981" />

      <div>
        <label className="block text-xs text-gray-400 mb-1">Cancer Type</label>
        <select
          value={cancerType}
          onChange={e => onCancerTypeChange(e.target.value)}
          className="w-full bg-[#0f172a] border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          {CANCER_TYPES.map(ct => (
            <option key={ct} value={ct}>{ct}</option>
          ))}
        </select>
      </div>

      <div className="bg-[#0f172a] rounded p-3 border border-gray-700">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">N Samples</span>
          <span className="text-white font-semibold">{result.n_samples.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-gray-400">Pearson R</span>
          <span className={`font-semibold ${result.pearson_r >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {result.pearson_r.toFixed(3)}
          </span>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Popular Pairs</h4>
        <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
          {POPULAR_PAIRS.map(pair => (
            <button
              key={`${pair.geneA}-${pair.geneB}`}
              onClick={() => { onGeneAChange(pair.geneA); onGeneBChange(pair.geneB); }}
              className={`w-full text-left px-2 py-1.5 rounded border text-xs transition-colors ${
                geneA === pair.geneA && geneB === pair.geneB
                  ? 'bg-blue-900/40 border-blue-600 text-blue-300'
                  : 'bg-[#0f172a] border-gray-700 hover:border-gray-500 text-gray-300'
              }`}
            >
              <span className="font-mono font-semibold">{pair.geneA} ↔ {pair.geneB}</span>
              <p className="text-gray-500 text-[10px] mt-0.5">{pair.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(GeneSelector);
