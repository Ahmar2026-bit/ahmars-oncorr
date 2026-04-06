import { useState } from 'react';
import { FileText, Loader2, Copy, Check, ChevronDown } from 'lucide-react';
import { askAI } from '../services/aiService';
import { getCancerById } from '../data/cancerTypes';
import { renderMarkdown } from '../utils/markdown';
import ProviderBadge from './ProviderBadge';
import type { AIProvider } from '../services/aiService';

type Section = 'abstract' | 'introduction' | 'methods' | 'results' | 'discussion';

interface DraftResult {
  text: string;
  provider: AIProvider;
}

const SECTION_CONFIG: Record<Section, { label: string; emoji: string; description: string }> = {
  abstract:     { label: 'Abstract',     emoji: '📄', description: 'Concise 250-word summary of the study' },
  introduction: { label: 'Introduction', emoji: '📖', description: 'Background, rationale, and aims' },
  methods:      { label: 'Methods',      emoji: '🔬', description: 'Data source, analysis approach, statistics' },
  results:      { label: 'Results',      emoji: '📊', description: 'Key findings with statistical context' },
  discussion:   { label: 'Discussion',   emoji: '💬', description: 'Interpretation, limitations, future directions' },
};

function buildPrompt(
  section: Section,
  geneA: string,
  geneB: string,
  cancerLabel: string,
  cancerShort: string,
  correlationR: number | null,
): string {
  const geneContext =
    geneA && geneB
      ? `The study investigates the co-expression of ${geneA} and ${geneB} in ${cancerLabel} (TCGA cohort).` +
        (correlationR !== null
          ? ` The observed Pearson correlation coefficient between ${geneA} and ${geneB} is r = ${correlationR}.`
          : '')
      : `The study analyses gene expression data from ${cancerLabel} (TCGA cohort).`;

  const sectionPrompts: Record<Section, string> = {
    abstract: (
      `Write a structured scientific abstract (~250 words) for a paper with the following context:\n${geneContext}\n\n` +
      `Include: Background (1-2 sentences), Methods (2-3 sentences), Results (2-3 sentences), ` +
      `Conclusion (1-2 sentences). Use formal academic language appropriate for a high-impact oncology journal.`
    ),
    introduction: (
      `Write a scientific Introduction section (~400 words) for a manuscript about:\n${geneContext}\n\n` +
      `Structure: (1) Cancer burden and significance of ${cancerShort}. ` +
      `(2) Known biology of ${geneA || 'the target genes'} and ${geneB || 'the co-expression partner'}. ` +
      `(3) Gap in knowledge / rationale for this study. ` +
      `(4) Statement of objectives. Use formal academic language and include placeholder citations like [1], [2], [3].`
    ),
    methods: (
      `Write a scientific Methods section for a study with:\n${geneContext}\n\n` +
      `Include subsections for: (1) Data Source (TCGA ${cancerShort} cohort, RNA-seq level 3 data, sample processing). ` +
      `(2) Statistical Analysis (Pearson correlation, significance testing, multiple comparison correction). ` +
      `(3) Bioinformatics Tools (R/Python packages, pathway databases). ` +
      `Use standard methods reporting conventions and passive voice.`
    ),
    results: (
      `Write a scientific Results section for a study with:\n${geneContext}\n\n` +
      `Report: (1) Cohort characteristics. ` +
      `(2) ${geneA || 'Gene A'} and ${geneB || 'Gene B'} expression distribution in ${cancerShort}. ` +
      (correlationR !== null
        ? `(3) Correlation analysis: r = ${correlationR} — interpret the directionality, magnitude, and statistical significance. `
        : `(3) Correlation analysis findings. `) +
      `(4) Clinical associations (survival, grade, stage if applicable). ` +
      `Write in past tense with figure/table references like (Figure 1), (Table 1).`
    ),
    discussion: (
      `Write a scientific Discussion section (~500 words) for a study with:\n${geneContext}\n\n` +
      `Include: (1) Interpretation of the ${geneA || 'gene'}-${geneB || 'gene'} correlation in the context of ${cancerShort} biology. ` +
      `(2) Comparison with existing literature (cite relevant studies as [Author et al., year]). ` +
      `(3) Mechanistic explanation of the co-expression pattern. ` +
      `(4) Clinical implications and therapeutic opportunities. ` +
      `(5) Study limitations. ` +
      `(6) Future research directions. ` +
      `Conclude with a summary sentence.`
    ),
  };

  return sectionPrompts[section];
}

