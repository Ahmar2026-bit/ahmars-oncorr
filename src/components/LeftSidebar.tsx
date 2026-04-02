'use client';
import React, { useState } from 'react';
import { FiChevronDown, FiChevronRight, FiUpload, FiZap } from 'react-icons/fi';
import { analysisTools } from '@/data/mockData';

type MutationContext = 'ALL' | 'MUTANT' | 'WILDTYPE';
type TumorStage = 'ALL' | 'I' | 'II' | 'III' | 'IV';

const subtypes = ['All Subtypes', 'Luminal A', 'Luminal B', 'HER2+', 'TNBC', 'Other'];

export default function LeftSidebar() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [mutationContext, setMutationContext] = useState<MutationContext>('ALL');
  const [tumorStage, setTumorStage] = useState<TumorStage>('ALL');
  const [subtype, setSubtype] = useState('All Subtypes');
  const [normalOverlay, setNormalOverlay] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const toggleSection = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside className="w-52 flex-shrink-0 bg-[#060c18] border-r border-[#1a2540] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {/* Tool Sections */}
        <div className="p-2 space-y-0.5">
          {analysisTools.map((tool) => (
            <div key={tool.id}>
              <button
                onClick={() => toggleSection(tool.id)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded text-[10px] font-bold tracking-widest text-[#8899aa] hover:bg-[#0d1526] hover:text-[#00d4ff] transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{tool.icon}</span>
                  <span>{tool.label}</span>
                  {tool.count !== undefined && (
                    <span className="ml-auto bg-[#1a2540] text-[#00d4ff] text-[9px] px-1.5 py-0.5 rounded-full">
                      {tool.count}
                    </span>
                  )}
                </div>
                {collapsed[tool.id] ? (
                  <FiChevronRight size={10} className="flex-shrink-0" />
                ) : (
                  <FiChevronDown size={10} className="flex-shrink-0" />
                )}
              </button>
              {!collapsed[tool.id] && (
                <div className="ml-4 mt-0.5 mb-1 space-y-0.5">
                  <div className="px-2 py-1 text-[9px] text-[#4a6080] italic">
                    No active analysis
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-[#1a2540] mx-2" />

        {/* Translational Filters */}
        <div className="p-2">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold tracking-widest text-[#00d4ff] hover:text-white transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <FiZap size={10} />
              <span>TRANSLATIONAL FILTERS</span>
            </div>
            {filtersOpen ? <FiChevronDown size={10} /> : <FiChevronRight size={10} />}
          </button>

          {filtersOpen && (
            <div className="mt-2 space-y-3 px-1">
              {/* Mutation Context */}
              <div>
                <div className="text-[9px] text-[#4a6080] tracking-widest uppercase mb-1.5">
                  Mutation Context
                </div>
                <div className="flex rounded overflow-hidden border border-[#1a2540]">
                  {(['ALL', 'MUTANT', 'WILDTYPE'] as MutationContext[]).map((ctx) => (
                    <button
                      key={ctx}
                      onClick={() => setMutationContext(ctx)}
                      className={`flex-1 py-1 text-[9px] font-bold tracking-wide transition-colors ${
                        mutationContext === ctx
                          ? 'bg-[#00d4ff] text-[#040810]'
                          : 'bg-[#0a0f1e] text-[#8899aa] hover:text-white'
                      }`}
                    >
                      {ctx}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tumor Stage */}
              <div>
                <div className="text-[9px] text-[#4a6080] tracking-widest uppercase mb-1.5">
                  Tumor Stage
                </div>
                <div className="flex rounded overflow-hidden border border-[#1a2540]">
                  {(['ALL', 'I', 'II', 'III', 'IV'] as TumorStage[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setTumorStage(s)}
                      className={`flex-1 py-1 text-[9px] font-bold tracking-wide transition-colors ${
                        tumorStage === s
                          ? 'bg-[#00d4ff] text-[#040810]'
                          : 'bg-[#0a0f1e] text-[#8899aa] hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Molecular Subtype */}
              <div>
                <div className="text-[9px] text-[#4a6080] tracking-widest uppercase mb-1.5">
                  Molecular Subtype
                </div>
                <select
                  value={subtype}
                  onChange={(e) => setSubtype(e.target.value)}
                  className="w-full bg-[#0a0f1e] border border-[#1a2540] text-[#e2e8f0] text-[10px] rounded px-2 py-1.5 focus:outline-none focus:border-[#00d4ff] transition-colors"
                >
                  {subtypes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Normal Overlay */}
              <div className="flex items-center justify-between">
                <div className="text-[9px] text-[#4a6080] tracking-widest uppercase">
                  Normal Overlay
                </div>
                <button
                  onClick={() => setNormalOverlay((v) => !v)}
                  className={`relative w-8 h-4 rounded-full transition-colors ${
                    normalOverlay ? 'bg-[#10B981]' : 'bg-[#1a2540]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                      normalOverlay ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Upload Button */}
              <button className="w-full flex items-center justify-center gap-2 py-2 bg-[#0a0f1e] border border-[#1a2540] rounded text-[10px] font-bold tracking-widest text-[#8899aa] hover:border-[#00d4ff] hover:text-[#00d4ff] transition-colors uppercase">
                <FiUpload size={10} />
                Upload RNA-Seq CSV
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
