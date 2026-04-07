import { useState } from 'react';
import { Microscope, Loader2, ExternalLink, Dna } from 'lucide-react';
import { askAI, activeProvider } from '../services/aiService';
import { getCancerById } from '../data/cancerTypes';
import { renderMarkdown } from '../utils/markdown';
import ProviderBadge from './ProviderBadge';
import type { AIProvider } from '../services/aiService';

interface UniProtEntry {
  primaryAccession: string;
  genes: { geneName?: { value: string } }[];
  proteinDescription: {
    recommendedName?: { fullName: { value: string } };
    submittedNames?: { fullName: { value: string } }[];
  };
  sequence: { length: number; molWeight: number };
  comments?: {
    commentType: string;
    texts?: { value: string }[];
    subcellularLocations?: { location: { value: string } }[];
  }[];
}

interface ProteinInfo {
  accession: string;
  name: string;
  fullName: string;
  length: number;
  mass: number;
  function: string;
  location: string;
}

async function fetchProteinInfo(gene: string): Promise<ProteinInfo | null> {
  const url =
    `https://rest.uniprot.org/uniprotkb/search?query=gene_exact:${encodeURIComponent(gene)}` +
    `+AND+organism_id:9606+AND+reviewed:true` +
    `&fields=id,gene_names,protein_name,sequence,cc_function,cc_subcellular_location` +
    `&format=json&size=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`UniProt HTTP ${res.status}`);
  const data = await res.json();
  const entry: UniProtEntry | undefined = data?.results?.[0];
  if (!entry) return null;

  const fullName =
    entry.proteinDescription?.recommendedName?.fullName?.value ||
    entry.proteinDescription?.submittedNames?.[0]?.fullName?.value ||
    gene;

  const fnComment = entry.comments?.find((c) => c.commentType === 'FUNCTION');
  const fnText = fnComment?.texts?.[0]?.value || '';

  const locComment = entry.comments?.find((c) => c.commentType === 'SUBCELLULAR LOCATION');
  const locText =
    locComment?.subcellularLocations?.map((l) => l.location.value).join(', ') || '';

  return {
    accession: entry.primaryAccession,
    name: entry.genes?.[0]?.geneName?.value || gene,
    fullName,
    length: entry.sequence?.length ?? 0,
    mass: entry.sequence?.molWeight ?? 0,
    function: fnText,
    location: locText,
  };
}

export default function ProteomicsAnalysis({
  geneA,
  geneB,
  cancerType,
}: {
  geneA: string;
  geneB: string;
  cancerType: string;
}) {
  const cancer = getCancerById(cancerType);
  const [gene, setGene] = useState(geneA || '');
  const [proteinInfo, setProteinInfo] = useState<ProteinInfo | null>(null);
  const [aiText, setAiText] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>(activeProvider);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function analyse() {
    const g = gene.trim().toUpperCase();
    if (!g || loading) return;
    setLoading(true);
    setError('');
    setSearched(true);
    setProteinInfo(null);
    setAiText('');

    try {
      const [info] = await Promise.all([fetchProteinInfo(g)]);
      setProteinInfo(info);

      const context =
        `Gene/Protein: ${g}` +
        (geneB ? ` (paired with ${geneB.toUpperCase()})` : '') +
        ` in ${cancer.label}.` +
        (info
          ? ` UniProt: ${info.fullName}, ${info.length} aa, ${(info.mass / 1000).toFixed(1)} kDa.`
          : '');

      const prompt =
        `${context}\n\n` +
        `Provide a comprehensive proteomics analysis report for ${g} in ${cancer.label} covering:\n\n` +
        `## 1. Protein Expression & Abundance\n` +
        `Key findings from CPTAC and mass spectrometry studies (protein levels, post-translational modifications).\n\n` +
        `## 2. Post-Translational Modifications (PTMs)\n` +
        `Known phosphorylation, ubiquitination, acetylation sites relevant to cancer.\n\n` +
        `## 3. Protein–Protein Interactions\n` +
        `Key interactors, complexes, and co-expression patterns in tumour vs normal tissue.\n\n` +
        `## 4. Clinical Significance\n` +
        `How protein expression levels correlate with patient outcomes, therapy response.\n\n` +
        `## 5. Proteomics Biomarker Potential\n` +
        `Suitability as a serum / tissue biomarker, current detection methods.\n\n` +
        `Be concise and use markdown formatting.`;

      const response = await askAI(prompt);
      setAiText(response.text);
      setAiProvider(response.provider);
    } catch (e) {
      setError('Analysis failed. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Microscope size={15} className="text-brand-600" />
          Proteomics Analysis
        </h2>
        <p className="text-xs text-gray-500">
          Protein expression, PTMs, and mass spectrometry insights from UniProt + CPTAC data via AI analysis.
        </p>
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Protein / Gene Symbol</label>
          <input
            className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. EGFR"
            value={gene}
            onChange={(e) => setGene(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && analyse()}
          />
        </div>
        <button
          onClick={analyse}
          disabled={loading || !gene.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Microscope size={14} />}
          {loading ? 'Analysing…' : 'Analyse'}
        </button>
        {gene.trim() && (
          <a
            href={`https://www.uniprot.org/uniprotkb?query=gene_exact:${encodeURIComponent(gene.trim().toUpperCase())}+AND+organism_id:9606`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-brand-500 hover:underline ml-auto"
          >
            Open UniProt <ExternalLink size={11} />
          </a>
        )}
      </div>

      {/* Attribution */}
      <p className="text-xs text-gray-400 flex items-center gap-1">
        <Dna size={11} />
        Protein data via{' '}
        <a href="https://www.uniprot.org" target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">
          UniProt
        </a>
        {' '}· AI analysis ·{' '}
        <a href="https://proteomics.cancer.gov/programs/cptac" target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">
          CPTAC
        </a>
      </p>

      {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}

      {/* Protein Info Card */}
      {proteinInfo && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Accession</p>
            <a
              href={`https://www.uniprot.org/uniprotkb/${proteinInfo.accession}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-mono font-bold text-brand-600 hover:underline"
            >
              {proteinInfo.accession}
            </a>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-500 mb-0.5">Protein Name</p>
            <p className="text-sm font-medium text-gray-800 leading-snug">{proteinInfo.fullName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Mass</p>
            <p className="text-sm font-medium text-gray-800">
              {(proteinInfo.mass / 1000).toFixed(1)} kDa
              <span className="text-xs text-gray-400 ml-1">({proteinInfo.length} aa)</span>
            </p>
          </div>
          {proteinInfo.location && (
            <div className="col-span-2 sm:col-span-4">
              <p className="text-xs text-gray-500 mb-0.5">Subcellular Location</p>
              <p className="text-xs text-gray-700">{proteinInfo.location}</p>
            </div>
          )}
          {proteinInfo.function && (
            <div className="col-span-2 sm:col-span-4">
              <p className="text-xs text-gray-500 mb-0.5">Function</p>
              <p className="text-xs text-gray-700 line-clamp-3">{proteinInfo.function}</p>
            </div>
          )}
        </div>
      )}

      {/* AI Analysis */}
      {aiText && (
        <div className="flex-1 overflow-y-auto space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-gray-600">AI Proteomics Report</p>
            <ProviderBadge provider={aiProvider} />
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 leading-relaxed">
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(aiText) }} />
          </div>
        </div>
      )}

      {!searched && !loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-xl">
          <div className="text-center">
            <Microscope size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Enter a gene/protein symbol to run proteomics analysis.</p>
            <p className="text-xs mt-1">Covers expression, PTMs, interactions & biomarker potential.</p>
          </div>
        </div>
      )}
    </div>
  );
}
