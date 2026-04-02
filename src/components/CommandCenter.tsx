'use client';
import React, { useState } from 'react';
import {
  FiCpu,
  FiBookOpen,
  FiFileText,
  FiBook,
  FiMessageSquare,
  FiCircle,
  FiGrid,
  FiTrendingUp,
  FiEyeOff,
} from 'react-icons/fi';

interface CmdButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  accent?: string;
}

const buttons: CmdButton[] = [
  { id: 'core', label: 'CORE ANALYSIS', icon: <FiCpu size={12} />, accent: '#00d4ff' },
  { id: 'refs', label: 'GROUNDING REFERENCES', icon: <FiBookOpen size={12} /> },
  { id: 'report', label: 'FULL REPORT', icon: <FiFileText size={12} /> },
  { id: 'notebook', label: 'RESEARCH NOTEBOOK', icon: <FiBook size={12} /> },
  { id: 'chat', label: 'ONCOASSISTANT CHAT', icon: <FiMessageSquare size={12} />, accent: '#10B981' },
  { id: 'scatter', label: 'SCATTER', icon: <FiCircle size={12} /> },
  { id: 'heatmap', label: 'HEATMAP', icon: <FiGrid size={12} /> },
  { id: 'regression', label: 'HIDE REGRESSION', icon: <FiTrendingUp size={12} /> },
  { id: 'hide', label: 'HIDE', icon: <FiEyeOff size={12} /> },
];

export default function CommandCenter() {
  const [active, setActive] = useState<string>('core');

  return (
    <div className="flex-shrink-0 border-t border-[#1a2540] bg-[#040810] px-4 py-2">
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {buttons.map((btn) => {
          const isActive = active === btn.id;
          const accentColor = btn.accent || '#8899aa';
          return (
            <button
              key={btn.id}
              onClick={() => setActive(btn.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[9px] font-bold tracking-widest whitespace-nowrap transition-all uppercase flex-shrink-0 ${
                isActive
                  ? 'bg-[#0d1526] border'
                  : 'bg-[#060c18] border border-[#1a2540] hover:border-[#2a3550]'
              }`}
              style={
                isActive
                  ? { borderColor: accentColor, color: accentColor }
                  : { color: '#4a6080' }
              }
            >
              {btn.icon}
              {btn.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
