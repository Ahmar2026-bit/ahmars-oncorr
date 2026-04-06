import { useState } from 'react';
import Header from './components/Header';
import GeneCorrelation from './components/GeneCorrelation';
import AIChat from './components/AIChat';
import LiteratureSearch from './components/LiteratureSearch';
import GEOSearch from './components/GEOSearch';
import ProteinNetwork from './components/ProteinNetwork';
import HypothesisValidator from './components/HypothesisValidator';
import VirtualLab from './components/VirtualLab';
import ManuscriptDraft from './components/ManuscriptDraft';
import { DEFAULT_CANCER_ID } from './data/cancerTypes';

type Tab = 'correlation' | 'hypothesis' | 'virtuallab' | 'manuscript' | 'ai' | 'literature' | 'geo' | 'network';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('correlation');
  const [geneA, setGeneA] = useState('');
  const [geneB, setGeneB] = useState('');
  const [cancerType, setCancerType] = useState(DEFAULT_CANCER_ID);
  const [correlationR, setCorrelationR] = useState<number | null>(null);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'correlation', label: '📈 Correlation' },
    { id: 'hypothesis',  label: '🔬 Hypothesis' },
    { id: 'virtuallab',  label: '⚗️ Virtual Lab' },
    { id: 'manuscript',  label: '📝 Manuscript' },
    { id: 'ai',          label: '🤖 AI Analysis' },
    { id: 'literature',  label: '📚 PubMed' },
    { id: 'geo',         label: '🧬 GEO Datasets' },
    { id: 'network',     label: '🔗 Protein Network' },
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

        {/* Panel */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex-1 min-h-[520px] flex flex-col">
          {activeTab === 'correlation' && (
            <GeneCorrelation
              geneA={geneA}
              geneB={geneB}
              cancerType={cancerType}
              onGenesChange={(a, b) => { setGeneA(a); setGeneB(b); }}
              onCancerChange={setCancerType}
              onCorrelation={setCorrelationR}
            />
          )}
          {activeTab === 'hypothesis' && (
            <HypothesisValidator
              geneA={geneA}
              geneB={geneB}
              cancerType={cancerType}
              correlationR={correlationR}
            />
          )}
          {activeTab === 'virtuallab' && (
            <VirtualLab
              geneA={geneA}
              geneB={geneB}
              cancerType={cancerType}
            />
          )}
          {activeTab === 'manuscript' && (
            <ManuscriptDraft
              geneA={geneA}
              geneB={geneB}
              cancerType={cancerType}
              correlationR={correlationR}
            />
          )}
          {activeTab === 'ai' && <AIChat geneA={geneA} geneB={geneB} />}
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
                    onClick={() => { setGeneA(a); setGeneB(b); }}
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
