import { useState, useEffect, useMemo } from 'react';
import type { PatientSample } from '../types/patient';
import type { CorrelationResult } from '../types/correlation';
import { MOCK_TCGA_DATA } from '../data/mockTCGAData';
import { generateDataForPair } from '../utils/dataGeneration';
import { calculateCorrelationResult } from '../utils/statistics';

export function useCorrelationData(
  cancerType: string,
  geneA: string,
  geneB: string
): {
  samples: PatientSample[];
  result: CorrelationResult;
  isLoading: boolean;
} {
  const [isLoading, setIsLoading] = useState(false);
  const [key, setKey] = useState(`${cancerType}-${geneA}-${geneB}`);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setKey(`${cancerType}-${geneA}-${geneB}`);
      setIsLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [cancerType, geneA, geneB]);

  const samples = useMemo(() => {
    const baseData = MOCK_TCGA_DATA[cancerType] ?? MOCK_TCGA_DATA['TCGA-BRCA'];
    return generateDataForPair(geneA, geneB, cancerType, baseData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const result = useMemo(() => calculateCorrelationResult(samples), [samples]);

  return { samples, result, isLoading };
}
