/**
 * Curated tech-skill dictionary with aliases. Used by:
 *  - the local (no-LLM) resume parser to extract skills from raw text
 *  - the match scorer to normalise "ReactJS" / "React.js" / "react" → "React"
 *  - the employer post-job wizard for skill auto-suggestions
 *
 * canonical → aliases (lowercase). Matching is whole-word, case-insensitive.
 */
export interface SkillDef {
  name: string;
  aliases: string[];
  category:
    | 'frontend'
    | 'backend'
    | 'mobile'
    | 'devops'
    | 'cloud'
    | 'data'
    | 'database'
    | 'testing'
    | 'design'
    | 'tools'
    | 'soft'
    | 'domain';
}

export const SKILLS: SkillDef[] = [
  // Frontend
  { name: 'JavaScript', aliases: ['js', 'ecmascript', 'es6', 'es2015'], category: 'frontend' },
  { name: 'TypeScript', aliases: ['ts', 'typescript strict'], category: 'frontend' },
  { name: 'React', aliases: ['reactjs', 'react.js', 'react 18', 'react 18+'], category: 'frontend' },
  { name: 'Next.js', aliases: ['nextjs', 'next', 'next.js app router', 'app router'], category: 'frontend' },
  { name: 'Vue.js', aliases: ['vue', 'vuejs', 'nuxt', 'nuxt.js'], category: 'frontend' },
  { name: 'Angular', aliases: ['angularjs', 'angular 2+'], category: 'frontend' },
  { name: 'Svelte', aliases: ['sveltekit'], category: 'frontend' },
  { name: 'HTML', aliases: ['html5'], category: 'frontend' },
  { name: 'CSS', aliases: ['css3', 'scss', 'sass', 'less'], category: 'frontend' },
  { name: 'Tailwind CSS', aliases: ['tailwind', 'tailwindcss'], category: 'frontend' },
  { name: 'Redux', aliases: ['redux toolkit', 'rtk'], category: 'frontend' },
  { name: 'Zustand', aliases: [], category: 'frontend' },
  { name: 'GraphQL', aliases: ['apollo', 'apollo client', 'graphql federation'], category: 'frontend' },
  { name: 'REST APIs', aliases: ['rest', 'restful', 'rest api', 'restful apis'], category: 'backend' },
  { name: 'Micro-frontends', aliases: ['microfrontends', 'micro frontends', 'module federation'], category: 'frontend' },
  { name: 'Web Performance', aliases: ['core web vitals', 'lighthouse', 'web vitals'], category: 'frontend' },
  { name: 'Design Systems', aliases: ['design system', 'design tokens', 'storybook'], category: 'frontend' },
  { name: 'Accessibility', aliases: ['a11y', 'wcag', 'wcag 2.1'], category: 'frontend' },
  { name: 'Webpack', aliases: ['vite', 'rollup', 'esbuild', 'bundlers'], category: 'tools' },
  { name: 'WebSockets', aliases: ['websocket', 'socket.io', 'real-time'], category: 'backend' },

  // Backend
  { name: 'Node.js', aliases: ['node', 'nodejs'], category: 'backend' },
  { name: 'Express', aliases: ['expressjs', 'express.js'], category: 'backend' },
  { name: 'NestJS', aliases: ['nest', 'nest.js'], category: 'backend' },
  { name: 'Python', aliases: [], category: 'backend' },
  { name: 'Django', aliases: [], category: 'backend' },
  { name: 'FastAPI', aliases: [], category: 'backend' },
  { name: 'Flask', aliases: [], category: 'backend' },
  { name: 'Java', aliases: ['java 17', 'java 21'], category: 'backend' },
  { name: 'Spring Boot', aliases: ['spring', 'spring framework'], category: 'backend' },
  { name: 'Go', aliases: ['golang'], category: 'backend' },
  { name: 'C#', aliases: ['csharp', 'c sharp'], category: 'backend' },
  { name: '.NET', aliases: ['dotnet', 'asp.net', 'asp.net core', '.net core'], category: 'backend' },
  { name: 'PHP', aliases: [], category: 'backend' },
  { name: 'Laravel', aliases: [], category: 'backend' },
  { name: 'Ruby on Rails', aliases: ['rails', 'ruby'], category: 'backend' },
  { name: 'Kotlin', aliases: [], category: 'mobile' },
  { name: 'Swift', aliases: ['swiftui'], category: 'mobile' },
  { name: 'Microservices', aliases: ['micro-services', 'microservice architecture'], category: 'backend' },
  { name: 'System Design', aliases: ['systems design', 'distributed systems', 'architecture'], category: 'backend' },
  { name: 'Message Queues', aliases: ['rabbitmq', 'kafka', 'sqs', 'pub/sub'], category: 'backend' },

  // Mobile
  { name: 'React Native', aliases: ['react-native'], category: 'mobile' },
  { name: 'Flutter', aliases: ['dart'], category: 'mobile' },
  { name: 'Android', aliases: ['android sdk'], category: 'mobile' },
  { name: 'iOS', aliases: ['ios development'], category: 'mobile' },

  // Database
  { name: 'MongoDB', aliases: ['mongo', 'mongoose'], category: 'database' },
  { name: 'PostgreSQL', aliases: ['postgres', 'psql'], category: 'database' },
  { name: 'MySQL', aliases: ['mariadb'], category: 'database' },
  { name: 'SQL', aliases: ['t-sql', 'pl/sql'], category: 'database' },
  { name: 'Redis', aliases: ['redis caching'], category: 'database' },
  { name: 'Elasticsearch', aliases: ['opensearch'], category: 'database' },
  { name: 'Firebase', aliases: ['firestore'], category: 'database' },
  { name: 'Prisma', aliases: ['typeorm', 'sequelize', 'orm'], category: 'database' },

  // DevOps / Cloud
  { name: 'Docker', aliases: ['containers', 'containerization', 'docker compose'], category: 'devops' },
  { name: 'Kubernetes', aliases: ['k8s', 'helm'], category: 'devops' },
  { name: 'CI/CD', aliases: ['ci cd', 'github actions', 'gitlab ci', 'jenkins', 'circleci'], category: 'devops' },
  { name: 'AWS', aliases: ['amazon web services', 'ec2', 's3', 'lambda', 'cloudfront', 'ecs', 'aws ecs'], category: 'cloud' },
  { name: 'Google Cloud', aliases: ['gcp', 'google cloud platform', 'cloud run'], category: 'cloud' },
  { name: 'Azure', aliases: ['microsoft azure'], category: 'cloud' },
  { name: 'Vercel', aliases: ['netlify', 'edge ssr'], category: 'cloud' },
  { name: 'Linux', aliases: ['ubuntu', 'bash', 'shell scripting'], category: 'devops' },
  { name: 'Terraform', aliases: ['infrastructure as code', 'iac'], category: 'devops' },
  { name: 'Nginx', aliases: [], category: 'devops' },
  { name: 'Monitoring', aliases: ['datadog', 'grafana', 'prometheus', 'observability'], category: 'devops' },

  // Testing
  { name: 'Unit Testing', aliases: ['jest', 'vitest', 'mocha', 'junit', 'pytest', 'tdd'], category: 'testing' },
  { name: 'E2E Testing', aliases: ['playwright', 'cypress', 'selenium', 'end-to-end testing'], category: 'testing' },
  { name: 'QA Automation', aliases: ['test automation', 'automation testing'], category: 'testing' },

  // Data / AI
  { name: 'Machine Learning', aliases: ['ml', 'scikit-learn', 'sklearn'], category: 'data' },
  { name: 'Deep Learning', aliases: ['tensorflow', 'pytorch', 'keras', 'neural networks'], category: 'data' },
  { name: 'Data Analysis', aliases: ['pandas', 'numpy', 'data analytics'], category: 'data' },
  { name: 'Data Engineering', aliases: ['etl', 'airflow', 'spark', 'databricks'], category: 'data' },
  { name: 'LLMs', aliases: ['llm', 'openai api', 'prompt engineering', 'rag', 'langchain'], category: 'data' },
  { name: 'Power BI', aliases: ['tableau', 'looker', 'data visualization'], category: 'data' },

  // Design
  { name: 'Figma', aliases: ['adobe xd', 'sketch'], category: 'design' },
  { name: 'UI/UX Design', aliases: ['ui design', 'ux design', 'ui/ux', 'user experience', 'product design'], category: 'design' },
  { name: 'Prototyping', aliases: ['wireframing', 'wireframes'], category: 'design' },

  // Tools
  { name: 'Git', aliases: ['github', 'gitlab', 'bitbucket', 'version control'], category: 'tools' },
  { name: 'Agile', aliases: ['scrum', 'kanban', 'jira', 'sprint planning'], category: 'soft' },
  { name: 'Mentoring', aliases: ['mentorship', 'coaching', 'team lead', 'leadership'], category: 'soft' },
  { name: 'Communication', aliases: ['stakeholder management', 'presentation'], category: 'soft' },

  // Domain (PH-relevant)
  { name: 'Fintech', aliases: ['payments', 'banking', 'e-wallet', 'bsp compliance', 'pci-dss', 'kyc'], category: 'domain' },
  { name: 'E-commerce', aliases: ['ecommerce', 'shopify', 'checkout'], category: 'domain' },
  { name: 'Security', aliases: ['cybersecurity', 'owasp', 'appsec', 'penetration testing'], category: 'domain' },
  { name: 'SaaS', aliases: ['b2b saas', 'multi-tenant'], category: 'domain' },
  { name: 'BPO Operations', aliases: ['bpo', 'customer support', 'contact center'], category: 'domain' },
];

