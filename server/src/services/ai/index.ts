import { config } from '../../config';
import { createGeminiProvider } from './gemini';
import { withGuard } from './guard';
import { localProvider } from './local';
import { mockProvider } from './mock';
import type { AIProvider } from './provider';

let cached: AIProvider | null = null;

export function getAI(): AIProvider {
  if (cached) return cached;
  const mode = config.aiProvider;
  if (mode === 'mock') cached = mockProvider;
  else if (mode === 'local') cached = localProvider;
  else if (mode === 'gemini' || (mode === 'auto' && config.geminiApiKey)) {
    if (!config.geminiApiKey) {
      console.warn('[ai] AI_PROVIDER=gemini but GEMINI_API_KEY is empty — using local parser');
      cached = localProvider;
    } else cached = withGuard(createGeminiProvider(config.geminiApiKey, config.geminiModel));
  } else cached = localProvider;
  console.log(`[ai] provider: ${cached.name}`);
  return cached;
}

export type { AIProvider } from './provider';
