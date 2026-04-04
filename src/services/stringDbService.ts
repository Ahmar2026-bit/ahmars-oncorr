/**
 * STRING DB — Protein-protein interaction network.
 * Free API, no key required. https://string-db.org/cgi/help.pl
 */

export interface StringInteraction {
  geneA: string;
  geneB: string;
  score: number;          // 0–1000 (STRING combined score)
  scoreNorm: number;      // 0–1 normalized
  category: string;       // e.g. "coexpression", "experimental"
}

export interface StringProtein {
  id: string;
  name: string;
  annotation: string;
}

const BASE = 'https://string-db.org/api/json';
const CALLER = 'OncoCorr';
const SPECIES = 9606; // Homo sapiens

/** Resolve gene symbol(s) to STRING IDs */
async function resolveIds(genes: string[]): Promise<Record<string, string>> {
  const url =
    `${BASE}/get_string_ids?` +
    `identifiers=${encodeURIComponent(genes.join('%0d'))}` +
    `&species=${SPECIES}&caller_identity=${CALLER}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`STRING resolve HTTP ${res.status}`);
  const data = await res.json();
  const map: Record<string, string> = {};
  for (const item of data as Array<{ queryItem: string; stringId: string }>) {
    if (!map[item.queryItem.toUpperCase()]) {
      map[item.queryItem.toUpperCase()] = item.stringId;
    }
  }
  return map;
}

/** Get interaction partners for a single gene */
export async function getInteractionPartners(
  gene: string,
  limit = 10,
): Promise<StringInteraction[]> {
  const ids = await resolveIds([gene]);
  const stringId = ids[gene.toUpperCase()];
  if (!stringId) return [];

  const url =
    `${BASE}/interaction_partners?` +
    `identifiers=${encodeURIComponent(stringId)}` +
    `&species=${SPECIES}&limit=${limit}&caller_identity=${CALLER}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`STRING partners HTTP ${res.status}`);
  const data = await res.json();

  return (data as Array<Record<string, unknown>>).map((d) => ({
    geneA: (d.preferredName_A as string) || gene,
    geneB: (d.preferredName_B as string) || '',
    score: Number(d.score) || 0,
    scoreNorm: (Number(d.score) || 0) / 1000,
    category: '',
  }));
}

/** Get interaction score between two specific genes */
export async function getPairScore(
  geneA: string,
  geneB: string,
): Promise<number | null> {
  const ids = await resolveIds([geneA, geneB]);
  const idA = ids[geneA.toUpperCase()];
  const idB = ids[geneB.toUpperCase()];
  if (!idA || !idB) return null;

  const url =
    `${BASE}/network?` +
    `identifiers=${encodeURIComponent([idA, idB].join('%0d'))}` +
    `&species=${SPECIES}&caller_identity=${CALLER}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`STRING network HTTP ${res.status}`);
  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) return null;
  // Find the direct edge between A and B
  const edge = (data as Array<Record<string, unknown>>).find(
    (e) =>
      (e.preferredName_A === geneA.toUpperCase() || e.preferredName_A === geneA) &&
      (e.preferredName_B === geneB.toUpperCase() || e.preferredName_B === geneB),
  );
  return edge ? Number(edge.score) / 1000 : null;
}
