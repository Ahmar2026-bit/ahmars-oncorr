import { useState } from 'react';
import { Pill, Loader2, ExternalLink, AlertCircle, CheckCircle, Database } from 'lucide-react';
import { askAI } from '../services/aiService';
import { getCancerById } from '../data/cancerTypes';
import { renderMarkdown } from '../utils/markdown';
import ProviderBadge from './ProviderBadge';
import type { AIProvider } from '../services/aiService';

interface DrugInteraction {
  drugName: string;
  drugConceptId: string;
  interactionTypes: string[];
  sources: string[];
  pmids: string[];
}

interface DGIdbResult {
  geneName: string;
  interactions: DrugInteraction[];
}

async function queryDGIdb(gene: string): Promise<DGIdbResult | null> {
  const res = await fetch(
    `https://dgidb.org/api/v2/interactions.json?genes=${encodeURIComponent(gene)}`
  );
  if (!res.ok) throw new Error(`DGIdb HTTP ${res.status}`);
  const data = await res.json();
  const match = data?.matchedTerms?.[0];
  if (!match) return null;
  return {
    geneName: match.geneName || gene,
    interactions: (match.interactions || []) as DrugInteraction[],
  };
}

function interactionBadgeColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('inhibitor')) return 'bg-red-100 text-red-700';
  if (t.includes('activator') || t.includes('agonist')) return 'bg-green-100 text-green-700';
  if (t.includes('antagonist') || t.includes('blocker')) return 'bg-orange-100 text-orange-700';
  return 'bg-gray-100 text-gray-600';
}

export default function DrugPredictor({
  geneA,
  geneB,
  cancerType,
}: {
  geneA: string;
  geneB: string;
  cancerType: string;
}) {
  const cancer = getCancerById(cancerType);
  const [gene, setGene] = useState(geneA || '');
  const [dgiResults, setDgiResults] = useState<DGIdbResult | null>(null);
  const [aiText, setAiText] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>('demo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function predict() {
    const g = gene.trim().toUpperCase();
    if (!g || loading) return;
    setLoading(true);
    setError('');
    setSearched(true);
    setDgiResults(null);
    setAiText('');

    try {
      let dgi: DGIdbResult | null = null;
      try {
        dgi = await queryDGIdb(g);
      } catch {
        // DGIdb CORS may fail in some environments — continue to AI fallback
      }
      setDgiResults(dgi);

      const topDrugs = dgi?.interactions
        .slice(0, 10)
        .map((i) => `${i.drugName} (${i.interactionTypes.join(', ') || 'unknown'})`)
        .join('; ') || 'none retrieved from DGIdb';

      const prompt =
        `Gene target: ${g}` +
        (geneB ? ` (paired with ${geneB.toUpperCase()})` : '') +
        ` in ${cancer.label}.\n` +
        `DGIdb interactions retrieved: ${topDrugs}\n\n` +
        `Please provide a drug prediction report:\n\n` +
        `## Known Targeted Therapies\n` +
        `List FDA-approved or late-stage drugs targeting ${g}, their mechanism, and clinical indications.\n\n` +
        `## Predicted Drug Sensitivities\n` +
        `Based on the gene's pathway role, predict additional drug classes that may be effective.\n\n` +
        `## Resistance Mechanisms\n` +
        `Common resistance pathways and how to overcome them.\n\n` +
        `## Combination Strategies\n` +
        `Rational drug combinations involving ${g}` +
        (geneB ? ` and ${geneB.toUpperCase()}` : '') +
        ` in ${cancer.shortName}.\n\n` +
        `## Clinical Evidence\n` +
        `Key clinical trials and response rates.\n\n` +
        `Use markdown formatting and bold key drug names.`;

      const response = await askAI(prompt);
      setAiText(response.text);
      setAiProvider(response.provider);
    } catch (e) {
      setError('Drug prediction failed. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const shownDrugs = dgiResults?.interactions.slice(0, 15) ?? [];

  return (
    <div className="flex flex-col h-full space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Pill size={15} className="text-brand-600" />
          Drug Predictor
        </h2>
        <p className="text-xs text-gray-500">
          Drug-gene interactions from DGIdb + AI-powered therapy predictions, resistance mechanisms, and combination strategies.
        </p>
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Target Gene</label>
          <input
            className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. EGFR"
            value={gene}
            onChange={(e) => setGene(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && predict()}
          />
        </div>
        <button
          onClick={predict}
          disabled={loading || !gene.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Pill size={14} />}
          {loading ? 'Predicting…' : 'Predict Drugs'}
        </button>
        {gene.trim() && (
          <a
            href={`https://dgidb.org/genes/${encodeURIComponent(gene.trim().toUpperCase())}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-brand-500 hover:underline ml-auto"
          >
            Open DGIdb <ExternalLink size={11} />
          </a>
        )}
      </div>

      {/* Attribution */}
      <p className="text-xs text-gray-400 flex items-center gap-1">
        <Database size={11} />
        Drug interactions from{' '}
        <a href="https://dgidb.org" target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">
          DGIdb v4
        </a>
        {' '}— free API, no key required
      </p>

      {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}

      <div className="flex-1 overflow-y-auto space-y-4">
        {/* DGIdb Results */}
        {searched && !loading && (
          <>
            {shownDrugs.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                  <CheckCircle size={12} className="text-green-500" />
                  DGIdb — {dgiResults!.interactions.length} drug interactions found for{' '}
                  <span className="font-mono text-brand-600">{dgiResults!.geneName}</span>
                </p>
                <div className="space-y-1.5">
                  {shownDrugs.map((drug, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors"
                    >
                      <Pill size={13} className="text-brand-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-800 capitalize">
                            {drug.drugName.toLowerCase()}
                          </span>
                          {drug.interactionTypes.map((t, j) => (
                            <span
                              key={j}
                              className={`text-xs px-1.5 py-0.5 rounded font-medium ${interactionBadgeColor(t)}`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        {drug.sources.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Sources: {drug.sources.slice(0, 3).join(', ')}
                            {drug.pmids.length > 0 && (
                              <a
                                href={`https://pubmed.ncbi.nlm.nih.gov/${drug.pmids[0]}`}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-1 text-brand-500 hover:underline"
                              >
                                PubMed
                              </a>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {dgiResults!.interactions.length > 15 && (
                    <p className="text-xs text-gray-400 text-center pt-1">
                      +{dgiResults!.interactions.length - 15} more on{' '}
                      <a
                        href={`https://dgidb.org/genes/${encodeURIComponent(gene.trim().toUpperCase())}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-500 hover:underline"
                      >
                        DGIdb
                      </a>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              searched && !loading && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  <AlertCircle size={13} />
                  No DGIdb entries found. Showing AI-only predictions below.
                </div>
              )
            )}
          </>
        )}

        {/* AI Report */}
        {aiText && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-gray-600">AI Drug Prediction Report</p>
              <ProviderBadge provider={aiProvider} />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(aiText) }} />
            </div>
          </div>
        )}

        {!searched && !loading && (
          <div className="flex-1 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-xl min-h-40">
            <div className="text-center">
              <Pill size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Enter a target gene to predict relevant drugs.</p>
              <p className="text-xs mt-1">Combines DGIdb database with AI-powered clinical insights.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
