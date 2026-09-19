import { useState } from 'react';
import { Icon, NumberField, SkillPill, Toggle } from '../../components/ui';
import { estimateNetMonthly, peso } from '../../lib/format';
import type { EducationEntry, ExperienceEntry, SeekerProfile, WorkSetup } from '../../lib/types';

export type ProfileDraft = Pick<SeekerProfile, 'headline' | 'location' | 'workSetup' | 'yearsExperience' | 'skills' | 'experience' | 'education' | 'summary' | 'highlights' | 'links' | 'noticeDays' | 'ghostMode' | 'hiddenCompanies' | 'preferredIndustries'> & {
  name: string;
  salaryMin: number | '';
  salaryTarget: number | '';
};

export const SUGGESTED_SKILLS = ['Docker', 'AWS', 'GraphQL', 'E2E Testing', 'CI/CD', 'Next.js', 'PostgreSQL', 'Kubernetes', 'React Native', 'Python', 'System Design', 'Redis'];
const SETUPS: Array<[WorkSetup, string]> = [
  ['hybrid', 'Hybrid'],
  ['remote', 'Full remote (PH)'],
  ['onsite', 'Onsite'],
];
const LOCATIONS = ['BGC / Taguig', 'Makati City', 'Ortigas, Pasig', 'Quezon City', 'Alabang, Muntinlupa', 'Cebu IT Park, Cebu City', 'Davao City', 'Clark, Pampanga', 'Iloilo City', 'Remote — anywhere in the Philippines'];
const INDUSTRIES = ['Fintech & Neo-banking', 'Enterprise SaaS & Cloud', 'HR Tech / SaaS', 'E-commerce Logistics', 'HealthTech', 'Social / Media', 'Banking Software', 'BPO / Shared Services'];

export function draftFromProfile(p: SeekerProfile, name: string): ProfileDraft {
  return {
    name,
    headline: p.headline ?? '',
    location: p.location ?? '',
    workSetup: p.workSetup?.length ? p.workSetup : ['hybrid', 'remote'],
    yearsExperience: p.yearsExperience ?? 0,
    skills: p.skills ?? [],
    experience: p.experience ?? [],
    education: p.education ?? [],
    summary: p.summary ?? '',
    highlights: p.highlights ?? [],
    links: p.links ?? {},
    salaryMin: p.salaryMin ?? '',
    salaryTarget: p.salaryTarget ?? '',
    noticeDays: p.noticeDays ?? 30,
    ghostMode: p.ghostMode ?? false,
    hiddenCompanies: p.hiddenCompanies ?? [],
    preferredIndustries: p.preferredIndustries ?? [],
  };
}

export function draftToPayload(d: ProfileDraft) {
  return {
    ...d,
    salaryMin: d.salaryMin === '' ? null : Number(d.salaryMin),
    salaryTarget: d.salaryTarget === '' ? null : Number(d.salaryTarget),
    yearsExperience: Number(d.yearsExperience) || 0,
  };
}

