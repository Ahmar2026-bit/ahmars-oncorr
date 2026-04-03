import { useState } from 'react';
import Header from './components/Header';
import GeneCorrelation from './components/GeneCorrelation';
import AIChat from './components/AIChat';
import LiteratureSearch from './components/LiteratureSearch';

type Tab = 'correlation' | 'ai' | 'literature';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('correlation');
  const [geneA, setGeneA] = useState('');
  const [geneB, setGeneB] = useState('');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'correlation', label: '📈 Gene Correlation' },
    { id: 'ai', label: '🤖 AI Analysis' },
    { id: 'literature', label: '📚 Literature' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 flex flex-col gap-4">
        {/* Tab bar */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex-1 min-h-[520px] flex flex-col">
          {activeTab === 'correlation' && (
            <GeneCorrelation
              geneA={geneA}
              geneB={geneB}
              onGenesChange={(a, b) => {
                setGeneA(a);
                setGeneB(b);
              }}
            />
          )}
          {activeTab === 'ai' && <AIChat geneA={geneA} geneB={geneB} />}
          {activeTab === 'literature' && (
            <LiteratureSearch initialQuery={geneA && geneB ? `${geneA} ${geneB}` : ''} />
          )}
        </div>

        {/* Quick start hints */}
        {!geneA && !geneB && (
          <div className="text-center text-xs text-gray-400 mt-2 space-y-1">
            <p>Try: <strong>TP53</strong> vs <strong>BRCA1</strong> · <strong>EGFR</strong> vs <strong>KRAS</strong> · <strong>MYC</strong> vs <strong>BCL2</strong></p>
          </div>
        )}
      </main>
    </div>
  );
}
