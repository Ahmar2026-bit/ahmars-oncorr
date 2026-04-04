import { useState } from 'react';
import { Search, ShieldAlert, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { getClinVarVariants, type ClinVarVariant } from '../services/clinvarService';

function sigColor(sig: string): string {
  const s = sig.toLowerCase();
  if (s.includes('pathogenic') && !s.includes('likely')) return 'text-red-700 bg-red-100 border-red-200';
  if (s.includes('likely pathogenic')) return 'text-orange-700 bg-orange-100 border-orange-200';
  if (s.includes('benign')) return 'text-green-700 bg-green-100 border-green-200';
  if (s.includes('uncertain') || s.includes('vus')) return 'text-yellow-700 bg-yellow-100 border-yellow-200';
  return 'text-gray-700 bg-gray-100 border-gray-200';
}

function reviewIcon(status: string) {
  const s = status.toLowerCase();
  if (s.includes('practice guideline') || s.includes('expert panel')) return '⭐⭐⭐⭐';
  if (s.includes('multiple submitters')) return '⭐⭐';
  if (s.includes('single submitter')) return '⭐';
  return '';
}

export default function MutationPanel({ geneA }: { geneA: string }) {
  const [gene, setGene] = useState(geneA || '');
  const [variants, setVariants] = useState<ClinVarVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function search() {
    const g = gene.trim().toUpperCase();
    if (!g || loading) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const results = await getClinVarVariants(g);
      setVariants(results);
    } catch (e) {
      setError('ClinVar query failed. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Input */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="Gene symbol, e.g. TP53"
            value={gene}
            onChange={(e) => setGene(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
        </div>
        <button
          onClick={search}
          disabled={loading || !gene.trim()}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Search
        </button>
      </div>

      {/* Attribution */}
      <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
        <ShieldAlert size={11} />
        Powered by{' '}
        <a
          href="https://www.ncbi.nlm.nih.gov/clinvar/"
          target="_blank"
          rel="noreferrer"
          className="text-brand-500 hover:underline"
        >
          NCBI ClinVar
        </a>{' '}
        — pathogenic &amp; likely-pathogenic variants, free API
      </p>

      <div className="flex-1 overflow-y-auto space-y-2">
        {error && (
          <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </p>
        )}
        {!loading && searched && variants.length === 0 && !error && (
          <p className="text-sm text-gray-500 text-center mt-8">No pathogenic variants found for <strong>{gene}</strong>.</p>
        )}
        {!searched && !loading && (
          <div className="text-center text-gray-400 mt-8">
            <ShieldAlert size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Search ClinVar for oncogenic mutations in a gene.</p>
          </div>
        )}

        {variants.map((v) => (
          <a
            key={v.uid}
            href={v.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 leading-snug group-hover:text-brand-700">
                {v.title}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded border ${sigColor(v.clinicalSignificance)}`}
                >
                  {v.clinicalSignificance || '—'}
                </span>
                {v.variantType && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {v.variantType}
                  </span>
                )}
                {v.reviewStatus && (
                  <span className="text-xs text-gray-400" title={v.reviewStatus}>
                    {reviewIcon(v.reviewStatus)} {v.reviewStatus}
                  </span>
                )}
              </div>
              {v.lastEvaluated && (
                <p className="text-xs text-gray-400 mt-0.5">Last evaluated: {v.lastEvaluated}</p>
              )}
            </div>
            <ExternalLink size={12} className="text-gray-300 group-hover:text-brand-500 flex-shrink-0 mt-1" />
          </a>
        ))}
      </div>
    </div>
  );
}
