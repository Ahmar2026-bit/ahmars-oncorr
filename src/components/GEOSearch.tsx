import { useState } from 'react';
import { Search, Database, ExternalLink, Loader2, FlaskConical } from 'lucide-react';
import { searchGEO, type GEODataset } from '../services/geoService';

export default function GEOSearch({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<GEODataset[]>([]);
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
      const datasets = await searchGEO(q);
      setResults(datasets);
    } catch (e) {
      setError('GEO search failed. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="e.g. BRCA breast cancer RNA-seq, TP53 lung…"
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
        <Database size={11} />
        Powered by{' '}
        <a
          href="https://www.ncbi.nlm.nih.gov/geo/"
          target="_blank"
          rel="noreferrer"
          className="text-brand-500 hover:underline"
        >
          NCBI GEO (Gene Expression Omnibus)
        </a>{' '}
        — free, no API key required
      </p>

      {/* Results */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}
        {!loading && searched && results.length === 0 && !error && (
          <p className="text-sm text-gray-500 text-center mt-8">No datasets found.</p>
        )}
        {!searched && !loading && (
          <div className="text-center text-gray-400 mt-8">
            <FlaskConical size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Search GEO for publicly available omics datasets.</p>
            <p className="text-xs mt-1">Over 200,000 datasets from researchers worldwide.</p>
          </div>
        )}
        {results.map((ds) => (
          <a
            key={ds.gse}
            href={ds.url}
            target="_blank"
            rel="noreferrer"
            className="block p-4 rounded-xl border border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-colors group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs font-bold text-brand-600 bg-brand-100 px-1.5 py-0.5 rounded">
                    {ds.gse}
                  </span>
                  {ds.organism && (
                    <span className="text-xs text-gray-500 italic">{ds.organism}</span>
                  )}
                  {ds.samples && (
                    <span className="text-xs text-gray-400">{ds.samples} samples</span>
                  )}
                </div>
                <h3 className="text-sm font-medium text-gray-900 group-hover:text-brand-700 leading-snug mb-1">
                  {ds.title}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-2">{ds.summary}</p>
              </div>
              <ExternalLink size={12} className="text-gray-300 group-hover:text-brand-500 flex-shrink-0 mt-1" />
            </div>
            {(ds.type || ds.pubDate) && (
              <div className="flex gap-3 mt-1.5">
                {ds.type && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {ds.type}
                  </span>
                )}
                {ds.pubDate && (
                  <span className="text-xs text-gray-400">{ds.pubDate}</span>
                )}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
