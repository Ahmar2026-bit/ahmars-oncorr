import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import MainCanvas from './components/MainCanvas';
import StatsPanel from './components/StatsPanel';
import ResearchTabs from './components/ResearchTabs';
import { useCorrelationData } from './hooks/useCorrelationData';
import { useFilters } from './hooks/useFilters';
import { useSelection } from './hooks/useSelection';
import { filterSamples } from './utils/filtering';
import { calculateCorrelationResult } from './utils/statistics';
import type { NotebookEntry } from './types/notebook';

const DEFAULT_GENE_A = 'GATA6';
const DEFAULT_GENE_B = 'HSF1';
const DEFAULT_CANCER_TYPE = 'TCGA-PAAD';

function App() {
  const [geneA, setGeneA] = useState(DEFAULT_GENE_A);
  const [geneB, setGeneB] = useState(DEFAULT_GENE_B);
  const [cancerType, setCancerType] = useState(DEFAULT_CANCER_TYPE);

  const { filters, setFilter, resetFilters } = useFilters();
  const { selectedSamples, setHoveredSample, clearSelection } = useSelection();

  const { samples: rawSamples, result: rawResult, isLoading } = useCorrelationData(cancerType, geneA, geneB);

  const filteredSamples = useMemo(
    () => filterSamples(rawSamples, filters),
    [rawSamples, filters]
  );

  const filteredResult = useMemo(
    () => calculateCorrelationResult(filteredSamples),
    [filteredSamples]
  );

  const handleCancerTypeChange = useCallback((ct: string) => {
    setCancerType(ct);
    setFilter('selectedSubtypes', []);
  }, [setFilter]);

  const handleResetView = useCallback(() => {
    setGeneA(DEFAULT_GENE_A);
    setGeneB(DEFAULT_GENE_B);
    setCancerType(DEFAULT_CANCER_TYPE);
    resetFilters();
    clearSelection();
  }, [resetFilters, clearSelection]);

  // Research Notebook state
  const [notebookEntries, setNotebookEntries] = useState<NotebookEntry[]>([]);

  const handlePin = useCallback((entry: Omit<NotebookEntry, 'id'>) => {
    setNotebookEntries(prev => [
      { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
      ...prev,
    ]);
  }, []);

  const handleRemoveEntry = useCallback((id: string) => {
    setNotebookEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const handleClearNotebook = useCallback(() => {
    setNotebookEntries([]);
  }, []);

  return (
    <div className="flex flex-col min-h-screen overflow-y-auto" style={{ background: '#0f172a' }}>
      <Header geneA={geneA} geneB={geneB} cancerType={cancerType} />

      <motion.div
        className="flex"
        style={{ height: '60vh', minHeight: 480 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <LeftSidebar
          geneA={geneA}
          geneB={geneB}
          cancerType={cancerType}
          filters={filters}
          result={rawResult}
          onGeneAChange={setGeneA}
          onGeneBChange={setGeneB}
          onCancerTypeChange={handleCancerTypeChange}
          setFilter={setFilter}
          resetFilters={resetFilters}
        />

        <MainCanvas
          samples={filteredSamples}
          result={filteredResult}
          geneA={geneA}
          geneB={geneB}
          cancerType={cancerType}
          showGtex={filters.showGtex}
          isLoading={isLoading}
          selectedSamples={selectedSamples}
          onHover={setHoveredSample}
          onResetView={handleResetView}
        />

        <StatsPanel
          samples={filteredSamples}
          result={filteredResult}
          geneA={geneA}
          geneB={geneB}
        />
      </motion.div>

      <ResearchTabs
        geneA={geneA}
        geneB={geneB}
        cancerType={cancerType}
        result={filteredResult}
        notebookEntries={notebookEntries}
        onPin={handlePin}
        onRemoveEntry={handleRemoveEntry}
        onClearNotebook={handleClearNotebook}
      />
    </div>
  );
}

export default App;
