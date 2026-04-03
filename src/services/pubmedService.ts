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
