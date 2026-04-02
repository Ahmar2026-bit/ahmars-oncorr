'use client';
import React from 'react';

export default function HeroSection() {
  return (
    <div className="px-6 pt-5 pb-4 border-b border-[#1a2540]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-serif italic text-[#e2e8f0] tracking-wide leading-tight">
            Research Command Center
          </h1>
          <p className="text-[10px] tracking-widest text-[#4a6080] uppercase mt-1 font-medium">
            Active Session // Precision Oncology Intelligence
          </p>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0f1e] border border-[#1a2540] rounded">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse" />
            <span className="text-[9px] font-bold tracking-widest text-[#8899aa] uppercase">
              AI Reasoning:
            </span>
            <span className="text-[9px] font-bold tracking-widest text-[#00d4ff] uppercase">
              Optimized
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0f1e] border border-[#1a2540] rounded">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[9px] font-bold tracking-widest text-[#8899aa] uppercase">
              Data Stream:
            </span>
            <span className="text-[9px] font-bold tracking-widest text-[#10B981] uppercase">
              Stable
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
