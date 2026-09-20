import type { IEmployerProfile, IJob, ISeekerProfile } from '../models';
import { computeMatch } from '../services/matching/score';

/** Public shape of an employer attached to a job card / detail. */
export function employerSummary(e: IEmployerProfile | null | undefined) {
  if (!e) return null;
  return {
    id: String(e._id),
    companyName: e.companyName,
    industry: e.industry,
    size: e.size,
    location: e.location,
    website: e.website,
    description: e.description,
    logoUrl: e.logoUrl,
    monogram: e.monogram,
    verified: e.verified,
    verificationLabel: e.verificationLabel,
    avgResponseHours: e.avgResponseHours,
  };
}

/** Plain-object shape of a job document (what toJSON returns, minus Mongoose internals). */
export type JobJSON = Pick<
  IJob,
  | 'title' | 'department' | 'description' | 'responsibilities' | 'location' | 'workSetup' | 'employmentType'
  | 'industry' | 'salaryMin' | 'salaryMax' | 'requiredSkills' | 'preferredSkills' | 'minYears' | 'educationRequired'
  | 'benefits' | 'screeningQuestion' | 'coreWeight' | 'autoScreenMinYears' | 'status' | 'views' | 'createdAt' | 'updatedAt'
> & { _id: unknown; employerId: unknown };

/** Job + employer + (optional) match for the current seeker. */
export function jobView(job: IJob, employer: IEmployerProfile | null | undefined, seeker?: ISeekerProfile | null) {
  const j = job.toJSON() as unknown as JobJSON;
  return {
    ...j,
    id: String(job._id),
    employer: employerSummary(employer),
    match: seeker ? computeMatch(seeker, job) : undefined,
  };
}

export const daysAgo = (d: Date) => Math.floor((Date.now() - d.getTime()) / 86_400_000);

/** Escape user text before it goes into a RegExp (search filters). */
export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Ghost mode: a seeker who hid a company must be invisible to that company
 * everywhere — pipeline, dossier, conversations and messaging alike.
 */
export function hiddenFromEmployer(seeker: Pick<ISeekerProfile, 'ghostMode' | 'hiddenCompanies'> | null | undefined, employer: Pick<IEmployerProfile, 'companyName'> | null | undefined): boolean {
  if (!seeker?.ghostMode || !employer?.companyName) return false;
  const company = employer.companyName.trim().toLowerCase();
  return seeker.hiddenCompanies.some((c) => c.trim().toLowerCase() === company);
}
