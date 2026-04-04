import { useState, useEffect } from 'react';
import Header from './components/Header';
import GeneCorrelation from './components/GeneCorrelation';
import AIChat from './components/AIChat';
import LiteratureSearch from './components/LiteratureSearch';
import GEOSearch from './components/GEOSearch';
import ProteinNetwork from './components/ProteinNetwork';
import SurvivalAnalysis from './components/SurvivalAnalysis';
import MutationPanel from './components/MutationPanel';
import DrugInteractions from './components/DrugInteractions';
import PathwayEnrichment from './components/PathwayEnrichment';
import { Clock, X } from 'lucide-react';

type Tab = 'correlation' | 'ai' | 'literature' | 'geo' | 'network' | 'survival' | 'mutations' | 'drugs' | 'pathways';

const HISTORY_KEY = 'oncorr_history';
const MAX_HISTORY = 8;

interface HistoryEntry {
  a: string;
  b: string;
  ts: number;
}

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as HistoryEntry[];
  } catch (error) {
    console.error('Failed to load search history:', error);
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('correlation');
  const [geneA, setGeneA] = useState('');
  const [geneB, setGeneB] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  // Persist history to localStorage whenever it changes
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  function handleGenesChange(a: string, b: string) {
    setGeneA(a);
    setGeneB(b);
    if (a && b) {
      setHistory((prev) => {
        const filtered = prev.filter((e) => !(e.a === a && e.b === b));
        return [{ a, b, ts: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
      });
    }
  }

  function removeHistoryEntry(ts: number) {
    setHistory((prev) => prev.filter((e) => e.ts !== ts));
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'correlation', label: '📈 Correlation' },
    { id: 'ai',          label: '🤖 AI Analysis' },
    { id: 'survival',    label: '📉 Survival' },
    { id: 'mutations',   label: '🧬 Mutations' },
    { id: 'drugs',       label: '💊 Drugs' },
    { id: 'pathways',    label: '🛤️ Pathways' },
    { id: 'literature',  label: '📚 PubMed' },
    { id: 'geo',         label: '🔬 GEO' },
    { id: 'network',     label: '🔗 Network' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 flex flex-col gap-4">
        {/* Tab bar */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Recent searches */}
        {history.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={11} /> Recent:
            </span>
            {history.map((e) => (
              <span
                key={e.ts}
                className="flex items-center gap-1 text-xs bg-white border border-gray-200 rounded-full pl-2 pr-1 py-0.5 hover:border-brand-400 transition-colors group"
              >
                <button
                  className="font-mono font-semibold text-gray-700 group-hover:text-brand-600"
                  onClick={() => { handleGenesChange(e.a, e.b); setActiveTab('correlation'); }}
                >
                  {e.a} / {e.b}
                </button>
                <button
                  onClick={() => removeHistoryEntry(e.ts)}
                  className="text-gray-300 hover:text-red-500 ml-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Panel */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex-1 min-h-[520px] flex flex-col">
          {activeTab === 'correlation' && (
            <GeneCorrelation
              geneA={geneA}
              geneB={geneB}
              onGenesChange={handleGenesChange}
            />
          )}
          {activeTab === 'ai' && <AIChat geneA={geneA} geneB={geneB} />}
          {activeTab === 'survival' && <SurvivalAnalysis geneA={geneA} geneB={geneB} />}
          {activeTab === 'mutations' && <MutationPanel geneA={geneA} />}
          {activeTab === 'drugs' && <DrugInteractions geneA={geneA} />}
          {activeTab === 'pathways' && <PathwayEnrichment geneA={geneA} geneB={geneB} />}
          {activeTab === 'literature' && (
            <LiteratureSearch initialQuery={geneA && geneB ? `${geneA} ${geneB}` : ''} />
          )}
          {activeTab === 'geo' && (
            <GEOSearch initialQuery={geneA && geneB ? `${geneA} ${geneB} cancer` : ''} />
          )}
          {activeTab === 'network' && (
            <ProteinNetwork geneA={geneA} geneB={geneB} />
          )}
        </div>

        {/* Quick start hints */}
        {!geneA && !geneB && (
          <div className="text-center text-xs text-gray-400 mt-1">
            <p>
              Try:{' '}
              {[['TP53', 'BRCA1'], ['EGFR', 'KRAS'], ['MYC', 'BCL2']].map(([a, b], i) => (
                <span key={i}>
                  {i > 0 && ' · '}
                  <button
                    className="font-semibold hover:text-brand-500 transition-colors"
                    onClick={() => { handleGenesChange(a, b); }}
                  >
                    {a} vs {b}
                  </button>
                </span>
              ))}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
