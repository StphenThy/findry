import type { MatchBreakdown } from '../../types';
import { normalizeSkills } from './skills';

/**
 * Explainable, deterministic match score.
 *
 *   overall = skills*0.45 + experience*0.30 + education*0.25
 *
 * Every component is 0-100 and the breakdown is returned so the UI can show
 * "Why you match" (skills vs experience vs education) and the missing skills.
 */
export const WEIGHTS = { skills: 45, experience: 30, education: 25 } as const;

export interface SeekerLike {
  skills: string[];
  yearsExperience: number;
  education: Array<{ degree?: string; school?: string }>;
}

export interface JobLike {
  requiredSkills: string[];
  preferredSkills: string[];
  minYears: number;
  educationRequired: boolean;
  /** % of the skills component that comes from required skills (default 70). */
  coreWeight?: number;
}

const DEGREE_RE = /\b(bs|ba|bsc|b\.s\.|bachelor|master|ms|msc|m\.s\.|phd|doctor|associate|diploma|engineer)/i;

export function computeMatch(seeker: SeekerLike, job: JobLike): MatchBreakdown {
  const have = new Set(normalizeSkills(seeker.skills).map((s) => s.toLowerCase()));
  const req = normalizeSkills(job.requiredSkills);
  const pref = normalizeSkills(job.preferredSkills);

  const requiredMatched = req.filter((s) => have.has(s.toLowerCase()));
  const requiredMissing = req.filter((s) => !have.has(s.toLowerCase()));
  const preferredMatched = pref.filter((s) => have.has(s.toLowerCase()));
  const preferredMissing = pref.filter((s) => !have.has(s.toLowerCase()));

  const core = Math.min(100, Math.max(0, job.coreWeight ?? 70)) / 100;
  const reqRatio = req.length ? requiredMatched.length / req.length : 1;
  const prefRatio = pref.length ? preferredMatched.length / pref.length : 1;
  // If a job lists no preferred skills, the whole component is the required ratio.
  const skillsScore = Math.round(
    100 * (pref.length ? reqRatio * core + prefRatio * (1 - core) : reqRatio),
  );

  const years = Math.max(0, seeker.yearsExperience || 0);
  const requiredYears = Math.max(0, job.minYears || 0);
  let experienceScore: number;
  if (requiredYears === 0) experienceScore = years > 0 ? 100 : 70;
  else {
    const ratio = years / requiredYears;
    // full marks at 100%+, generous partial credit below, small bonus cap for over-qualification
    experienceScore = ratio >= 1 ? 100 : Math.round(55 + 45 * ratio);
    if (ratio >= 2.5) experienceScore = 95; // possibly overqualified → slight ding
  }

  const hasDegree = (seeker.education || []).some(
    (e) => DEGREE_RE.test(e.degree || '') || /university|college|institute/i.test(e.school || ''),
  );
  let educationScore: number;
  let educationNote: string;
  if (!job.educationRequired) {
    educationScore = hasDegree ? 100 : 85;
    educationNote = hasDegree ? 'Degree on file (not required for this role)' : 'No degree required for this role';
  } else {
    educationScore = hasDegree ? 100 : 40;
    educationNote = hasDegree ? 'Meets degree requirement' : 'Role requires a degree — none found on profile';
  }

  const score = Math.round(
    (skillsScore * WEIGHTS.skills + experienceScore * WEIGHTS.experience + educationScore * WEIGHTS.education) /
      100,
  );

  const label: MatchBreakdown['label'] =
    score >= 90 ? 'High Match' : score >= 80 ? 'Strong Fit' : score >= 65 ? 'Potential' : 'Low Match';

  const strong = [...requiredMatched, ...preferredMatched].slice(0, 3);
  const missing = [...requiredMissing, ...preferredMissing].slice(0, 2);
  const summary =
    (strong.length ? `Strong overlap in ${strong.join(', ')}` : 'Limited skill overlap') +
    (missing.length ? `; missing: ${missing.join(', ')}` : '');

  return {
    score,
    label,
    weights: { ...WEIGHTS },
    skills: { score: skillsScore, requiredMatched, requiredMissing, preferredMatched, preferredMissing },
    experience: { score: experienceScore, years, requiredYears },
    education: { score: educationScore, hasDegree, note: educationNote },
    summary,
  };
}

/** Helper for ring colouring on the client — kept here so both sides agree. */
export function matchTone(score: number): 'secondary' | 'primary' | 'tertiary' | 'outline' {
  if (score >= 90) return 'secondary';
  if (score >= 80) return 'primary';
  if (score >= 65) return 'tertiary';
  return 'outline';
}
