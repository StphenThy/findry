import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBox, Icon, Monogram, Skeleton } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { toast, useFetch } from '../../lib/hooks';
import type { EmployerSummary } from '../../lib/types';

const INDUSTRIES = ['Fintech & Neo-banking', 'Enterprise SaaS & Cloud', 'HR Tech / SaaS', 'E-commerce Logistics', 'HealthTech', 'BPO / Shared Services', 'Banking Software', 'Social / Media', 'Other'];
const SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

/** Employer onboarding (company profile setup) — also reused as the /employer/profile edit page. */
export function CompanyProfile({ onboarding = false }: { onboarding?: boolean }) {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const { data, error, loading, reload } = useFetch(() => api.get<{ profile: EmployerSummary; onboardingComplete: boolean }>('/employer/profile'));
  const [form, setForm] = useState({ companyName: '', industry: INDUSTRIES[0], size: SIZES[2], location: '', website: '', description: '', logoUrl: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      const p = data.profile;
      setForm({ companyName: p.companyName ?? '', industry: p.industry || INDUSTRIES[0], size: p.size || SIZES[2], location: p.location ?? '', website: p.website ?? '', description: p.description ?? '', logoUrl: p.logoUrl ?? '' });
    }
  }, [data]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put('/employer/profile', { ...form, onboardingComplete: true });
      await refresh();
      toast.success(onboarding ? 'Company profile ready — post your first job' : 'Company profile saved');
      navigate(onboarding ? '/employer/jobs/new' : '/employer');
    } catch (e2) {
      toast.error((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="max-w-3xl mx-auto p-space-lg"><ErrorBox message={error} onRetry={reload} /></div>;
  if (loading || !data) return <div className="max-w-3xl mx-auto p-space-lg"><Skeleton className="h-96" /></div>;
  const verified = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}/i.test(form.website);

  return (
    <div className="max-w-[1100px] mx-auto px-margin-sm lg:px-margin-lg py-space-lg">
      {onboarding && (
        <div className="card p-space-md mb-space-lg flex items-center gap-space-sm flex-wrap">
          {['Company profile', 'Post a job', 'Review candidates'].map((s, i) => (
            <div key={s} className="flex items-center gap-space-sm">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold ${i === 0 ? 'bg-secondary text-on-secondary' : 'bg-surface-container text-on-surface-variant'}`}>{i + 1}</span>
              <span className={`font-label-prominent text-label-prominent ${i === 0 ? 'text-secondary' : 'text-outline'}`}>{s}</span>
              {i < 2 && <span className="w-6 h-[2px] bg-surface-container-highest hidden sm:block" />}
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        <form onSubmit={submit} className="lg:col-span-8 card p-space-lg flex flex-col gap-space-md">
          <div>
            <span className="pill bg-secondary-fixed text-on-secondary-fixed uppercase font-bold tracking-wider">{onboarding ? 'Employer setup' : 'Company profile'}</span>
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold mt-2">{onboarding ? 'Set up your company' : 'Edit company profile'}</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">This is what candidates see on every job post. A company website earns the verified badge.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <div className="md:col-span-2">
              <label className="label">Company name</label>
              <input required className="field" value={form.companyName} onChange={set('companyName')} />
            </div>
            <div>
              <label className="label">Industry</label>
              <select className="field appearance-none" value={form.industry} onChange={set('industry')}>
                {INDUSTRIES.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Company size</label>
              <select className="field appearance-none" value={form.size} onChange={set('size')}>
                {SIZES.map((s) => (
                  <option key={s}>{s} employees</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Headquarters / main hub</label>
              <input className="field" placeholder="Bonifacio Global City, Taguig" value={form.location} onChange={set('location')} />
            </div>
            <div>
              <label className="label">
                Website <span className="caption font-normal">(verification)</span>
              </label>
              <input className="field" placeholder="https://www.company.ph" value={form.website} onChange={set('website')} />
            </div>
            <div className="md:col-span-2">
              <label className="label">
                Logo URL <span className="caption font-normal">(optional — a monogram is used otherwise)</span>
              </label>
              <input className="field" placeholder="https://…/logo.png" value={form.logoUrl} onChange={set('logoUrl')} />
            </div>
            <div className="md:col-span-2">
              <label className="label">About the company</label>
              <textarea className="textarea" rows={4} value={form.description} onChange={set('description')} placeholder="What you build, who you serve, and why engineers join." />
            </div>
          </div>
          <div className="flex justify-end gap-space-sm pt-space-sm">
            {!onboarding && (
              <button type="button" onClick={() => navigate('/employer')} className="btn-ghost h-11">
                Cancel
              </button>
            )}
            <button type="submit" disabled={busy || !form.companyName} className="btn-secondary h-11 px-space-lg">
              {busy ? 'Saving…' : onboarding ? 'Save & post first job' : 'Save profile'}
              <Icon name="arrow_forward" size={18} />
            </button>
          </div>
        </form>

        <aside className="lg:col-span-4 flex flex-col gap-space-md">
          <div className="card p-space-lg">
            <span className="kicker text-on-surface-variant">Live preview</span>
            <div className="flex items-center gap-space-md mt-space-sm">
              {form.logoUrl ? <img src={form.logoUrl} alt="" className="w-14 h-14 rounded-xl object-contain bg-surface-container" /> : <Monogram text={monogram(form.companyName)} size={56} tone="text-secondary" />}
              <div className="min-w-0">
                <div className="flex items-center gap-space-xs">
                  <span className="font-title-card text-title-card text-on-surface truncate">{form.companyName || 'Your company'}</span>
                  {verified && <Icon name="verified" size={18} fill className="text-primary" />}
                </div>
                <p className="caption">{form.industry} • {form.size} employees</p>
                <p className="caption">{form.location || 'Location'}</p>
              </div>
            </div>
            <div className={`mt-space-md p-space-sm rounded-lg flex items-center gap-space-sm ${verified ? 'bg-secondary-container/40' : 'bg-surface-container-low'}`}>
              <Icon name={verified ? 'verified_user' : 'shield'} size={20} className={verified ? 'text-secondary' : 'text-outline'} />
              <span className="caption">{verified ? 'Verified employer badge active — shown on every post.' : 'Add a website to earn the verified badge.'}</span>
            </div>
          </div>
          <div className="rounded-xl bg-surface-container p-space-md flex items-start gap-space-sm">
            <Icon name="tips_and_updates" size={22} className="text-secondary" />
            <p className="caption">
              <strong className="text-on-surface">Tip:</strong> job posts that show a ₱ salary range and benefits attract more qualified applicants.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function monogram(name: string) {
  const w = name.replace(/[^a-zA-Z ]/g, '').split(/\s+/).filter(Boolean);
  return (w.length >= 2 ? w[0][0] + w[1][0] : name.slice(0, 2) || '??').toUpperCase();
}
