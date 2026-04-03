import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Network, Loader2, ExternalLink } from 'lucide-react';
import { getInteractionPartners, getPairScore, type StringInteraction } from '../services/stringDbService';

function scoreColor(score: number): string {
  if (score >= 0.7) return '#16a34a';  // green
  if (score >= 0.4) return '#d97706';  // amber
  return '#9ca3af';                     // gray
}

function scoreLabel(score: number): string {
  if (score >= 0.9) return 'Highest';
  if (score >= 0.7) return 'High';
  if (score >= 0.4) return 'Medium';
  return 'Low';
}

export default function ProteinNetwork({
  geneA,
  geneB,
}: {
  geneA: string;
  geneB: string;
}) {
  const [gene, setGene] = useState(geneA || '');
  const [partners, setPartners] = useState<StringInteraction[]>([]);
  const [pairScore, setPairScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function search() {
    const g = gene.trim().toUpperCase();
    if (!g || loading) return;
    setLoading(true);
    setError('');
    setSearched(true);
    setPairScore(null);
    try {
      const [interactors, pair] = await Promise.all([
        getInteractionPartners(g, 12),
        geneB ? getPairScore(g, geneB.toUpperCase()) : Promise.resolve(null),
      ]);
      setPartners(interactors);
      setPairScore(pair);
    } catch (e) {
      setError('STRING DB query failed. Please check the gene symbol and try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const chartData = partners
    .slice(0, 10)
    .map((p) => ({ name: p.geneB, score: Math.round(p.score) }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col h-full">
      {/* Input */}
      <div className="flex gap-2 items-end mb-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Gene / Protein</label>
          <input
            className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. TP53"
            value={gene}
            onChange={(e) => setGene(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
        </div>
        <button
          onClick={search}
          disabled={loading || !gene.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Network size={14} />}
          {loading ? 'Loading…' : 'Get Interactions'}
        </button>
        <a
          href={`https://string-db.org/network/${gene || 'TP53'}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs text-brand-500 hover:underline ml-auto"
        >
          Open in STRING DB <ExternalLink size={11} />
        </a>
      </div>

      {/* Attribution */}
      <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
        <Network size={11} />
        Powered by{' '}
        <a
          href="https://string-db.org"
          target="_blank"
          rel="noreferrer"
          className="text-brand-500 hover:underline"
        >
          STRING DB
        </a>{' '}
        — protein interaction network, free API
      </p>

      {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg mb-3">{error}</p>}

      {/* Pair score */}
      {geneA && geneB && pairScore !== null && (
        <div
          className={`flex items-center gap-3 p-3 rounded-xl border mb-3 ${
            pairScore >= 0.7 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
          }`}
        >
          <Network size={16} className={pairScore >= 0.7 ? 'text-green-600' : 'text-amber-600'} />
          <div>
            <p className="text-sm font-medium text-gray-800">
              {geneA} ↔ {geneB} interaction score
            </p>
            <p className="text-xs text-gray-500">
              <strong style={{ color: scoreColor(pairScore) }}>{(pairScore * 1000).toFixed(0)}/1000</strong>
              {' '}({scoreLabel(pairScore)} confidence)
            </p>
          </div>
        </div>
      )}

      {/* Bar chart */}
      {!loading && searched && partners.length > 0 && (
        <>
          <p className="text-xs font-medium text-gray-600 mb-2">
            Top interaction partners for <span className="font-mono text-brand-600">{gene}</span>
          </p>
          <div className="flex-1 min-h-0" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 40, bottom: 0, left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  domain={[0, 1000]}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fontFamily: 'monospace' }}
                  width={55}
                />
                <Tooltip
                  formatter={(value: unknown) => {
                    const v = Number(value);
                    return [`${v}/1000 (${scoreLabel(v / 1000)})`, 'Score'] as [string, string];
                  }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={scoreColor(entry.score / 1000)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {!searched && !loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Network size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Enter a gene symbol to see its protein interaction network.</p>
            <p className="text-xs mt-1">Data from STRING DB (v12) — human proteome</p>
          </div>
        </div>
      )}

      {!loading && searched && partners.length === 0 && !error && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <p className="text-sm">No interactions found. Check the gene symbol.</p>
        </div>
      )}
    </div>
  );
}
