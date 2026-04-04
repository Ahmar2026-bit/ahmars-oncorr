/**
 * DGIdb — Drug-Gene Interaction Database
 * Free REST API, no API key required.
 * Docs: https://dgidb.org/api/v2
 */

export interface DrugInteraction {
  drugName: string;
  drugChemblId: string;
  interactionTypes: string[];
  sources: string[];
  pmids: string[];
  score: number | null;
  approved: boolean;
}

interface DGIdbSource {
  sourceName?: string;
  source_db_name?: string;
}

interface DGIdbPublication {
  pmid?: string;
}

interface DGIdbRawInteraction {
  drugName?: string;
  drug_name?: string;
  drugChemblId?: string;
  drug_chembl_id?: string;
  interactionTypes?: string[];
  interaction_types?: string[];
  sources?: DGIdbSource[];
  publications?: DGIdbPublication[];
  score?: number;
  approved?: boolean;
}

interface DGIdbMatchedTerm {
  interactions?: DGIdbRawInteraction[];
}

export async function getDrugInteractions(gene: string): Promise<DrugInteraction[]> {
  const url = `https://dgidb.org/api/v2/interactions.json?genes=${encodeURIComponent(gene.toUpperCase())}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`DGIdb HTTP ${res.status}`);
  const data = await res.json() as { matchedTerms?: DGIdbMatchedTerm[] };

  const rawInteractions: DGIdbRawInteraction[] = data?.matchedTerms?.[0]?.interactions ?? [];

  return rawInteractions
    .filter((i) => !!(i.drugName || i.drug_name))
    .map((i) => ({
      drugName: (i.drugName || i.drug_name || '').toUpperCase(),
      drugChemblId: i.drugChemblId || i.drug_chembl_id || '',
      interactionTypes: (i.interactionTypes || i.interaction_types || []).filter(Boolean),
      sources: (i.sources ?? []).map((s) => s.sourceName || s.source_db_name || '').filter(Boolean),
      pmids: (i.publications ?? []).map((p) => p.pmid || '').filter(Boolean),
      score: i.score ?? null,
      approved: i.approved ?? false,
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
