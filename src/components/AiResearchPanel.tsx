import React, { useState, useCallback } from 'react';
import type { AiProvider, ApiKeys } from '../utils/llmApi';
import {
  callLLM,
  buildResearchPrompt,
  buildDeepInsightsPrompt,
  buildRescuePrompt,
} from '../utils/llmApi';
import type { CorrelationResult } from '../types/correlation';
import type { NotebookEntry } from '../types/notebook';

const PROVIDERS: AiProvider[] = ['Gemini', 'Claude', 'OpenAI', 'Perplexity', 'Kimi'];

interface AiResearchPanelProps {
  geneA: string;
  geneB: string;
  cancerType: string;
  result: CorrelationResult;
  onPin: (entry: Omit<NotebookEntry, 'id'>) => void;
}

const Spinner: React.FC = () => (
  <div className="flex items-center gap-2 text-blue-400 text-xs">
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
    Thinking…
  </div>
);

const ResponseBox: React.FC<{
  content: string;
  label: string;
  onPin: () => void;
}> = ({ content, label, onPin }) => (
  <div className="mt-3 bg-gray-900 border border-gray-700 rounded-lg p-3">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-semibold text-blue-300">{label}</span>
      <button
        onClick={onPin}
        className="text-[10px] bg-blue-900 hover:bg-blue-700 text-blue-200 px-2 py-0.5 rounded transition-colors"
      >
        📌 Pin to Notebook
      </button>
    </div>
    <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
      {content}
    </div>
  </div>
);

