import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { GitBranch, Loader2, AlertCircle, Plus, X } from 'lucide-react';
import { enrichPathways, type PathwayResult } from '../services/enrichrService';

function scoreColor(score: number): string {
  if (score >= 300) return '#16a34a';
  if (score >= 150) return '#d97706';
  return '#0ea5e9';
}

export default function PathwayEnrichment({
  geneA,
  geneB,
}: {
  geneA: string;
  geneB: string;
}) {
  const defaultGenes = [geneA, geneB].filter(Boolean);
  const [geneInput, setGeneInput] = useState('');
  const [genes, setGenes] = useState<string[]>(defaultGenes);
  const [results, setResults] = useState<PathwayResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  function addGene() {
    const g = geneInput.trim().toUpperCase();
    if (!g || genes.includes(g)) { setGeneInput(''); return; }
    setGenes((prev) => [...prev, g]);
    setGeneInput('');
  }

  function removeGene(g: string) {
    setGenes((prev) => prev.filter((x) => x !== g));
  }

  async function analyse() {
    if (genes.length === 0 || loading) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const r = await enrichPathways(genes);
      setResults(r);
    } catch (e) {
      setError('Enrichr pathway analysis failed. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const chartData = results
    .slice(0, 10)
    .map((r) => ({ name: r.pathway.replace(/ - Homo sapiens \(human\)$/, ''), score: +r.combinedScore.toFixed(1), adj: +r.adjustedPValue.toExponential(2) }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col h-full">
      {/* Gene pill input */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">Gene Set</label>
        <div className="flex gap-2 flex-wrap items-center border border-gray-300 rounded-lg p-2 min-h-[44px] focus-within:ring-2 focus-within:ring-brand-500 bg-white">
          {genes.map((g) => (
            <span key={g} className="flex items-center gap-1 text-xs font-mono font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
              {g}
              <button onClick={() => removeGene(g)} className="hover:text-red-600">
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            className="flex-1 text-sm font-mono uppercase min-w-[80px] outline-none bg-transparent"
            placeholder="Add gene…"
            value={geneInput}
            onChange={(e) => setGeneInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addGene(); }
            }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">Press Enter or comma to add genes</p>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={addGene}
          disabled={!geneInput.trim()}
          className="flex items-center gap-1 px-3 py-1.5 border border-brand-300 text-brand-600 hover:bg-brand-50 disabled:opacity-40 text-sm rounded-lg transition-colors"
        >
          <Plus size={13} /> Add
        </button>
        <button
          onClick={analyse}
          disabled={genes.length === 0 || loading}
          className="flex items-center gap-2 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <GitBranch size={14} />}
          {loading ? 'Enriching…' : 'Analyse Pathways'}
        </button>
      </div>

      {/* Attribution */}
      <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
        <GitBranch size={11} />
        Powered by{' '}
        <a
          href="https://maayanlab.cloud/Enrichr/"
          target="_blank"
          rel="noreferrer"
          className="text-brand-500 hover:underline"
        >
          Enrichr (KEGG 2021 Human)
        </a>{' '}
        — free API
      </p>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg flex items-center gap-2 mb-3">
          <AlertCircle size={14} /> {error}
        </p>
      )}

      {!searched && !loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <GitBranch size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Add genes and run pathway enrichment analysis.</p>
            <p className="text-xs mt-1">Uses Enrichr KEGG 2021 Human pathway library</p>
          </div>
        </div>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <p className="text-sm text-gray-500 text-center mt-8">No significant pathways found.</p>
      )}

      {!loading && results.length > 0 && (
        <>
          <p className="text-xs font-medium text-gray-600 mb-2">
            Top KEGG pathways — combined enrichment score
          </p>
          <div className="flex-1 min-h-0" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 50, bottom: 0, left: 180 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 9 }}
                  width={175}
                />
                <Tooltip
                  formatter={(v: unknown, _name: unknown, props: { payload?: { adj?: string } }) => [
                    `${v} (adj. p = ${props.payload?.adj ?? ''})`,
                    'Combined Score',
                  ]}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={scoreColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
