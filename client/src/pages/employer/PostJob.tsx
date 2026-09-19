import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bar, ErrorBox, Icon, NumberField, SkillPill, Skeleton, Toggle } from '../../components/ui';
import { api, qs } from '../../lib/api';
import { peso, pesoRange } from '../../lib/format';
import { toast, useDebounced, useFetch } from '../../lib/hooks';
import type { Job, WorkSetup } from '../../lib/types';

interface Draft {
  title: string;
  department: string;
  employmentType: string;
  location: string;
  workSetup: WorkSetup;
  industry: string;
  minYears: number;
  description: string;
  responsibilities: string;
  requiredSkills: string[];
  preferredSkills: string[];
  coreWeight: number;
  salaryMin: number;
  salaryMax: number;
  benefits: string[];
  educationRequired: boolean;
  screeningQuestion: string;
  autoScreenMinYears: boolean;
}

const EMPTY: Draft = {
  title: '',
  department: '',
  employmentType: 'full-time',
  location: 'Bonifacio Global City, Taguig',
  workSetup: 'hybrid',
  industry: 'Fintech & Neo-banking',
  minYears: 3,
  description: '',
  responsibilities: '',
  requiredSkills: [],
  preferredSkills: [],
  coreWeight: 70,
  salaryMin: 80000,
  salaryMax: 120000,
  benefits: ['Guaranteed 13th Month Pay', 'SSS, PhilHealth & Pag-IBIG', 'Day 1 HMO + 2 Dependents'],
  educationRequired: false,
  screeningQuestion: '',
  autoScreenMinYears: false,
};

const LOCATIONS = ['Bonifacio Global City, Taguig', 'Makati Central Business District', 'Ortigas Center, Pasig', 'Quezon City', 'Alabang, Muntinlupa', 'Cebu IT Park, Cebu City', 'Davao City', 'Clark Freeport, Pampanga', 'Remote (Philippines)'];
const INDUSTRIES = ['Fintech & Neo-banking', 'Enterprise SaaS & Cloud', 'HR Tech / SaaS', 'E-commerce Logistics', 'HealthTech', 'Social / Media', 'Banking Software', 'BPO / Shared Services'];
const BENEFITS: Array<[string, string]> = [
  ['Guaranteed 13th Month Pay', 'DOLE statutory requirement'],
  ['Performance 14th Month Bonus', 'Discretionary, milestone-based'],
  ['Day 1 HMO + 2 Dependents', 'e.g. Maxicare, ₱250k MBL per illness'],
  ['₱3,500/mo Remote & Fiber Allowance', 'Covers PLDT/Globe fiber + ergonomics'],
  ['Laptop + Monitor Kit', 'Shipped to the candidate in PH'],
  ['SSS, PhilHealth & Pag-IBIG', 'Full government remittance'],
  ['Equity / Stock Options', 'For senior & staff roles'],
  ['Learning & Certification Budget', 'AWS, GCP, conferences'],
];
const STEPS = ['About the role', 'Skills', 'Salary & benefits', 'Review & publish'];

function fromJob(j: Job): Draft {
  return {
    title: j.title,
    department: j.department ?? '',
    employmentType: j.employmentType,
    location: j.location,
    workSetup: j.workSetup,
    industry: j.industry,
    minYears: j.minYears,
    description: j.description,
    responsibilities: j.responsibilities.join('\n'),
    requiredSkills: j.requiredSkills,
    preferredSkills: j.preferredSkills,
    coreWeight: j.coreWeight,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    benefits: j.benefits,
    educationRequired: j.educationRequired,
    screeningQuestion: j.screeningQuestion ?? '',
    autoScreenMinYears: j.autoScreenMinYears,
  };
}

