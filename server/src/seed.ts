import bcrypt from 'bcryptjs';
import { Application, EmployerProfile, Job, Message, SeekerProfile, User } from './models';
import type { IEmployerProfile, ISeekerProfile } from './models';
import { MARIA_SANTOS } from './services/ai/mock';
import { computeMatch } from './services/matching/score';
import type { ApplicationStatus } from './types';

export const DEMO_PASSWORD = 'password123';

/** Every seeded account lives under the reserved `.demo` TLD, so they are easy to recognise (and to refuse in production). */
export const isDemoEmail = (email: string) => /@[a-z0-9.-]+.demo$/i.test(email.trim());

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
const daysAgo = (d: number) => hoursAgo(d * 24);
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);

export const DEMO_ACCOUNTS = [
  { email: 'maria@findry.demo', role: 'Job Seeker — Maria Santos (Senior Frontend, full demo pipeline)' },
  { email: 'hr@maya.demo', role: 'Employer — Maya (4 active jobs, ranked candidates)' },
  { email: 'demo@findry.demo', role: 'Job Seeker — Rafael Cruz (Full Stack, applications in progress)' },
  { email: 'hr@sprout.demo', role: 'Employer — Sprout Solutions (2 active jobs)' },
];

interface SeekerSeed {
  email: string;
  name: string;
  headline: string;
  location: string;
  years: number;
  skills: string[];
  salaryTarget: number;
  salaryMin: number;
  lastCompany: string;
  prevCompany?: string;
  degree: string;
  school: string;
  workSetup?: Array<'hybrid' | 'remote' | 'onsite'>;
  noticeDays?: number;
  linkedin?: string;
}

