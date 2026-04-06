/**
 * NIH RePORTER service — queries active grants via the public RePORTER API.
 * Docs: https://api.reporter.nih.gov/
 * No API key required.
 */

export interface NIHGrant {
  applId: string;
  title: string;
  piNames: string[];
  organization: string;
  totalCost: number;
  fiscalYear: number;
  projectUrl: string;
}

const BASE = 'https://api.reporter.nih.gov/v2';

export async function searchNIHGrants(query: string, maxResults = 8): Promise<NIHGrant[]> {
  const terms = query
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const res = await fetch(`${BASE}/projects/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      criteria: {
        terms,
        include_active_projects: true,
      },
      offset: 0,
      limit: maxResults,
      sort_field: 'project_start_date',
      sort_order: 'desc',
    }),
  });

  if (!res.ok) throw new Error(`NIH RePORTER HTTP ${res.status}`);
  const data = await res.json();

  return ((data?.results ?? []) as Record<string, unknown>[]).map((r) => ({
    applId: String(r.appl_id ?? ''),
    title: (r.project_title as string) || 'Untitled',
    piNames: (
      (r.principal_investigators as Array<{ full_name: string }>) ?? []
    ).map((pi) => pi.full_name),
    organization:
      ((r.organization as Record<string, unknown>)?.org_name as string) || '',
    totalCost: (r.total_cost as number) ?? 0,
    fiscalYear: (r.fiscal_year as number) ?? 0,
    projectUrl: r.appl_id
      ? `https://reporter.nih.gov/project-details/${r.appl_id}`
      : 'https://reporter.nih.gov',
  }));
}
