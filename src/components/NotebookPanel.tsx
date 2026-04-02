import React, { useCallback } from 'react';
import type { NotebookEntry } from '../types/notebook';

interface NotebookPanelProps {
  entries: NotebookEntry[];
  onRemove: (id: string) => void;
  onClear: () => void;
  geneA: string;
  geneB: string;
  cancerType: string;
}

function buildMarkdown(
  entries: NotebookEntry[],
  geneA: string,
  geneB: string,
  cancerType: string,
): string {
  const lines: string[] = [
    `# OncoCorr Research Notebook`,
    ``,
    `**Gene Pair:** ${geneA} × ${geneB}  `,
    `**Cancer Type:** ${cancerType}  `,
    `**Exported:** ${new Date().toLocaleString()}`,
    ``,
    `---`,
    ``,
  ];
  entries.forEach((e, i) => {
    lines.push(`## Entry ${i + 1}: ${e.type}`);
    lines.push(`*${e.timestamp}*`);
    lines.push(``);
    lines.push(e.content);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  });
  return lines.join('\n');
}

function buildJson(
  entries: NotebookEntry[],
  geneA: string,
  geneB: string,
  cancerType: string,
): string {
  return JSON.stringify(
    { geneA, geneB, cancerType, exportedAt: new Date().toISOString(), entries },
    null,
    2,
  );
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const TYPE_COLORS: Record<string, string> = {
  'Research Analysis': 'border-l-blue-500',
  'Deep Insights': 'border-l-purple-500',
  'Pivot & Rescue Strategies': 'border-l-orange-500',
  'GO Enrichment': 'border-l-green-500',
  'GO & Pathway Enrichment': 'border-l-green-500',
  'Investigators': 'border-l-yellow-500',
  'Chat Response': 'border-l-cyan-500',
};

const NotebookPanel: React.FC<NotebookPanelProps> = ({
  entries,
  onRemove,
  onClear,
  geneA,
  geneB,
  cancerType,
}) => {
  const exportMd = useCallback(() => {
    const content = buildMarkdown(entries, geneA, geneB, cancerType);
    const name = `oncorr_${geneA}_${geneB}_${Date.now()}.md`;
    downloadBlob(content, name, 'text/markdown');
  }, [entries, geneA, geneB, cancerType]);

  const exportJson = useCallback(() => {
    const content = buildJson(entries, geneA, geneB, cancerType);
    const name = `oncorr_${geneA}_${geneB}_${Date.now()}.json`;
    downloadBlob(content, name, 'application/json');
  }, [entries, geneA, geneB, cancerType]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-200 uppercase tracking-widest">
          📓 Research Notebook
        </h3>
        <span className="text-[10px] text-gray-500">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-3xl mb-2">📌</div>
          <p className="text-xs text-gray-500">
            Your research notebook is empty.
          </p>
          <p className="text-[11px] text-gray-600 mt-1">
            Use the <strong className="text-gray-500">📌 Pin to Notebook</strong> buttons in AI Research,
            GO Enrichment, and other panels to curate insights here.
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <button
              onClick={exportMd}
              className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded transition-colors"
            >
              📄 Export Markdown
            </button>
            <button
              onClick={exportJson}
              className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded transition-colors"
            >
              📋 Export JSON
            </button>
            <button
              onClick={onClear}
              className="py-1.5 px-3 bg-red-900 hover:bg-red-800 text-red-200 text-xs font-semibold rounded transition-colors"
            >
              🗑️
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                className={`bg-gray-900 border border-gray-700 border-l-2 ${TYPE_COLORS[entry.type] ?? 'border-l-gray-500'} rounded-lg p-3`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold text-white">
                        #{i + 1} {entry.type}
                      </span>
                      <span className="text-[9px] text-gray-500">{entry.timestamp}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 flex gap-2 mb-1.5 flex-wrap">
                      <span className="text-blue-400">{entry.geneA}</span>
                      <span className="text-gray-600">×</span>
                      <span className="text-green-400">{entry.geneB}</span>
                      <span className="text-gray-600">·</span>
                      <span className="text-yellow-400">{entry.cancerType}</span>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed line-clamp-3">
                      {entry.content.length > 300
                        ? `${entry.content.slice(0, 300)}…`
                        : entry.content}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemove(entry.id)}
                    className="text-[10px] text-gray-600 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                    title="Remove entry"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(NotebookPanel);
