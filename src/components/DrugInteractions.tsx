import { useState } from 'react';
import { Search, Pill, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { getDrugInteractions, type DrugInteraction } from '../services/dgidbService';

function interactionBadge(types: string[]): string {
  if (types.length === 0) return 'bg-gray-100 text-gray-600';
  const t = types[0].toLowerCase();
  if (t.includes('inhibitor') || t.includes('antagonist')) return 'bg-red-100 text-red-700';
  if (t.includes('activator') || t.includes('agonist')) return 'bg-green-100 text-green-700';
  if (t.includes('inducer')) return 'bg-blue-100 text-blue-700';
  return 'bg-purple-100 text-purple-700';
}

export default function DrugInteractions({ geneA }: { geneA: string }) {
  const [gene, setGene] = useState(geneA || '');
  const [drugs, setDrugs] = useState<DrugInteraction[]>([]);
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
      const results = await getDrugInteractions(g);
      setDrugs(results);
    } catch (e) {
      setError('DGIdb query failed. Please try again.');
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
            placeholder="Gene symbol, e.g. EGFR"
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
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Pill size={14} />}
          Search
        </button>
      </div>

      {/* Attribution */}
      <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
        <Pill size={11} />
        Powered by{' '}
        <a
          href="https://dgidb.org"
          target="_blank"
          rel="noreferrer"
          className="text-brand-500 hover:underline"
        >
          DGIdb — Drug Gene Interaction Database
        </a>{' '}
        — free API
      </p>

      <div className="flex-1 overflow-y-auto space-y-2">
        {error && (
          <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </p>
        )}
        {!loading && searched && drugs.length === 0 && !error && (
          <p className="text-sm text-gray-500 text-center mt-8">
            No drug interactions found for <strong>{gene}</strong> in DGIdb.
          </p>
        )}
        {!searched && !loading && (
          <div className="text-center text-gray-400 mt-8">
            <Pill size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Search DGIdb for drugs targeting a gene of interest.</p>
            <p className="text-xs mt-1">Over 40,000 drug-gene interactions curated from 30+ sources.</p>
          </div>
        )}

        {drugs.map((d, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-sm text-gray-900">{d.drugName}</span>
                {d.approved && (
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                    FDA Approved
                  </span>
                )}
                {d.interactionTypes.length > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${interactionBadge(d.interactionTypes)}`}>
                    {d.interactionTypes.join(', ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Sources: {d.sources.slice(0, 3).join(', ') || '—'}
                {d.sources.length > 3 && ` +${d.sources.length - 3} more`}
              </p>
              {d.pmids.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {d.pmids.length} publication{d.pmids.length !== 1 ? 's' : ''}
                  {d.pmids.slice(0, 3).map((pmid) => (
                    <a
                      key={pmid}
                      href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 text-brand-500 hover:underline"
                    >
                      PMID:{pmid}
                    </a>
                  ))}
                </p>
              )}
            </div>
            {d.drugChemblId && (
              <a
                href={`https://www.ebi.ac.uk/chembl/compound_report_card/${d.drugChemblId}/`}
                target="_blank"
                rel="noreferrer"
                title="View in ChEMBL"
                className="text-gray-300 hover:text-brand-500 flex-shrink-0 mt-0.5"
              >
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
