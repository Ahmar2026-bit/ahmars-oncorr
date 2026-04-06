import { useState } from 'react';
import { FlaskConical, Loader2, CheckCircle, XCircle, AlertCircle, ClipboardList } from 'lucide-react';
import { askAI } from '../services/aiService';
import { getCancerById } from '../data/cancerTypes';
import ProviderBadge from './ProviderBadge';
import type { AIProvider } from '../services/aiService';

interface ValidationResult {
  raw: string;
  score: number | null;
  verdict: 'supported' | 'partial' | 'inconclusive' | 'not-supported' | null;
  provider: AIProvider;
}

function parseScore(text: string): number | null {
  const m = text.match(/evidence\s+score[:\s]+(\d{1,3})/i) ||
            text.match(/score[:\s]+(\d{1,3})\s*\/\s*100/i) ||
            text.match(/(\d{1,3})\s*\/\s*100/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 0 && n <= 100 ? n : null;
}

function parseVerdict(text: string): ValidationResult['verdict'] {
  const lower = text.toLowerCase();
  if (lower.includes('strongly supported') || lower.includes('well supported')) return 'supported';
  if (lower.includes('not supported') || lower.includes('unsupported') || lower.includes('contradicted')) return 'not-supported';
  if (lower.includes('partially supported') || lower.includes('partial support')) return 'partial';
  if (lower.includes('inconclusive') || lower.includes('insufficient')) return 'inconclusive';
  return null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="font-semibold text-sm mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-semibold text-base mt-4 mb-1">$2</h2>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/^(?!<[hlp])(.+)$/gm, '$1');
}

const VERDICT_CONFIG = {
  supported:     { label: 'Strongly Supported',    icon: CheckCircle,  bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300' },
  partial:       { label: 'Partially Supported',   icon: AlertCircle,  bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  inconclusive:  { label: 'Inconclusive',           icon: AlertCircle,  bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-300' },
  'not-supported': { label: 'Not Supported',        icon: XCircle,      bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300' },
};

const EXAMPLE_HYPOTHESES = [
  'TP53 loss-of-function correlates with poor overall survival in BRCA breast cancer patients.',
  'EGFR and KRAS expression are mutually exclusive in LUAD lung adenocarcinoma.',
  'High MYC expression co-occurs with BCL2 overexpression in GBM glioblastoma.',
];

export default function HypothesisValidator({
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
  const defaultHypothesis =
    geneA && geneB
      ? `${geneA} expression positively correlates with ${geneB} in ${cancer.shortName} and is associated with altered patient prognosis.`
      : '';

  const [hypothesis, setHypothesis] = useState(defaultHypothesis);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function validate() {
    const h = hypothesis.trim();
    if (!h || loading) return;
    setLoading(true);
    setResult(null);

    const context =
      geneA && geneB
        ? `Current analysis context: Gene pair ${geneA} vs ${geneB} in ${cancer.label} (TCGA).` +
          (correlationR !== null ? ` Observed Pearson r = ${correlationR}.` : '')
        : `Cancer cohort: ${cancer.label} (TCGA).`;

    const prompt =
      `${context}\n\n` +
      `Scientific Hypothesis to validate: "${h}"\n\n` +
      `Please evaluate this hypothesis against known oncology literature and TCGA data evidence. ` +
      `Structure your response exactly as follows:\n\n` +
      `**Evidence Score**: X/100\n` +
      `**Verdict**: [Strongly Supported / Partially Supported / Inconclusive / Not Supported]\n\n` +
      `## Supporting Evidence\n` +
      `- Point 1\n- Point 2\n- Point 3\n\n` +
      `## Contradicting Evidence / Caveats\n` +
      `- Point 1\n- Point 2\n\n` +
      `## Key Considerations\n` +
      `Provide a concise scientific assessment and any clinical implications.`;

    try {
      const response = await askAI(prompt);
      const score = parseScore(response.text);
      const verdict = parseVerdict(response.text);
      setResult({ raw: response.text, score, verdict, provider: response.provider });
    } catch {
      setResult({
        raw: '⚠️ Failed to get a response. Please check your AI provider configuration.',
        score: null,
        verdict: null,
        provider: 'demo',
      });
    } finally {
      setLoading(false);
    }
  }

  const verdictCfg = result?.verdict ? VERDICT_CONFIG[result.verdict] : null;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <FlaskConical size={15} className="text-brand-600" />
          Hypothesis Validator
        </h2>
        <p className="text-xs text-gray-500">
          State a scientific hypothesis and let AI evaluate supporting and contradicting evidence from the literature and TCGA data.
        </p>
      </div>

      {/* Hypothesis input */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Your Hypothesis</label>
        <textarea
          rows={3}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          placeholder="e.g. TP53 loss-of-function correlates with poor prognosis in BRCA breast cancer patients."
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          disabled={loading}
        />
        <div className="flex flex-wrap gap-1 mt-1">
          {EXAMPLE_HYPOTHESES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setHypothesis(ex)}
              className="text-xs text-brand-600 hover:text-brand-800 hover:underline truncate max-w-xs"
            >
              Try: {ex.slice(0, 55)}…
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={validate}
        disabled={loading || !hypothesis.trim()}
        className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors w-fit"
      >
        {loading ? (
          <><Loader2 size={14} className="animate-spin" /> Validating…</>
        ) : (
          <><ClipboardList size={14} /> Validate Hypothesis</>
        )}
      </button>

      {/* Results */}
      {result && (
        <div className="flex-1 overflow-y-auto space-y-3">
          {/* Score + Verdict bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {result.score !== null && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Evidence Score</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        result.score >= 70 ? 'bg-green-500' :
                        result.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${result.score}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold ${
                    result.score >= 70 ? 'text-green-700' :
                    result.score >= 40 ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                    {result.score}/100
                  </span>
                </div>
              </div>
            )}
            {verdictCfg && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${verdictCfg.bg} ${verdictCfg.text} ${verdictCfg.border}`}>
                <verdictCfg.icon size={12} />
                {verdictCfg.label}
              </span>
            )}
            <ProviderBadge provider={result.provider} />
          </div>

          {/* Full AI response */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 leading-relaxed">
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(result.raw) }} />
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-xl">
          <div className="text-center">
            <FlaskConical size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Enter a hypothesis above and click Validate</p>
          </div>
        </div>
      )}
    </div>
  );
}
