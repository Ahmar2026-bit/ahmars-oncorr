import { useState } from 'react';
import { Search, FlaskConical, Loader2, ExternalLink, Calendar, Activity } from 'lucide-react';
import { getCancerById } from '../data/cancerTypes';

interface TrialStudy {
  nctId: string;
  title: string;
  status: string;
  phase: string;
  conditions: string[];
  interventions: string[];
  sponsor: string;
  startDate: string;
  url: string;
}

async function searchClinicalTrials(query: string): Promise<TrialStudy[]> {
  const url =
    `https://clinicaltrials.gov/api/v2/studies` +
    `?query.term=${encodeURIComponent(query)}` +
    `&pageSize=15&format=json` +
    `&fields=NCTId,BriefTitle,OverallStatus,Phase,Condition,InterventionName,LeadSponsorName,StartDate`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`ClinicalTrials.gov HTTP ${res.status}`);
  const data = await res.json();

  return (data?.studies ?? []).map((s: Record<string, unknown>) => {
    const proto = s.protocolSection as Record<string, unknown> | undefined;
    const id = proto?.identificationModule as Record<string, unknown> | undefined;
    const status = proto?.statusModule as Record<string, unknown> | undefined;
    const design = proto?.designModule as Record<string, unknown> | undefined;
    const cond = proto?.conditionsModule as Record<string, unknown> | undefined;
    const interv = proto?.interventionsModule as Record<string, unknown> | undefined;
    const sponsor = proto?.sponsorCollaboratorsModule as Record<string, unknown> | undefined;

    const nctId = String(id?.nctId ?? '');
    const phases: string[] = Array.isArray(design?.phases) ? (design.phases as string[]) : [];

    const interventionNames: string[] = Array.isArray(interv?.interventions)
      ? (interv.interventions as Record<string, unknown>[])
          .map((i) => String(i.interventionName ?? ''))
          .filter(Boolean)
      : [];

    return {
      nctId,
      title: String(id?.briefTitle ?? ''),
      status: String(status?.overallStatus ?? ''),
      phase: phases.join(', ') || 'N/A',
      conditions: Array.isArray(cond?.conditions) ? (cond.conditions as string[]) : [],
      interventions: interventionNames.slice(0, 3),
      sponsor: String((sponsor?.leadSponsor as Record<string, unknown> | undefined)?.name ?? ''),
      startDate: String(status?.startDateStruct
        ? ((status.startDateStruct as Record<string, unknown>).date ?? '')
        : ''),
      url: `https://clinicaltrials.gov/study/${nctId}`,
    };
  });
}

function statusBadge(status: string) {
  const s = status.toLowerCase().replace(/_/g, ' ');
  if (s.includes('recruiting'))
    return 'bg-green-100 text-green-700 border-green-200';
  if (s.includes('completed'))
    return 'bg-blue-100 text-blue-700 border-blue-200';
  if (s.includes('active'))
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (s.includes('terminated') || s.includes('withdrawn'))
    return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

function phaseBadge(phase: string) {
  const p = phase.toUpperCase();
  if (p.includes('3') || p.includes('III')) return 'bg-purple-100 text-purple-700';
  if (p.includes('2') || p.includes('II')) return 'bg-brand-100 text-brand-700';
  if (p.includes('1') || p.includes('I')) return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-500';
}

export default function ClinicalTrials({
  geneA,
  geneB,
  cancerType,
}: {
  geneA: string;
  geneB: string;
  cancerType: string;
}) {
  const cancer = getCancerById(cancerType);
  const defaultQuery = [geneA, geneB].filter(Boolean).join(' ') + (cancer.shortName ? ` ${cancer.shortName}` : '');
  const [query, setQuery] = useState(defaultQuery);
  const [trials, setTrials] = useState<TrialStudy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function search() {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const results = await searchClinicalTrials(q);
      setTrials(results);
    } catch (e) {
      setError('Clinical trials search failed. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Activity size={15} className="text-brand-600" />
          Clinical Trials
        </h2>
        <p className="text-xs text-gray-500">
          Live search of ClinicalTrials.gov — find ongoing and completed trials for your gene targets and cancer type.
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="e.g. EGFR lung cancer, BRCA1 PARP inhibitor…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
        </div>
        <button
          onClick={search}
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Search
        </button>
      </div>

      {/* Attribution */}
      <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
        <Activity size={11} />
        Powered by{' '}
        <a
          href="https://clinicaltrials.gov"
          target="_blank"
          rel="noreferrer"
          className="text-brand-500 hover:underline"
        >
          ClinicalTrials.gov
        </a>{' '}
        — free API, no key required
      </p>

      {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg mb-3">{error}</p>}

      {/* Results */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {!loading && searched && trials.length === 0 && !error && (
          <p className="text-sm text-gray-500 text-center mt-8">No trials found. Try different keywords.</p>
        )}

        {!searched && !loading && (
          <div className="text-center text-gray-400 mt-8">
            <FlaskConical size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Search clinical trials by gene, drug, or cancer type.</p>
            <p className="text-xs mt-1">Access 400,000+ studies registered globally.</p>
          </div>
        )}

        {trials.map((trial) => (
          <a
            key={trial.nctId}
            href={trial.url}
            target="_blank"
            rel="noreferrer"
            className="block p-4 rounded-xl border border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-colors group"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-brand-600 bg-brand-100 px-1.5 py-0.5 rounded">
                  {trial.nctId}
                </span>
                {trial.phase && trial.phase !== 'N/A' && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${phaseBadge(trial.phase)}`}>
                    {trial.phase}
                  </span>
                )}
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded border ${statusBadge(trial.status)}`}
                >
                  {trial.status.replace(/_/g, ' ')}
                </span>
              </div>
              <ExternalLink
                size={12}
                className="text-gray-300 group-hover:text-brand-500 flex-shrink-0 mt-0.5"
              />
            </div>

            <h3 className="text-sm font-medium text-gray-900 group-hover:text-brand-700 leading-snug mb-2">
              {trial.title}
            </h3>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              {trial.conditions.length > 0 && (
                <span className="flex items-center gap-1">
                  <FlaskConical size={10} />
                  {trial.conditions.slice(0, 2).join(', ')}
                </span>
              )}
              {trial.interventions.length > 0 && (
                <span className="flex items-center gap-1">
                  <Activity size={10} />
                  {trial.interventions.join(', ')}
                </span>
              )}
              {trial.startDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={10} />
                  {trial.startDate}
                </span>
              )}
              {trial.sponsor && (
                <span className="text-gray-400 truncate max-w-xs">{trial.sponsor}</span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
