const KEYS = {
  groq: 'oncorr_groq_api_key',
  deepseek: 'oncorr_deepseek_api_key',
  gemini: 'oncorr_gemini_api_key',
  openrouter: 'oncorr_openrouter_api_key',
} as const;

export type SettingsKeys = typeof KEYS;

export interface ApiKeys {
  groq: string;
  deepseek: string;
  gemini: string;
  openrouter: string;
}

export function getStoredApiKeys(): ApiKeys {
  return {
    groq: localStorage.getItem(KEYS.groq) ?? '',
    deepseek: localStorage.getItem(KEYS.deepseek) ?? '',
    gemini: localStorage.getItem(KEYS.gemini) ?? '',
    openrouter: localStorage.getItem(KEYS.openrouter) ?? '',
  };
}

export function saveApiKeys(keys: Partial<ApiKeys>): void {
  for (const [provider, storageKey] of Object.entries(KEYS) as [keyof ApiKeys, string][]) {
    const value = keys[provider];
    if (value !== undefined) {
      if (value.trim()) {
        localStorage.setItem(storageKey, value.trim());
      } else {
        localStorage.removeItem(storageKey);
      }
    }
  }
}

export function getApiKey(provider: keyof ApiKeys): string {
  return localStorage.getItem(KEYS[provider]) ?? '';
}
