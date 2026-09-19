import { GoogleGenAI, Type } from '@google/genai';
import type { GapAdvice, ParsedResume, SkillSuggestion } from '../../types';
import { normalizeSkills } from '../matching/skills';
import type { AIProvider } from './provider';

/**
 * Google Gemini provider (free tier). Every call asks for strict JSON via a
 * responseSchema. Errors are thrown, not swallowed: the guard layer
 * (./guard.ts) owns caching, budgets and the fall back to the local engine.
 */
export function createGeminiProvider(apiKey: string, model: string): AIProvider {
  const ai = new GoogleGenAI({ apiKey });

  async function generateJSON<T>(prompt: string, schema: object): Promise<T> {
    const res = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.2,
      },
    });
    const text = res.text ?? '';
    return JSON.parse(text) as T;
  }

  const resumeSchema = {
    type: Type.OBJECT,
    properties: {
      fullName: { type: Type.STRING },
      email: { type: Type.STRING },
      phone: { type: Type.STRING },
      headline: { type: Type.STRING, description: 'Current or most recent job title, e.g. "Senior Frontend Engineer"' },
      location: { type: Type.STRING, description: 'City / region in the Philippines if present' },
      summary: { type: Type.STRING },
      skills: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Technical and domain skills, canonical names (React, Node.js, AWS...)' },
      yearsExperience: { type: Type.NUMBER, description: 'Total years of professional experience, deduplicating overlapping roles' },
      experience: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            company: { type: Type.STRING },
            title: { type: Type.STRING },
            from: { type: Type.STRING, description: 'YYYY or YYYY-MM' },
            to: { type: Type.STRING, description: 'YYYY, YYYY-MM or "Present"' },
            location: { type: Type.STRING },
            description: { type: Type.STRING, description: '1-2 sentences, keep quantified results' },
          },
          required: ['company', 'title'],
        },
      },
      education: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            school: { type: Type.STRING },
            degree: { type: Type.STRING },
            field: { type: Type.STRING },
            from: { type: Type.STRING },
            to: { type: Type.STRING },
            honors: { type: Type.STRING },
          },
          required: ['school'],
        },
      },
      links: {
        type: Type.OBJECT,
        properties: {
          linkedin: { type: Type.STRING },
          github: { type: Type.STRING },
          portfolio: { type: Type.STRING },
        },
      },
      highlights: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Up to 5 quantified achievements verbatim' },
      confidence: { type: Type.NUMBER, description: '0-100 confidence that extraction is accurate' },
    },
    required: ['skills', 'yearsExperience', 'experience', 'education', 'confidence'],
  };

  const suggestionSchema = {
    type: Type.OBJECT,
    properties: {
      required: { type: Type.ARRAY, items: { type: Type.STRING } },
      preferred: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ['required', 'preferred'],
  };

  const adviceSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        skill: { type: Type.STRING },
        why: { type: Type.STRING },
        resource: { type: Type.STRING, description: 'A specific, preferably free course or certification' },
        estimatedHours: { type: Type.NUMBER },
        salaryImpact: { type: Type.STRING, description: 'e.g. "+₱10k–₱20k/mo" for the Philippine market' },
      },
      required: ['skill', 'why', 'resource'],
    },
  };

  return {
    name: 'gemini',

    async parseResume(rawText: string): Promise<ParsedResume> {
      try {
        const parsed = await generateJSON<ParsedResume>(
          `You are a resume parser for a Philippine tech job platform. Extract structured data from the resume below.
Rules:
- Use canonical skill names (e.g. "React" not "ReactJS", "Node.js", "AWS", "PostgreSQL").
- yearsExperience must deduplicate overlapping roles.
- Keep quantified achievements in highlights verbatim.
- If a field is not present, omit it. Do not invent data.

RESUME:
"""
${rawText.slice(0, 30000)}
"""`,
          resumeSchema,
        );
        return {
          ...parsed,
          skills: normalizeSkills(parsed.skills || []),
          experience: parsed.experience || [],
          education: parsed.education || [],
          yearsExperience: Number(parsed.yearsExperience) || 0,
          confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 70)),
        };
      } catch (err) {
        throw new Error(`gemini parseResume: ${(err as Error).message}`);
      }
    },

    async suggestSkills(jobTitle: string, description = ''): Promise<SkillSuggestion> {
      try {
        const s = await generateJSON<SkillSuggestion>(
          `For a job posting in the Philippine tech market titled "${jobTitle}"${
            description ? ` with this description:\n"""${description.slice(0, 4000)}"""` : ''
          }
Return 4-6 must-have "required" skills and 4-8 "preferred" skills. Use canonical names (React, TypeScript, AWS, Docker, PostgreSQL...). Do not repeat a skill in both lists.`,
          suggestionSchema,
        );
        const required = normalizeSkills(s.required || []);
        const preferred = normalizeSkills(s.preferred || []).filter((p) => !required.includes(p));
        return { required, preferred };
      } catch (err) {
        throw new Error(`gemini suggestSkills: ${(err as Error).message}`);
      }
    },

    async gapAdvice(input): Promise<GapAdvice[]> {
      if (!input.missingSkills.length) return [];
      try {
        return await generateJSON<GapAdvice[]>(
          `A job seeker in the Philippines${input.seekerHeadline ? ` (${input.seekerHeadline})` : ''} is applying for "${input.jobTitle}" but is missing these skills: ${input.missingSkills.join(', ')}.
For each missing skill give: why it matters for this role (1 sentence), one specific free or cheap learning resource, estimated hours to reach a job-ready basic level, and the typical monthly salary impact in Philippine pesos (₱).`,
          adviceSchema,
        );
      } catch (err) {
        throw new Error(`gemini gapAdvice: ${(err as Error).message}`);
      }
    },
  };
}
