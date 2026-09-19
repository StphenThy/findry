// Shared domain types used across services, routes and the seed script.

export type Role = 'seeker' | 'employer';

export type WorkSetup = 'hybrid' | 'remote' | 'onsite';
export type EmploymentType = 'full-time' | 'contract' | 'part-time' | 'internship';
export type JobStatus = 'draft' | 'active' | 'closed';
export type ApplicationStatus = 'submitted' | 'viewed' | 'interview' | 'offer' | 'rejected';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'submitted',
  'viewed',
  'interview',
  'offer',
  'rejected',
];

export interface ExperienceEntry {
  company: string;
  title: string;
  from?: string; // "2022-01" or "2022"
  to?: string; // "2024-06" | "Present"
  description?: string;
  location?: string;
}

export interface EducationEntry {
  school: string;
  degree?: string; // "BS Computer Science"
  field?: string;
  from?: string;
  to?: string;
  honors?: string;
}

/** What the AI (or the local parser) extracts from a resume. */
export interface ParsedResume {
  fullName?: string;
  email?: string;
  phone?: string;
  headline?: string;
  location?: string;
  summary?: string;
  skills: string[];
  yearsExperience: number;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  links?: { linkedin?: string; github?: string; portfolio?: string };
  /** 0-100, how confident the parser is in the extraction */
  confidence: number;
  /** Notable quantified achievements found in the resume */
  highlights?: string[];
}

export interface SkillSuggestion {
  required: string[];
  preferred: string[];
}

export interface GapAdvice {
  skill: string;
  why: string;
  resource: string; // e.g. course / certification name
  estimatedHours?: number;
  salaryImpact?: string; // e.g. "+₱10k–₱25k/mo"
}

export interface MatchBreakdown {
  score: number; // 0-100 overall
  label: 'High Match' | 'Strong Fit' | 'Potential' | 'Low Match';
  weights: { skills: number; experience: number; education: number };
  skills: {
    score: number;
    requiredMatched: string[];
    requiredMissing: string[];
    preferredMatched: string[];
    preferredMissing: string[];
  };
  experience: {
    score: number;
    years: number;
    requiredYears: number;
  };
  education: {
    score: number;
    hasDegree: boolean;
    note: string;
  };
  summary: string; // one-line explanation: "Strong overlap in React, Node.js; missing: AWS"
}
