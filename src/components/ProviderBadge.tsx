import type { AIProvider } from '../services/aiService';

const PROVIDER_META: Record<AIProvider, { label: string; color: string; dot: string }> = {
  groq: {
    label: 'Groq · Llama 3.3',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    dot: 'bg-orange-500',
  },
  gemini: {
    label: 'Gemini 1.5 Flash',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
  },
  ollama: {
    label: 'Ollama · Local',
    color: 'bg-green-100 text-green-800 border-green-200',
    dot: 'bg-green-500',
  },
  demo: {
    label: 'Demo Mode',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    dot: 'bg-gray-400',
  },
};

export default function ProviderBadge({ provider }: { provider: AIProvider }) {
  const meta = PROVIDER_META[provider];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
