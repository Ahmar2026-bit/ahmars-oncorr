export type AiProvider = 'Gemini' | 'Claude' | 'OpenAI' | 'Perplexity' | 'Kimi';

export interface ApiKeys {
  gemini: string;
  claude: string;
  openai: string;
  perplexity: string;
  kimi: string;
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gemini API error (${resp.status}): ${err}`);
  }
  const data = await resp.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '(no response)';
}

async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI API error (${resp.status}): ${err}`);
  }
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content ?? '(no response)';
}

async function callClaude(prompt: string, apiKey: string): Promise<string> {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Claude API error (${resp.status}): ${err}`);
  }
  const data = await resp.json();
  return data?.content?.[0]?.text ?? '(no response)';
}

async function callPerplexity(prompt: string, apiKey: string): Promise<string> {
  const resp = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-large-128k-online',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Perplexity API error (${resp.status}): ${err}`);
  }
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content ?? '(no response)';
}

async function callKimi(prompt: string, apiKey: string): Promise<string> {
  const resp = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'moonshot-v1-8k',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Kimi API error (${resp.status}): ${err}`);
  }
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content ?? '(no response)';
}

export async function callLLM(
  prompt: string,
  provider: AiProvider,
  keys: ApiKeys,
): Promise<string> {
  const keyMap: Record<AiProvider, string> = {
    Gemini: keys.gemini,
    Claude: keys.claude,
    OpenAI: keys.openai,
    Perplexity: keys.perplexity,
    Kimi: keys.kimi,
  };
  const apiKey = keyMap[provider];
  if (!apiKey) throw new Error(`No API key provided for ${provider}.`);

  switch (provider) {
    case 'Gemini': return callGemini(prompt, apiKey);
    case 'OpenAI': return callOpenAI(prompt, apiKey);
    case 'Claude': return callClaude(prompt, apiKey);
    case 'Perplexity': return callPerplexity(prompt, apiKey);
    case 'Kimi': return callKimi(prompt, apiKey);
  }
}

export function buildResearchPrompt(
  geneA: string,
  geneB: string,
  cancerType: string,
  pearsonR: number,
  pValue: number,
  nSamples: number,
): string {
  return `You are an expert translational oncologist and computational biologist.

Analyze the following gene correlation finding from a multi-omics study:

**Gene Pair:** ${geneA} × ${geneB}
**Cancer Type:** ${cancerType}
**Pearson r:** ${pearsonR.toFixed(3)}
**P-value:** ${pValue.toExponential(2)}
**N samples:** ${nSamples}

Please provide a structured expert analysis covering:

1. **Molecular Mechanism** — Explain the biological basis for this co-expression pattern. What molecular pathways link ${geneA} and ${geneB}?

2. **Clinical Significance** — What does this correlation mean for patient prognosis and treatment in ${cancerType}?

3. **Therapeutic Vulnerabilities** — Identify 2-3 actionable therapeutic strategies targeting this ${geneA}/${geneB} axis.

4. **Experimental Validation** — Suggest 3 wet-lab experiments to validate this finding.

5. **Key Literature** — Cite 3-5 relevant published studies (provide PubMed IDs if known).

Provide a structured, expert-level analysis suitable for inclusion in a grant application.`;
}

export function buildDeepInsightsPrompt(
  geneA: string,
  geneB: string,
  cancerType: string,
  pearsonR: number,
): string {
  return `You are a world-class molecular oncologist performing "high-thinking" deep analysis.

## DEEP INSIGHTS ANALYSIS
**Gene Pair:** ${geneA} × ${geneB} | **Cancer:** ${cancerType} | **Pearson r = ${pearsonR.toFixed(3)}**

### 1. Mechanistic Deep Dive
Provide a detailed mechanistic explanation of how ${geneA} and ${geneB} interact at the protein, transcriptional, and epigenetic levels. Include post-translational modifications and non-coding RNA regulation.

### 2. Systems Biology Perspective
How does this gene pair fit within the broader oncogenic signaling network in ${cancerType}? Identify synthetic lethal interactions and feedback loops.

### 3. Novel Hypothesis Generation
Propose 2-3 novel, testable hypotheses about the ${geneA}/${geneB} axis that have NOT been extensively studied but are mechanistically plausible.

### 4. Cancer Subtype Heterogeneity
How might this correlation differ across molecular subtypes of ${cancerType}? Which subtype is most likely to be therapeutically relevant?

### 5. Therapeutic Innovation
Propose one cutting-edge therapeutic approach (e.g., PROTAC, bispecific antibody, synthetic lethality) targeting this gene pair. Include mechanism of action and potential resistance mechanisms.`;
}

export function buildRescuePrompt(
  geneA: string,
  geneB: string,
  cancerType: string,
): string {
  return `You are an expert oncology strategist specializing in experimental failure analysis.

A wet-lab experiment targeting the **${geneA}/${geneB}** axis in **${cancerType}** has failed to show the expected biological effect.

Generate a comprehensive **Pivot & Rescue Strategy** covering:

1. **Failure Mode Analysis** — List the 3 most likely reasons why the experiment failed (molecular, technical, or biological).

2. **Bypass Pathway Strategies** — Identify 3-4 alternative bypass pathways or compensatory mechanisms that may have rescued the cells. For each, suggest a specific inhibitor or genetic tool to test.

3. **Alternative Experimental Designs** — Propose 3 orthogonal experimental approaches that could rescue or validate the hypothesis differently.

4. **Biomarker Stratification** — Suggest patient stratification biomarkers that might identify the subset where the hypothesis holds.

5. **Salvageable Scientific Value** — Explain how to reframe this negative result as a publishable finding or redirect the research direction productively.`;
}
