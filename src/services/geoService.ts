/**
 * GEO (Gene Expression Omnibus) dataset search.
 * Uses NCBI E-utilities — free, no API key required.
 * Docs: https://www.ncbi.nlm.nih.gov/geo/info/geo_paccess.html
 */

export interface GEODataset {
  gse: string;
  title: string;
  summary: string;
  organism: string;
  type: string;
  samples: string;
  pubDate: string;
  url: string;
}

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const TOOL = 'OncoCorr';
const EMAIL = 'oncorr@example.com';

export async function searchGEO(query: string, maxResults = 8): Promise<GEODataset[]> {
  // 1. Search GDS (GEO DataSets) database
  const searchUrl =
    `${BASE}/esearch.fcgi?db=gds&retmode=json&retmax=${maxResults}` +
    `&term=${encodeURIComponent(query + ' [Title]')}` +
    `&tool=${TOOL}&email=${EMAIL}`;

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`GEO search HTTP ${searchRes.status}`);
  const searchData = await searchRes.json();
  const ids: string[] = searchData?.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];

  // 2. Summary
  const summaryUrl =
    `${BASE}/esummary.fcgi?db=gds&retmode=json` +
    `&id=${ids.join(',')}` +
    `&tool=${TOOL}&email=${EMAIL}`;

  const summaryRes = await fetch(summaryUrl);
  if (!summaryRes.ok) throw new Error(`GEO summary HTTP ${summaryRes.status}`);
  const summaryData = await summaryRes.json();
  const result = summaryData?.result ?? {};

  return ids
    .filter((id) => result[id])
    .map((id) => {
      const r = result[id];
      const accession: string = (r.accession as string) || id;
      const isGSE = accession.startsWith('GSE');
      return {
        gse: accession,
        title: (r.title as string) || 'Untitled',
        summary: ((r.summary as string) || '').slice(0, 200) + '…',
        organism: (r.taxon as string) || (r.organism as string) || '',
        type: (r.gdstype as string) || (r.entrytype as string) || '',
        samples: r.n_samples != null ? String(r.n_samples) : '',
        pubDate: (r.pdat as string) || '',
        url: isGSE
          ? `https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=${accession}`
          : `https://www.ncbi.nlm.nih.gov/sites/GDSbrowser?acc=${accession}`,
      };
    });
}
