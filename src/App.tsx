import { useState, useEffect } from 'react';
import Header from './components/Header';
import GeneCorrelation from './components/GeneCorrelation';
import AIChat from './components/AIChat';
import LiteratureSearch from './components/LiteratureSearch';
import GEOSearch from './components/GEOSearch';
import ProteinNetwork from './components/ProteinNetwork';
import HypothesisValidator from './components/HypothesisValidator';
import VirtualLab from './components/VirtualLab';
import ManuscriptDraft from './components/ManuscriptDraft';
import ProteomicsAnalysis from './components/ProteomicsAnalysis';
import RNASeqAnalysis from './components/RNASeqAnalysis';
import DrugPredictor from './components/DrugPredictor';
import ClinicalTrials from './components/ClinicalTrials';
import SurvivalAnalysis from './components/SurvivalAnalysis';
import MutationLandscape from './components/MutationLandscape';
import ImmuneInfiltration from './components/ImmuneInfiltration';
import SignatureExplorer from './components/SignatureExplorer';
import TranscriptionalRegulation from './components/TranscriptionalRegulation';
import TumorBoard from './components/TumorBoard';
import InvestigatorRegistry from './components/InvestigatorRegistry';
import OmicsRegistry from './components/OmicsRegistry';
import { DEFAULT_CANCER_ID } from './data/cancerTypes';

type Tab =
  | 'correlation'
  | 'survival'
  | 'mutations'
  | 'immune'
  | 'signature'
  | 'txreg'
  | 'hypothesis'
  | 'virtuallab'
  | 'manuscript'
  | 'ai'
  | 'literature'
  | 'geo'
  | 'network'
  | 'proteomics'
  | 'rnaseq'
  | 'drugs'
  | 'trials'
  | 'tumorboard'
  | 'investigators'
  | 'omics';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('correlation');
  const [geneA, setGeneA] = useState('');
  const [geneB, setGeneB] = useState('');
  const [cancerType, setCancerType] = useState(DEFAULT_CANCER_ID);
  const [correlationR, setCorrelationR] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'correlation',    label: '📈 Correlation' },
    { id: 'survival',       label: '📉 KM Survival' },
    { id: 'mutations',      label: '🧬 Mutations' },
    { id: 'immune',         label: '🛡️ Immune' },
    { id: 'signature',      label: '🧩 Signature' },
    { id: 'txreg',          label: '🧬 TF Regulation' },
    { id: 'drugs',          label: '💊 Drug Predictor' },
    { id: 'tumorboard',     label: '🏥 Tumor Board' },
    { id: 'trials',         label: '🔬 Clinical Trials' },
    { id: 'hypothesis',     label: '💡 Hypothesis' },
    { id: 'virtuallab',     label: '⚗️ Virtual Lab' },
    { id: 'manuscript',     label: '📝 Manuscript' },
    { id: 'ai',             label: '🤖 AI Analysis' },
    { id: 'literature',     label: '📚 PubMed' },
    { id: 'investigators',  label: '🔭 Investigators' },
    { id: 'omics',          label: '🧫 Omics Registry' },
    { id: 'geo',            label: '🗄️ GEO Datasets' },
    { id: 'network',        label: '🔗 Protein Network' },
    { id: 'proteomics',     label: '🔭 Proteomics' },
    { id: 'rnaseq',         label: '📊 RNA-seq' },
  ];

  // ── Session URL sync ─────────────────────────────────────────────────────────
  // On mount: restore state from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const a = params.get('a');
    const b = params.get('b');
    const c = params.get('c');
    const t = params.get('t') as Tab | null;
    if (a) setGeneA(a.toUpperCase());
    if (b) setGeneB(b.toUpperCase());
    if (c) setCancerType(c);
    if (t && tabs.some((tab) => tab.id === t)) setActiveTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On state change: keep URL in sync
  useEffect(() => {
    const params = new URLSearchParams();
    if (geneA) params.set('a', geneA);
    if (geneB) params.set('b', geneB);
    if (cancerType !== DEFAULT_CANCER_ID) params.set('c', cancerType);
    if (activeTab !== 'correlation') params.set('t', activeTab);
    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [geneA, geneB, cancerType, activeTab]);

  function copyShareUrl() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 flex flex-col gap-4">
        {/* Tab bar + Share button */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 flex-wrap items-center">
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
          <button
            onClick={copyShareUrl}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors flex-shrink-0"
            title="Copy shareable session URL"
          >
            {copied ? '✓ Copied!' : '🔗 Share'}
          </button>
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
          {activeTab === 'proteomics' && (
            <ProteomicsAnalysis geneA={geneA} geneB={geneB} cancerType={cancerType} />
          )}
          {activeTab === 'rnaseq' && (
            <RNASeqAnalysis geneA={geneA} geneB={geneB} cancerType={cancerType} />
          )}
          {activeTab === 'drugs' && (
            <DrugPredictor geneA={geneA} geneB={geneB} cancerType={cancerType} />
          )}
          {activeTab === 'trials' && (
            <ClinicalTrials geneA={geneA} geneB={geneB} cancerType={cancerType} />
          )}
          {activeTab === 'survival' && (
            <SurvivalAnalysis geneA={geneA} geneB={geneB} cancerType={cancerType} />
          )}
          {activeTab === 'mutations' && (
            <MutationLandscape geneA={geneA} geneB={geneB} cancerType={cancerType} />
          )}
          {activeTab === 'immune' && (
            <ImmuneInfiltration geneA={geneA} geneB={geneB} cancerType={cancerType} />
          )}
          {activeTab === 'signature' && (
            <SignatureExplorer geneA={geneA} geneB={geneB} cancerType={cancerType} />
          )}
          {activeTab === 'txreg' && (
            <TranscriptionalRegulation geneA={geneA} geneB={geneB} cancerType={cancerType} />
          )}
          {activeTab === 'tumorboard' && (
            <TumorBoard geneA={geneA} geneB={geneB} cancerType={cancerType} />
          )}
          {activeTab === 'investigators' && (
            <InvestigatorRegistry geneA={geneA} geneB={geneB} cancerType={cancerType} />
          )}
          {activeTab === 'omics' && (
            <OmicsRegistry geneA={geneA} geneB={geneB} cancerType={cancerType} />
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
