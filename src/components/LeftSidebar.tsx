import React from 'react';
import GeneSelector from './GeneSelector';
import FilterPanel from './FilterPanel';
import type { FilterState, CorrelationResult } from '../types/correlation';

interface LeftSidebarProps {
  geneA: string;
  geneB: string;
  cancerType: string;
  filters: FilterState;
  result: CorrelationResult;
  onGeneAChange: (g: string) => void;
  onGeneBChange: (g: string) => void;
  onCancerTypeChange: (c: string) => void;
  setFilter: (key: keyof FilterState, value: FilterState[keyof FilterState]) => void;
  resetFilters: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = (props) => {
  return (
    <aside
      className="flex flex-col overflow-y-auto border-r border-gray-800"
      style={{ width: 280, minWidth: 280, background: '#0f172a' }}
    >
      <GeneSelector
        geneA={props.geneA}
        geneB={props.geneB}
        cancerType={props.cancerType}
        result={props.result}
        onGeneAChange={props.onGeneAChange}
        onGeneBChange={props.onGeneBChange}
        onCancerTypeChange={props.onCancerTypeChange}
      />
      <div className="border-t border-gray-800" />
      <FilterPanel
        filters={props.filters}
        cancerType={props.cancerType}
        setFilter={props.setFilter}
        resetFilters={props.resetFilters}
      />
    </aside>
  );
};

export default React.memo(LeftSidebar);
