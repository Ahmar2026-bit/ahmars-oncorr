import { useState } from 'react';
import { Dna, Settings } from 'lucide-react';
import { activeProvider } from '../services/aiService';
import ProviderBadge from './ProviderBadge';
import SettingsModal from './SettingsModal';

export default function Header() {
  const [showSettings, setShowSettings] = useState(false);
  const [, forceUpdate] = useState(0);

  function handleSaved() {
    forceUpdate((n) => n + 1);
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center">
            <Dna size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">OncoCorr</h1>
            <p className="text-xs text-gray-500">AI-Augmented Multi-Omics Research Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 hidden sm:block">AI Provider:</span>
          <ProviderBadge provider={activeProvider()} />
          <button
            onClick={() => setShowSettings(true)}
            title="API Key Settings"
            className="ml-1 p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-gray-100 transition-colors"
          >
            <Settings size={17} />
          </button>
        </div>
      </header>
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} onSaved={handleSaved} />
      )}
    </>
  );
}
