import type { ParsedResume } from '../../types';
import { localProvider } from './local';
import type { AIProvider } from './provider';

/**
 * Demo fixture — the "Maria Santos" profile from the Stitch mockups.
 * AI_PROVIDER=mock returns this for any uploaded file so you can demo the
 * onboarding flow without a key or a real resume.
 */
export const MARIA_SANTOS: ParsedResume = {
  fullName: 'Maria Santos',
  email: 'maria.santos@example.com',
  phone: '+63 917 555 0142',
  headline: 'Senior Frontend Engineer',
  location: 'Taguig City, Metro Manila',
  summary:
    'Frontend engineer with 6+ years building high-traffic fintech web apps in the Philippines. Led micro-frontend re-architecture at scale, mentored 14 engineers across Manila and Cebu squads.',
  skills: [
    'React',
    'Next.js',
    'TypeScript',
    'Tailwind CSS',
    'Redux',
    'Zustand',
    'Micro-frontends',
    'Web Performance',
    'Design Systems',
    'GraphQL',
    'REST APIs',
    'Unit Testing',
    'Git',
    'Fintech',
    'Mentoring',
  ],
  yearsExperience: 6,
  experience: [
    {
      company: 'Maya Philippines',
      title: 'Staff Frontend Contractor',
      from: '2022-03',
      to: 'Present',
      location: 'Taguig',
      description:
        'Spearheaded frontend re-architecture for the consumer merchant dashboard, lifting Core Web Vitals to 95+. Trained 14 junior devs across Manila and Cebu squads on TypeScript strict migrations.',
    },
    {
      company: 'Coins.ph',
      title: 'Senior Web Engineer',
      from: '2019-06',
      to: '2022-02',
      location: 'Pasig',
      description:
        'Delivered crypto checkout widgets in React & Next.js. Engineered responsive real-time charts handling ₱50M+ daily transactional flow. Architected Module Federation, cutting build deployment times by 40%.',
    },
  ],
  education: [
    {
      school: 'University of the Philippines Diliman',
      degree: 'BS Computer Science',
      field: 'Computer Science',
      from: '2014',
      to: '2018',
      honors: 'Cum Laude',
    },
  ],
  links: {
    linkedin: 'linkedin.com/in/maria-santos-dev',
    github: 'github.com/mariasantos',
  },
  highlights: [
    'Scaled consumer app frontend to 4.2M MAU',
    'Reduced web bundle size by 42%',
    'Cut build deployment times by 40% with Module Federation',
    'Core Web Vitals raised to 95+ on merchant dashboard',
  ],
  confidence: 96,
};

export const mockProvider: AIProvider = {
  name: 'mock',
  async parseResume() {
    // simulate the "Extracting your skills..." delay the UI animates against
    await new Promise((r) => setTimeout(r, 1200));
    return structuredClone(MARIA_SANTOS);
  },
  suggestSkills: localProvider.suggestSkills,
  gapAdvice: localProvider.gapAdvice,
};
