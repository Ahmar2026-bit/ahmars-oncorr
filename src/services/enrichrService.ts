/**
 * Enrichr service — pathway enrichment analysis.
 * Free API, no key required. https://maayanlab.cloud/Enrichr/
 */

export interface PathwayResult {
  rank: number;
  pathway: string;
  pValue: number;
  adjustedPValue: number;
  combinedScore: number;
  overlappingGenes: string[];
}

// Tuple returned per pathway: [rank, name, p-value, z-score, combined-score, genes[], adj-p, ...]
type EnrichrEntry = [number, string, number, number, number, string[], number, ...unknown[]];

export async function enrichPathways(genes: string[]): Promise<PathwayResult[]> {
  if (genes.length === 0) return [];

  // Step 1: Add gene list
  const formData = new FormData();
  formData.append('list', genes.join('\n'));
  formData.append('description', 'OncoCorr gene set');

  const addRes = await fetch('https://maayanlab.cloud/Enrichr/addList', {
    method: 'POST',
    body: formData,
  });
  if (!addRes.ok) throw new Error(`Enrichr addList HTTP ${addRes.status}`);
  const { userListId } = await addRes.json() as { userListId: number };

  // Step 2: Get KEGG enrichment
  const enrichRes = await fetch(
    `https://maayanlab.cloud/Enrichr/enrich?userListId=${userListId}&backgroundType=KEGG_2021_Human`,
  );
  if (!enrichRes.ok) throw new Error(`Enrichr enrich HTTP ${enrichRes.status}`);
  const enrichData = await enrichRes.json() as Record<string, EnrichrEntry[]>;

  const results = (enrichData?.KEGG_2021_Human ?? []).slice(0, 15);

  return results.map((r) => ({
    rank: r[0],
    pathway: r[1],
    pValue: r[2],
    adjustedPValue: r[6],
    combinedScore: r[4],
    overlappingGenes: r[5] ?? [],
  }));
}
