import type { EducationEntry, ExperienceEntry, GapAdvice, ParsedResume, SkillSuggestion } from '../../types';
import { extractSkillsFromText, suggestSkillsLocal } from '../matching/skills';
import type { AIProvider } from './provider';

/**
 * Deterministic resume parser. No network, no keys. Used as the default when
 * no Gemini key is configured and as the fallback whenever Gemini fails.
 * It is heuristic (regex + dictionary) but produces the same shape as the LLM.
 */

const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec';
const DATE = `(?:(?:${MONTHS})[a-z]*\\.?\\s+)?(?:19|20)\\d{2}`;
const RANGE_RE = new RegExp(`(${DATE})\\s*[-–—to]+\\s*(${DATE}|present|current|now)`, 'gi');
const YEARS_RE = /(\d{1,2})\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:professional\s+)?experience/i;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(\+?63|0)\s?9\d{2}[\s-]?\d{3}[\s-]?\d{4}/;
const LINKEDIN_RE = /linkedin\.com\/in\/[a-z0-9_-]+/i;
const GITHUB_RE = /github\.com\/[a-z0-9_-]+/i;
const URL_RE = /https?:\/\/[^\s)]+/gi;

const yearOf = (s: string) => {
  const m = s.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : undefined;
};

function computeYears(text: string, fullText = text): number {
  // "5+ years of experience" stated anywhere in the resume wins over date math
  const explicit = fullText.match(YEARS_RE);
  if (explicit) return Number(explicit[1]);
  const spans: Array<[number, number]> = [];
  const now = new Date().getFullYear();
  for (const m of text.matchAll(RANGE_RE)) {
    const a = yearOf(m[1]);
    const b = /present|current|now/i.test(m[2]) ? now : yearOf(m[2]);
    if (a && b && b >= a && b - a < 30) spans.push([a, b]);
  }
  if (!spans.length) return 0;
  // merge overlapping spans so concurrent jobs don't double count
  spans.sort((x, y) => x[0] - y[0]);
  let total = 0;
  let [cs, ce] = spans[0];
  for (const [s, e] of spans.slice(1)) {
    if (s <= ce) ce = Math.max(ce, e);
    else {
      total += ce - cs;
      [cs, ce] = [s, e];
    }
  }
  total += ce - cs;
  return Math.max(0, Math.round(total));
}

function splitSections(text: string): Record<string, string> {
  const lines = text.split(/\r?\n/);
  const sections: Record<string, string[]> = { header: [] };
  let current = 'header';
  const headingMap: Array<[RegExp, string]> = [
    [/^(work\s+)?experience|employment|career history|professional background/i, 'experience'],
    [/^education|academic/i, 'education'],
    [/^(technical\s+)?skills|technologies|tech stack|competencies/i, 'skills'],
    [/^summary|profile|objective|about/i, 'summary'],
    [/^projects?/i, 'projects'],
    [/^certifications?|licen[cs]es/i, 'certs'],
  ];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.length < 40) {
      const hit = headingMap.find(([re]) => re.test(line.replace(/[:\-–—]/g, '').trim()));
      if (hit) {
        current = hit[1];
        sections[current] ??= [];
        continue;
      }
    }
    sections[current] ??= [];
    sections[current].push(line);
  }
  return Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.join('\n')]));
}

function parseExperience(block: string): ExperienceEntry[] {
  const out: ExperienceEntry[] = [];
  const lines = block.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const range = [...line.matchAll(RANGE_RE)][0];
    if (!range) continue;
    // Title/company are on this line or the one above; separators: • | – — , @ at
    const stripEdges = (s: string) => s.replace(/^[\s•·|,\-–—]+|[\s•·|,\-–—]+$/g, '');
    const header = stripEdges(line.replace(range[0], '').replace(/[|•·]/g, ' • ')) || stripEdges(lines[i - 1] || '');
    const parts = header
      .split(/\s+•\s+|\s+[-–—]\s+|\s+@\s+|\s+at\s+|,\s+/)
      .map((s) => stripEdges(s))
      .filter(Boolean);
    const [title = 'Role', company = 'Company', location] = parts;
    const desc: string[] = [];
    for (let j = i + 1; j < lines.length && desc.length < 4; j++) {
      if ([...lines[j].matchAll(RANGE_RE)].length) break;
      if (/^[-•*▪]/.test(lines[j]) || lines[j].length > 40) desc.push(lines[j].replace(/^[-•*▪]\s*/, ''));
    }
    out.push({
      title,
      company,
      location,
      from: range[1],
      to: /present|current|now/i.test(range[2]) ? 'Present' : range[2],
      description: desc.join(' '),
    });
    if (out.length >= 8) break;
  }
  return out;
}

