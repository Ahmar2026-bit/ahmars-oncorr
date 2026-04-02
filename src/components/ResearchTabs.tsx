import React, { useState } from 'react';
import AiResearchPanel from './AiResearchPanel';
import EnrichmentPanel from './EnrichmentPanel';
import InvestigatorPanel from './InvestigatorPanel';
import ChatPanel from './ChatPanel';
import NotebookPanel from './NotebookPanel';
import type { CorrelationResult } from '../types/correlation';
import type { NotebookEntry } from '../types/notebook';
import type { AiProvider, ApiKeys } from '../utils/llmApi';

type TabId = 'ai' | 'enrichment' | 'investigators' | 'chat' | 'notebook';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'ai', label: 'AI Research', icon: '🤖' },
  { id: 'enrichment', label: 'GO & Pathways', icon: '🧬' },
  { id: 'investigators', label: 'Investigators', icon: '🔎' },
  { id: 'chat', label: 'AI Chat', icon: '💬' },
  { id: 'notebook', label: 'Notebook', icon: '📓' },
];

interface ResearchTabsProps {
  geneA: string;
  geneB: string;
  cancerType: string;
  result: CorrelationResult;
  notebookEntries: NotebookEntry[];
  onPin: (entry: Omit<NotebookEntry, 'id'>) => void;
  onRemoveEntry: (id: string) => void;
  onClearNotebook: () => void;
}

const ResearchTabs: React.FC<ResearchTabsProps> = ({
  geneA,
  geneB,
  cancerType,
  result,
  notebookEntries,
  onPin,
  onRemoveEntry,
  onClearNotebook,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('ai');
  const [provider, setProvider] = useState<AiProvider>('Gemini');
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    gemini: '',
    claude: '',
    openai: '',
    perplexity: '',
    kimi: '',
  });

  return (
    <div
      className="border-t border-gray-800"
      style={{ background: '#0f172a', minHeight: 460 }}
    >
      {/* Tab bar */}
      <div className="flex border-b border-gray-800 px-4 overflow-x-auto">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const badgeCount = tab.id === 'notebook' ? notebookEntries.length : 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-500 text-blue-300'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {badgeCount > 0 && (
                <span className="bg-blue-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
        {activeTab === 'ai' && (
          <AiResearchPanel
            geneA={geneA}
            geneB={geneB}
            cancerType={cancerType}
            result={result}
            onPin={onPin}
          />
        )}
        {activeTab === 'enrichment' && (
          <EnrichmentPanel
            geneA={geneA}
            geneB={geneB}
            cancerType={cancerType}
            onPin={onPin}
          />
        )}
        {activeTab === 'investigators' && (
          <InvestigatorPanel
            geneA={geneA}
            geneB={geneB}
            cancerType={cancerType}
            onPin={onPin}
          />
        )}
        {activeTab === 'chat' && (
          <ChatPanel
            geneA={geneA}
            geneB={geneB}
            cancerType={cancerType}
            result={result}
            apiKeys={apiKeys}
            provider={provider}
            onProviderChange={setProvider}
            onKeysChange={setApiKeys}
            onPin={onPin}
          />
        )}
        {activeTab === 'notebook' && (
          <NotebookPanel
            entries={notebookEntries}
            onRemove={onRemoveEntry}
            onClear={onClearNotebook}
            geneA={geneA}
            geneB={geneB}
            cancerType={cancerType}
          />
        )}
      </div>
    </div>
  );
};

export default React.memo(ResearchTabs);
