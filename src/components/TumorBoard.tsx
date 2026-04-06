import { useState, useRef } from 'react';
import { ClipboardList, Loader2, Printer, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { getCancerById, CANCER_TYPES } from '../data/cancerTypes';
import { askAI, activeProvider } from '../services/aiService';
import { renderMarkdown } from '../utils/markdown';
import ProviderBadge from './ProviderBadge';
import type { AIProvider } from '../services/aiService';

// ── Evidence Level Badge ─────────────────────────────────────────────────────

type EvidenceLevel = '1A' | '1B' | '2A' | '2B' | '3' | '4';

const EVIDENCE_META: Record<EvidenceLevel, { label: string; description: string; cls: string }> = {
  '1A': {
    label: 'Level 1A',
    description: 'FDA-approved / validated biomarker in this indication',
    cls: 'bg-green-100 text-green-800 border-green-300',
  },
  '1B': {
    label: 'Level 1B',
    description: 'NCCN/ESMO guideline-recommended',
    cls: 'bg-teal-100 text-teal-800 border-teal-300',
  },
  '2A': {
    label: 'Level 2A',
    description: 'Standard care — supporting evidence from clinical trials',
    cls: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  '2B': {
    label: 'Level 2B',
    description: 'Investigational — clinical trial evidence in another indication',
    cls: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  },
  '3': {
    label: 'Level 3',
    description: 'Conflicting evidence from clinical studies',
    cls: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  '4': {
    label: 'Level 4',
    description: 'Preclinical / biological evidence only',
    cls: 'bg-gray-100 text-gray-600 border-gray-300',
  },
};

export function EvidenceBadge({ level, showTooltip = true }: { level: EvidenceLevel; showTooltip?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const meta = EVIDENCE_META[level];
  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-bold cursor-help ${meta.cls}`}
      >
        {meta.label}
      </span>
      {showTooltip && hovered && (
        <span className="absolute bottom-full left-0 mb-1 w-52 bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 z-50 shadow-lg pointer-events-none">
          <span className="font-semibold">{meta.label}:</span> {meta.description}
        </span>
      )}
    </span>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PatientCase {
  age: string;
  sex: string;
  stage: string;
  ecog: string;
  histology: string;
  keyMutations: string;
  priorTreatments: string;
  expressionGeneA: string;
  expressionGeneB: string;
  otherFindings: string;
}

const INITIAL_CASE: PatientCase = {
  age: '',
  sex: '',
  stage: '',
  ecog: '',
  histology: '',
  keyMutations: '',
  priorTreatments: '',
  expressionGeneA: '',
  expressionGeneB: '',
  otherFindings: '',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function TumorBoard({
  geneA,
  geneB,
  cancerType,
}: {
  geneA: string;
  geneB: string;
  cancerType: string;
}) {
  const cancer = getCancerById(cancerType);
  const [patientCase, setPatientCase] = useState<PatientCase>(INITIAL_CASE);
  const [selectedCancer, setSelectedCancer] = useState(cancerType);
  const [aiText, setAiText] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>(activeProvider);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [formCollapsed, setFormCollapsed] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const gA = geneA.trim().toUpperCase() || 'Gene A';
  const gB = geneB.trim().toUpperCase() || 'Gene B';
  const cancerLabel = getCancerById(selectedCancer).label;

  function update(field: keyof PatientCase, value: string) {
    setPatientCase((prev) => ({ ...prev, [field]: value }));
  }

  async function submit() {
    if (loading) return;
    setLoading(true);
    setError('');
    setSubmitted(true);
    setAiText('');

    try {
      const prompt =
        `TUMOR BOARD CASE CONSULTATION\n` +
        `================================\n\n` +
        `Cancer Type: ${cancerLabel}\n` +
        `Patient Age: ${patientCase.age || 'Not provided'}\n` +
        `Sex: ${patientCase.sex || 'Not provided'}\n` +
        `Stage: ${patientCase.stage || 'Not provided'}\n` +
        `ECOG Performance Status: ${patientCase.ecog || 'Not provided'}\n` +
        `Histology: ${patientCase.histology || 'Not provided'}\n\n` +
        `Molecular Findings:\n` +
        `- Key mutations/alterations: ${patientCase.keyMutations || 'Not provided'}\n` +
        `- ${gA} expression: ${patientCase.expressionGeneA || 'Not provided'}\n` +
        (gB !== 'Gene B' ? `- ${gB} expression: ${patientCase.expressionGeneB || 'Not provided'}\n` : '') +
        `- Other molecular findings: ${patientCase.otherFindings || 'None'}\n\n` +
        `Prior Treatments: ${patientCase.priorTreatments || 'Treatment naive'}\n\n` +
        `Based on this patient's specific molecular profile and clinical context, provide a comprehensive tumor board assessment:\n\n` +
        `## Summary of Molecular Profile\n` +
        `Summarise the key molecular findings and their clinical significance for this patient.\n\n` +
        `## Treatment Recommendations (with Evidence Levels)\n` +
        `List recommended therapies with evidence levels (FDA-approved = Level 1A, guideline-recommended = 1B, ` +
        `clinical trial = 2A/2B, preclinical = 4). Format each as: **Drug Name** [Level X]: rationale.\n\n` +
        `## Biomarker Assessment\n` +
        `Assess ${gA}${gB !== 'Gene B' ? ` and ${gB}` : ''} as actionable biomarkers for this patient.\n\n` +
        `## Relevant Clinical Trials\n` +
        `Suggest specific trial categories or agent classes worth enrolling this patient in.\n\n` +
        `## Prognosis\n` +
        `Estimated prognosis based on stage, molecular profile, and available therapies.\n\n` +
        `## Next Steps\n` +
        `Recommended additional testing (e.g., liquid biopsy, IHC, NGS panel additions) and timeline.\n\n` +
        `Use markdown. Bold drug names. Include evidence levels for each recommendation.`;

      const response = await askAI(prompt);
      setAiText(response.text);
      setAiProvider(response.provider);
      setFormCollapsed(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Analysis failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function printReport() {
    if (!reportRef.current) return;

    // Use the DOM to build the print document safely — no string interpolation of user data
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const doc = printWindow.document;
    doc.open();
    doc.write('<!DOCTYPE html><html><head></head><body></body></html>');
    doc.close();

    // Set title safely
    const geneLabel = gB !== 'Gene B' ? `${gA}/${gB}` : gA;
    doc.title = `Tumor Board Report — ${geneLabel} · ${cancer.shortName}`;

    // Inject stylesheet
    const style = doc.createElement('style');
    style.textContent = [
      'body{font-family:Georgia,serif;max-width:800px;margin:40px auto;color:#1a1a1a;line-height:1.6}',
      'h1{font-size:20px;border-bottom:2px solid #333;padding-bottom:8px}',
      'h2{font-size:16px;margin-top:24px;color:#1e40af}',
      'h3{font-size:14px;margin-top:16px}',
      'strong{font-weight:700}li{margin-bottom:4px}',
      '.header{background:#1e3a5f;color:white;padding:16px 20px;border-radius:8px;margin-bottom:20px}',
      '.header h1{color:white;border-color:rgba(255,255,255,.3);font-size:18px}',
      '.meta{font-size:12px;color:rgba(255,255,255,.8);margin-top:4px}',
      '@media print{body{margin:20px}}',
    ].join('');
    doc.head.appendChild(style);

    // Build header using DOM APIs to avoid XSS
    const header = doc.createElement('div');
    header.className = 'header';

    const h1 = doc.createElement('h1');
    h1.textContent = 'OncoCorr Tumor Board Report';
    header.appendChild(h1);

    const meta = doc.createElement('p');
    meta.className = 'meta';
    meta.textContent =
      `Cancer: ${cancerLabel} · Genes: ${geneLabel} · Generated: ${new Date().toLocaleDateString()}`;
    header.appendChild(meta);
    doc.body.appendChild(header);

    // Import the report HTML (already rendered by renderMarkdown which escapes input)
    const reportNode = reportRef.current.cloneNode(true) as HTMLElement;
    doc.body.appendChild(reportNode);

    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <ClipboardList size={15} className="text-brand-600" />
            Tumor Board Case Consultation
          </h2>
          <p className="text-xs text-gray-500">
            Enter patient clinical and molecular data for an AI-powered, evidence-graded tumor board analysis.
          </p>
        </div>
        {aiText && (
          <button
            onClick={printReport}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-600 transition-colors flex-shrink-0 ml-4"
          >
            <Printer size={12} />
            Print Report
          </button>
        )}
      </div>

      {/* Evidence level legend */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
        <p className="text-xs font-medium text-gray-600 mb-2">Evidence Level Legend (OncoKB)</p>
        <div className="flex flex-wrap gap-1.5">
          {(['1A', '1B', '2A', '2B', '3', '4'] as EvidenceLevel[]).map((level) => (
            <EvidenceBadge key={level} level={level} />
          ))}
        </div>
      </div>

      {/* Patient case form */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setFormCollapsed((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
        >
          <span>Patient Case Details</span>
          {formCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
        {!formCollapsed && (
          <div className="p-4 space-y-3">
            {/* Cancer type override */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cancer Type</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={selectedCancer}
                onChange={(e) => setSelectedCancer(e.target.value)}
              >
                {CANCER_TYPES.filter((c) => c.id !== 'PanCancer').map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { field: 'age' as const, label: 'Age', placeholder: 'e.g. 58' },
                { field: 'sex' as const, label: 'Sex', placeholder: 'M / F / Other' },
                { field: 'stage' as const, label: 'Stage', placeholder: 'e.g. IIIB, IV' },
                { field: 'ecog' as const, label: 'ECOG PS', placeholder: '0 / 1 / 2 / 3' },
              ].map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder={placeholder}
                    value={patientCase[field]}
                    onChange={(e) => update(field, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Histology / Subtype</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Invasive ductal carcinoma, ER+/PR+/HER2-, grade 3"
                value={patientCase.histology}
                onChange={(e) => update('histology', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Key Mutations / Molecular Alterations
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. TP53 R175H, PIK3CA H1047R, TMB-high, MSI-H"
                value={patientCase.keyMutations}
                onChange={(e) => update('keyMutations', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {gA} Expression
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. High / Low / 3+ IHC"
                  value={patientCase.expressionGeneA}
                  onChange={(e) => update('expressionGeneA', e.target.value)}
                />
              </div>
              {gB !== 'Gene B' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {gB} Expression
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g. High / Low / 3+ IHC"
                    value={patientCase.expressionGeneB}
                    onChange={(e) => update('expressionGeneB', e.target.value)}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prior Treatments</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Carboplatin + paclitaxel × 6 cycles (PD), bevacizumab"
                value={patientCase.priorTreatments}
                onChange={(e) => update('priorTreatments', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Other Molecular / Clinical Findings
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. PD-L1 TPS 45%, BRCA2 germline, liver metastasis"
                value={patientCase.otherFindings}
                onChange={(e) => update('otherFindings', e.target.value)}
              />
            </div>

            <button
              onClick={submit}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ClipboardList size={14} />}
              {loading ? 'Generating tumor board report…' : 'Generate Tumor Board Report'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* AI Report */}
      <div className="flex-1 overflow-y-auto">
        {aiText ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-gray-600">Tumor Board Analysis</p>
              <ProviderBadge provider={aiProvider} />
            </div>
            <div
              ref={reportRef}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 leading-relaxed"
            >
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(aiText) }} />
            </div>
            <p className="text-xs text-gray-400 text-center">
              ⚠️ For research use only. Not for direct clinical decision-making.
            </p>
          </div>
        ) : (
          !submitted && !loading && (
            <div className="flex-1 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-xl min-h-40">
              <div className="text-center">
                <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Complete the patient case form above.</p>
                <p className="text-xs mt-1">
                  AI will provide evidence-graded recommendations contextualised to the specific patient.
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
