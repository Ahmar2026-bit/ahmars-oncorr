/**
 * ClinVar service — pathogenic/likely-pathogenic variants for a gene.
 * Uses NCBI E-utilities (free, no API key required).
 * Docs: https://www.ncbi.nlm.nih.gov/clinvar/docs/api_http/
 */

export interface ClinVarVariant {
  uid: string;
  title: string;
  clinicalSignificance: string;
  reviewStatus: string;
  lastEvaluated: string;
  variantType: string;
  url: string;
}

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const TOOL = 'OncoCorr';
const EMAIL = 'oncorr@example.com';

interface ClinVarResult {
  title?: string;
  obj_type?: string;
  clinical_significance?: { description?: string; review_status?: string; last_evaluated?: string };
  germline_classification?: { description?: string; review_status?: string; last_evaluated?: string };
  variation_set?: Array<{ variation_name?: string }>;
  last_evaluated?: string;
}

export async function getClinVarVariants(
  gene: string,
  maxResults = 12,
): Promise<ClinVarVariant[]> {
  const term = `${gene}[gene] AND (pathogenic[CLIN_SIG] OR "likely pathogenic"[CLIN_SIG])`;
  const searchUrl =
    `${BASE}/esearch.fcgi?db=clinvar&retmode=json&retmax=${maxResults}` +
    `&term=${encodeURIComponent(term)}&sort=relevance` +
    `&tool=${TOOL}&email=${EMAIL}`;

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`ClinVar search HTTP ${searchRes.status}`);
  const searchData = await searchRes.json() as { esearchresult?: { idlist?: string[] } };
  const ids: string[] = searchData?.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];

  const summaryUrl =
    `${BASE}/esummary.fcgi?db=clinvar&retmode=json` +
    `&id=${ids.join(',')}` +
    `&tool=${TOOL}&email=${EMAIL}`;

  const summaryRes = await fetch(summaryUrl);
  if (!summaryRes.ok) throw new Error(`ClinVar summary HTTP ${summaryRes.status}`);
  const summaryData = await summaryRes.json() as { result?: Record<string, ClinVarResult> };
  const result = summaryData?.result ?? {};

  return ids
    .filter((id) => result[id])
    .map((id) => {
      const r = result[id];
      const sig =
        r.clinical_significance?.description ||
        r.germline_classification?.description ||
        '';
      const review =
        r.clinical_significance?.review_status ||
        r.germline_classification?.review_status ||
        '';
      const lastEval =
        r.clinical_significance?.last_evaluated ||
        r.germline_classification?.last_evaluated ||
        r.last_evaluated ||
        '';
      return {
        uid: id,
        title:
          r.title ||
          r.variation_set?.[0]?.variation_name ||
          `Variant ${id}`,
        clinicalSignificance: sig,
        reviewStatus: review,
        lastEvaluated: lastEval,
        variantType: r.obj_type || '',
        url: `https://www.ncbi.nlm.nih.gov/clinvar/variation/${id}/`,
      };
    });
}
