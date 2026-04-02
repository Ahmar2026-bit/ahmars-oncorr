'use client';
import React, { useState } from 'react';
import { analysisTabs } from '@/data/mockData';

export default function RightSidebar() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <aside className="w-10 flex-shrink-0 bg-[#060c18] border-l border-[#1a2540] flex flex-col items-center py-2 overflow-hidden">
      <div className="flex flex-col gap-1 w-full">
        {analysisTabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            title={tab}
            className={`relative w-full flex items-center justify-center py-3 text-[8px] font-bold tracking-widest transition-colors group ${
              activeTab === i
                ? 'text-[#00d4ff] bg-[#0d1526]'
                : 'text-[#4a6080] hover:text-[#8899aa] hover:bg-[#0a0f1e]'
            }`}
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            {activeTab === i && (
              <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#00d4ff] rounded-r" />
            )}
            <span className="rotate-180 text-[7px] leading-none px-1">{tab}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