const SEEKERS: SeekerSeed[] = [
  { email: 'demo@findry.demo', name: 'Rafael Cruz', headline: 'Full Stack Specialist', location: 'BGC, Taguig', years: 5, skills: ['React', 'Vue.js', 'Node.js', 'Express', 'TypeScript', 'MongoDB', 'REST APIs', 'Git', 'Unit Testing', 'Tailwind CSS'], salaryTarget: 165000, salaryMin: 150000, lastCompany: 'Sprout Solutions', prevCompany: 'Ingram Micro', degree: 'BS Information Technology', school: 'De La Salle University', noticeDays: 0, linkedin: 'linkedin.com/in/rafael-cruz-dev' },
  { email: 'angelica@findry.demo', name: 'Angelica Lim', headline: 'Design Technologist', location: 'Cebu IT Park, Cebu City', years: 4, skills: ['React', 'Tailwind CSS', 'Design Systems', 'Figma', 'UI/UX Design', 'CSS', 'HTML', 'Accessibility', 'TypeScript'], salaryTarget: 140000, salaryMin: 120000, lastCompany: 'Freelance (Global clients)', prevCompany: 'Accenture Philippines', degree: 'BS Computer Science', school: 'University of San Carlos', workSetup: ['remote'], noticeDays: 15 },
  { email: 'joshua@findry.demo', name: 'Joshua Reyes', headline: 'Senior Backend Engineer (Go)', location: 'Makati City', years: 7, skills: ['Go', 'PostgreSQL', 'Microservices', 'Docker', 'Kubernetes', 'AWS', 'Message Queues', 'Redis', 'CI/CD', 'System Design', 'Fintech'], salaryTarget: 190000, salaryMin: 170000, lastCompany: 'UnionBank', prevCompany: 'Globe Telecom', degree: 'BS Computer Engineering', school: 'Mapúa University', linkedin: 'linkedin.com/in/joshua-reyes-go' },
  { email: 'patricia@findry.demo', name: 'Patricia Go', headline: 'DevOps / Platform Engineer', location: 'Quezon City', years: 5, skills: ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Terraform', 'Linux', 'Monitoring', 'Nginx', 'Python', 'Security'], salaryTarget: 150000, salaryMin: 130000, lastCompany: 'Xurpas', prevCompany: 'Accenture Philippines', degree: 'BS Information Technology', school: 'Polytechnic University of the Philippines', workSetup: ['remote', 'hybrid'] },
  { email: 'miguel@findry.demo', name: 'Miguel Tan', headline: 'Data Engineer', location: 'Pasig City', years: 3, skills: ['Python', 'SQL', 'Data Engineering', 'PostgreSQL', 'Data Analysis', 'AWS', 'Power BI'], salaryTarget: 120000, salaryMin: 100000, lastCompany: 'Shopee Philippines', degree: 'BS Statistics', school: 'UP Diliman' },
  { email: 'kristine@findry.demo', name: 'Kristine Bautista', headline: 'Senior Product Designer', location: 'Cebu City', years: 6, skills: ['Figma', 'UI/UX Design', 'Prototyping', 'Design Systems', 'Accessibility', 'HTML', 'CSS'], salaryTarget: 120000, salaryMin: 100000, lastCompany: 'Canva Philippines', prevCompany: 'Lalamove', degree: 'BFA Multimedia Arts', school: 'University of Cebu', workSetup: ['hybrid', 'onsite'] },
  { email: 'carlo@findry.demo', name: 'Carlo Villanueva', headline: 'Frontend Developer', location: 'Makati City', years: 3, skills: ['React', 'JavaScript', 'TypeScript', 'CSS', 'HTML', 'Redux', 'Git', 'REST APIs'], salaryTarget: 95000, salaryMin: 80000, lastCompany: 'Kollab Philippines', degree: 'BS Computer Science', school: 'Adamson University' },
  { email: 'jasmine@findry.demo', name: 'Jasmine Dela Cruz', headline: 'Mobile Engineer (React Native)', location: 'Davao City', years: 4, skills: ['React Native', 'TypeScript', 'React', 'Firebase', 'REST APIs', 'WebSockets', 'Unit Testing', 'iOS', 'Android'], salaryTarget: 130000, salaryMin: 110000, lastCompany: 'Kumu', prevCompany: 'Symph', degree: 'BS Information Systems', school: 'Ateneo de Davao', workSetup: ['remote'] },
  { email: 'ben@findry.demo', name: 'Benedict Ocampo', headline: 'Python Backend Engineer', location: 'Ortigas, Pasig', years: 4, skills: ['Python', 'Django', 'FastAPI', 'PostgreSQL', 'Docker', 'REST APIs', 'Redis', 'Unit Testing', 'AWS'], salaryTarget: 140000, salaryMin: 120000, lastCompany: 'Thinking Machines', degree: 'BS Computer Science', school: 'Ateneo de Manila University' },
  { email: 'trish@findry.demo', name: 'Trisha Mendoza', headline: 'QA Automation Engineer', location: 'Alabang, Muntinlupa', years: 3, skills: ['QA Automation', 'E2E Testing', 'Unit Testing', 'JavaScript', 'CI/CD', 'Python'], salaryTarget: 85000, salaryMin: 70000, lastCompany: 'Concentrix', degree: 'BS Information Technology', school: 'STI College' },
];

interface EmployerSeed {
  email: string;
  contact: string;
  company: string;
  industry: string;
  size: string;
  location: string;
  website: string;
  description: string;
  responseHours: number;
}

const EMPLOYERS: EmployerSeed[] = [
  { email: 'hr@maya.demo', contact: 'Angelo Dizon', company: 'Maya', industry: 'Fintech & Neo-banking', size: '1000+', location: 'Bonifacio Global City, Taguig', website: 'https://www.maya.ph', description: 'Formerly Voyager Innovations. The Philippines’ leading digital bank and payments platform serving millions of daily consumer transactions.', responseHours: 20 },
  { email: 'hr@gcash.demo', contact: 'Paolo Mercado', company: 'GCash', industry: 'Fintech & Neo-banking', size: '1000+', location: 'Taguig City', website: 'https://www.gcash.com', description: 'Philippine fintech unicorn (Mynt). E-wallet, lending, insurance and investments for 90M+ registered users.', responseHours: 30 },
  { email: 'hr@canva.demo', contact: 'Raffy Tolentino', company: 'Canva Philippines', industry: 'Enterprise SaaS & Cloud', size: '501-1000', location: 'Makati Central Business District', website: 'https://www.canva.com', description: 'Global creative platform. Manila is one of Canva’s largest engineering hubs outside Sydney.', responseHours: 48 },
  { email: 'hr@sprout.demo', contact: 'Andrea Reyes', company: 'Sprout Solutions', industry: 'HR Tech / SaaS', size: '201-500', location: 'Ortigas Center, Pasig', website: 'https://sprout.ph', description: 'HR and payroll platform for Philippine businesses — statutory-compliant payroll, 13th month, SSS/PhilHealth/Pag-IBIG.', responseHours: 72 },
  { email: 'hr@avaloq.demo', contact: 'Clarissa Sy', company: 'Avaloq', industry: 'Banking Software', size: '1000+', location: 'Makati CBD', website: 'https://www.avaloq.com', description: 'Swiss core-banking software; Manila engineering centre.', responseHours: 96 },
  { email: 'hr@kumu.demo', contact: 'Angelo Duran', company: 'Kumu', industry: 'Social / Live-streaming', size: '201-500', location: 'BGC, Taguig', website: 'https://www.kumu.ph', description: 'The Philippines’ largest live-streaming community app.', responseHours: 36 },
  { email: 'hr@tonik.demo', contact: 'Bea Dominguez', company: 'Tonik Digital Bank', industry: 'Fintech & Neo-banking', size: '201-500', location: 'Taguig City', website: 'https://tonikbank.com', description: 'First neobank in the Philippines, BSP-licensed digital bank.', responseHours: 24 },
];

interface JobSeed {
  company: string;
  title: string;
  department?: string;
  location: string;
  workSetup: 'hybrid' | 'remote' | 'onsite';
  industry: string;
  salary: [number, number];
  required: string[];
  preferred: string[];
  minYears: number;
  benefits: string[];
  description: string;
  responsibilities?: string[];
  screening?: string;
  createdDaysAgo: number;
  views: number;
  autoScreen?: boolean;
}

const BENEFITS_PH = ['Guaranteed 13th Month Pay', 'Day 1 HMO + 2 Dependents', 'SSS, PhilHealth & Pag-IBIG', '₱3,500/mo Remote & Fiber Allowance'];

const JOBS: JobSeed[] = [
  {
    company: 'Maya', title: 'Lead Frontend Architect', department: 'Core Web Platform & Checkout Engineering', location: 'Bonifacio Global City, Taguig', workSetup: 'hybrid', industry: 'Fintech & Neo-banking', salary: [160000, 210000],
    required: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'GraphQL'], preferred: ['Micro-frontends', 'Docker', 'AWS', 'CI/CD', 'Web Performance', 'Design Systems'], minYears: 5,
    benefits: [...BENEFITS_PH, 'Performance 14th Month Bonus', 'M3 MacBook Pro + 4K Monitor Kit', 'Maxicare Platinum ₱350k MBL'],
    description: 'As the Lead Frontend Architect at Maya, you will own the client-side architecture supporting millions of daily consumer transactions and enterprise payment gateways across the Philippines. You will mentor a cluster of 14 frontend engineers, establish Next.js micro-frontend boundaries, and coordinate closely with our Core Banking and SecOps teams to ensure millisecond rendering speeds.',
    responsibilities: ['Spearhead design system orchestration using Tailwind CSS and Radix Primitives across web and mobile web surfaces.', 'Define performance SLAs for Core Web Vitals to sustain sub-second Time to Interactive on 4G cellular connections.', 'Collaborate with Bangko Sentral ng Pilipinas (BSP) compliance auditors regarding end-to-end client-side encryption.'],
    screening: 'Describe a production scenario where you debugged hydration mismatches or memory leaks in a Next.js App Router micro-frontend application.',
    createdDaysAgo: 9, views: 412, autoScreen: true,
  },
  { company: 'Maya', title: 'Senior Backend Engineer (Go)', department: 'Payments Core', location: 'Makati City', workSetup: 'hybrid', industry: 'Fintech & Neo-banking', salary: [150000, 190000], required: ['Go', 'PostgreSQL', 'Microservices', 'Docker', 'REST APIs'], preferred: ['Kubernetes', 'AWS', 'Message Queues', 'Redis', 'Fintech'], minYears: 4, benefits: [...BENEFITS_PH, 'Performance 14th Month Bonus'], description: 'Build and scale the Go services behind Maya’s payment rails, handling BSP-regulated settlement flows at 4,000+ TPS.', createdDaysAgo: 6, views: 233 },
  { company: 'Maya', title: 'DevOps / Infrastructure Engineer', department: 'Platform', location: 'Remote (Philippines)', workSetup: 'remote', industry: 'Fintech & Neo-banking', salary: [120000, 160000], required: ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Linux'], preferred: ['Terraform', 'Monitoring', 'Security', 'Python'], minYears: 3, benefits: BENEFITS_PH, description: 'Own the EKS clusters, GitHub Actions pipelines and observability stack for a BSP-licensed digital bank.', createdDaysAgo: 4, views: 188 },
  { company: 'Maya', title: 'Senior Product Designer', department: 'Design', location: 'Cebu IT Park, Cebu City', workSetup: 'hybrid', industry: 'Fintech & Neo-banking', salary: [90000, 130000], required: ['Figma', 'UI/UX Design', 'Prototyping', 'Design Systems'], preferred: ['Accessibility', 'HTML', 'CSS'], minYears: 4, benefits: BENEFITS_PH, description: 'Lead end-to-end design for Maya’s savings and credit products from the Cebu studio.', createdDaysAgo: 3, views: 97 },
  { company: 'GCash', title: 'Senior Fullstack Engineer (React + Node)', department: 'GLoan Platform', location: 'Taguig / Fully Remote', workSetup: 'remote', industry: 'Fintech & Neo-banking', salary: [140000, 180000], required: ['React', 'Node.js', 'Express', 'TypeScript', 'Microservices'], preferred: ['Redis', 'AWS', 'MongoDB', 'GraphQL', 'Docker'], minYears: 4, benefits: [...BENEFITS_PH, 'Health card from Day 1', '₱15k Wellness Allowance'], description: 'Ship lending features used by millions of Filipinos. Fast-track pipeline: technical interview within 5 business days.', createdDaysAgo: 1, views: 301 },
  { company: 'Canva Philippines', title: 'Staff UI/UX Systems Engineer', department: 'Design Systems', location: 'Makati Central Business District', workSetup: 'hybrid', industry: 'Enterprise SaaS & Cloud', salary: [175000, 230000], required: ['React', 'TypeScript', 'Design Systems', 'Accessibility', 'CSS'], preferred: ['Web Performance', 'Figma', 'Unit Testing', 'E2E Testing', 'Tailwind CSS'], minYears: 6, benefits: [...BENEFITS_PH, 'Equity grants', 'Subsidised gourmet meals onsite'], description: 'Own the component library and design tokens used by 1,000+ Canva engineers worldwide. WCAG 2.1 AA is table stakes.', createdDaysAgo: 5, views: 356 },
  { company: 'Sprout Solutions', title: 'Senior React Developer', department: 'Payroll Web', location: 'Ortigas Center, Pasig', workSetup: 'hybrid', industry: 'HR Tech / SaaS', salary: [130000, 160000], required: ['React', 'TypeScript', 'Redux', 'REST APIs', 'Unit Testing'], preferred: ['Next.js', 'Tailwind CSS', 'E2E Testing', 'CI/CD'], minYears: 4, benefits: BENEFITS_PH, description: 'Build the payroll and timekeeping web app used by 1,000+ Philippine companies.', createdDaysAgo: 2, views: 142 },
  { company: 'Sprout Solutions', title: 'QA Automation Engineer', department: 'Quality', location: 'Ortigas Center, Pasig', workSetup: 'hybrid', industry: 'HR Tech / SaaS', salary: [70000, 95000], required: ['QA Automation', 'E2E Testing', 'JavaScript'], preferred: ['CI/CD', 'Unit Testing', 'Python'], minYears: 2, benefits: BENEFITS_PH, description: 'Own Playwright suites across payroll, HRIS and mobile timekeeping.', createdDaysAgo: 7, views: 88 },
  { company: 'Avaloq', title: 'TypeScript Engineer', department: 'Wealth Frontend', location: 'Makati CBD', workSetup: 'onsite', industry: 'Banking Software', salary: [120000, 145000], required: ['TypeScript', 'Angular', 'REST APIs', 'Unit Testing'], preferred: ['React', 'Java', 'CI/CD'], minYears: 3, benefits: BENEFITS_PH, description: 'Wealth management front-ends for Swiss and APAC private banks.', createdDaysAgo: 1, views: 76 },
  { company: 'Kumu', title: 'Frontend Engineer', department: 'Live Web', location: 'BGC, Taguig', workSetup: 'hybrid', industry: 'Social / Live-streaming', salary: [140000, 170000], required: ['React', 'TypeScript', 'WebSockets', 'REST APIs'], preferred: ['React Native', 'Web Performance', 'GraphQL', 'Redux'], minYears: 4, benefits: [...BENEFITS_PH, 'HMO Day 1'], description: 'Real-time live-streaming web experience: chat, gifting, and low-latency video UI.', createdDaysAgo: 3, views: 210 },
  { company: 'Kumu', title: 'Mobile Engineer (React Native)', department: 'Mobile', location: 'Remote (Philippines)', workSetup: 'remote', industry: 'Social / Live-streaming', salary: [120000, 150000], required: ['React Native', 'TypeScript', 'REST APIs'], preferred: ['iOS', 'Android', 'Firebase', 'WebSockets'], minYears: 3, benefits: BENEFITS_PH, description: 'Ship the Kumu mobile app to 10M+ users on iOS and Android.', createdDaysAgo: 8, views: 160 },
  { company: 'Tonik Digital Bank', title: 'Senior UI Systems Engineer', department: 'Digital Channels', location: 'Taguig City', workSetup: 'hybrid', industry: 'Fintech & Neo-banking', salary: [150000, 185000], required: ['React', 'TypeScript', 'Design Systems', 'Tailwind CSS'], preferred: ['Next.js', 'Accessibility', 'Unit Testing', 'Fintech'], minYears: 5, benefits: [...BENEFITS_PH, 'Maxicare HMO (3 dependents)', '₱45,000 WFH equipment stipend', '₱100,000 signing incentive'], description: 'Lead the design-system layer of the first BSP-licensed neobank’s web channels.', createdDaysAgo: 14, views: 268 },
  { company: 'GCash', title: 'Data Engineer', department: 'Data Platform', location: 'Taguig City', workSetup: 'hybrid', industry: 'Fintech & Neo-banking', salary: [110000, 150000], required: ['Python', 'SQL', 'Data Engineering', 'AWS'], preferred: ['PostgreSQL', 'Data Analysis', 'Docker', 'Power BI'], minYears: 3, benefits: BENEFITS_PH, description: 'Build Airflow pipelines feeding GCash’s risk and marketing models.', createdDaysAgo: 5, views: 121 },
  { company: 'Canva Philippines', title: 'Backend Engineer (Python)', department: 'Content Platform', location: 'Makati Central Business District', workSetup: 'hybrid', industry: 'Enterprise SaaS & Cloud', salary: [140000, 180000], required: ['Python', 'PostgreSQL', 'REST APIs', 'Docker'], preferred: ['FastAPI', 'AWS', 'Redis', 'Unit Testing'], minYears: 4, benefits: [...BENEFITS_PH, 'Equity grants'], description: 'Services behind Canva’s template marketplace.', createdDaysAgo: 10, views: 134 },
];

interface AppSeed {
  seeker: string; // email
  company: string;
  title: string;
  status: ApplicationStatus;
  createdHoursAgo: number;
  note?: string;
  interviewInDays?: number;
  interviewNote?: string;
  offerSalary?: number;
  offerExpiresInDays?: number;
  offerPerks?: string[];
  screeningAnswer?: string;
}

const APPLICATIONS: AppSeed[] = [
  // Maria's Kanban (mirrors the mockup)
  { seeker: 'maria@findry.demo', company: 'Sprout Solutions', title: 'Senior React Developer', status: 'submitted', createdHoursAgo: 48 },
  { seeker: 'maria@findry.demo', company: 'Avaloq', title: 'TypeScript Engineer', status: 'submitted', createdHoursAgo: 4 },
  { seeker: 'maria@findry.demo', company: 'Kumu', title: 'Frontend Engineer', status: 'viewed', createdHoursAgo: 30, note: 'Lead recruiter reviewed full GitHub dossier' },
  { seeker: 'maria@findry.demo', company: 'Maya', title: 'Lead Frontend Architect', status: 'interview', createdHoursAgo: 24 * 6, interviewInDays: 1, interviewNote: 'Round 2 Technical Deep Dive — Google Meet, 2:00 PM PHT', note: 'Shortlisted for technical interview', screeningAnswer: 'At Coins.ph our checkout micro-frontend threw hydration mismatches after a Next.js 13 upgrade because a date formatter used the client locale during SSR. I isolated it by diffing the server HTML against the first client render, moved the locale-dependent formatting behind useEffect, and added a Playwright check that fails on any console hydration warning.' },
  { seeker: 'maria@findry.demo', company: 'Canva Philippines', title: 'Staff UI/UX Systems Engineer', status: 'interview', createdHoursAgo: 24 * 4, note: 'Technical assignment submitted. Team review in progress — updates by Friday.' },
  { seeker: 'maria@findry.demo', company: 'Tonik Digital Bank', title: 'Senior UI Systems Engineer', status: 'offer', createdHoursAgo: 24 * 12, offerSalary: 185000, offerExpiresInDays: 4, offerPerks: ['Maxicare HMO (3 dependents)', '₱45,000 WFH Equipment Stipend', '₱100,000 Signing Incentive'], note: 'Formal offer released' },
  // Maya's pipeline for Lead Frontend Architect
  { seeker: 'demo@findry.demo', company: 'Maya', title: 'Lead Frontend Architect', status: 'viewed', createdHoursAgo: 24 * 3 },
  { seeker: 'angelica@findry.demo', company: 'Maya', title: 'Lead Frontend Architect', status: 'submitted', createdHoursAgo: 20 },
  { seeker: 'carlo@findry.demo', company: 'Maya', title: 'Lead Frontend Architect', status: 'submitted', createdHoursAgo: 10 },
  // other Maya jobs
  { seeker: 'joshua@findry.demo', company: 'Maya', title: 'Senior Backend Engineer (Go)', status: 'interview', createdHoursAgo: 24 * 4, interviewInDays: 2, interviewNote: 'Systems design round with Payments Core leads' },
  { seeker: 'ben@findry.demo', company: 'Maya', title: 'Senior Backend Engineer (Go)', status: 'submitted', createdHoursAgo: 6 },
  { seeker: 'patricia@findry.demo', company: 'Maya', title: 'DevOps / Infrastructure Engineer', status: 'viewed', createdHoursAgo: 24 * 2 },
  { seeker: 'kristine@findry.demo', company: 'Maya', title: 'Senior Product Designer', status: 'submitted', createdHoursAgo: 12 },
  { seeker: 'angelica@findry.demo', company: 'Maya', title: 'Senior Product Designer', status: 'submitted', createdHoursAgo: 3 },
  // others
  { seeker: 'demo@findry.demo', company: 'GCash', title: 'Senior Fullstack Engineer (React + Node)', status: 'submitted', createdHoursAgo: 15 },
  { seeker: 'jasmine@findry.demo', company: 'Kumu', title: 'Mobile Engineer (React Native)', status: 'offer', createdHoursAgo: 24 * 20, offerSalary: 135000, offerExpiresInDays: 6 },
  { seeker: 'trish@findry.demo', company: 'Sprout Solutions', title: 'QA Automation Engineer', status: 'interview', createdHoursAgo: 24 * 5, interviewInDays: 3 },
  { seeker: 'carlo@findry.demo', company: 'Sprout Solutions', title: 'Senior React Developer', status: 'rejected', createdHoursAgo: 24 * 9, note: 'Auto-screened: role requires 4+ years verified experience' },
  { seeker: 'miguel@findry.demo', company: 'GCash', title: 'Data Engineer', status: 'viewed', createdHoursAgo: 24 * 2 },
];

export async function isSeeded(): Promise<boolean> {
  return (await User.countDocuments()) > 0;
}

export async function seed({ force = false }: { force?: boolean } = {}) {
  if (force) {
    await Promise.all([User.deleteMany({}), SeekerProfile.deleteMany({}), EmployerProfile.deleteMany({}), Job.deleteMany({}), Application.deleteMany({}), Message.deleteMany({})]);
  } else if (await isSeeded()) {
    return { skipped: true };
  }
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 8);
  const users = new Map<string, InstanceType<typeof User>>();

  // One email = one account = one role. A seed entry that reuses an email for the other role is a bug.
  async function ensureUser(email: string, name: string, role: 'seeker' | 'employer') {
    let u = users.get(email);
    if (!u) {
      u = await User.create({ email, name, passwordHash, roles: [role], lastRole: role });
      users.set(email, u);
    } else if (!u.roles.includes(role)) {
      // One email = one account = one role. A seed entry reusing an email for the other role is a bug.
      throw new Error(`seed: ${email} is already a ${u.roles[0]} account and cannot also be a ${role}`);
    }
    return u;
  }

  // Employers
  const employers = new Map<string, IEmployerProfile>();
  for (const e of EMPLOYERS) {
    const u = await ensureUser(e.email, e.contact, 'employer');
    const profile = await EmployerProfile.create({
      userId: u._id,
      companyName: e.company,
      industry: e.industry,
      size: e.size,
      location: e.location,
      website: e.website,
      description: e.description,
      verified: true,
      verificationLabel: 'DOLE PEA Certified',
      avgResponseHours: e.responseHours,
      onboardingComplete: true,
    });
    employers.set(e.company, profile);
  }

  // Seekers
  const seekers = new Map<string, ISeekerProfile>();
  const maria = await ensureUser('maria@findry.demo', MARIA_SANTOS.fullName!, 'seeker');
  seekers.set(
    'maria@findry.demo',
    await SeekerProfile.create({
      userId: maria._id,
      headline: MARIA_SANTOS.headline,
      location: MARIA_SANTOS.location,
      workSetup: ['hybrid', 'remote'],
      yearsExperience: MARIA_SANTOS.yearsExperience,
      skills: MARIA_SANTOS.skills,
      experience: MARIA_SANTOS.experience,
      education: MARIA_SANTOS.education,
      summary: MARIA_SANTOS.summary,
      highlights: MARIA_SANTOS.highlights,
      links: MARIA_SANTOS.links,
      linkedinVerified: true,
      salaryMin: 160000,
      salaryTarget: 180000,
      noticeDays: 30,
      preferredIndustries: ['Fintech & Neo-banking', 'Enterprise SaaS & Cloud'],
      ghostMode: true,
      hiddenCompanies: ['PLDT'],
      resumes: [{ filename: 'demo-maria.pdf', originalName: 'Maria_Santos_Senior_Frontend_2025.pdf', mimeType: 'application/pdf', size: 2_400_000, uploadedAt: daysAgo(10), rawText: '', parserUsed: 'mock', confidence: 96 }],
      onboardingComplete: true,
    }),
  );
  for (const s of SEEKERS) {
    const u = await ensureUser(s.email, s.name, 'seeker');
    seekers.set(
      s.email,
      await SeekerProfile.create({
        userId: u._id,
        headline: s.headline,
        location: s.location,
        workSetup: s.workSetup ?? ['hybrid', 'remote'],
        yearsExperience: s.years,
        skills: s.skills,
        experience: [
          { company: s.lastCompany, title: s.headline, from: String(new Date().getFullYear() - Math.min(s.years, 3)), to: 'Present', description: `${s.headline} working across ${s.skills.slice(0, 3).join(', ')}.` },
          ...(s.prevCompany ? [{ company: s.prevCompany, title: s.headline.replace(/Senior |Lead /, ''), from: String(new Date().getFullYear() - s.years), to: String(new Date().getFullYear() - Math.min(s.years, 3)) }] : []),
        ],
        education: [{ school: s.school, degree: s.degree }],
        links: s.linkedin ? { linkedin: s.linkedin } : {},
        linkedinVerified: !!s.linkedin,
        salaryMin: s.salaryMin,
        salaryTarget: s.salaryTarget,
        noticeDays: s.noticeDays ?? 30,
        resumes: [{ filename: 'demo.pdf', originalName: `${s.name.replace(/ /g, '_')}_Resume.pdf`, mimeType: 'application/pdf', size: 900_000, uploadedAt: daysAgo(20), rawText: '', parserUsed: 'local', confidence: 82 }],
        onboardingComplete: true,
      }),
    );
  }

  // Jobs
  const jobs = new Map<string, InstanceType<typeof Job>>();
  for (const j of JOBS) {
    const employer = employers.get(j.company)!;
    const job = await Job.create({
      employerId: employer._id,
      title: j.title,
      department: j.department,
      description: j.description,
      responsibilities: j.responsibilities ?? [],
      location: j.location,
      workSetup: j.workSetup,
      employmentType: 'full-time',
      industry: j.industry,
      salaryMin: j.salary[0],
      salaryMax: j.salary[1],
      requiredSkills: j.required,
      preferredSkills: j.preferred,
      minYears: j.minYears,
      educationRequired: false,
      benefits: j.benefits,
      screeningQuestion: j.screening,
      coreWeight: 70,
      autoScreenMinYears: !!j.autoScreen,
      status: 'active',
      views: j.views,
      createdAt: daysAgo(j.createdDaysAgo),
    });
    jobs.set(`${j.company}|${j.title}`, job);
  }

  // Applications
  const apps = new Map<string, InstanceType<typeof Application>>();
  for (const a of APPLICATIONS) {
    const seeker = seekers.get(a.seeker)!;
    const job = jobs.get(`${a.company}|${a.title}`)!;
    const match = computeMatch(seeker, job);
    const created = hoursAgo(a.createdHoursAgo);
    const timeline: Array<{ status: ApplicationStatus; at: Date; note?: string }> = [{ status: 'submitted', at: created, note: 'Application submitted via Findry 1-click apply' }];
    const order: ApplicationStatus[] = ['viewed', 'interview', 'offer'];
    const idx = order.indexOf(a.status);
    let viewedAt: Date | undefined;
    if (idx >= 0) {
      for (let i = 0; i <= idx; i++) {
        const at = new Date(created.getTime() + (i + 1) * Math.max(1, a.createdHoursAgo / (idx + 2)) * 3_600_000);
        if (order[i] === 'viewed') viewedAt = at;
        timeline.push({ status: order[i], at, note: i === idx ? a.note : undefined });
      }
    } else if (a.status === 'rejected') timeline.push({ status: 'rejected', at: new Date(created.getTime() + 3_600_000), note: a.note });
    const app = await Application.create({
      jobId: job._id,
      seekerId: seeker._id,
      employerId: job.employerId,
      status: a.status,
      matchScore: match.score,
      matchBreakdown: match,
      screeningAnswer: a.screeningAnswer,
      employerNote: a.note,
      interviewAt: a.interviewInDays !== undefined ? new Date(daysFromNow(a.interviewInDays).setHours(14, 0, 0, 0)) : undefined,
      interviewNote: a.interviewNote,
      offerSalary: a.offerSalary,
      offerExpiresAt: a.offerExpiresInDays !== undefined ? daysFromNow(a.offerExpiresInDays) : undefined,
      offerPerks: a.offerPerks ?? [],
      timeline,
      viewedAt,
      createdAt: created,
    });
    apps.set(`${a.seeker}|${a.company}|${a.title}`, app);
  }

  // Messages
  const mariaUser = users.get('maria@findry.demo')!;
  const mayaUser = users.get('hr@maya.demo')!;
  const tonikUser = users.get('hr@tonik.demo')!;
  const mayaApp = apps.get('maria@findry.demo|Maya|Lead Frontend Architect')!;
  const tonikApp = apps.get('maria@findry.demo|Tonik Digital Bank|Senior UI Systems Engineer')!;
  const canvaUser = users.get('hr@canva.demo')!;
  const canvaApp = apps.get('maria@findry.demo|Canva Philippines|Staff UI/UX Systems Engineer')!;
  const thread = [
    { app: mayaApp, from: mayaUser, to: mariaUser, body: 'Hi Maria! Angelo from Maya Talent here. Your Module Federation work at Coins.ph is exactly what our Core Web team is after. Are you open to a technical deep dive this week?', h: 50 },
    { app: mayaApp, from: mariaUser, to: mayaUser, body: 'Hi Angelo, thanks for reaching out — yes, very interested. Tomorrow afternoon works well for me.', h: 46 },
    { app: mayaApp, from: mayaUser, to: mariaUser, body: 'Perfect. Round 2 is set for tomorrow 2:00 PM PHT on Google Meet (link auto-synced in your tracker). Expect questions on micro-frontend boundaries and Core Web Vitals budgets. Good luck!', h: 20, unread: true },
    { app: tonikApp, from: tonikUser, to: mariaUser, body: 'Maria, we are thrilled to extend a formal offer: ₱185,000/mo plus the perks in your tracker. The offer stands for 4 days — happy to jump on a call to walk through the HMO and equipment stipend.', h: 30, unread: true },
    { app: canvaApp, from: canvaUser, to: mariaUser, body: 'Thanks for submitting the design-system assignment. The team is reviewing this week; we’ll have an update by Friday.', h: 40, unread: true },
  ];
  for (const m of thread) {
    await Message.create({ applicationId: m.app._id, fromUserId: m.from._id, toUserId: m.to._id, body: m.body, readAt: m.unread ? undefined : hoursAgo(m.h - 1), createdAt: hoursAgo(m.h) });
  }

  console.log(`[seed] ${users.size} users, ${employers.size} employers, ${seekers.size} seekers, ${jobs.size} jobs, ${apps.size} applications, ${thread.length} messages`);
  return { skipped: false };
}
