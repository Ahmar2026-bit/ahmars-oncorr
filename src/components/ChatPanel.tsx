import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { AiProvider, ApiKeys } from '../utils/llmApi';
import { callLLM } from '../utils/llmApi';
import type { CorrelationResult } from '../types/correlation';
import type { NotebookEntry } from '../types/notebook';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  time: string;
  provider?: AiProvider;
}

const PROVIDERS: AiProvider[] = ['Gemini', 'Claude', 'OpenAI', 'Perplexity', 'Kimi'];

interface ChatPanelProps {
  geneA: string;
  geneB: string;
  cancerType: string;
  result: CorrelationResult;
  apiKeys: ApiKeys;
  provider: AiProvider;
  onProviderChange: (p: AiProvider) => void;
  onKeysChange: (keys: ApiKeys) => void;
  onPin: (entry: Omit<NotebookEntry, 'id'>) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  geneA,
  geneB,
  cancerType,
  result,
  apiKeys,
  provider,
  onProviderChange,
  onKeysChange,
  onPin,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setError('');

    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMsg, time: new Date().toLocaleTimeString() },
    ]);

    setLoading(true);
    try {
      const context =
        `You are an expert oncology research assistant. The researcher is studying ` +
        `${geneA} × ${geneB} in ${cancerType}. ` +
        `Pearson r = ${result.pearson_r.toFixed(3)}, p = ${result.p_value.toExponential(2)}, N = ${result.n_samples}.\n\n` +
        `Question: ${userMsg}`;
      const reply = await callLLM(context, provider, apiKeys);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: reply,
          time: new Date().toLocaleTimeString(),
          provider,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [input, loading, geneA, geneB, cancerType, result, provider, apiKeys]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const pinMessage = (content: string) => {
    onPin({
      type: 'Chat Response',
      content,
      timestamp: new Date().toLocaleString(),
      geneA,
      geneB,
      cancerType,
    });
  };

  const keyField = (label: string, field: keyof ApiKeys) => (
    <div key={field}>
      <label className="block text-[10px] text-gray-400 mb-0.5">{label}</label>
      <input
        type="password"
        value={apiKeys[field]}
        onChange={e => onKeysChange({ ...apiKeys, [field]: e.target.value })}
        placeholder="sk-…"
        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
      />
    </div>
  );

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 400 }}>
      {/* Provider selector */}
      <div className="p-3 border-b border-gray-800 flex items-center gap-2 flex-wrap">
        {PROVIDERS.map(p => (
          <button
            key={p}
            onClick={() => onProviderChange(p)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              provider === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => setShowKeys(k => !k)}
          className="ml-auto text-[10px] text-blue-400 underline"
        >
          🔑 {showKeys ? 'Hide' : 'API Keys'}
        </button>
      </div>

      {showKeys && (
        <div className="p-3 border-b border-gray-800 grid grid-cols-2 gap-2 bg-gray-900">
          {keyField('Gemini', 'gemini')}
          {keyField('Claude', 'claude')}
          {keyField('OpenAI', 'openai')}
          {keyField('Perplexity', 'perplexity')}
          {keyField('Kimi', 'kimi')}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: 0 }}>
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-xs mt-8">
            <div className="text-2xl mb-2">💬</div>
            <div>Ask anything about {geneA} × {geneB} in {cancerType}</div>
            <div className="text-gray-600 mt-1">e.g., &quot;What is the role of {geneA} in metastasis?&quot;</div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-700 text-white'
                  : 'bg-gray-800 text-gray-200 border border-gray-700'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] opacity-60">{msg.time}</span>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => pinMessage(msg.content)}
                    className="text-[9px] text-blue-400 hover:text-blue-300 ml-2"
                  >
                    📌 Pin
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Ask about ${geneA} × ${geneB}…`}
          disabled={loading}
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-semibold px-3 py-2 rounded transition-colors"
        >
          Send →
        </button>
      </div>
    </div>
  );
};

export default React.memo(ChatPanel);