/** Post-a-job wizard (4 steps) with AI skill suggestions and a live talent-pool simulation dock. */
export function PostJob() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = !!id;
  const { data: existing, error: loadErr, loading } = useFetch(() => (id ? api.get<{ job: Job }>(`/employer/jobs/${id}`) : Promise.resolve(null)), [id]);
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (existing?.job) setD(fromJob(existing.job));
  }, [existing]);

  const { data: stats } = useFetch(() => api.get<{ medianSalary: number }>('/jobs/stats'));

  // Live simulation (debounced on skills / years / weight)
  const simKey = useDebounced(qs({ requiredSkills: d.requiredSkills.join(','), preferredSkills: d.preferredSkills.join(','), minYears: d.minYears, educationRequired: d.educationRequired, coreWeight: d.coreWeight }), 500);
  const { data: sim } = useFetch(() => (d.requiredSkills.length ? api.get<{ total: number; high: number; strong: number; pool: number; top: { name: string; headline: string; score: number; salaryTarget?: number; skills: string[]; lastCompany?: string } | null }>(`/employer/simulate${simKey}`) : Promise.resolve(null)), [simKey]);

  const suggest = async () => {
    if (!d.title.trim()) return toast.error('Enter a job title first');
    setSuggesting(true);
    try {
      const r = await api.post<{ required: string[]; preferred: string[]; provider: string }>('/employer/ai/suggest-skills', { title: d.title, description: d.description });
      setD((s) => ({
        ...s,
        requiredSkills: s.requiredSkills.length ? s.requiredSkills : r.required,
        preferredSkills: s.preferredSkills.length ? s.preferredSkills : r.preferred.slice(0, 4),
      }));
      setSuggested([...r.required, ...r.preferred]);
      toast.success(`Suggested ${r.required.length + r.preferred.length} skills via ${r.provider === 'gemini' ? 'Gemini' : 'Findry engine'}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSuggesting(false);
    }
  };

  const addSkill = (name: string, list: 'requiredSkills' | 'preferredSkills') => {
    const v = name.trim();
    if (!v) return;
    setD((s) => {
      const other = list === 'requiredSkills' ? 'preferredSkills' : 'requiredSkills';
      if (s[list].some((x) => x.toLowerCase() === v.toLowerCase())) return s;
      return { ...s, [list]: [...s[list], v], [other]: s[other].filter((x) => x.toLowerCase() !== v.toLowerCase()) };
    });
    setCustom('');
  };

  const payload = useMemo(
    () => ({
      ...d,
      responsibilities: d.responsibilities.split('\n').map((s) => s.trim()).filter(Boolean),
      screeningQuestion: d.screeningQuestion || undefined,
      department: d.department || undefined,
    }),
    [d],
  );

  const save = async (status: 'active' | 'draft') => {
    setBusy(true);
    try {
      const r = editing ? await api.put<{ job: Job }>(`/employer/jobs/${id}`, { ...payload, status }) : await api.post<{ job: Job }>('/employer/jobs', { ...payload, status });
      toast.success(status === 'active' ? `"${r.job.title}" is live — AI matching started` : 'Draft saved');
      navigate(status === 'active' ? `/employer/candidates?jobId=${r.job.id}` : '/employer/jobs');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const median = stats?.medianSalary ?? 0;
  const mid = (d.salaryMin + d.salaryMax) / 2;
  const benchmark = median ? Math.round(((mid - median) / median) * 100) : 0;
  const canNext = [d.title.trim().length >= 3, d.requiredSkills.length > 0, d.salaryMax >= d.salaryMin && d.salaryMax > 0, true][step];

  if (loadErr) return <div className="p-space-lg"><ErrorBox message={loadErr} /></div>;
  if (editing && loading) return <div className="p-space-lg"><Skeleton className="h-96" /></div>;

  return (
    <div className="max-w-[1280px] w-full mx-auto px-margin-sm lg:px-space-lg py-space-lg">
      {/* Stepper */}
      <div className="card p-space-md mb-space-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
          {STEPS.map((s, i) => (
            <button key={s} type="button" onClick={() => i < step && setStep(i)} className={`flex items-center gap-space-sm text-left rounded-lg p-space-xs ${i === step ? 'bg-secondary/5' : ''} ${i > step ? 'opacity-60 cursor-default' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${i < step ? 'bg-surface-container text-secondary' : i === step ? 'bg-secondary text-on-secondary shadow-sm' : 'bg-surface-container text-on-surface-variant'}`}>{i < step ? <Icon name="check" size={16} /> : i + 1}</div>
              <div className="min-w-0">
                <span className={`kicker block ${i === step ? 'text-secondary' : 'text-outline'}`}>
                  Step 0{i + 1}
                  {i === step ? ' • In progress' : ''}
                </span>
                <span className={`font-label-prominent text-label-prominent truncate block ${i === step ? 'text-secondary font-bold' : 'text-on-surface-variant'}`}>{s}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        <div className="lg:col-span-8 flex flex-col gap-space-lg">
          {/* STEP 1 */}
          {step === 0 && (
            <div className="card p-space-lg flex flex-col gap-space-md">
              <div>
                <span className="kicker text-secondary flex items-center gap-1">
                  <Icon name="work" size={14} /> Step 1 of 4
                </span>
                <h1 className="font-headline-md text-headline-md text-on-surface font-extrabold tracking-tight">{editing ? 'Edit job post' : 'Tell us about the role'}</h1>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">The basics first — we use the title to suggest skills in the next step.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="md:col-span-2">
                  <label className="label flex items-center justify-between">
                    <span>Job title</span>
                  </label>
                  <input className="field font-semibold" placeholder="e.g. Lead Frontend Architect" value={d.title} onChange={(e) => set('title', e.target.value)} />
                </div>
                <div>
                  <label className="label">Department / team</label>
                  <input className="field" placeholder="Core Web Platform" value={d.department} onChange={(e) => set('department', e.target.value)} />
                </div>
                <div>
                  <label className="label">Employment type</label>
                  <select className="field appearance-none" value={d.employmentType} onChange={(e) => set('employmentType', e.target.value)}>
                    <option value="full-time">Full-time permanent (direct PH payroll)</option>
                    <option value="contract">Independent contractor</option>
                    <option value="part-time">Part-time</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div>
                  <label className="label">Location</label>
                  <input className="field" list="post-locations" value={d.location} onChange={(e) => set('location', e.target.value)} />
                  <datalist id="post-locations">
                    {LOCATIONS.map((l) => (
                      <option key={l} value={l} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="label">Industry</label>
                  <select className="field appearance-none" value={d.industry} onChange={(e) => set('industry', e.target.value)}>
                    {INDUSTRIES.map((i) => (
                      <option key={i}>{i}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Work setup</label>
                  <div className="flex items-center gap-space-xs bg-surface-container-low p-1 rounded-lg h-11">
                    {(['hybrid', 'remote', 'onsite'] as WorkSetup[]).map((w) => (
                      <button key={w} type="button" onClick={() => set('workSetup', w)} className={`flex-1 h-full text-center caption font-bold rounded capitalize ${d.workSetup === w ? 'bg-surface-container-lowest text-secondary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
                        {w === 'remote' ? 'Full remote' : w}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Minimum years of experience</label>
                  <NumberField min={0} max={30} suffix="years" value={d.minYears} onChange={(v) => set('minYears', Number(v))} />
                </div>
                <div className="md:col-span-2">
                  <label className="label">About the role</label>
                  <textarea className="textarea" rows={5} value={d.description} onChange={(e) => set('description', e.target.value)} placeholder="What the person will own, the team, the stack, and the impact." />
                </div>
                <div className="md:col-span-2">
                  <label className="label">
                    Key responsibilities <span className="caption font-normal">(one per line)</span>
                  </label>
                  <textarea className="textarea" rows={4} value={d.responsibilities} onChange={(e) => set('responsibilities', e.target.value)} placeholder={'Own the design system\nDefine Core Web Vitals SLAs\nMentor 4 engineers'} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 1 && (
            <div className="card p-space-lg flex flex-col gap-space-md">
              <div className="flex items-center justify-between flex-wrap gap-space-xs">
                <div className="flex items-center gap-space-sm">
                  <div className="w-9 h-9 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
                    <Icon name="psychology" size={20} />
                  </div>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">AI skill architecture &amp; relevance weights</h2>
                    <p className="caption">Required skills gate the 85%+ tier; preferred skills add ecosystem agility.</p>
                  </div>
                </div>
                <button type="button" onClick={suggest} disabled={suggesting} className="btn-secondary h-10">
                  <Icon name="auto_awesome" size={18} /> {suggesting ? 'Analysing…' : 'Suggest from title'}
                </button>
              </div>

              <div className="flex flex-col gap-space-xs">
                <label className="label flex items-center gap-space-xs mb-0">
                  <span className="w-2 h-2 rounded-full bg-secondary" /> Required core stack <span className="caption font-normal">(must-have)</span>
                </label>
                <div className="flex flex-wrap gap-space-sm p-space-md bg-surface-container-low rounded-xl min-h-[56px]">
                  {d.requiredSkills.map((s) => (
                    <SkillPill key={s} name={s} tone="matched" onRemove={() => set('requiredSkills', d.requiredSkills.filter((x) => x !== s))} />
                  ))}
                  {!d.requiredSkills.length && <span className="caption">Click "Suggest from title" or add skills below.</span>}
                </div>
              </div>
              <div className="flex flex-col gap-space-xs">
                <label className="label flex items-center gap-space-xs mb-0">
                  <span className="w-2 h-2 rounded-full bg-primary-container" /> Preferred / ecosystem skills <span className="caption font-normal">(nice-to-have)</span>
                </label>
                <div className="flex flex-wrap gap-space-sm p-space-md bg-surface-container-low rounded-xl min-h-[56px]">
                  {d.preferredSkills.map((s) => (
                    <SkillPill key={s} name={s} tone="preferred" onRemove={() => set('preferredSkills', d.preferredSkills.filter((x) => x !== s))} />
                  ))}
                  {!d.preferredSkills.length && <span className="caption">Optional.</span>}
                </div>
              </div>
              <div className="flex gap-space-sm">
                <input
                  className="field"
                  placeholder="Add a custom skill…"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill(custom, 'requiredSkills');
                    }
                  }}
                />
                <button type="button" onClick={() => addSkill(custom, 'requiredSkills')} className="btn-ghost h-11 shrink-0">
                  + Required
                </button>
                <button type="button" onClick={() => addSkill(custom, 'preferredSkills')} className="btn-ghost h-11 shrink-0">
                  + Preferred
                </button>
              </div>
              {suggested.filter((s) => !d.requiredSkills.includes(s) && !d.preferredSkills.includes(s)).length > 0 && (
                <div>
                  <span className="kicker text-outline">AI-suggested — click to add as preferred</span>
                  <div className="flex flex-wrap gap-space-xs mt-space-xs">
                    {suggested
                      .filter((s) => !d.requiredSkills.includes(s) && !d.preferredSkills.includes(s))
                      .map((s) => (
                        <SkillPill key={s} name={s} tone="neutral" icon="add_circle" onClick={() => addSkill(s, 'preferredSkills')} />
                      ))}
                  </div>
                </div>
              )}
              <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-prominent text-label-prominent text-on-surface flex items-center gap-space-xs">
                    <Icon name="balance" size={16} className="text-secondary" /> Matching weight: strict core vs ecosystem agility
                  </span>
                  <span className="caption font-bold text-secondary bg-surface-container-lowest px-2 py-0.5 rounded">
                    {d.coreWeight}% core : {100 - d.coreWeight}% ecosystem
                  </span>
                </div>
                <input type="range" min={40} max={100} step={5} value={d.coreWeight} onChange={(e) => set('coreWeight', Number(e.target.value))} className="w-full accent-secondary" aria-label="Core skill weight" />
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden flex">
                  <div className="bg-secondary h-full" style={{ width: `${d.coreWeight}%` }} />
                  <div className="bg-primary-container h-full" style={{ width: `${100 - d.coreWeight}%` }} />
                </div>
                <div className="flex justify-between caption">
                  <span>Must have deep architecture &amp; core stack</span>
                  <span>Flexible on adjacent libraries</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 2 && (
            <div className="card p-space-lg flex flex-col gap-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
                  <Icon name="payments" size={20} />
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Salary &amp; benefits</h2>
                  <p className="caption">Posts with a visible ₱ range get more qualified applicants. The range is shown on the job card.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {(['salaryMin', 'salaryMax'] as const).map((k) => (
                  <div key={k}>
                    <label className="label">{k === 'salaryMin' ? 'Minimum' : 'Maximum'} base salary (gross / month)</label>
                    <NumberField prefix="₱" suffix="/ mo" min={0} step={5000} bold value={d[k]} onChange={(v) => set(k, Number(v))} />
                  </div>
                ))}
              </div>
              <div className="p-space-md rounded-xl bg-secondary/10 flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <Icon name="insights" size={24} className="text-secondary" />
                  <div>
                    <span className="font-label-prominent text-label-prominent text-on-surface font-bold">Market benchmark: live Findry postings</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant block">
                      Platform median: <strong className="text-on-surface">{median ? peso(median) : '—'}</strong>. Your midpoint {pesoRange(d.salaryMin, d.salaryMax, true)} is{' '}
                      <strong className={benchmark >= 0 ? 'text-secondary' : 'text-error'}>
                        {benchmark >= 0 ? '+' : ''}
                        {benchmark}%
                      </strong>{' '}
                      vs median.
                    </span>
                  </div>
                </div>
                <span className={`pill font-bold whitespace-nowrap ${benchmark >= 10 ? 'bg-surface-container-lowest text-secondary' : benchmark >= -10 ? 'bg-surface-container-lowest text-primary' : 'bg-error-container text-on-error-container'}`}>{benchmark >= 10 ? 'Tier-1 competitive' : benchmark >= -10 ? 'Market rate' : 'Below market'}</span>
              </div>
              <div>
                <label className="label">Benefits &amp; statutory remittances</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm mt-1">
                  {BENEFITS.map(([b, sub]) => {
                    const on = d.benefits.includes(b);
                    return (
                      <label key={b} className="flex items-start gap-space-sm p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer">
                        <input type="checkbox" checked={on} onChange={() => set('benefits', on ? d.benefits.filter((x) => x !== b) : [...d.benefits, b])} className="mt-0.5 w-4 h-4 accent-secondary cursor-pointer" />
                        <span>
                          <span className="font-body-md text-body-md text-on-surface font-semibold block">{b}</span>
                          <span className="caption">{sub}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between p-space-md rounded-xl bg-surface-container-low">
                <div>
                  <span className="font-label-prominent text-label-prominent text-on-surface font-bold">Require a college degree</span>
                  <p className="caption">Off by default — education is 25% of the score either way, but only a knockout if required.</p>
                </div>
                <Toggle on={d.educationRequired} onChange={(v) => set('educationRequired', v)} label="Require degree" />
              </div>
              <div>
                <label className="label flex items-center justify-between">
                  <span>Screening question (optional)</span>
                  <span className="caption text-secondary font-medium">Candidates answer before their dossier reaches you</span>
                </label>
                <textarea className="textarea" rows={2} value={d.screeningQuestion} onChange={(e) => set('screeningQuestion', e.target.value)} placeholder="Describe a production incident you debugged end-to-end…" />
              </div>
              <div className="p-space-md rounded-xl bg-surface-container-low flex items-center justify-between gap-space-md">
                <div className="flex items-start gap-space-sm">
                  <Icon name="security" size={20} className="text-secondary mt-0.5" />
                  <div>
                    <span className="font-label-prominent text-label-prominent text-on-surface font-bold">Auto-screen applicants below {d.minYears} years verified experience</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Under-qualified candidates are marked "not selected" instantly with a transparent reason. Reduces pipeline noise.</p>
                  </div>
                </div>
                <Toggle on={d.autoScreenMinYears} onChange={(v) => set('autoScreenMinYears', v)} label="Auto-screen" />
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 3 && (
            <div className="card p-space-lg flex flex-col gap-space-md">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Preview — what candidates will see</h2>
              <div className="rounded-xl bg-surface-container-low p-space-lg flex flex-col gap-space-sm">
                <h3 className="font-headline-md text-headline-md text-on-surface font-extrabold">{d.title}</h3>
                <p className="caption">
                  {d.department ? `${d.department} • ` : ''}
                  {d.location} • {d.workSetup} • {d.employmentType} • {d.minYears}+ yrs
                </p>
                <span className="font-headline-sm text-headline-sm text-secondary font-extrabold">{pesoRange(d.salaryMin, d.salaryMax)} / mo</span>
                <p className="font-body-md text-body-md text-on-surface-variant whitespace-pre-line">{d.description || 'No description.'}</p>
                <div className="flex flex-wrap gap-1 mt-space-xs">
                  {d.requiredSkills.map((s) => (
                    <SkillPill key={s} name={s} tone="matched" />
                  ))}
                  {d.preferredSkills.map((s) => (
                    <SkillPill key={s} name={s} tone="preferred" />
                  ))}
                </div>
                <ul className="caption flex flex-wrap gap-x-space-md gap-y-1 mt-space-xs">
                  {d.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-1">
                      <Icon name="check_circle" size={13} className="text-secondary" /> {b}
                    </li>
                  ))}
                </ul>
              </div>
              {d.screeningQuestion && (
                <p className="caption">
                  <strong className="text-on-surface">Screening question:</strong> {d.screeningQuestion}
                </p>
              )}
              <p className="caption flex items-center gap-1">
                <Icon name="verified_user" size={14} className="text-secondary" /> Every applicant is scored {d.coreWeight}/{100 - d.coreWeight} on required/preferred skills, then blended 45/30/25 with experience and education.
              </p>
            </div>
          )}

          {/* Nav */}
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))} className="btn-ghost h-11">
              <Icon name="arrow_back" size={18} /> {step === 0 ? 'Cancel' : 'Back'}
            </button>
            {step < 3 ? (
              <button type="button" onClick={() => setStep(step + 1)} disabled={!canNext} className="btn-secondary h-11 px-space-lg">
                Continue <Icon name="arrow_forward" size={18} />
              </button>
            ) : (
              <div className="flex gap-space-sm">
                <button type="button" onClick={() => save('draft')} disabled={busy} className="btn-ghost h-11">
                  Save draft
                </button>
                <button type="button" onClick={() => save('active')} disabled={busy} className="btn-secondary h-11 px-space-lg">
                  <Icon name="rocket_launch" size={20} /> {busy ? 'Publishing…' : editing ? 'Save & publish' : 'Publish & launch AI match'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right dock: live simulation */}
        <aside className="lg:col-span-4 flex flex-col gap-space-md lg:sticky lg:top-20">
          <div className="card shadow-md p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <span className="kicker text-secondary flex items-center gap-space-xs">
                <Icon name="groups" size={14} /> Matching candidates
              </span>
              <span className="caption">{sim ? `${sim.pool} seekers in pool` : ''}</span>
            </div>
            <div className="flex flex-col bg-secondary/5 rounded-xl p-space-md">
              {sim ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display-hero text-[42px] leading-none font-extrabold text-secondary">{sim.total}</span>
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">{sim.total === 1 ? 'candidate' : 'candidates'}</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">on Findry currently score 80% or higher against this draft.</p>
                </>
              ) : (
                <div className="flex items-start gap-space-sm">
                  <Icon name="person_search" size={28} className="text-secondary" />
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Add required skills in step 2 to see how many candidates on Findry would match this role.</p>
                </div>
              )}
            </div>
            {sim && (
              <div className="space-y-2">
                {[
                  ['90–100% fit (immediate shortlist)', sim.high, 'bg-secondary', 'text-secondary'],
                  ['80–89% fit (strong potential)', sim.strong, 'bg-primary-container', 'text-primary-container'],
                ].map(([l, n, bar, txt]) => (
                  <div key={l as string}>
                    <div className="flex justify-between caption mb-1">
                      <span className={`font-semibold ${txt}`}>{l as string}</span>
                      <span className="font-bold text-on-surface">{n as number} engineers</span>
                    </div>
                    <Bar value={sim.total ? ((n as number) / Math.max(sim.pool, 1)) * 100 * 3 : 0} tone={bar as string} className="h-2" />
                  </div>
                ))}
              </div>
            )}
            {sim?.top && (
              <div className="flex flex-col gap-space-xs">
                <span className="font-label-prominent text-label-prominent text-on-surface flex items-center gap-1">
                  <Icon name="star" size={16} className="text-secondary" /> Top matched profile in queue
                </span>
                <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="font-title-card text-title-card text-on-surface font-bold block truncate">{sim.top.name}</span>
                      <span className="caption truncate block">
                        {sim.top.headline}
                        {sim.top.lastCompany ? ` • ${sim.top.lastCompany}` : ''}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-secondary text-on-secondary text-[10px] font-extrabold">{sim.top.score}% FIT</span>
                  </div>
                  <div className="flex items-center justify-between caption">
                    <span>Asking: <strong className="text-secondary">{sim.top.salaryTarget ? `${peso(sim.top.salaryTarget)} / mo` : 'undisclosed'}</strong></span>
                    {sim.top.salaryTarget && sim.top.salaryTarget <= d.salaryMax && <span className="text-secondary font-semibold">Within budget</span>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {sim.top.skills.map((s) => (
                      <span key={s} className="pill bg-secondary-container text-on-secondary-container text-[11px] font-bold">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="pt-space-xs flex items-center justify-center gap-space-xs caption text-outline">
              <Icon name="verified_user" size={14} /> Candidates who hid their profile from your company are not counted
            </div>
          </div>
          <div className="card p-space-md flex items-start gap-space-sm">
            <Icon name="tips_and_updates" size={22} className="text-secondary" />
            <div>
              <span className="font-label-prominent text-label-prominent text-on-surface font-bold">Tip</span>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Benefits like <strong className="text-on-surface">HMO from day one</strong> are shown on the job card and help your post stand out.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