export default function ManuscriptDraft({
  geneA,
  geneB,
  cancerType,
  correlationR,
}: {
  geneA: string;
  geneB: string;
  cancerType: string;
  correlationR: number | null;
}) {
  const cancer = getCancerById(cancerType);
  const [activeSection, setActiveSection] = useState<Section>('abstract');
  const [drafts, setDrafts] = useState<Partial<Record<Section, DraftResult>>>({});
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentDraft = drafts[activeSection];

  async function generateSection(section: Section) {
    if (loading) return;
    setLoading(true);
    const prompt = buildPrompt(section, geneA, geneB, cancer.label, cancer.shortName, correlationR);
    try {
      const response = await askAI(prompt);
      setDrafts((prev) => ({ ...prev, [section]: { text: response.text, provider: response.provider } }));
    } catch {
      setDrafts((prev) => ({
        ...prev,
        [section]: {
          text: '⚠️ Draft generation failed. Please check your AI provider configuration.',
          provider: 'demo' as AIProvider,
        },
      }));
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    if (!currentDraft) return;
    await navigator.clipboard.writeText(currentDraft.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <FileText size={15} className="text-brand-600" />
          Manuscript Draft Generator
        </h2>
        <p className="text-xs text-gray-500">
          AI drafts publication-ready manuscript sections from your current analysis context.
        </p>
      </div>

      {/* Context summary */}
      <div className="flex flex-wrap gap-2 items-center text-xs">
        <span className="text-gray-500">Current context:</span>
        {geneA && <span className="font-mono font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">{geneA}</span>}
        {geneA && geneB && <span className="text-gray-400">vs</span>}
        {geneB && <span className="font-mono font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">{geneB}</span>}
        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{cancer.shortName}</span>
        {correlationR !== null && (
          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">r = {correlationR}</span>
        )}
        {!geneA && !geneB && (
          <span className="text-amber-600">💡 Set gene pair in Correlation tab for richer drafts</span>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
        {(Object.keys(SECTION_CONFIG) as Section[]).map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeSection === s
                ? 'bg-white text-brand-700 shadow-sm border border-gray-200'
                : 'text-gray-600 hover:bg-white hover:text-gray-800'
            }`}
          >
            <span>{SECTION_CONFIG[s].emoji}</span>
            <span>{SECTION_CONFIG[s].label}</span>
            {drafts[s] && (
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" title="Draft available" />
            )}
          </button>
        ))}
      </div>

      {/* Section description + generate button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-gray-500">
          {SECTION_CONFIG[activeSection].emoji} {SECTION_CONFIG[activeSection].description}
        </p>
        <div className="flex items-center gap-2">
          {currentDraft && (
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
            >
              {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
          <button
            onClick={() => generateSection(activeSection)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-xs rounded-lg transition-colors"
          >
            {loading ? (
              <><Loader2 size={12} className="animate-spin" /> Generating…</>
            ) : (
              <><FileText size={12} /> {currentDraft ? 'Regenerate' : 'Generate'} {SECTION_CONFIG[activeSection].label}</>
            )}
          </button>
        </div>
      </div>

      {/* Draft content */}
      {currentDraft ? (
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
            <span>Generated by</span>
            <ProviderBadge provider={currentDraft.provider} />
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(currentDraft.text) }} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-xl">
          <div className="text-center">
            <FileText size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              Click <strong>Generate {SECTION_CONFIG[activeSection].label}</strong> to draft this section
            </p>
            <p className="text-xs mt-1 text-gray-400">
              All five sections can be generated independently
            </p>
          </div>
        </div>
      )}

      {/* Export all button */}
      {Object.keys(drafts).length >= 2 && (
        <button
          onClick={() => {
            const allText = (Object.keys(SECTION_CONFIG) as Section[])
              .filter((s) => drafts[s])
              .map((s) => `# ${SECTION_CONFIG[s].label.toUpperCase()}\n\n${drafts[s]!.text}`)
              .join('\n\n---\n\n');
            const blob = new Blob([allText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `OncoCorr_${geneA || 'Gene'}_${geneB || 'Gene'}_${cancer.shortName}_manuscript.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 px-4 py-2 border border-brand-300 text-brand-700 hover:bg-brand-50 text-xs rounded-lg transition-colors w-fit"
        >
          <ChevronDown size={12} />
          Export All Sections (.txt)
        </button>
      )}
    </div>
  );
}
