import React from 'react';

interface HeaderProps {
  geneA: string;
  geneB: string;
  cancerType: string;
}

const Header: React.FC<HeaderProps> = ({ geneA, geneB, cancerType }) => {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-gray-700 bg-[#0f172a]" style={{ minHeight: 60 }}>
      <div className="flex items-center gap-3">
        {/* DNA icon */}
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 4 Q16 10 22 4" stroke="#3B82F6" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <path d="M10 10 Q16 16 22 10" stroke="#3B82F6" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <path d="M10 16 Q16 22 22 16" stroke="#10B981" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <path d="M10 22 Q16 28 22 22" stroke="#10B981" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <line x1="10" y1="4" x2="10" y2="28" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="22" y1="4" x2="22" y2="28" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <div>
          <span className="text-xl font-bold text-white tracking-tight">OncoCorr</span>
          <p className="text-xs text-gray-400 leading-none mt-0.5">Phase 1: Correlation Engine</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 bg-[#1e293b] rounded-lg px-4 py-2 border border-gray-700">
          <span className="text-blue-400 font-mono font-semibold text-sm">{geneA}</span>
          <span className="text-gray-400 text-sm">↔</span>
          <span className="text-green-400 font-mono font-semibold text-sm">{geneB}</span>
        </div>

        <div className="bg-[#1e293b] rounded-lg px-3 py-2 border border-gray-700">
          <span className="text-xs text-gray-400">Dataset: </span>
          <span className="text-xs text-yellow-400 font-semibold">{cancerType}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-medium">SYSTEM ONLINE</span>
        </div>
      </div>
    </header>
  );
};

export default React.memo(Header);
