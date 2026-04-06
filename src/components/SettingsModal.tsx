import { useState, useEffect } from 'react';
import { X, Key, ExternalLink, CheckCircle2 } from 'lucide-react';
import { getStoredApiKeys, saveApiKeys, getSelectedProvider, saveSelectedProvider, type ApiKeys } from '../services/settingsService';

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

  useEffect(() => {
    setKeys(getStoredApiKeys());
    setSelectedProvider(getSelectedProvider());
  }, []);

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
              <input
                type="password"
                autoComplete="off"
                placeholder={p.placeholder}
                value={keys[p.id]}
                onChange={(e) => setKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono"
              />
              <p className="text-xs text-gray-400 mt-0.5">{p.note}</p>
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
