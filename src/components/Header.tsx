'use client';
import React from 'react';
import { FiLogOut, FiKey, FiShare2 } from 'react-icons/fi';
import { MdOutlinePublish } from 'react-icons/md';

export default function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-[#040810] border-b border-[#1a2540] h-12 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
            OC
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-wider">OncoCorr</div>
            <div className="text-[#4a6080] text-[9px] tracking-widest uppercase">
              Translational Oncology Lab
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 ml-4">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-[10px] tracking-widest uppercase font-medium">
            Operational
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="px-3 py-1 text-[10px] font-bold tracking-widest text-[#8899aa] border border-[#1a2540] rounded hover:border-[#3a5070] hover:text-white transition-colors uppercase flex items-center gap-1">
          <FiLogOut size={10} />
          Logout
        </button>
        <button className="px-3 py-1 text-[10px] font-bold tracking-widest text-[#8899aa] border border-[#1a2540] rounded hover:border-[#3a5070] hover:text-white transition-colors flex items-center gap-1 uppercase">
          <FiKey size={10} />
          Personal Key
        </button>
        <button className="p-1.5 text-[#4a6080] hover:text-white transition-colors">
          <FiShare2 size={14} />
        </button>
        <button className="p-1.5 text-[#4a6080] hover:text-white transition-colors">
          <MdOutlinePublish size={14} />
        </button>
      </div>
    </header>
  );
}
