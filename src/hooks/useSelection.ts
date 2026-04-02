import { useState, useCallback } from 'react';

export function useSelection(): {
  selectedSamples: string[];
  hoveredSample: string | null;
  setHoveredSample: (id: string | null) => void;
  toggleSampleSelection: (id: string) => void;
  clearSelection: () => void;
} {
  const [selectedSamples, setSelectedSamples] = useState<string[]>([]);
  const [hoveredSample, setHoveredSample] = useState<string | null>(null);

  const toggleSampleSelection = useCallback((id: string) => {
    setSelectedSamples(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedSamples([]), []);

  return { selectedSamples, hoveredSample, setHoveredSample, toggleSampleSelection, clearSelection };
}
