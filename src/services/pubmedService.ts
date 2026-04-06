/**
 * PubMed service — uses NCBI E-utilities (free, no API key required).
 * Docs: https://www.ncbi.nlm.nih.gov/books/NBK25499/
 */

export interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  pubDate: string;
  abstract?: string;
  url: string;
}

export interface KOLEntry {
  name: string;
  count: number;
  samplePmid: string;
}

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const TOOL = 'OncoCorr';
const EMAIL = 'oncorr@example.com'; // required by NCBI policy

export async function searchPubMed(
  query: string,
  maxResults = 8,
): Promise<PubMedArticle[]> {
  // 1. Search — get PMIDs
  const searchUrl =
    `${BASE}/esearch.fcgi?db=pubmed&retmode=json&retmax=${maxResults}` +
    `&term=${encodeURIComponent(query)}` +
    `&tool=${TOOL}&email=${EMAIL}`;

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`PubMed search HTTP ${searchRes.status}`);
  const searchData = await searchRes.json();
  const pmids: string[] = searchData?.esearchresult?.idlist ?? [];
  if (pmids.length === 0) return [];

  // 2. Summary — get titles, authors, journal, date
  const summaryUrl =
    `${BASE}/esummary.fcgi?db=pubmed&retmode=json` +
    `&id=${pmids.join(',')}` +
    `&tool=${TOOL}&email=${EMAIL}`;

  const summaryRes = await fetch(summaryUrl);
  if (!summaryRes.ok) throw new Error(`PubMed summary HTTP ${summaryRes.status}`);
  const summaryData = await summaryRes.json();
  const results = summaryData?.result ?? {};

  return pmids
    .filter((id) => results[id])
    .map((id) => {
      const r = results[id];
      const authors: string[] =
        (r.authors as Array<{ name: string }> | undefined)?.map((a) => a.name) ?? [];
      return {
        pmid: id,
        title: (r.title as string) || 'Untitled',
        authors: authors.slice(0, 3).join(', ') + (authors.length > 3 ? ' et al.' : ''),
        journal: (r.fulljournalname as string) || (r.source as string) || '',
        pubDate: (r.pubdate as string) || '',
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      };
    });
}

/**
 * Identify Key Opinion Leaders by counting author frequency across the top
 * PubMed results for a given query.
 */
export async function findKOLs(query: string, maxArticles = 40): Promise<KOLEntry[]> {
  const searchUrl =
    `${BASE}/esearch.fcgi?db=pubmed&retmode=json&retmax=${maxArticles}` +
    `&term=${encodeURIComponent(query)}` +
    `&tool=${TOOL}&email=${EMAIL}`;

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`PubMed KOL search HTTP ${searchRes.status}`);
  const searchData = await searchRes.json();
  const pmids: string[] = searchData?.esearchresult?.idlist ?? [];
  if (pmids.length === 0) return [];

  const summaryUrl =
    `${BASE}/esummary.fcgi?db=pubmed&retmode=json` +
    `&id=${pmids.join(',')}` +
    `&tool=${TOOL}&email=${EMAIL}`;

  const summaryRes = await fetch(summaryUrl);
  if (!summaryRes.ok) throw new Error(`PubMed KOL summary HTTP ${summaryRes.status}`);
  const summaryData = await summaryRes.json();
  const results = summaryData?.result ?? {};

  const authorMap = new Map<string, { count: number; pmid: string }>();
  for (const pmid of pmids) {
    const r = results[pmid];
    if (!r) continue;
    const authors: Array<{ name: string }> =
      (r.authors as Array<{ name: string }>) ?? [];
    for (const author of authors) {
      if (!author.name) continue;
      const existing = authorMap.get(author.name);
      if (existing) {
        existing.count++;
      } else {
        authorMap.set(author.name, { count: 1, pmid });
      }
    }
  }

  return Array.from(authorMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 12)
    .map(([name, { count, pmid }]) => ({ name, count, samplePmid: pmid }));
}
