export type Role = 'seeker' | 'employer';
export type WorkSetup = 'hybrid' | 'remote' | 'onsite';
export type ApplicationStatus = 'submitted' | 'viewed' | 'interview' | 'offer' | 'rejected';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  lastRole?: Role;
  avatarUrl?: string;
}

export interface ProfileStatus {
  seekerOnboarded: boolean;
  employerOnboarded: boolean;
  companyName: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  profiles: ProfileStatus;
}

export interface ExperienceEntry {
  company: string;
  title: string;
  from?: string;
  to?: string;
  description?: string;
  location?: string;
}

export interface EducationEntry {
  school: string;
  degree?: string;
  field?: string;
  from?: string;
  to?: string;
  honors?: string;
}

export interface ResumeVersion {
  _id?: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  parserUsed: string;
  confidence: number;
}

export interface SeekerProfile {
  id: string;
  headline: string;
  location: string;
  workSetup: WorkSetup[];
  yearsExperience: number;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  summary?: string;
  highlights: string[];
  links: { linkedin?: string; github?: string; portfolio?: string };
  linkedinVerified: boolean;
  salaryMin?: number;
  salaryTarget?: number;
  noticeDays: number;
  preferredIndustries: string[];
  ghostMode: boolean;
  hiddenCompanies: string[];
  savedJobs: string[];
  resumes: ResumeVersion[];
  onboardingComplete: boolean;
  completion: { percent: number; missing: string[] };
}

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
  confidence: number;
  highlights?: string[];
}

export interface EmployerSummary {
  id: string;
  companyName: string;
  industry: string;
  size: string;
  location: string;
  website?: string;
  description?: string;
  logoUrl?: string;
  monogram: string;
  verified: boolean;
  verificationLabel?: string;
  avgResponseHours?: number;
}

export interface MatchBreakdown {
  score: number;
  label: 'High Match' | 'Strong Fit' | 'Potential' | 'Low Match';
  weights: { skills: number; experience: number; education: number };
  skills: {
    score: number;
    requiredMatched: string[];
    requiredMissing: string[];
    preferredMatched: string[];
    preferredMissing: string[];
  };
  experience: { score: number; years: number; requiredYears: number };
  education: { score: number; hasDegree: boolean; note: string };
  summary: string;
}

export interface Job {
  id: string;
  title: string;
  department?: string;
  description: string;
  responsibilities: string[];
  location: string;
  workSetup: WorkSetup;
  employmentType: string;
  industry: string;
  salaryMin: number;
  salaryMax: number;
  requiredSkills: string[];
  preferredSkills: string[];
  minYears: number;
  educationRequired: boolean;
  benefits: string[];
  screeningQuestion?: string;
  coreWeight: number;
  autoScreenMinYears: boolean;
  status: 'draft' | 'active' | 'closed';
  views: number;
  createdAt: string;
  employer: EmployerSummary | null;
  match?: MatchBreakdown;
  applied?: boolean;
  applicationId?: string;
  applicationStatus?: ApplicationStatus;
  saved?: boolean;
  stats?: { applicants: number; newToday: number; avgMatch: number; interview: number };
}

export interface GapAdvice {
  skill: string;
  why: string;
  resource: string;
  estimatedHours?: number;
  salaryImpact?: string;
}

export interface TimelineEvent {
  status: ApplicationStatus;
  at: string;
  note?: string;
}

export interface Application {
  id: string;
  status: ApplicationStatus;
  matchScore: number;
  matchBreakdown: MatchBreakdown;
  liveMatch?: MatchBreakdown;
  screeningAnswer?: string;
  coverNote?: string;
  employerNote?: string;
  interviewAt?: string;
  interviewNote?: string;
  offerSalary?: number;
  offerExpiresAt?: string;
  offerPerks?: string[];
  timeline: TimelineEvent[];
  viewedAt?: string;
  createdAt: string;
  updatedAt: string;
  job?: JobSummary | null;
  employer?: EmployerSummary | null;
  candidate?: Candidate | null;
}

export interface JobSummary {
  id: string;
  title: string;
  location: string;
  workSetup: WorkSetup;
  salaryMin: number;
  salaryMax: number;
  requiredSkills: string[];
  preferredSkills: string[];
  minYears: number;
  benefits: string[];
  screeningQuestion?: string;
  status: string;
  createdAt: string;
}

export interface Candidate {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  headline: string;
  location: string;
  yearsExperience: number;
  skills: string[];
  salaryTarget?: number;
  noticeDays: number;
  workSetup: WorkSetup[];
  linkedinVerified: boolean;
  lastCompany?: string;
  // full dossier (employer viewing an application)
  email?: string;
  summary?: string;
  highlights?: string[];
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
  links?: { linkedin?: string; github?: string; portfolio?: string };
  resume?: { originalName: string; uploadedAt: string; parserUsed: string } | null;
}

export interface Conversation {
  applicationId: string;
  status: ApplicationStatus;
  matchScore: number;
  jobTitle: string;
  counterpart: { name: string; subtitle: string; avatarUrl?: string; monogram?: string };
  lastMessage: { body: string; at: string; mine: boolean } | null;
  unread: number;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  body: string;
  at: string;
  mine: boolean;
  readAt?: string;
}
