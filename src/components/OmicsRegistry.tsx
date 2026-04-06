import { useState, useEffect, useRef } from 'react';
import { Search, Database, ExternalLink, Loader2, FlaskConical } from 'lucide-react';
import { searchGEO, type GEODataset } from '../services/geoService';

const ASSAY_TYPES = [
  {
    id: 'rnaseq' as const,
    label: 'RNA-seq',
    query: 'RNA-seq expression profiling',
    badge: 'bg-blue-100 text-blue-700',
    activeBadge: 'bg-blue-600 text-white',
  },
  {
    id: 'chipseq' as const,
    label: 'ChIP-seq',
    query: 'ChIP-seq chromatin immunoprecipitation',
    badge: 'bg-purple-100 text-purple-700',
    activeBadge: 'bg-purple-600 text-white',
  },
  {
    id: 'scrnaseq' as const,
    label: 'scRNA-seq',
    query: 'single cell RNA-seq scRNA-seq single-cell',
    badge: 'bg-orange-100 text-orange-700',
    activeBadge: 'bg-orange-500 text-white',
  },
  {
    id: 'atac' as const,
    label: 'ATAC-seq',
    query: 'ATAC-seq chromatin accessibility open chromatin',
    badge: 'bg-pink-100 text-pink-700',
    activeBadge: 'bg-pink-500 text-white',
  },
  {
    id: 'methylation' as const,
    label: 'Methylation',
    query: 'DNA methylation epigenomics bisulfite',
    badge: 'bg-green-100 text-green-700',
    activeBadge: 'bg-green-600 text-white',
  },
] as const;

type AssayId = (typeof ASSAY_TYPES)[number]['id'];

export default function OmicsRegistry({
  geneA,
  geneB,
}: {
  geneA: string;
  geneB: string;
  cancerType: string;
}) {
  const [activeAssay, setActiveAssay] = useState<AssayId>('rnaseq');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GEODataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const lastQueryRef = useRef('');

  // Auto-search when gene pair is set
  useEffect(() => {
    if (geneA) {
      const base = geneB ? `${geneA} ${geneB}` : geneA;
      const q = `${base} cancer`;
      setQuery(q);
      lastQueryRef.current = q;
      runSearch(q, activeAssay);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geneA, geneB]);

  // Re-run when assay tab changes (only if we've already searched)
  useEffect(() => {
    if (searched && lastQueryRef.current) {
      runSearch(lastQueryRef.current, activeAssay);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAssay]);

  async function runSearch(q: string, assay: AssayId) {
    if (!q.trim()) return;
    const assayConfig = ASSAY_TYPES.find((a) => a.id === assay)!;
    setLoading(true);
    setError('');
    setSearched(true);
    lastQueryRef.current = q;
    try {
      const datasets = await searchGEO(`${q} ${assayConfig.query}`);
      setResults(datasets);
    } catch (e) {
      setError('GEO search failed. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    const q = query.trim();
    if (q) runSearch(q, activeAssay);
  }

  const currentAssay = ASSAY_TYPES.find((a) => a.id === activeAssay)!;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header */}
      <div>
        <h2 className="font-semibold text-gray-800">Multi-Omics Sequencing Registry</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Curated public datasets from NCBI GEO — filter by assay type
        </p>
      </div>

      {/* Assay type pill tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {ASSAY_TYPES.map((assay) => (
          <button
            key={assay.id}
            onClick={() => setActiveAssay(assay.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeAssay === assay.id ? assay.activeBadge : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {assay.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="e.g. TP53 BRCA1 cancer"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Search
        </button>
      </div>

      {/* Attribution */}
      <p className="text-xs text-gray-400 flex items-center gap-1">
        <Database size={11} />
        Powered by{' '}
        <a
          href="https://www.ncbi.nlm.nih.gov/geo/"
          target="_blank"
          rel="noreferrer"
          className="text-brand-500 hover:underline"
        >
          NCBI GEO
        </a>
        {' — currently showing '}
        <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium ${currentAssay.badge}`}>
          {currentAssay.label}
        </span>
        {' datasets'}
      </p>

      {/* Results */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {error && (
          <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>
        )}
        {loading && (
          <div className="text-center py-8">
            <Loader2 size={24} className="mx-auto mb-2 animate-spin text-brand-400" />
            <p className="text-sm text-gray-400">
              Searching GEO for {currentAssay.label} datasets…
            </p>
          </div>
        )}
        {!loading && searched && results.length === 0 && !error && (
          <p className="text-sm text-gray-500 text-center mt-8">
            No {currentAssay.label} datasets found for this query.
          </p>
        )}
        {!searched && !loading && (
          <div className="text-center text-gray-400 mt-8">
            <FlaskConical size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Browse public omics datasets for your gene pair.</p>
            <p className="text-xs mt-1">Over 200,000 datasets from researchers worldwide.</p>
          </div>
        )}
        {!loading &&
          results.map((ds) => (
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
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${currentAssay.badge}`}
                    >
                      {currentAssay.label}
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
                <ExternalLink
                  size={12}
                  className="text-gray-300 group-hover:text-brand-500 flex-shrink-0 mt-1"
                />
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