/** All editable seeker sections — shared by onboarding review and the Profile page. */
export function ProfileEditor({ draft, onChange }: { draft: ProfileDraft; onChange: (d: ProfileDraft) => void }) {
  const set = <K extends keyof ProfileDraft>(k: K, v: ProfileDraft[K]) => onChange({ ...draft, [k]: v });
  const [skillInput, setSkillInput] = useState('');
  const [hiddenInput, setHiddenInput] = useState('');

  const addSkill = (s: string) => {
    const v = s.trim();
    if (!v) return;
    if (draft.skills.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    set('skills', [...draft.skills, v]);
    setSkillInput('');
  };

  const target = Number(draft.salaryTarget) || 0;

  return (
    <div className="flex flex-col gap-space-lg">
      {/* Identity */}
      <section className="bg-surface rounded-xl p-space-md flex flex-col gap-space-md">
        <h4 className="font-title-card text-title-card text-on-surface font-bold">Basic information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          <div>
            <label className="label">Full name</label>
            <input className="field" value={draft.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Headline / target title</label>
            <input className="field" placeholder="e.g. Senior Frontend Engineer" value={draft.headline} onChange={(e) => set('headline', e.target.value)} />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="field" list="findry-locations" placeholder="City / hub" value={draft.location} onChange={(e) => set('location', e.target.value)} />
            <datalist id="findry-locations">
              {LOCATIONS.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label">Years of experience</label>
            <NumberField min={0} max={50} suffix="years" value={draft.yearsExperience} onChange={(v) => set('yearsExperience', Number(v))} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Work setup you'll accept</label>
            <div className="flex flex-wrap gap-space-xs">
              {SETUPS.map(([v, l]) => {
                const on = draft.workSetup.includes(v);
                return (
                  <button key={v} type="button" aria-pressed={on} onClick={() => set('workSetup', on ? draft.workSetup.filter((x) => x !== v) : [...draft.workSetup, v])} className={`pill px-space-sm py-1.5 ${on ? 'bg-primary-fixed text-on-primary-fixed font-semibold' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'}`}>
                    {on && <Icon name="check" size={14} />} {l}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="label">Summary</label>
            <textarea className="textarea" rows={3} value={draft.summary ?? ''} onChange={(e) => set('summary', e.target.value)} placeholder="2–3 sentences about what you build and the impact you've had." />
          </div>
        </div>
      </section>

      {/* Skills */}
      <section className="flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-title-card text-title-card text-on-surface font-bold">Your skills</h4>
            <p className="caption">Remove anything wrong, add anything missing. These drive 45% of every match score.</p>
          </div>
          <span className="caption text-outline">{draft.skills.length} skills</span>
        </div>
        <div className="flex flex-wrap gap-space-xs p-space-md bg-surface-container-low rounded-xl min-h-[56px]">
          {draft.skills.map((s) => (
            <SkillPill key={s} name={s} tone="matched" onRemove={() => set('skills', draft.skills.filter((x) => x !== s))} />
          ))}
          {!draft.skills.length && <span className="caption">No skills yet — add some below.</span>}
        </div>
        <div className="flex gap-space-sm">
          <input
            className="field"
            placeholder="Type a skill and press Enter (e.g. Docker)"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSkill(skillInput);
              }
            }}
          />
          <button type="button" onClick={() => addSkill(skillInput)} className="btn-ghost h-11 shrink-0">
            <Icon name="add" size={18} /> Add
          </button>
        </div>
        <div>
          <span className="kicker text-outline">Suggested for senior PH tech roles (click to add)</span>
          <div className="flex flex-wrap gap-space-xs mt-space-xs">
            {SUGGESTED_SKILLS.filter((s) => !draft.skills.some((x) => x.toLowerCase() === s.toLowerCase())).map((s) => (
              <SkillPill key={s} name={s} tone="neutral" icon="add" onClick={() => addSkill(s)} />
            ))}
          </div>
        </div>
      </section>

      {/* Experience */}
      <section className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <h4 className="font-title-card text-title-card text-on-surface font-bold">Work experience</h4>
          <button type="button" onClick={() => set('experience', [{ title: '', company: '', from: '', to: 'Present', description: '' }, ...draft.experience])} className="caption text-primary font-semibold hover:underline flex items-center gap-1">
            <Icon name="add" size={14} /> Add role
          </button>
        </div>
        {draft.experience.length === 0 && <p className="caption bg-surface-container-low rounded-lg p-space-sm">No experience listed yet.</p>}
        {draft.experience.map((x, i) => (
          <ExperienceRow key={i} entry={x} onChange={(e) => set('experience', draft.experience.map((y, j) => (j === i ? e : y)))} onRemove={() => set('experience', draft.experience.filter((_, j) => j !== i))} />
        ))}
      </section>

      {/* Education */}
      <section className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <h4 className="font-title-card text-title-card text-on-surface font-bold">Education</h4>
          <button type="button" onClick={() => set('education', [...draft.education, { school: '', degree: '', from: '', to: '' }])} className="caption text-primary font-semibold hover:underline flex items-center gap-1">
            <Icon name="add" size={14} /> Add school
          </button>
        </div>
        {draft.education.length === 0 && <p className="caption bg-surface-container-low rounded-lg p-space-sm">No education listed yet.</p>}
        {draft.education.map((x, i) => (
          <EducationRow key={i} entry={x} onChange={(e) => set('education', draft.education.map((y, j) => (j === i ? e : y)))} onRemove={() => set('education', draft.education.filter((_, j) => j !== i))} />
        ))}
      </section>

      {/* Links */}
      <section className="flex flex-col gap-space-sm">
        <h4 className="font-title-card text-title-card text-on-surface font-bold">
          Links &amp; light-touch verification <span className="caption font-normal">— a valid LinkedIn URL earns a verified badge</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
          {(['linkedin', 'github', 'portfolio'] as const).map((k) => (
            <div key={k}>
              <label className="label capitalize">{k}</label>
              <input className="field" placeholder={k === 'linkedin' ? 'linkedin.com/in/…' : k === 'github' ? 'github.com/…' : 'https://…'} value={draft.links?.[k] ?? ''} onChange={(e) => set('links', { ...draft.links, [k]: e.target.value })} />
            </div>
          ))}
        </div>
      </section>

      {/* Compensation */}
      <section className="p-space-lg rounded-xl bg-surface-container-low flex flex-col gap-space-md">
        <div>
          <h4 className="font-title-card text-title-card text-on-surface font-bold">Salary expectations</h4>
          <p className="caption">Gross monthly, in ₱. Employers only see whether you're inside their budget — never the exact number unless you apply.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          <div className="card p-space-md">
            <label className="kicker text-outline block mb-1">Target monthly salary (gross)</label>
            <NumberField prefix="₱" suffix="/ mo" min={0} step={1000} bold allowEmpty value={draft.salaryTarget} onChange={(v) => set('salaryTarget', v)} />
            {target > 0 && (
              <div className="mt-space-sm bg-surface-container-low rounded-lg p-space-xs caption flex items-center justify-between">
                <span>Est. TRAIN-law net take-home:</span>
                <span className="font-bold text-secondary">~{peso(estimateNetMonthly(target))} / mo</span>
              </div>
            )}
          </div>
          <div className="card p-space-md">
            <label className="kicker text-outline block mb-1">Minimum you would accept</label>
            <NumberField prefix="₱" suffix="/ mo" min={0} step={1000} bold allowEmpty value={draft.salaryMin} onChange={(v) => set('salaryMin', v)} />
            <div className="mt-space-sm bg-surface-container-low rounded-lg p-space-xs caption flex items-center justify-between">
              <span>Notice period:</span>
              <select className="bg-transparent font-bold text-on-surface" value={draft.noticeDays} onChange={(e) => set('noticeDays', Number(e.target.value))}>
                {[0, 15, 30, 45, 60].map((d) => (
                  <option key={d} value={d}>
                    {d === 0 ? 'Immediate' : `${d} days`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div>
          <span className="kicker text-outline">Preferred industries</span>
          <div className="flex flex-wrap gap-space-xs mt-space-xs">
            {INDUSTRIES.map((ind) => {
              const on = draft.preferredIndustries.includes(ind);
              return (
                <button key={ind} type="button" aria-pressed={on} onClick={() => set('preferredIndustries', on ? draft.preferredIndustries.filter((x) => x !== ind) : [...draft.preferredIndustries, ind])} className={`pill px-space-sm py-1.5 ${on ? 'bg-secondary-container text-on-secondary-container font-semibold' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'}`}>
                  {on && <Icon name="check" size={14} />} {ind}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ghost mode */}
      <section className="rounded-xl p-space-md bg-surface-container flex flex-col gap-space-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
          <div className="flex items-start gap-space-sm">
            <div className="w-9 h-9 rounded-lg bg-surface-container-lowest text-primary flex items-center justify-center shrink-0">
              <Icon name="visibility_off" size={20} fill />
            </div>
            <div>
              <div className="flex items-center gap-space-xs">
                <h4 className="font-label-prominent text-label-prominent text-on-surface font-bold">Ghost mode: hide from specific employers</h4>
                {draft.ghostMode && <span className="pill bg-secondary-container text-on-secondary-container font-bold">ACTIVE</span>}
              </div>
              <p className="caption mt-0.5">Your profile and applications become invisible to recruiters at the companies you list (e.g. your current employer).</p>
            </div>
          </div>
          <Toggle on={draft.ghostMode} onChange={(v) => set('ghostMode', v)} label="Ghost mode" />
        </div>
        {draft.ghostMode && (
          <div className="flex flex-col gap-space-xs">
            <div className="flex flex-wrap gap-space-xs">
              {draft.hiddenCompanies.map((c) => (
                <SkillPill key={c} name={c} tone="neutral" icon="domain" onRemove={() => set('hiddenCompanies', draft.hiddenCompanies.filter((x) => x !== c))} />
              ))}
            </div>
            <div className="flex gap-space-sm">
              <input
                className="field h-10"
                placeholder="Company name to hide from, then Enter"
                value={hiddenInput}
                onChange={(e) => setHiddenInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && hiddenInput.trim()) {
                    e.preventDefault();
                    set('hiddenCompanies', [...draft.hiddenCompanies, hiddenInput.trim()]);
                    setHiddenInput('');
                  }
                }}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ExperienceRow({ entry, onChange, onRemove }: { entry: ExperienceEntry; onChange: (e: ExperienceEntry) => void; onRemove: () => void }) {
  return (
    <div className="card p-space-md grid grid-cols-1 md:grid-cols-12 gap-space-sm relative">
      <button type="button" onClick={onRemove} className="absolute top-2 right-2 text-outline hover:text-error" aria-label="Remove role">
        <Icon name="delete" size={18} />
      </button>
      <div className="md:col-span-4">
        <label className="label">Title</label>
        <input className="field h-10" value={entry.title} onChange={(e) => onChange({ ...entry, title: e.target.value })} />
      </div>
      <div className="md:col-span-4">
        <label className="label">Company</label>
        <input className="field h-10" value={entry.company} onChange={(e) => onChange({ ...entry, company: e.target.value })} />
      </div>
      <div className="md:col-span-2">
        <label className="label">From</label>
        <input className="field h-10" placeholder="2022" value={entry.from ?? ''} onChange={(e) => onChange({ ...entry, from: e.target.value })} />
      </div>
      <div className="md:col-span-2">
        <label className="label">To</label>
        <input className="field h-10" placeholder="Present" value={entry.to ?? ''} onChange={(e) => onChange({ ...entry, to: e.target.value })} />
      </div>
      <div className="md:col-span-12">
        <label className="label">What you did (keep the numbers)</label>
        <textarea className="textarea" rows={2} value={entry.description ?? ''} onChange={(e) => onChange({ ...entry, description: e.target.value })} />
      </div>
    </div>
  );
}

function EducationRow({ entry, onChange, onRemove }: { entry: EducationEntry; onChange: (e: EducationEntry) => void; onRemove: () => void }) {
  return (
    <div className="card p-space-md grid grid-cols-1 md:grid-cols-12 gap-space-sm relative">
      <button type="button" onClick={onRemove} className="absolute top-2 right-2 text-outline hover:text-error" aria-label="Remove school">
        <Icon name="delete" size={18} />
      </button>
      <div className="md:col-span-5">
        <label className="label">School</label>
        <input className="field h-10" value={entry.school} onChange={(e) => onChange({ ...entry, school: e.target.value })} />
      </div>
      <div className="md:col-span-4">
        <label className="label">Degree</label>
        <input className="field h-10" placeholder="BS Computer Science" value={entry.degree ?? ''} onChange={(e) => onChange({ ...entry, degree: e.target.value })} />
      </div>
      <div className="md:col-span-3">
        <label className="label">Years</label>
        <div className="flex gap-1">
          <input className="field h-10" placeholder="2014" value={entry.from ?? ''} onChange={(e) => onChange({ ...entry, from: e.target.value })} />
          <input className="field h-10" placeholder="2018" value={entry.to ?? ''} onChange={(e) => onChange({ ...entry, to: e.target.value })} />
        </div>
      </div>
    </div>
  );
}
