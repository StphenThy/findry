import type { GapAdvice, ParsedResume, SkillSuggestion } from '../../types';

/**
 * Everything "AI" in Findry goes through this interface so the provider can be
 * swapped with one env var (AI_PROVIDER=gemini|local|mock). The deterministic
 * match score never depends on it — only parsing, suggestions and advice do.
 */
export interface AIProvider {
  readonly name: string;
  parseResume(rawText: string): Promise<ParsedResume>;
  suggestSkills(jobTitle: string, description?: string): Promise<SkillSuggestion>;
  gapAdvice(input: {
    jobTitle: string;
    missingSkills: string[];
    seekerHeadline?: string;
  }): Promise<GapAdvice[]>;
}
