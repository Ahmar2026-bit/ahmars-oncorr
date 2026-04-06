import { useState, useEffect } from 'react';
import { Users, Award, Search, ExternalLink, Loader2, DollarSign, BookOpen } from 'lucide-react';
import { findKOLs, type KOLEntry } from '../services/pubmedService';
import { searchNIHGrants, type NIHGrant } from '../services/nihService';

export default function InvestigatorRegistry({
  geneA,
  geneB,
}: {
  geneA: string;
  geneB: string;
  cancerType: string;
}) {
  const [query, setQuery] = useState('');
  const [kols, setKols] = useState<KOLEntry[]>([]);
  const [grants, setGrants] = useState<NIHGrant[]>([]);
  const [loadingKols, setLoadingKols] = useState(false);
  const [loadingGrants, setLoadingGrants] = useState(false);
  const [errorKols, setErrorKols] = useState('');
  const [errorGrants, setErrorGrants] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (geneA && geneB) {
      const q = `${geneA} ${geneB} cancer`;
      setQuery(q);
      runSearch(q);
    } else if (geneA) {
      const q = `${geneA} cancer`;
      setQuery(q);
      runSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geneA, geneB]);

  function runSearch(q: string) {
    if (!q.trim()) return;
    setSearched(true);
    setKols([]);
    setGrants([]);
    setErrorKols('');
    setErrorGrants('');

    setLoadingKols(true);
    findKOLs(q + ' oncology', 40)
      .then(setKols)
      .catch((e: unknown) => setErrorKols(String(e)))
      .finally(() => setLoadingKols(false));

    setLoadingGrants(true);
    searchNIHGrants(q)
      .then(setGrants)
      .catch((e: unknown) => setErrorGrants(String(e)))
      .finally(() => setLoadingGrants(false));
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div>
        <h2 className="font-semibold text-gray-800">Investigator Registry</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Key Opinion Leaders (PubMed author frequency) &amp; active NIH grants for your gene axis
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="e.g. TP53 BRCA1 breast cancer"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch(query)}
          />
        </div>
        <button
          onClick={() => runSearch(query)}
          disabled={!query.trim() || (loadingKols && loadingGrants)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
        >
          {loadingKols || loadingGrants ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Search size={14} />
          )}
          Search
        </button>
      </div>

      {/* Two-column results */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* KOLs column */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100">
            <Users size={14} className="text-brand-500" />
            <span className="text-sm font-semibold text-gray-700">Key Opinion Leaders</span>
            {kols.length > 0 && (
              <span className="ml-auto text-xs text-gray-400">{kols.length} researchers</span>
            )}
          </div>

          {loadingKols && (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-4">
              <Loader2 size={12} className="animate-spin" /> Analysing PubMed authors…
            </div>
          )}
          {errorKols && (
            <p className="text-xs text-red-500 bg-red-50 p-2 rounded">{errorKols}</p>
          )}
          {!loadingKols && searched && kols.length === 0 && !errorKols && (
            <p className="text-xs text-gray-400 text-center py-4">No authors found.</p>
          )}
          {!loadingKols && kols.map((kol, i) => (
            <a
              key={kol.name}
              href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(kol.name + '[Author]')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors group"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i < 3
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{kol.name}</p>
                <p className="text-xs text-gray-400">
                  {kol.count} publication{kol.count !== 1 ? 's' : ''}
                </p>
              </div>
              <ExternalLink size={11} className="text-gray-300 group-hover:text-brand-500 flex-shrink-0" />
            </a>
          ))}

          <p className="text-xs text-gray-400 flex items-center gap-1 mt-auto pt-2">
            <BookOpen size={10} /> Source: PubMed / NCBI E-utilities
          </p>
        </div>

        {/* NIH Grants column */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100">
            <Award size={14} className="text-green-500" />
            <span className="text-sm font-semibold text-gray-700">Active NIH Grants</span>
            {grants.length > 0 && (
              <span className="ml-auto text-xs text-gray-400">{grants.length} grants</span>
            )}
          </div>

          {loadingGrants && (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-4">
              <Loader2 size={12} className="animate-spin" /> Querying NIH RePORTER…
            </div>
          )}
          {errorGrants && (
            <p className="text-xs text-red-500 bg-red-50 p-2 rounded">{errorGrants}</p>
          )}
          {!loadingGrants && searched && grants.length === 0 && !errorGrants && (
            <p className="text-xs text-gray-400 text-center py-4">No grants found.</p>
          )}
          {!loadingGrants && grants.map((grant) => (
            <a
              key={grant.applId}
              href={grant.projectUrl}
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors group"
            >
              <p className="text-sm font-medium text-gray-800 leading-snug mb-1 group-hover:text-green-700 line-clamp-2">
                {grant.title}
              </p>
              {grant.piNames.length > 0 && (
                <p className="text-xs text-gray-500 mb-0.5">
                  PI: {grant.piNames.slice(0, 2).join(', ')}
                  {grant.piNames.length > 2 ? ` +${grant.piNames.length - 2}` : ''}
                </p>
              )}
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400 truncate max-w-[60%]">
                  {grant.organization}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {grant.totalCost > 0 && (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
                      <DollarSign size={10} />
                      {(grant.totalCost / 1000).toFixed(0)}K
                    </span>
                  )}
                  {grant.fiscalYear > 0 && (
                    <span className="text-xs text-gray-400">FY{grant.fiscalYear}</span>
                  )}
                  <ExternalLink size={11} className="text-gray-300 group-hover:text-green-500" />
                </div>
              </div>
            </a>
          ))}

          <p className="text-xs text-gray-400 flex items-center gap-1 mt-auto pt-2">
            <Award size={10} /> Source: NIH RePORTER API (api.reporter.nih.gov)
          </p>
        </div>
      </div>

      {!searched && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Users size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Enter a gene pair or topic and click Search</p>
            <p className="text-xs mt-1">
              or set a gene pair in the{' '}
              <span className="font-medium">📈 Correlation</span> tab to auto-populate
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