function parseEducation(block: string): EducationEntry[] {
  const out: EducationEntry[] = [];
  for (const line of block.split('\n')) {
    if (!/university|college|institute|school|bachelor|master|\bbs\b|\bba\b|phd/i.test(line)) continue;
    const range = [...line.matchAll(RANGE_RE)][0];
    const yr = line.match(/(19|20)\d{2}/g);
    const degree = line.match(/(bachelor|master|phd|doctor|associate|bs|ba|msc|bsc)[^,|•–—-]*/i)?.[0]?.trim();
    const school = line.match(/[^,|•–—-]*(university|college|institute|school)[^,|•–—-]*/i)?.[0]?.trim();
    const honors = line.match(/(summa|magna|cum laude|with honors|dean'?s list)[^,|•]*/i)?.[0]?.trim();
    out.push({
      school: school || line.trim(),
      degree,
      from: range?.[1] ?? yr?.[0],
      to: range ? (/present/i.test(range[2]) ? 'Present' : range[2]) : yr?.[1],
      honors,
    });
    if (out.length >= 4) break;
  }
  return out;
}

function findHighlights(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const l = line.trim().replace(/^[-•*▪]\s*/, '');
    if (l.length < 25 || l.length > 220) continue;
    if (/(\d+(\.\d+)?\s*(%|x|k|m|million|users|mau|requests|ms|seconds?|days?|hours?))|(₱|php|\$)\s?\d/i.test(l)) {
      out.push(l);
    }
    if (out.length >= 5) break;
  }
  return out;
}

export const localProvider: AIProvider = {
  name: 'local',

  async parseResume(rawText: string): Promise<ParsedResume> {
    const text = rawText.replace(/\t/g, ' ').replace(/[ ]{2,}/g, ' ');
    const sections = splitSections(text);
    const firstLines = (sections.header || text).split('\n').map((l) => l.trim()).filter(Boolean);

    const email = text.match(EMAIL_RE)?.[0];
    const phone = text.match(PHONE_RE)?.[0];
    const fullName = firstLines.find(
      (l) => l.length > 3 && l.length < 40 && !EMAIL_RE.test(l) && !/\d/.test(l) && l.split(' ').length <= 4,
    );
    const headline = firstLines.find(
      (l) =>
        l !== fullName &&
        /engineer|developer|designer|manager|analyst|architect|lead|specialist|scientist/i.test(l) &&
        l.length < 80,
    );
    const location = text.match(
      /\b(makati|taguig|bgc|bonifacio|pasig|ortigas|quezon city|manila|cebu|davao|iloilo|baguio|clark|pampanga|laguna|cavite|philippines)\b[^\n,]*/i,
    )?.[0];

    const skills = extractSkillsFromText(
      (sections.skills ? sections.skills + '\n' : '') + text,
    );
    const experience = parseExperience(sections.experience || text);
    const education = parseEducation(sections.education || text);
    const yearsExperience = computeYears(sections.experience || text, text);
    const urls = text.match(URL_RE) || [];
    const links = {
      linkedin: text.match(LINKEDIN_RE)?.[0],
      github: text.match(GITHUB_RE)?.[0],
      portfolio: urls.find((u) => !/linkedin|github/i.test(u)),
    };

    // Confidence: how many of the key fields we actually found
    const signals = [fullName, email, skills.length >= 3, experience.length > 0, education.length > 0, yearsExperience > 0];
    const confidence = Math.round((signals.filter(Boolean).length / signals.length) * 100);

    return {
      fullName,
      email,
      phone,
      headline,
      location: location?.trim(),
      summary: sections.summary?.slice(0, 600),
      skills,
      yearsExperience,
      experience,
      education,
      links,
      highlights: findHighlights(text),
      confidence,
    };
  },

  async suggestSkills(jobTitle: string, description?: string): Promise<SkillSuggestion> {
    return suggestSkillsLocal(jobTitle, description);
  },

  async gapAdvice({ jobTitle, missingSkills }): Promise<GapAdvice[]> {
    return missingSkills.slice(0, 4).map((skill) => ({
      skill,
      why: `${skill} appears in the requirements for ${jobTitle}. Adding it moves you closer to the required stack and raises your skills score.`,
      resource: GAP_RESOURCES[skill] ?? `${skill} fundamentals — free course on freeCodeCamp / YouTube`,
      estimatedHours: GAP_HOURS[skill] ?? 12,
      salaryImpact: GAP_SALARY[skill] ?? '+₱5k–₱15k/mo',
    }));
  },
};

const GAP_RESOURCES: Record<string, string> = {
  Docker: 'Docker & Kubernetes for Frontend/Backend Devs (Udemy) or Docker Getting Started (docs.docker.com)',
  AWS: 'AWS Cloud Practitioner (free AWS Skill Builder path)',
  Kubernetes: 'Kubernetes Basics (kubernetes.io interactive tutorial)',
  TypeScript: 'TypeScript Handbook + Total TypeScript beginner tier (free)',
  'Next.js': 'Next.js Learn course (nextjs.org/learn, free)',
  GraphQL: 'How to GraphQL (howtographql.com, free)',
  Redis: 'Redis University RU101 (free)',
  'CI/CD': 'GitHub Actions Learning Path (free)',
  'E2E Testing': 'Playwright official docs + Test Automation University (free)',
  Python: 'CS50P — Python (Harvard, free)',
  'System Design': 'System Design Primer (GitHub) + Reforge System Design',
  'React Native': 'React Native docs + Expo tutorial (free)',
  PostgreSQL: 'PostgreSQL for Everybody (Coursera, audit free)',
  Microservices: 'Microservices with Node.js & React (Udemy)',
};
const GAP_HOURS: Record<string, number> = { Docker: 8, AWS: 25, Kubernetes: 20, TypeScript: 15, 'Next.js': 10, GraphQL: 8, Redis: 6, 'CI/CD': 6 };
const GAP_SALARY: Record<string, string> = {
  AWS: '+₱15k–₱25k/mo',
  Kubernetes: '+₱15k–₱25k/mo',
  Docker: '+₱8k–₱15k/mo',
  'System Design': '+₱20k–₱35k/mo',
  Microservices: '+₱12k–₱20k/mo',
};
