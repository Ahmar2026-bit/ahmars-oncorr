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
  // Keys are intentionally stored as clear text in localStorage — this is a
  // client-side-only SPA and the keys are sent directly from the browser to the
  // provider APIs. There is no server-side storage, and no more secure browser
  // storage option is available for credentials that must be readable by JS.
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

const SELECTED_PROVIDER_KEY = 'oncorr_selected_provider';

/** Returns the user-chosen provider, or 'auto' if none has been explicitly set. */
export function getSelectedProvider(): string {
  return localStorage.getItem(SELECTED_PROVIDER_KEY) ?? 'auto';
}

/** Persist the user's provider choice. Pass 'auto' to clear the preference. */
export function saveSelectedProvider(provider: string): void {
  if (provider === 'auto') {
    localStorage.removeItem(SELECTED_PROVIDER_KEY);
  } else {
    localStorage.setItem(SELECTED_PROVIDER_KEY, provider);
  }
}
