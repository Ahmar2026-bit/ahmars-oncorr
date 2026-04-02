'use client';
import React from 'react';
import HeroSection from './HeroSection';
import CorrelationMatrix from './CorrelationMatrix';
import ResearchParameters from './ResearchParameters';
import CommandCenter from './CommandCenter';
import { FiActivity, FiCpu, FiSliders } from 'react-icons/fi';

function CoreCards() {
  return (
    <div className="flex gap-3 px-6 py-3">
      {/* Core Analysis Card */}
      <div className="flex-1 bg-[#060c18] border border-[#1a2540] rounded-lg p-3 hover:border-[#2a3550] transition-colors">
        <div className="flex items-center gap-2 mb-1.5">
          <FiActivity size={13} className="text-[#00d4ff]" />
          <span className="text-[10px] font-bold tracking-widest text-[#e2e8f0] uppercase">
            Core Analysis
          </span>
        </div>
        <p className="text-[9px] text-[#4a6080] leading-relaxed">
          Gene correlation analysis with statistical validation across tumor cohorts.
        </p>
        <div className="mt-2 flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          <span className="text-[9px] text-[#10B981]">Ready</span>
        </div>
      </div>

      {/* Advisor Lab Card */}
      <div className="flex-1 bg-[#060c18] border border-[#1a2540] rounded-lg p-3 hover:border-[#2a3550] transition-colors">
        <div className="flex items-center gap-2 mb-1.5">
          <FiCpu size={13} className="text-[#8b5cf6]" />
          <span className="text-[10px] font-bold tracking-widest text-[#e2e8f0] uppercase">
            Advisor Lab
          </span>
        </div>
        <p className="text-[9px] text-[#4a6080] leading-relaxed">
          AI-augmented hypothesis generation and literature synthesis engine.
        </p>
        <div className="mt-2 flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
          <span className="text-[9px] text-[#f59e0b]">Standby</span>
        </div>
      </div>

      {/* Active Parameters Card */}
      <div className="flex-1 bg-[#060c18] border border-[#1a2540] rounded-lg p-3 hover:border-[#2a3550] transition-colors">
        <div className="flex items-center gap-2 mb-1.5">
          <FiSliders size={13} className="text-[#10B981]" />
          <span className="text-[10px] font-bold tracking-widest text-[#e2e8f0] uppercase">
            Active Parameters
          </span>
        </div>
        <div className="flex gap-2 mt-1">
          <span className="px-2 py-0.5 bg-[#EF4444]/20 border border-[#EF4444]/40 rounded text-[#EF4444] text-[9px] font-bold tracking-wide">
            KRAS
          </span>
          <span className="px-2 py-0.5 bg-[#3B82F6]/20 border border-[#3B82F6]/40 rounded text-[#3B82F6] text-[9px] font-bold tracking-wide">
            NRF2
          </span>
        </div>
        <div className="mt-2 text-[9px] text-[#4a6080]">
          N=452 · PAAD · Stage ALL
        </div>
      </div>
    </div>
  );
}

export default function MainCanvas() {
  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-[#040810]">
      <HeroSection />
      <div className="flex-1 overflow-y-auto">
        <CoreCards />
        <div className="px-6 pb-3 grid grid-cols-2 gap-3">
          <CorrelationMatrix />
          <ResearchParameters />
        </div>
      </div>
      <CommandCenter />
    </main>
  );
}
