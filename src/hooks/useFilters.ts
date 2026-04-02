import { useState, useCallback } from 'react';
import type { FilterState } from '../types/correlation';

const DEFAULT_FILTERS: FilterState = {
  pearsonThreshold: 0,
  pValueThreshold: 1,
  sampleSizeMin: 50,
  selectedSubtypes: [],
  showGtex: false,
  cancerType: 'TCGA-BRCA',
};

export function useFilters(): {
  filters: FilterState;
  setFilter: (key: keyof FilterState, value: FilterState[keyof FilterState]) => void;
  resetFilters: () => void;
} {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const setFilter = useCallback((key: keyof FilterState, value: FilterState[keyof FilterState]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(prev => ({ ...DEFAULT_FILTERS, cancerType: prev.cancerType }));
  }, []);

  return { filters, setFilter, resetFilters };
}