const aliasIndex = new Map<string, string>();
for (const s of SKILLS) {
  aliasIndex.set(s.name.toLowerCase(), s.name);
  for (const a of s.aliases) aliasIndex.set(a.toLowerCase(), s.name);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Map any spelling to the canonical skill name; unknown skills are returned trimmed/title-cased. */
export function normalizeSkill(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!key) return '';
  const hit = aliasIndex.get(key);
  if (hit) return hit;
  // try stripping trailing versions e.g. "React 17" → "react"
  const stripped = key.replace(/\s*\d+(\.\d+)?\+?$/, '');
  const hit2 = aliasIndex.get(stripped);
  if (hit2) return hit2;
  return raw.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeSkills(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const n = normalizeSkill(raw);
    if (n && !seen.has(n.toLowerCase())) {
      seen.add(n.toLowerCase());
      out.push(n);
    }
  }
  return out;
}

/** Scan free text and return every canonical skill mentioned (dictionary-based extraction). */
export function extractSkillsFromText(text: string): string[] {
  const found = new Map<string, number>();
  const lower = text.toLowerCase();
  for (const s of SKILLS) {
    const terms = [s.name, ...s.aliases];
    let count = 0;
    for (const t of terms) {
      const re = new RegExp(`(^|[^a-z0-9+#.])${escapeRe(t.toLowerCase())}(?=$|[^a-z0-9+#])`, 'g');
      const m = lower.match(re);
      if (m) count += m.length;
    }
    if (count > 0) found.set(s.name, count);
  }
  // most-mentioned first
  return [...found.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

export function skillCategory(name: string): SkillDef['category'] | 'other' {
  const s = SKILLS.find((d) => d.name.toLowerCase() === name.toLowerCase());
  return s?.category ?? 'other';
}

/**
 * Local (no-LLM) skill suggestions for the post-job wizard, keyed on words in the title.
 */
export function suggestSkillsLocal(title: string, description = ''): { required: string[]; preferred: string[] } {
  const t = `${title} ${description}`.toLowerCase();
  const pick = (...names: string[]) => names;
  let required: string[] = [];
  let preferred: string[] = [];

  if (/front.?end|react|ui engineer|web developer/.test(t)) {
    required = pick('React', 'TypeScript', 'JavaScript', 'HTML', 'CSS');
    preferred = pick('Next.js', 'Tailwind CSS', 'Design Systems', 'Web Performance', 'E2E Testing', 'GraphQL');
  } else if (/back.?end|api|node|golang|\bgo\b|java|python/.test(t)) {
    required = pick('Node.js', 'REST APIs', 'PostgreSQL', 'Docker', 'Git');
    preferred = pick('Microservices', 'Redis', 'Message Queues', 'AWS', 'CI/CD', 'Unit Testing');
  } else if (/full.?stack/.test(t)) {
    required = pick('React', 'Node.js', 'TypeScript', 'REST APIs', 'SQL');
    preferred = pick('Next.js', 'MongoDB', 'Docker', 'AWS', 'GraphQL');
  } else if (/devops|sre|infra|platform/.test(t)) {
    required = pick('Docker', 'Kubernetes', 'CI/CD', 'Linux', 'AWS');
    preferred = pick('Terraform', 'Monitoring', 'Nginx', 'Google Cloud', 'Security');
  } else if (/mobile|android|ios|react native|flutter/.test(t)) {
    required = pick('React Native', 'TypeScript', 'REST APIs');
    preferred = pick('Flutter', 'Android', 'iOS', 'Firebase', 'Unit Testing');
  } else if (/data|analyst|ml|machine learning|ai engineer/.test(t)) {
    required = pick('Python', 'SQL', 'Data Analysis');
    preferred = pick('Machine Learning', 'Data Engineering', 'Power BI', 'LLMs', 'Deep Learning');
  } else if (/design|ux|ui\b/.test(t)) {
    required = pick('Figma', 'UI/UX Design', 'Prototyping');
    preferred = pick('Design Systems', 'Accessibility', 'HTML', 'CSS');
  } else if (/qa|test|quality/.test(t)) {
    required = pick('QA Automation', 'E2E Testing', 'Unit Testing');
    preferred = pick('CI/CD', 'JavaScript', 'Python');
  } else {
    required = pick('Communication', 'Agile', 'Git');
    preferred = pick('SQL', 'JavaScript', 'Python');
  }
  // Also add anything explicitly mentioned in the description
  const mentioned = extractSkillsFromText(description);
  for (const m of mentioned) if (!required.includes(m) && !preferred.includes(m)) preferred.push(m);

  if (/lead|senior|staff|principal|architect/.test(t)) {
    preferred.push('System Design', 'Mentoring');
  }
  return { required: normalizeSkills(required), preferred: normalizeSkills(preferred) };
}
