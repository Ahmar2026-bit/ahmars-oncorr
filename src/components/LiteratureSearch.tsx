import { useState } from 'react';
import { Search, BookOpen, ExternalLink, Loader2 } from 'lucide-react';
import { searchPubMed, type PubMedArticle } from '../services/pubmedService';

export default function LiteratureSearch({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PubMedArticle[]>([]);
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
      const articles = await searchPubMed(q + ' cancer oncology');
      setResults(articles);
    } catch (e) {
      setError('PubMed search failed. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') search();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="Search gene, pathway, drug, cancer type…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
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
        <BookOpen size={11} />
        Powered by{' '}
        <a
          href="https://pubmed.ncbi.nlm.nih.gov"
          target="_blank"
          rel="noreferrer"
          className="text-brand-500 hover:underline"
        >
          PubMed / NCBI E-utilities
        </a>{' '}
        — free, no API key required
      </p>

      {/* Results */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}
        {!loading && searched && results.length === 0 && !error && (
          <p className="text-sm text-gray-500 text-center mt-8">No results found.</p>
        )}
        {!searched && !loading && (
          <div className="text-center text-gray-400 mt-8">
            <BookOpen size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Search PubMed for oncology literature.</p>
          </div>
        )}
        {results.map((article) => (
          <a
            key={article.pmid}
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="block p-4 rounded-xl border border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-colors group"
          >
            <h3 className="text-sm font-medium text-gray-900 group-hover:text-brand-700 leading-snug mb-1">
              {article.title}
            </h3>
            <p className="text-xs text-gray-500 mb-0.5">{article.authors}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {article.journal}
                {article.pubDate ? ` · ${article.pubDate}` : ''}
              </span>
              <ExternalLink size={12} className="text-gray-300 group-hover:text-brand-500" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
