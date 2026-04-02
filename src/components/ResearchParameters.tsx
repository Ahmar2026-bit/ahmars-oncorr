'use client';
import React, { useState, useRef, useEffect } from 'react';
import { geneList, cancerTypes, intelligenceModels } from '@/data/mockData';
import { FiChevronDown } from 'react-icons/fi';

interface GeneInputProps {
  label: string;
  sublabel: string;
  value: string;
  onChange: (v: string) => void;
}

function GeneInput({ label, sublabel, value, onChange }: GeneInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  const suggestions = query.length > 0
    ? geneList.filter((g) => g.toLowerCase().startsWith(query.toLowerCase())).slice(0, 8)
    : [];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex-1" ref={ref}>
      <div className="text-[9px] text-[#4a6080] tracking-widest uppercase mb-1">
        {label} <span className="text-[#4a6080] normal-case">({sublabel})</span>
      </div>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Enter gene..."
          className="w-full bg-[#0a0f1e] border border-[#1a2540] text-[#e2e8f0] text-xs rounded px-3 py-2 focus:outline-none focus:border-[#00d4ff] transition-colors placeholder-[#2a3550]"
        />
        {open && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-0.5 bg-[#0a0f1e] border border-[#1a2540] rounded shadow-xl z-50 overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setQuery(s);
                  onChange(s);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-[10px] text-[#e2e8f0] hover:bg-[#1a2540] hover:text-[#00d4ff] transition-colors font-mono"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResearchParameters() {
  const [selectedModel, setSelectedModel] = useState('31pro');
  const [geneA, setGeneA] = useState('KRAS');
  const [geneB, setGeneB] = useState('NRF2');
  const [cancerType, setCancerType] = useState('Pancreatic Adenocarcinoma (PAAD)');
  const [cancerOpen, setCancerOpen] = useState(false);
  const cancerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (cancerRef.current && !cancerRef.current.contains(e.target as Node)) setCancerOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="bg-[#060c18] border border-[#1a2540] rounded-lg p-4">
      <div className="text-[10px] font-bold tracking-widest text-[#e2e8f0] uppercase mb-3">
        Research Parameters
      </div>

      {/* Intelligence Engine */}
      <div className="mb-3">
        <div className="text-[9px] text-[#4a6080] tracking-widest uppercase mb-1.5">
          Intelligence Engine
        </div>
        <div className="flex gap-1">
          {intelligenceModels.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedModel(m.id)}
              title={m.description}
              className={`flex-1 py-1.5 text-[9px] font-bold tracking-wide rounded transition-colors uppercase ${
                selectedModel === m.id
                  ? 'bg-[#00d4ff] text-[#040810]'
                  : 'bg-[#0a0f1e] border border-[#1a2540] text-[#8899aa] hover:text-white hover:border-[#2a3550]'
              }`}
            >
              {m.label}
              {m.rpm !== null && (
                <div className={`text-[7px] mt-0.5 ${selectedModel === m.id ? 'text-[#040810]' : 'text-[#4a6080]'}`}>
                  {m.rpm}rpm
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Gene Inputs */}
      <div className="flex gap-3 mb-3">
        <GeneInput label="Gene A" sublabel="TARGET" value={geneA} onChange={setGeneA} />
        <GeneInput label="Gene B" sublabel="COMPARATOR" value={geneB} onChange={setGeneB} />
      </div>

      {/* Cancer Type */}
      <div ref={cancerRef} className="relative">
        <div className="text-[9px] text-[#4a6080] tracking-widest uppercase mb-1">Cancer Type</div>
        <button
          onClick={() => setCancerOpen((v) => !v)}
          className="w-full bg-[#0a0f1e] border border-[#1a2540] text-[#e2e8f0] text-xs rounded px-3 py-2 text-left focus:outline-none hover:border-[#2a3550] transition-colors flex items-center justify-between"
        >
          <span className="truncate">{cancerType}</span>
          <FiChevronDown size={12} className={`flex-shrink-0 ml-2 text-[#4a6080] transition-transform ${cancerOpen ? 'rotate-180' : ''}`} />
        </button>
        {cancerOpen && (
          <div className="absolute top-full left-0 right-0 mt-0.5 bg-[#0a0f1e] border border-[#1a2540] rounded shadow-xl z-50 max-h-40 overflow-y-auto">
            {cancerTypes.map((ct) => (
              <button
                key={ct}
                onClick={() => {
                  setCancerType(ct);
                  setCancerOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-[10px] hover:bg-[#1a2540] transition-colors ${
                  cancerType === ct ? 'text-[#00d4ff]' : 'text-[#e2e8f0]'
                }`}
              >
                {ct}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