const AiResearchPanel: React.FC<AiResearchPanelProps> = ({
  geneA,
  geneB,
  cancerType,
  result,
  onPin,
}) => {
  const [provider, setProvider] = useState<AiProvider>('Gemini');
  const [keys, setKeys] = useState<ApiKeys>({
    gemini: '',
    claude: '',
    openai: '',
    perplexity: '',
    kimi: '',
  });
  const [showKeys, setShowKeys] = useState(false);

  const [researchResult, setResearchResult] = useState('');
  const [deepResult, setDeepResult] = useState('');
  const [rescueResult, setRescueResult] = useState('');

  const [loadingResearch, setLoadingResearch] = useState(false);
  const [loadingDeep, setLoadingDeep] = useState(false);
  const [loadingRescue, setLoadingRescue] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(
    async (
      type: 'research' | 'deep' | 'rescue',
      setter: (v: string) => void,
      setLoading: (v: boolean) => void,
    ) => {
      setError('');
      setLoading(true);
      try {
        let prompt = '';
        if (type === 'research') {
          prompt = buildResearchPrompt(geneA, geneB, cancerType, result.pearson_r, result.p_value, result.n_samples);
        } else if (type === 'deep') {
          prompt = buildDeepInsightsPrompt(geneA, geneB, cancerType, result.pearson_r);
        } else {
          prompt = buildRescuePrompt(geneA, geneB, cancerType);
        }
        const text = await callLLM(prompt, provider, keys);
        setter(text);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [geneA, geneB, cancerType, result, provider, keys],
  );

  const pin = useCallback(
    (type: string, content: string) => {
      onPin({
        type,
        content,
        timestamp: new Date().toLocaleString(),
        geneA,
        geneB,
        cancerType,
      });
    },
    [onPin, geneA, geneB, cancerType],
  );

  const keyField = (label: string, field: keyof ApiKeys) => (
    <div key={field}>
      <label className="block text-[10px] text-gray-400 mb-0.5">{label}</label>
      <input
        type="password"
        value={keys[field]}
        onChange={e => setKeys(k => ({ ...k, [field]: e.target.value }))}
        placeholder="sk-…"
        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
      />
    </div>
  );

  return (
    <div className="p-4 space-y-4 text-sm">
      {/* Provider + Keys */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-400 whitespace-nowrap">AI Provider:</span>
          <div className="flex gap-1 flex-wrap">
            {PROVIDERS.map(p => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  provider === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowKeys(k => !k)}
            className="ml-auto text-[10px] text-blue-400 underline"
          >
            🔑 {showKeys ? 'Hide' : 'Show'} API Keys
          </button>
        </div>

        {showKeys && (
          <div className="grid grid-cols-2 gap-2 bg-gray-900 border border-gray-700 rounded-lg p-3">
            {keyField('Gemini API Key', 'gemini')}
            {keyField('Claude API Key', 'claude')}
            {keyField('OpenAI API Key', 'openai')}
            {keyField('Perplexity API Key', 'perplexity')}
            {keyField('Kimi API Key', 'kimi')}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Context preview */}
      <div className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-gray-400">
        Analyzing <span className="text-blue-300 font-semibold">{geneA}</span> ×{' '}
        <span className="text-green-300 font-semibold">{geneB}</span> in{' '}
        <span className="text-yellow-300">{cancerType}</span> &nbsp;|&nbsp; Pearson r ={' '}
        <span className="text-white font-mono">{result.pearson_r.toFixed(3)}</span> &nbsp;|&nbsp;
        N = <span className="text-white font-mono">{result.n_samples}</span>
      </div>

      {/* Research Analysis */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-gray-200 uppercase tracking-widest">
            🔬 Research Analysis
          </h4>
        </div>
        <p className="text-xs text-gray-500 mb-2">
          Molecular mechanism · Clinical significance · Therapeutic vulnerabilities · Experimental strategies
        </p>
        <button
          disabled={loadingResearch}
          onClick={() => run('research', setResearchResult, setLoadingResearch)}
          className="w-full py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-semibold rounded transition-colors"
        >
          {loadingResearch ? 'Running…' : '🔬 Run Research Analysis'}
        </button>
        {loadingResearch && <div className="mt-2"><Spinner /></div>}
        {researchResult && (
          <ResponseBox
            content={researchResult}
            label="Research Analysis"
            onPin={() => pin('Research Analysis', researchResult)}
          />
        )}
      </section>

      <div className="border-t border-gray-800" />

      {/* Deep Insights */}
      <section>
        <h4 className="text-xs font-semibold text-gray-200 uppercase tracking-widest mb-2">
          🧠 Deep Insights (High-Thinking Mode)
        </h4>
        <p className="text-xs text-gray-500 mb-2">
          PTMs · Systems biology · Novel hypotheses · Subtype heterogeneity · Therapeutic innovation
        </p>
        <button
          disabled={loadingDeep}
          onClick={() => run('deep', setDeepResult, setLoadingDeep)}
          className="w-full py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-semibold rounded transition-colors"
        >
          {loadingDeep ? 'Reasoning…' : '⚡ Generate Deep Insights'}
        </button>
        {loadingDeep && <div className="mt-2"><Spinner /></div>}
        {deepResult && (
          <ResponseBox
            content={deepResult}
            label="Deep Insights"
            onPin={() => pin('Deep Insights', deepResult)}
          />
        )}
      </section>

      <div className="border-t border-gray-800" />

      {/* Pivot & Rescue */}
      <section>
        <h4 className="text-xs font-semibold text-gray-200 uppercase tracking-widest mb-2">
          🔄 Pivot & Rescue Strategies
        </h4>
        <p className="text-xs text-gray-500 mb-2">
          Failure mode analysis · Bypass pathways · Alternative designs · Salvageable findings
        </p>
        <button
          disabled={loadingRescue}
          onClick={() => run('rescue', setRescueResult, setLoadingRescue)}
          className="w-full py-1.5 bg-orange-700 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold rounded transition-colors"
        >
          {loadingRescue ? 'Generating…' : '🆘 Generate Rescue Strategies'}
        </button>
        {loadingRescue && <div className="mt-2"><Spinner /></div>}
        {rescueResult && (
          <ResponseBox
            content={rescueResult}
            label="Pivot & Rescue Strategies"
            onPin={() => pin('Pivot & Rescue Strategies', rescueResult)}
          />
        )}
      </section>
    </div>
  );
};

export default React.memo(AiResearchPanel);
