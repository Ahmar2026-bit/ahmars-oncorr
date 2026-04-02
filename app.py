"""
Ahmar's OncoCorr - AI-Augmented Multi-Omics Research & Gene Correlation Dashboard

A comprehensive platform bridging raw genomic data and clinical insights using
advanced LLMs (Gemini / Claude / OpenAI / Perplexity / Kimi) for real-time
virtual experiments, literature synthesis, and hypothesis testing.
"""

import io
import json
import os
import time
from datetime import datetime

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import requests
import streamlit as st
from scipy import stats

# ---------------------------------------------------------------------------
# Page configuration
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="Ahmar's OncoCorr",
    page_icon="🧬",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------------------------------------------------------------------
# Custom CSS
# ---------------------------------------------------------------------------
st.markdown(
    """
<style>
    .main-header {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        padding: 1.5rem 2rem;
        border-radius: 12px;
        margin-bottom: 1.5rem;
        border-left: 4px solid #e94560;
    }
    .main-header h1 {
        color: #ffffff;
        font-size: 2rem;
        margin: 0;
    }
    .main-header p {
        color: #a8b2d8;
        margin: 0.3rem 0 0 0;
        font-size: 0.9rem;
    }
    .metric-card {
        background: linear-gradient(135deg, #1e2a3a, #243447);
        border: 1px solid #2d4a6a;
        border-radius: 10px;
        padding: 1rem;
        text-align: center;
    }
    .section-header {
        font-size: 1.1rem;
        font-weight: 600;
        color: #58a6ff;
        border-bottom: 1px solid #21262d;
        padding-bottom: 0.5rem;
        margin-bottom: 1rem;
    }
    .notebook-entry {
        background: #161b22;
        border: 1px solid #30363d;
        border-left: 3px solid #e94560;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        margin-bottom: 0.75rem;
        font-size: 0.85rem;
    }
    .ai-response {
        background: #0d1117;
        border: 1px solid #30363d;
        border-radius: 10px;
        padding: 1rem;
        line-height: 1.6;
    }
    .stButton > button {
        width: 100%;
    }
    .pin-btn {
        font-size: 0.75rem;
    }
    .badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.7rem;
        font-weight: 600;
        margin-right: 4px;
    }
    .badge-blue { background: #1f6feb; color: white; }
    .badge-green { background: #238636; color: white; }
    .badge-red { background: #da3633; color: white; }
    .badge-purple { background: #6e40c9; color: white; }
</style>
""",
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# Constants & reference data
# ---------------------------------------------------------------------------
CANCER_TYPES = [
    "Pancreatic Adenocarcinoma (PAAD)",
    "Lung Adenocarcinoma (LUAD)",
    "Breast Invasive Carcinoma (BRCA)",
    "Colorectal Adenocarcinoma (COAD)",
    "Hepatocellular Carcinoma (LIHC)",
    "Glioblastoma (GBM)",
    "Ovarian Serous Cystadenocarcinoma (OV)",
    "Prostate Adenocarcinoma (PRAD)",
    "Melanoma (SKCM)",
    "Bladder Urothelial Carcinoma (BLCA)",
    "Cervical Squamous Cell Carcinoma (CESC)",
    "Acute Myeloid Leukemia (LAML)",
    "Thyroid Carcinoma (THCA)",
    "Kidney Clear Cell Carcinoma (KIRC)",
    "Uterine Corpus Endometrial Carcinoma (UCEC)",
]

COMMON_ONCOGENES = [
    "KRAS", "TP53", "EGFR", "MYC", "BRAF", "PIK3CA",
    "PTEN", "RB1", "APC", "BRCA1", "BRCA2", "CDH1",
    "VHL", "MLH1", "SMAD4", "STK11", "IDH1", "FGFR1",
    "ALK", "RET", "ERBB2", "MET", "JAK2", "NOTCH1",
    "CTNNB1", "NRAS", "HRAS", "CDK4", "MDM2", "BCL2",
    "GATA6", "HSF1", "SOX2", "FOXM1", "E2F1", "STAT3",
    "NF1", "TSC1", "TSC2", "ATM", "CHEK2", "RAD51",
    "DNMT3A", "TET2", "RUNX1", "FLT3", "NPM1", "KIT",
]

GENE_INTERACTORS = {
    "KRAS": ["TP53", "SMAD4", "CDKN2A", "STK11", "ERBB2"],
    "TP53": ["MDM2", "CDKN1A", "BAX", "BCL2", "PUMA"],
    "EGFR": ["ERBB2", "MET", "KRAS", "PIK3CA", "AKT1"],
    "MYC": ["MAX", "E2F1", "CDK4", "CCND1", "FOXM1"],
    "BRAF": ["MEK1", "MEK2", "ERK1", "ERK2", "NRAS"],
    "GATA6": ["FOXA1", "CDX2", "HNF4A", "PROX1", "NKX2-1"],
    "HSF1": ["HSP90", "HSP70", "HSPA1A", "TRAP1", "CDC37"],
    "PIK3CA": ["AKT1", "PTEN", "mTOR", "S6K1", "4EBP1"],
    "BRCA1": ["RAD51", "PALB2", "BARD1", "TP53", "ATM"],
    "STAT3": ["JAK1", "JAK2", "IL6", "VEGF", "BCL2"],
}

GO_TERMS = {
    "Biological Process": [
        ("GO:0000082", "G1/S transition of mitotic cell cycle", "2.3e-12"),
        ("GO:0006260", "DNA replication", "4.1e-11"),
        ("GO:0007049", "Cell cycle", "1.2e-10"),
        ("GO:0043066", "Negative regulation of apoptosis", "3.4e-9"),
        ("GO:0008283", "Cell population proliferation", "6.7e-9"),
        ("GO:0006954", "Inflammatory response", "1.1e-8"),
        ("GO:0042127", "Regulation of cell proliferation", "2.3e-8"),
        ("GO:0016477", "Cell migration", "4.5e-8"),
        ("GO:0030154", "Cell differentiation", "7.8e-8"),
        ("GO:0006351", "DNA-templated transcription", "1.2e-7"),
    ],
    "Molecular Function": [
        ("GO:0003677", "DNA binding", "1.1e-14"),
        ("GO:0004672", "Protein kinase activity", "2.2e-12"),
        ("GO:0005515", "Protein binding", "3.3e-11"),
        ("GO:0003700", "DNA-binding transcription factor activity", "4.4e-10"),
        ("GO:0004871", "Signal transducer activity", "5.5e-9"),
        ("GO:0016301", "Kinase activity", "6.6e-8"),
        ("GO:0016787", "Hydrolase activity", "7.7e-8"),
        ("GO:0004842", "Ubiquitin-protein transferase activity", "8.8e-8"),
        ("GO:0003682", "Chromatin binding", "9.9e-8"),
        ("GO:0042802", "Identical protein binding", "1.1e-7"),
    ],
}

PATHWAYS = [
    ("hsa05210", "KEGG", "Colorectal cancer", "18/142", "1.2e-9", 18),
    ("hsa04110", "KEGG", "Cell cycle", "22/125", "3.4e-11", 22),
    ("hsa04115", "KEGG", "p53 signaling pathway", "15/69", "2.1e-10", 15),
    ("hsa04151", "KEGG", "PI3K-Akt signaling pathway", "31/354", "4.5e-9", 31),
    ("R-HSA-1640170", "Reactome", "Cell Cycle", "25/490", "1.1e-8", 25),
    ("R-HSA-611105", "Reactome", "Transcriptional regulation by small RNAs", "12/93", "3.2e-8", 12),
    ("R-HSA-3700989", "Reactome", "Transcriptional Regulation by TP53", "20/178", "5.6e-8", 20),
    ("hsa04012", "KEGG", "ErbB signaling pathway", "14/87", "7.8e-8", 14),
    ("R-HSA-69278", "Reactome", "Cell Cycle, Mitotic", "19/387", "9.1e-8", 19),
    ("hsa04310", "KEGG", "Wnt signaling pathway", "16/151", "1.3e-7", 16),
]

INVESTIGATORS = [
    {
        "name": "Dr. Jennifer A. Pietenpol",
        "institution": "Vanderbilt University Medical Center",
        "focus": "TP53 tumor suppressor, Triple-negative breast cancer",
        "grants": ["R35CA197463", "P50CA098131"],
        "h_index": 89,
    },
    {
        "name": "Dr. Channing J. Der",
        "institution": "University of North Carolina",
        "focus": "RAS oncoproteins, pancreatic cancer signaling",
        "grants": ["R35CA232113", "P01CA203657"],
        "h_index": 112,
    },
    {
        "name": "Dr. Kevin M. Shannon",
        "institution": "UCSF Helen Diller Comprehensive Cancer Center",
        "focus": "RAS pathway mutations, myeloid malignancies",
        "grants": ["R01CA207080", "U54CA209891"],
        "h_index": 74,
    },
    {
        "name": "Dr. Matthew Meyerson",
        "institution": "Dana-Farber Cancer Institute / Broad Institute",
        "focus": "Genomics of lung cancer, cancer genome analysis",
        "grants": ["R01CA211598", "U24CA210990"],
        "h_index": 128,
    },
    {
        "name": "Dr. Scott W. Lowe",
        "institution": "Memorial Sloan Kettering Cancer Center",
        "focus": "p53 pathway, apoptosis, cancer genetics",
        "grants": ["R35CA220508", "P30CA008748"],
        "h_index": 138,
    },
]

PUBLIC_DATASETS = [
    {
        "gse_id": "GSE62944",
        "type": "RNA-seq",
        "platform": "Illumina HiSeq",
        "samples": 9264,
        "description": "TCGA tumor/normal RNA-seq data, pan-cancer",
        "pmid": "26484167",
    },
    {
        "gse_id": "GSE102571",
        "type": "scRNA-seq",
        "platform": "10x Genomics Chromium",
        "samples": 57000,
        "description": "Single-cell transcriptomics of pancreatic tumors",
        "pmid": "29198524",
    },
    {
        "gse_id": "GSE116293",
        "type": "ChIP-seq",
        "platform": "Illumina NextSeq 500",
        "samples": 48,
        "description": "H3K27ac ChIP-seq in cancer cell lines",
        "pmid": "30359982",
    },
    {
        "gse_id": "GSE154763",
        "type": "ATAC-seq",
        "platform": "Illumina NovaSeq",
        "samples": 112,
        "description": "Open chromatin profiling across TCGA cancer types",
        "pmid": "33974100",
    },
    {
        "gse_id": "GSE178341",
        "type": "scRNA-seq",
        "platform": "10x Genomics Chromium",
        "samples": 371000,
        "description": "Human colorectal cancer single-cell atlas",
        "pmid": "34497389",
    },
    {
        "gse_id": "GSE131907",
        "type": "scRNA-seq",
        "platform": "10x Genomics Chromium",
        "samples": 208000,
        "description": "Lung cancer single-cell transcriptomics",
        "pmid": "31915373",
    },
]

# ---------------------------------------------------------------------------
# Session state initialization
# ---------------------------------------------------------------------------
def init_session_state() -> None:
    defaults = {
        "notebook": [],
        "ai_insights": "",
        "deep_insights": "",
        "go_enrichment": None,
        "pathway_enrichment": None,
        "rescue_strategies": "",
        "selected_cluster": None,
        "cluster_analysis": "",
        "correlation_data": None,
        "last_analysis_params": {},
    }
    for key, val in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = val


init_session_state()

# ---------------------------------------------------------------------------
# Data generation
# ---------------------------------------------------------------------------
def generate_gene_expression_data(
    gene1: str,
    gene2: str,
    cancer_type: str,
    n_patients: int = 250,
    seed: int = 42,
) -> pd.DataFrame:
    """Generate realistic simulated gene expression data for two genes."""
    rng = np.random.default_rng(
        seed + hash(gene1 + gene2 + cancer_type) % (2**31)
    )

    # Correlation coefficient driven by gene-cancer biology
    base_corr = 0.35 + rng.uniform(-0.2, 0.35)

    # Simulate correlated expression values
    cov_matrix = [[1.0, base_corr], [base_corr, 1.0]]
    raw = rng.multivariate_normal([0, 0], cov_matrix, n_patients)

    gene1_expr = raw[:, 0] * 2.5 + rng.normal(0, 0.5, n_patients)
    gene2_expr = raw[:, 1] * 2.2 + rng.normal(0, 0.5, n_patients)

    # Normalize to log2 TPM-like values
    gene1_expr = gene1_expr - gene1_expr.min() + 1
    gene2_expr = gene2_expr - gene2_expr.min() + 1

    stages = rng.choice(["I", "II", "III", "IV"], n_patients, p=[0.2, 0.3, 0.3, 0.2])
    genders = rng.choice(["Male", "Female"], n_patients, p=[0.48, 0.52])
    ages = rng.integers(28, 85, n_patients)
    survival = rng.integers(6, 120, n_patients)
    mutation_status = rng.choice(["WT", "Mutant"], n_patients, p=[0.55, 0.45])
    pid_a = rng.integers(10, 99, n_patients)
    pid_b = rng.integers(1000, 9999, n_patients)

    df = pd.DataFrame(
        {
            "Patient_ID": [f"TCGA-{pid_a[i]:02d}-{pid_b[i]:04d}" for i in range(n_patients)],
            gene1: np.round(gene1_expr, 3),
            gene2: np.round(gene2_expr, 3),
            "Tumor_Stage": stages,
            "Gender": genders,
            "Age": ages,
            "Survival_Months": survival,
            "Mutation_Status": mutation_status,
        }
    )
    return df


def compute_correlation(df: pd.DataFrame, gene1: str, gene2: str) -> dict:
    """Compute Pearson and Spearman correlation statistics."""
    x = df[gene1].values
    y = df[gene2].values
    pearson_r, pearson_p = stats.pearsonr(x, y)
    spearman_r, spearman_p = stats.spearmanr(x, y)
    return {
        "pearson_r": round(float(pearson_r), 4),
        "pearson_p": float(pearson_p),
        "spearman_r": round(float(spearman_r), 4),
        "spearman_p": float(spearman_p),
        "n": len(df),
    }

# ---------------------------------------------------------------------------
# Smart gene suggestion
# ---------------------------------------------------------------------------
def suggest_gene_interactors(gene: str, cancer_type: str) -> list[str]:
    """Return biologically relevant gene suggestions based on the query gene."""
    base = GENE_INTERACTORS.get(gene, [])
    if not base:
        # Return a subset of common oncogenes excluding the query gene
        base = [g for g in COMMON_ONCOGENES if g != gene][:5]
    return base

# ---------------------------------------------------------------------------
# AI helpers
# ---------------------------------------------------------------------------
def _call_gemini(prompt: str, api_key: str, model: str = "gemini-2.0-flash-thinking-exp") -> str:
    """Call Google Gemini API."""
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        gen_model = genai.GenerativeModel(model)
        response = gen_model.generate_content(prompt)
        return response.text
    except Exception as exc:
        return f"⚠️ Gemini API error: {exc}"


def _call_claude(prompt: str, api_key: str) -> str:
    """Call Anthropic Claude API."""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text
    except Exception as exc:
        return f"⚠️ Claude API error: {exc}"


def _call_openai(prompt: str, api_key: str) -> str:
    """Call OpenAI GPT API."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2048,
        )
        return response.choices[0].message.content
    except Exception as exc:
        return f"⚠️ OpenAI API error: {exc}"


def _call_perplexity(prompt: str, api_key: str) -> str:
    """Call Perplexity AI API."""
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "sonar-pro",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 2048,
        }
        resp = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers=headers,
            json=payload,
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except Exception as exc:
        return f"⚠️ Perplexity API error: {exc}"


def _call_kimi(prompt: str, api_key: str) -> str:
    """Call Moonshot AI (Kimi) API."""
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "moonshot-v1-8k",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 2048,
        }
        resp = requests.post(
            "https://api.moonshot.cn/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except Exception as exc:
        return f"⚠️ Kimi API error: {exc}"


def call_llm(prompt: str, provider: str, api_keys: dict) -> str:
    """Route LLM call to the appropriate provider."""
    key = api_keys.get(provider, "")
    if not key:
        return f"⚠️ No API key provided for {provider}. Please add your key in the sidebar."
    dispatch = {
        "Gemini": _call_gemini,
        "Claude": _call_claude,
        "OpenAI": _call_openai,
        "Perplexity": _call_perplexity,
        "Kimi": _call_kimi,
    }
    fn = dispatch.get(provider)
    if fn is None:
        return f"⚠️ Unknown provider: {provider}"
    return fn(prompt, key)


def build_research_prompt(gene1: str, gene2: str, cancer_type: str, corr_stats: dict) -> str:
    return f"""You are an expert cancer molecular biologist performing translational research analysis.

**Gene Pair:** {gene1} × {gene2}  
**Cancer Type:** {cancer_type}  
**Correlation Statistics:**  
- Pearson r = {corr_stats['pearson_r']} (p = {corr_stats['pearson_p']})  
- Spearman ρ = {corr_stats['spearman_r']} (p = {corr_stats['spearman_p']})  
- n = {corr_stats['n']} patients

**Task:** Provide a comprehensive research analysis covering:

1. **Molecular Mechanism** – Explain the biological basis of the {gene1}/{gene2} co-expression relationship in {cancer_type}. Include protein interactions, shared pathway membership, and transcriptional co-regulation.

2. **Clinical Significance** – What does this correlation mean for patient stratification, prognosis, or treatment response in {cancer_type}?

3. **Therapeutic Vulnerabilities** – Based on this gene pair, what are the most actionable drug targets or combination therapy strategies?

4. **Experimental Validation** – What in-vitro and in-vivo experiments would most effectively validate this relationship?

5. **Key Literature** – Cite 3-5 seminal papers (author, journal, year) that anchor this gene pair in cancer biology.

Provide a structured, expert-level analysis suitable for inclusion in a grant application."""


def build_deep_insights_prompt(gene1: str, gene2: str, cancer_type: str, corr_stats: dict) -> str:
    return f"""You are an elite oncology researcher with deep expertise in multi-omics and systems biology.

**Gene Pair:** {gene1} × {gene2} | **Cancer:** {cancer_type}  
**Pearson r:** {corr_stats['pearson_r']} | **p-value:** {corr_stats['pearson_p']}

Using high-depth "chain-of-thought" reasoning, perform a deep biochemical analysis:

## DEEP INSIGHTS ANALYSIS

### 1. Mechanistic Deep Dive
Trace the exact molecular circuitry connecting {gene1} and {gene2}. Consider:
- Post-translational modifications (phosphorylation, ubiquitination, SUMOylation)
- Protein-protein interaction interfaces
- Transcriptional and epigenetic co-regulation
- Non-coding RNA regulatory layers (miRNA, lncRNA, circRNA)

### 2. Systems Biology Perspective
How do {gene1} and {gene2} function as a regulatory node within the broader oncogenic network in {cancer_type}? Consider network hubs, feedback loops, and crosstalk with parallel pathways.

### 3. Novel Hypothesis Generation
Propose 2-3 novel, testable hypotheses about the {gene1}/{gene2} axis that have NOT been extensively studied but are mechanistically plausible.

### 4. Cancer Subtype Heterogeneity
How might this gene pair behave differently across molecular subtypes of {cancer_type} (e.g., luminal vs basal, MSI-H vs MSS)?

### 5. Therapeutic Innovation
Propose innovative therapeutic strategies targeting this axis, including:
- PROTAC/molecular glue degrader opportunities
- Synthetic lethality partners
- Biomarker-driven patient stratification strategy

Format your response with clear headers and be as mechanistically specific as possible."""


def build_rescue_prompt(gene1: str, gene2: str, cancer_type: str) -> str:
    return f"""As a seasoned oncology research strategist, you are helping a team whose primary hypothesis about {gene1}/{gene2} in {cancer_type} has encountered unexpected lab results.

**Scenario:** The team hypothesized that inhibiting {gene1} would suppress {gene2}-driven tumor growth, but the expected phenotype was not observed in cell lines.

**Pivot & Rescue Analysis:**

1. **Failure Mode Analysis** – What are the 3 most likely reasons the hypothesis failed? (e.g., redundant pathways, cell-line artifact, dosing, compensatory mechanisms)

2. **Bypass Pathway Strategies** – Identify 3-4 alternative bypass pathways or compensatory mechanisms that may have rescued the cells. For each, suggest a specific inhibitor or genetic tool to test.

3. **Experimental Rescue Plans** – Provide 3 concrete experimental redesigns (with specific reagents, cell models, and readouts) to salvage the research program.

4. **Model Selection Guidance** – Recommend better preclinical models (PDX, organoids, co-culture systems) that would more faithfully recapitulate the in vivo biology.

5. **Reframing the Hypothesis** – Suggest a refined, more nuanced hypothesis that incorporates the null result and opens a new productive research angle.

Be specific, actionable, and cite relevant precedents from the cancer biology literature."""


def build_cluster_analysis_prompt(gene1: str, gene2: str, cancer_type: str, cluster_info: dict) -> str:
    return f"""A researcher has selected a specific patient cluster from a {gene1} vs {gene2} scatter plot in {cancer_type}.

**Cluster Characteristics:**
- Number of patients in cluster: {cluster_info.get('n', 'N/A')}
- Mean {gene1} expression: {cluster_info.get('mean_g1', 'N/A')}
- Mean {gene2} expression: {cluster_info.get('mean_g2', 'N/A')}
- Tumor Stage distribution: {cluster_info.get('stages', 'N/A')}
- Gender distribution: {cluster_info.get('gender', 'N/A')}

**Task:** Explain why this specific sub-population of {cancer_type} patients might be biologically unique:

1. What molecular features likely define this cluster?
2. What clinical implications does this sub-population have?
3. Is there a known cancer subtype or molecular signature that matches this profile?
4. What targeted therapy might be uniquely effective for this cluster?

Provide a focused, 200-300 word expert analysis."""

# ---------------------------------------------------------------------------
# GO & Pathway Enrichment (simulated with enrichment API call)
# ---------------------------------------------------------------------------
def run_go_enrichment(gene1: str, gene2: str) -> dict:
    """Return enriched GO terms for a gene pair."""
    rng = np.random.default_rng(hash(gene1 + gene2) % (2**31))
    bp_terms = [list(t) for t in GO_TERMS["Biological Process"]]
    mf_terms = [list(t) for t in GO_TERMS["Molecular Function"]]
    rng.shuffle(bp_terms)
    rng.shuffle(mf_terms)
    return {
        "Biological Process": bp_terms[:7],
        "Molecular Function": mf_terms[:6],
    }


def run_pathway_enrichment(gene1: str, gene2: str) -> list:
    """Return enriched pathways for a gene pair."""
    rng = np.random.default_rng(hash(gene1 + gene2) % (2**31))
    paths = list(PATHWAYS)
    rng.shuffle(paths)
    return paths[:8]

# ---------------------------------------------------------------------------
# Notebook helpers
# ---------------------------------------------------------------------------
def pin_to_notebook(entry_type: str, content: str) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    st.session_state.notebook.append(
        {"type": entry_type, "content": content, "timestamp": timestamp}
    )
    st.success("📌 Pinned to Research Notebook!")


def export_notebook_markdown(
    notebook: list,
    gene1: str,
    gene2: str,
    cancer_type: str,
) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines = [
        f"# OncoCorr Research Notebook",
        f"",
        f"**Gene Pair:** {gene1} × {gene2}  ",
        f"**Cancer Type:** {cancer_type}  ",
        f"**Exported:** {now}  ",
        f"",
        f"---",
        f"",
    ]
    for i, entry in enumerate(notebook, 1):
        lines += [
            f"## Entry {i}: {entry['type']}",
            f"*{entry['timestamp']}*",
            f"",
            entry["content"],
            f"",
            f"---",
            f"",
        ]
    return "\n".join(lines)

# ---------------------------------------------------------------------------
# Sidebar
# ---------------------------------------------------------------------------
with st.sidebar:
    st.markdown("## 🧬 OncoCorr")
    st.markdown("*AI-Augmented Multi-Omics Research*")
    st.divider()

    # Gene 1
    st.markdown("### Gene 1")
    gene1_input = st.text_input(
        "Enter Gene Symbol",
        value="GATA6",
        key="gene1_input",
        placeholder="e.g., KRAS, TP53, EGFR",
        label_visibility="collapsed",
    ).upper().strip()

    # Smart suggestion
    suggestions_g1 = suggest_gene_interactors(gene1_input, "")
    if suggestions_g1:
        st.caption(f"💡 Related: {' · '.join(suggestions_g1[:4])}")

    # Gene 2
    st.markdown("### Gene 2")
    gene2_input = st.text_input(
        "Enter Gene Symbol",
        value="HSF1",
        key="gene2_input",
        placeholder="e.g., SMAD4, MYC, PTEN",
        label_visibility="collapsed",
    ).upper().strip()

    suggestions_g2 = suggest_gene_interactors(gene2_input, "")
    if suggestions_g2:
        st.caption(f"💡 Related: {' · '.join(suggestions_g2[:4])}")

    # Cancer type
    st.markdown("### Cancer Type")
    cancer_type = st.selectbox(
        "Select Cancer Type",
        CANCER_TYPES,
        label_visibility="collapsed",
    )

    # Filters
    st.markdown("### Filters")
    col_a, col_b = st.columns(2)
    with col_a:
        stage_filter = st.multiselect(
            "Tumor Stage",
            ["I", "II", "III", "IV"],
            default=["I", "II", "III", "IV"],
        )
    with col_b:
        gender_filter = st.multiselect(
            "Gender",
            ["Male", "Female"],
            default=["Male", "Female"],
        )

    st.divider()

    # AI Provider selection
    st.markdown("### 🤖 AI Provider")
    ai_provider = st.selectbox(
        "Select LLM",
        ["Gemini", "Claude", "OpenAI", "Perplexity", "Kimi"],
        label_visibility="collapsed",
    )

    # API Keys
    with st.expander("🔑 API Keys", expanded=False):
        gemini_key = st.text_input("Gemini API Key", type="password", key="gemini_key")
        claude_key = st.text_input("Claude API Key", type="password", key="claude_key")
        openai_key = st.text_input("OpenAI API Key", type="password", key="openai_key")
        perplexity_key = st.text_input("Perplexity API Key", type="password", key="perplexity_key")
        kimi_key = st.text_input("Kimi API Key", type="password", key="kimi_key")

    api_keys = {
        "Gemini": gemini_key,
        "Claude": claude_key,
        "OpenAI": openai_key,
        "Perplexity": perplexity_key,
        "Kimi": kimi_key,
    }

    st.divider()
    run_analysis = st.button("🔬 Run Research Analysis", type="primary", use_container_width=True)
    run_enrichment = st.button("📊 GO & Pathway Enrichment", use_container_width=True)
    find_datasets = st.button("🔍 Find Datasets & PIs", use_container_width=True)

# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------
st.markdown(
    f"""
<div class="main-header">
    <h1>🧬 Ahmar's OncoCorr</h1>
    <p>AI-Augmented Multi-Omics Research & Gene Correlation Dashboard &nbsp;|&nbsp;
    Currently analyzing: <strong>{gene1_input}</strong> × <strong>{gene2_input}</strong>
    in <strong>{cancer_type.split("(")[0].strip()}</strong></p>
</div>
""",
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# Data generation & filtering
# ---------------------------------------------------------------------------
raw_df = generate_gene_expression_data(gene1_input, gene2_input, cancer_type)
df = raw_df[
    raw_df["Tumor_Stage"].isin(stage_filter) & raw_df["Gender"].isin(gender_filter)
].copy()
corr_stats = compute_correlation(df, gene1_input, gene2_input)
st.session_state.correlation_data = df

# ---------------------------------------------------------------------------
# TOP METRICS ROW
# ---------------------------------------------------------------------------
m1, m2, m3, m4, m5 = st.columns(5)
with m1:
    st.metric("Patients Analyzed", f"{len(df):,}", delta=f"of {len(raw_df)} total")
with m2:
    r_val = corr_stats["pearson_r"]
    delta_color = "normal" if r_val > 0 else "inverse"
    st.metric("Pearson r", f"{r_val}", delta="positive" if r_val > 0 else "negative")
with m3:
    st.metric("Spearman ρ", f"{corr_stats['spearman_r']}")
with m4:
    p_val = corr_stats["pearson_p"]
    sig = "✅ Significant" if p_val < 0.05 else "❌ Not Significant"
    st.metric("p-value", f"{p_val:.2e}", delta=sig)
with m5:
    r2 = round(corr_stats["pearson_r"] ** 2, 4)
    st.metric("R²", f"{r2}", delta=f"{round(r2*100, 1)}% variance")

st.divider()

# ---------------------------------------------------------------------------
# MAIN LAYOUT: Scatter Plot + AI Panel
# ---------------------------------------------------------------------------
col_plot, col_ai = st.columns([3, 2], gap="medium")

with col_plot:
    st.markdown(
        f'<div class="section-header">📈 Gene Correlation Scatter Plot: {gene1_input} vs {gene2_input}</div>',
        unsafe_allow_html=True,
    )

    # Color-by selector
    color_by = st.radio(
        "Color by:",
        ["Tumor_Stage", "Gender", "Mutation_Status"],
        horizontal=True,
        key="color_by",
    )

    color_map_stage = {"I": "#4CAF50", "II": "#FFC107", "III": "#FF5722", "IV": "#F44336"}
    color_map_gender = {"Male": "#42A5F5", "Female": "#EC407A"}
    color_map_mut = {"WT": "#66BB6A", "Mutant": "#EF5350"}

    color_map = {
        "Tumor_Stage": color_map_stage,
        "Gender": color_map_gender,
        "Mutation_Status": color_map_mut,
    }.get(color_by, color_map_stage)

    fig = px.scatter(
        df,
        x=gene1_input,
        y=gene2_input,
        color=color_by,
        color_discrete_map=color_map,
        hover_data=["Patient_ID", "Tumor_Stage", "Gender", "Age", "Survival_Months"],
        title=f"{gene1_input} vs {gene2_input} in {cancer_type.split('(')[0].strip()}",
        labels={
            gene1_input: f"{gene1_input} Expression (log₂)",
            gene2_input: f"{gene2_input} Expression (log₂)",
        },
        template="plotly_dark",
        opacity=0.8,
    )

    # Add trend line
    x_vals = df[gene1_input].values
    y_vals = df[gene2_input].values
    slope, intercept, _, _, _ = stats.linregress(x_vals, y_vals)
    x_range = np.linspace(x_vals.min(), x_vals.max(), 100)
    y_trend = slope * x_range + intercept

    fig.add_trace(
        go.Scatter(
            x=x_range,
            y=y_trend,
            mode="lines",
            name=f"Trend (r={corr_stats['pearson_r']})",
            line=dict(color="#ffffff", width=1.5, dash="dash"),
        )
    )

    fig.update_layout(
        height=480,
        plot_bgcolor="#0d1117",
        paper_bgcolor="#0d1117",
        font_color="#c9d1d9",
        legend=dict(bgcolor="#161b22", bordercolor="#30363d", borderwidth=1),
        title_font_size=14,
        margin=dict(l=50, r=30, t=60, b=50),
    )
    fig.update_xaxes(gridcolor="#21262d", zeroline=False)
    fig.update_yaxes(gridcolor="#21262d", zeroline=False)

    # Selection for cluster analysis
    selected_data = st.plotly_chart(fig, use_container_width=True, on_select="rerun")

    # Handle point selection for cluster analysis
    if selected_data and hasattr(selected_data, "selection") and selected_data.selection:
        pts = selected_data.selection.get("points", [])
        if pts:
            selected_indices = [p["point_index"] for p in pts if "point_index" in p]
            if selected_indices:
                cluster_df = df.iloc[selected_indices]
                cluster_info = {
                    "n": len(cluster_df),
                    "mean_g1": round(cluster_df[gene1_input].mean(), 3),
                    "mean_g2": round(cluster_df[gene2_input].mean(), 3),
                    "stages": cluster_df["Tumor_Stage"].value_counts().to_dict(),
                    "gender": cluster_df["Gender"].value_counts().to_dict(),
                }
                with st.expander(f"🔍 Cluster Analysis ({len(cluster_df)} patients selected)", expanded=True):
                    if st.button("🤖 Analyze This Cluster", key="analyze_cluster"):
                        with st.spinner("Analyzing selected cluster..."):
                            prompt = build_cluster_analysis_prompt(
                                gene1_input, gene2_input, cancer_type, cluster_info
                            )
                            result = call_llm(prompt, ai_provider, api_keys)
                            st.session_state.cluster_analysis = result
                    if st.session_state.cluster_analysis:
                        st.markdown(st.session_state.cluster_analysis)
                        if st.button("📌 Pin Cluster Analysis", key="pin_cluster"):
                            pin_to_notebook("Cluster Analysis", st.session_state.cluster_analysis)

    # Violin plots by stage
    with st.expander("🎻 Expression Distribution by Stage", expanded=False):
        v_col1, v_col2 = st.columns(2)
        with v_col1:
            fig_v1 = px.violin(
                df,
                x="Tumor_Stage",
                y=gene1_input,
                color="Tumor_Stage",
                color_discrete_map=color_map_stage,
                box=True,
                title=f"{gene1_input} by Stage",
                template="plotly_dark",
                category_orders={"Tumor_Stage": ["I", "II", "III", "IV"]},
            )
            fig_v1.update_layout(
                height=300,
                plot_bgcolor="#0d1117",
                paper_bgcolor="#0d1117",
                showlegend=False,
                margin=dict(l=40, r=20, t=40, b=40),
            )
            st.plotly_chart(fig_v1, use_container_width=True)
        with v_col2:
            fig_v2 = px.violin(
                df,
                x="Tumor_Stage",
                y=gene2_input,
                color="Tumor_Stage",
                color_discrete_map=color_map_stage,
                box=True,
                title=f"{gene2_input} by Stage",
                template="plotly_dark",
                category_orders={"Tumor_Stage": ["I", "II", "III", "IV"]},
            )
            fig_v2.update_layout(
                height=300,
                plot_bgcolor="#0d1117",
                paper_bgcolor="#0d1117",
                showlegend=False,
                margin=dict(l=40, r=20, t=40, b=40),
            )
            st.plotly_chart(fig_v2, use_container_width=True)

with col_ai:
    st.markdown(
        '<div class="section-header">🤖 AI Research Analysis</div>',
        unsafe_allow_html=True,
    )

    if run_analysis or st.session_state.ai_insights:
        if run_analysis:
            prompt = build_research_prompt(
                gene1_input, gene2_input, cancer_type, corr_stats
            )
            with st.spinner(f"Running analysis with {ai_provider}..."):
                st.session_state.ai_insights = call_llm(prompt, ai_provider, api_keys)
                st.session_state.last_analysis_params = {
                    "gene1": gene1_input,
                    "gene2": gene2_input,
                    "cancer": cancer_type,
                    "provider": ai_provider,
                }

        if st.session_state.ai_insights:
            st.markdown(
                f'<div class="ai-response">{st.session_state.ai_insights}</div>',
                unsafe_allow_html=True,
            )
            if st.button("📌 Pin Research Analysis", key="pin_analysis"):
                pin_to_notebook("Research Analysis", st.session_state.ai_insights)
    else:
        st.info(
            "👈 Click **Run Research Analysis** in the sidebar to generate an AI-powered "
            "report for this gene pair. Add your API key in the sidebar under 🔑 API Keys."
        )
        # Preview card
        st.markdown(f"""
**What this analysis covers:**
- 🔬 Molecular mechanism of {gene1_input}/{gene2_input} co-expression
- 🏥 Clinical significance in {cancer_type.split("(")[0].strip()}
- 💊 Therapeutic vulnerabilities
- 🧪 Experimental validation strategies
- 📚 Key literature references
""")

    # Deep Insights button
    st.divider()
    st.markdown('<div class="section-header">🧠 Deep Insights (High-Thinking Mode)</div>', unsafe_allow_html=True)

    if st.button("⚡ Generate Deep Insights", key="deep_btn", use_container_width=True):
        prompt = build_deep_insights_prompt(
            gene1_input, gene2_input, cancer_type, corr_stats
        )
        with st.spinner(f"Deep reasoning with {ai_provider}..."):
            st.session_state.deep_insights = call_llm(prompt, ai_provider, api_keys)

    if st.session_state.deep_insights:
        with st.expander("🧠 Deep Insights", expanded=True):
            st.markdown(st.session_state.deep_insights)
            if st.button("📌 Pin Deep Insights", key="pin_deep"):
                pin_to_notebook("Deep Insights", st.session_state.deep_insights)

    # Pivot & Rescue
    st.divider()
    st.markdown('<div class="section-header">🔄 Pivot & Rescue Strategies</div>', unsafe_allow_html=True)

    if st.button("🆘 Generate Rescue Strategies", key="rescue_btn", use_container_width=True):
        prompt = build_rescue_prompt(gene1_input, gene2_input, cancer_type)
        with st.spinner("Generating rescue strategies..."):
            st.session_state.rescue_strategies = call_llm(prompt, ai_provider, api_keys)

    if st.session_state.rescue_strategies:
        with st.expander("🔄 Pivot & Rescue", expanded=True):
            st.markdown(st.session_state.rescue_strategies)
            if st.button("📌 Pin Rescue Strategies", key="pin_rescue"):
                pin_to_notebook("Pivot & Rescue Strategies", st.session_state.rescue_strategies)

# ---------------------------------------------------------------------------
# GO & PATHWAY ENRICHMENT
# ---------------------------------------------------------------------------
st.divider()
st.markdown(
    '<div class="section-header">🧬 GO & Pathway Enrichment Analysis</div>',
    unsafe_allow_html=True,
)

if run_enrichment or st.session_state.go_enrichment:
    if run_enrichment:
        with st.spinner("Running GO and pathway enrichment..."):
            st.session_state.go_enrichment = run_go_enrichment(gene1_input, gene2_input)
            st.session_state.pathway_enrichment = run_pathway_enrichment(gene1_input, gene2_input)

    enr_col1, enr_col2, enr_col3 = st.columns([2, 2, 2])

    with enr_col1:
        st.markdown("**Biological Process (GO)**")
        bp_data = st.session_state.go_enrichment.get("Biological Process", [])
        bp_df = pd.DataFrame(bp_data, columns=["GO ID", "Term", "FDR"])
        st.dataframe(
            bp_df,
            hide_index=True,
            use_container_width=True,
            height=280,
        )

    with enr_col2:
        st.markdown("**Molecular Function (GO)**")
        mf_data = st.session_state.go_enrichment.get("Molecular Function", [])
        mf_df = pd.DataFrame(mf_data, columns=["GO ID", "Term", "FDR"])
        st.dataframe(
            mf_df,
            hide_index=True,
            use_container_width=True,
            height=280,
        )

    with enr_col3:
        st.markdown("**KEGG / Reactome Pathways**")
        if st.session_state.pathway_enrichment:
            pw_df = pd.DataFrame(
                [(p[0], p[1], p[2], p[3], p[4]) for p in st.session_state.pathway_enrichment],
                columns=["ID", "DB", "Pathway", "Ratio", "FDR"],
            )
            st.dataframe(pw_df, hide_index=True, use_container_width=True, height=280)

    # Bubble chart for pathways
    if st.session_state.pathway_enrichment:
        with st.expander("📊 Pathway Enrichment Bubble Chart", expanded=False):
            pw_data = st.session_state.pathway_enrichment
            bubble_df = pd.DataFrame(
                {
                    "Pathway": [p[2] for p in pw_data],
                    "Database": [p[1] for p in pw_data],
                    "FDR": [-np.log10(float(p[4])) for p in pw_data],
                    "Gene_Count": [p[5] for p in pw_data],
                }
            )
            fig_bubble = px.scatter(
                bubble_df,
                x="Gene_Count",
                y="Pathway",
                size="Gene_Count",
                color="FDR",
                color_continuous_scale="Reds",
                hover_data=["Database"],
                title="Pathway Enrichment (size = gene count, color = -log10 FDR)",
                template="plotly_dark",
                labels={"FDR": "-log₁₀(FDR)", "Gene_Count": "Gene Count"},
            )
            fig_bubble.update_layout(
                height=400,
                plot_bgcolor="#0d1117",
                paper_bgcolor="#0d1117",
                margin=dict(l=20, r=20, t=50, b=20),
            )
            st.plotly_chart(fig_bubble, use_container_width=True)

    pin_col, _ = st.columns([1, 3])
    with pin_col:
        if st.button("📌 Pin Enrichment Results", key="pin_enrichment"):
            content = f"**GO Biological Process:**\n" + "\n".join(
                [f"- {t[0]}: {t[1]} (FDR={t[2]})" for t in bp_data[:5]]
            )
            pin_to_notebook("GO & Pathway Enrichment", content)
else:
    st.info("👈 Click **GO & Pathway Enrichment** in the sidebar to run enrichment analysis for the selected gene pair.")

# ---------------------------------------------------------------------------
# INVESTIGATOR LOOKUP & DATASETS
# ---------------------------------------------------------------------------
st.divider()
st.markdown(
    '<div class="section-header">🔎 Data & Investigator Intelligence</div>',
    unsafe_allow_html=True,
)

if find_datasets or "investigator_loaded" in st.session_state:
    if find_datasets:
        st.session_state["investigator_loaded"] = True

    inv_col, ds_col = st.columns([1, 1], gap="medium")

    with inv_col:
        st.markdown("**🏛️ Leading Investigators & Active Grants**")
        rng_inv = np.random.default_rng(hash(gene1_input + gene2_input + cancer_type) % (2**31))
        selected_pis = rng_inv.choice(len(INVESTIGATORS), size=min(3, len(INVESTIGATORS)), replace=False)
        for idx in selected_pis:
            pi = INVESTIGATORS[idx]
            with st.container():
                st.markdown(
                    f"""
**{pi['name']}**  
🏛️ {pi['institution']}  
🔬 *{pi['focus']}*  
📊 h-index: **{pi['h_index']}** &nbsp; | &nbsp; Grants: {' · '.join([f'`{g}`' for g in pi['grants']])}
""",
                )
                st.divider()

    with ds_col:
        st.markdown("**📦 Relevant Public Datasets**")
        rng_ds = np.random.default_rng(hash(gene1_input + cancer_type) % (2**31))
        selected_ds = rng_ds.choice(len(PUBLIC_DATASETS), size=min(4, len(PUBLIC_DATASETS)), replace=False)
        for idx in selected_ds:
            ds = PUBLIC_DATASETS[idx]
            badge_color = {
                "RNA-seq": "badge-blue",
                "scRNA-seq": "badge-purple",
                "ChIP-seq": "badge-green",
                "ATAC-seq": "badge-red",
            }.get(ds["type"], "badge-blue")
            st.markdown(
                f"""<span class="badge {badge_color}">{ds['type']}</span> **{ds['gse_id']}**  
📋 {ds['description']}  
🖥️ {ds['platform']} | 👥 {ds['samples']:,} samples | PMID: [{ds['pmid']}](https://pubmed.ncbi.nlm.nih.gov/{ds['pmid']}/)
""",
                unsafe_allow_html=True,
            )
            st.divider()
else:
    st.info("👈 Click **Find Datasets & PIs** in the sidebar to identify relevant investigators and public datasets.")

# ---------------------------------------------------------------------------
# CHAT INTERFACE
# ---------------------------------------------------------------------------
st.divider()
st.markdown(
    '<div class="section-header">💬 AI Research Chat</div>',
    unsafe_allow_html=True,
)

if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

chat_col1, chat_col2 = st.columns([4, 1])
with chat_col1:
    chat_input = st.text_input(
        "Ask anything about your gene pair or cancer biology...",
        key="chat_input",
        placeholder=f"e.g., What is the role of {gene1_input} in metastasis of {cancer_type.split('(')[0].strip()}?",
        label_visibility="collapsed",
    )
with chat_col2:
    send_chat = st.button("Send →", key="send_chat", use_container_width=True)

if send_chat and chat_input:
    with st.spinner("Thinking..."):
        context = (
            f"You are an expert oncology research assistant. The researcher is studying "
            f"{gene1_input} × {gene2_input} in {cancer_type}. "
            f"Pearson r = {corr_stats['pearson_r']}, p = {corr_stats['pearson_p']}.\n\n"
            f"Question: {chat_input}"
        )
        response = call_llm(context, ai_provider, api_keys)
        st.session_state.chat_history.append(
            {"role": "user", "content": chat_input, "time": datetime.now().strftime("%H:%M")}
        )
        st.session_state.chat_history.append(
            {"role": "assistant", "content": response, "time": datetime.now().strftime("%H:%M"), "provider": ai_provider}
        )

# Display chat history
if st.session_state.chat_history:
    for chat_idx, msg in enumerate(st.session_state.chat_history[-10:]):
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
            if msg["role"] == "assistant":
                pin_chat_col, _ = st.columns([1, 5])
                with pin_chat_col:
                    if st.button("📌 Pin", key=f"pin_chat_{chat_idx}"):
                        pin_to_notebook("Chat Response", msg["content"])

# ---------------------------------------------------------------------------
# RESEARCH NOTEBOOK
# ---------------------------------------------------------------------------
st.divider()
st.markdown(
    '<div class="section-header">📓 Collaborative Research Notebook</div>',
    unsafe_allow_html=True,
)

if not st.session_state.notebook:
    st.info(
        "Your research notebook is empty. Use the **📌 Pin** buttons throughout the app to "
        "curate insights, analysis results, and chat responses here."
    )
else:
    nb_col1, nb_col2 = st.columns([3, 1])
    with nb_col1:
        st.markdown(f"**{len(st.session_state.notebook)} entries pinned**")
    with nb_col2:
        if st.button("🗑️ Clear Notebook", key="clear_nb"):
            st.session_state.notebook = []
            st.rerun()

    for i, entry in enumerate(st.session_state.notebook):
        with st.container():
            header_col, del_col = st.columns([5, 1])
            with header_col:
                st.markdown(
                    f'<div class="notebook-entry">'
                    f'<strong>#{i+1} {entry["type"]}</strong> &nbsp;'
                    f'<span style="color: #8b949e; font-size: 0.8rem;">{entry["timestamp"]}</span>'
                    f'<br><span style="color: #c9d1d9;">{entry["content"][:300]}{"..." if len(entry["content"]) > 300 else ""}</span>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
            with del_col:
                if st.button("✕", key=f"del_nb_{i}", help="Remove this entry"):
                    st.session_state.notebook.pop(i)
                    st.rerun()

    # Export
    st.divider()
    export_col1, export_col2 = st.columns(2)
    with export_col1:
        if st.button("📄 Export as Markdown Report", key="export_md", use_container_width=True):
            md_content = export_notebook_markdown(
                st.session_state.notebook, gene1_input, gene2_input, cancer_type
            )
            st.download_button(
                label="⬇️ Download Markdown",
                data=md_content,
                file_name=f"oncorr_{gene1_input}_{gene2_input}_{datetime.now().strftime('%Y%m%d_%H%M')}.md",
                mime="text/markdown",
                key="download_md",
            )
    with export_col2:
        if st.button("📋 Export as JSON", key="export_json", use_container_width=True):
            json_content = json.dumps(
                {
                    "gene1": gene1_input,
                    "gene2": gene2_input,
                    "cancer_type": cancer_type,
                    "correlation": corr_stats,
                    "notebook": st.session_state.notebook,
                    "exported_at": datetime.now().isoformat(),
                },
                indent=2,
            )
            st.download_button(
                label="⬇️ Download JSON",
                data=json_content,
                file_name=f"oncorr_{gene1_input}_{gene2_input}_{datetime.now().strftime('%Y%m%d_%H%M')}.json",
                mime="application/json",
                key="download_json",
            )

# ---------------------------------------------------------------------------
# FOOTER
# ---------------------------------------------------------------------------
st.divider()
st.markdown(
    """
<div style="text-align: center; color: #8b949e; font-size: 0.8rem; padding: 1rem 0;">
    🧬 <strong>Ahmar's OncoCorr</strong> &nbsp;|&nbsp; 
    AI-Augmented Multi-Omics Research & Gene Correlation Dashboard &nbsp;|&nbsp;
    Powered by Gemini · Claude · OpenAI · Perplexity · Kimi &nbsp;|&nbsp;
    Data is simulated for demonstration — connect TCGA/GEO APIs for real data
</div>
""",
    unsafe_allow_html=True,
)
