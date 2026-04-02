import type { PatientSample } from '../types/patient';
import type { FilterState } from '../types/correlation';

export function filterSamples(
  samples: PatientSample[],
  filters: FilterState
): PatientSample[] {
  return samples.filter(s => {
    if (filters.selectedSubtypes.length > 0 && !filters.selectedSubtypes.includes(s.subtype)) {
      return false;
    }
    return true;
  });
}

export function getFilteredStats(
  filtered: PatientSample[],
  total: PatientSample[]
): { count: number; total: number; percentage: number } {
  return {
    count: filtered.length,
    total: total.length,
    percentage: total.length > 0 ? (filtered.length / total.length) * 100 : 0,
  };
}
