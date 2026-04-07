import { useState, useEffect } from 'react';
import { X, Key, ExternalLink, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { getStoredApiKeys, saveApiKeys, getSelectedProvider, saveSelectedProvider, type ApiKeys } from '../services/settingsService';
import { testProviderKey } from '../services/aiService';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const PROVIDERS: {
  id: keyof ApiKeys;
  label: string;
  placeholder: string;
  helpUrl: string;
  helpLabel: string;
  note: string;
}[] = [
  {
    id: 'groq',
    label: 'Groq',
    placeholder: 'gsk_…',
    helpUrl: 'https://console.groq.com/keys',
    helpLabel: 'console.groq.com',
    note: 'Free · 14,400 req/day · Llama 3.3 70B',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    placeholder: 'sk-…',
    helpUrl: 'https://platform.deepseek.com/api_keys',
    helpLabel: 'platform.deepseek.com',
    note: 'Very cheap · DeepSeek-V3',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    placeholder: 'AIza…',
    helpUrl: 'https://aistudio.google.com/apikey',
    helpLabel: 'aistudio.google.com',
    note: 'Free · 1 M tokens/day · Gemini 1.5 Flash',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    placeholder: 'sk-or-…',
    helpUrl: 'https://openrouter.ai/keys',
    helpLabel: 'openrouter.ai',
    note: 'Free Llama / Gemma models available',
  },
];

export default function SettingsModal({ onClose, onSaved }: Props) {
  const [keys, setKeys] = useState<ApiKeys>({ groq: '', deepseek: '', gemini: '', openrouter: '' });
  const [selectedProvider, setSelectedProvider] = useState<string>('auto');
  const [saved, setSaved] = useState(false);
  const [testState, setTestState] = useState<Record<string, 'idle' | 'testing' | 'ok' | 'auth' | 'error'>>({
    groq: 'idle', deepseek: 'idle', gemini: 'idle', openrouter: 'idle',
  });

  useEffect(() => {
    setKeys(getStoredApiKeys());
    setSelectedProvider(getSelectedProvider());
  }, []);

  async function handleTest(providerId: keyof ApiKeys) {
    const key = keys[providerId].trim();
    if (!key) return;
    setTestState((prev) => ({ ...prev, [providerId]: 'testing' }));
    const result = await testProviderKey(providerId, key);
    setTestState((prev) => ({ ...prev, [providerId]: result }));
  }

  // Providers that already have a key entered (in local form state)
  const configuredProviders = PROVIDERS.filter((p) => keys[p.id].trim().length > 0);

  function handleSave() {
    saveApiKeys(keys);
    saveSelectedProvider(selectedProvider);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onSaved();
      onClose();
    }, 800);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-brand-600" />
            <h2 className="font-semibold text-gray-900">API Key Settings</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-4 space-y-5 flex-1">
          <p className="text-sm text-gray-500">
            Keys are saved in your browser only and never sent anywhere except the provider's API.
            You only need <strong>one</strong>.
          </p>

          {PROVIDERS.map((p) => (
            <div key={p.id}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">{p.label}</label>
                <a
                  href={p.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-600 hover:underline flex items-center gap-0.5"
                >
                  {p.helpLabel} <ExternalLink size={10} />
                </a>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="password"
                  autoComplete="off"
                  placeholder={p.placeholder}
                  value={keys[p.id]}
                  onChange={(e) => {
                    setKeys((prev) => ({ ...prev, [p.id]: e.target.value }));
                    setTestState((prev) => ({ ...prev, [p.id]: 'idle' }));
                  }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono"
                />
                {keys[p.id].trim() && (
                  <button
                    type="button"
                    onClick={() => handleTest(p.id)}
                    disabled={testState[p.id] === 'testing'}
                    title="Test this API key"
                    className="flex-shrink-0 px-2.5 py-2 text-xs font-medium border rounded-lg transition-colors disabled:opacity-50
                      border-gray-300 text-gray-600 hover:border-brand-400 hover:text-brand-600"
                  >
                    {testState[p.id] === 'testing' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : testState[p.id] === 'ok' ? (
                      <CheckCircle2 size={14} className="text-green-600" />
                    ) : testState[p.id] === 'auth' ? (
                      <AlertCircle size={14} className="text-red-500" />
                    ) : testState[p.id] === 'error' ? (
                      <AlertCircle size={14} className="text-yellow-500" />
                    ) : (
                      'Test'
                    )}
                  </button>
                )}
              </div>
              {testState[p.id] === 'ok' && (
                <p className="text-xs text-green-600 mt-0.5">✓ Key is valid and working</p>
              )}
              {testState[p.id] === 'auth' && (
                <p className="text-xs text-red-500 mt-0.5">✗ Key rejected — invalid or revoked. Please generate a new key.</p>
              )}
              {testState[p.id] === 'error' && (
                <p className="text-xs text-yellow-600 mt-0.5">⚠ Could not verify key (network error or quota issue). Try saving and using it.</p>
              )}
              {testState[p.id] === 'idle' && (
                <p className="text-xs text-gray-400 mt-0.5">{p.note}</p>
              )}
            </div>
          ))}

          {/* Active provider selector — only shown when 2+ providers are configured */}
          {configuredProviders.length >= 2 && (
            <div className="pt-1 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">Active provider</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedProvider('auto')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedProvider === 'auto'
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
                  }`}
                >
                  {selectedProvider === 'auto' && <CheckCircle2 size={12} />}
                  Auto (first available)
                </button>
                {configuredProviders.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProvider(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      selectedProvider === p.id
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
                    }`}
                  >
                    {selectedProvider === p.id && <CheckCircle2 size={12} />}
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                "Auto" uses the first provider in the list that has a key.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saved ? '✓ Saved!' : 'Save Keys'}
          </button>
        </div>
      </div>
    </div>
  );
}
