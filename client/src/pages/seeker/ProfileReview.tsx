import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bar, ErrorBox, Icon, MatchRing, Skeleton } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { peso } from '../../lib/format';
import { toast, useFetch } from '../../lib/hooks';
import type { ParsedResume, SeekerProfile } from '../../lib/types';
import { Stepper } from './Onboarding';
import { ProfileEditor, draftFromProfile, draftToPayload } from './ProfileEditor';
import type { ProfileDraft } from './ProfileEditor';

interface NavState {
  parsed?: ParsedResume;
  parser?: string;
  parseMs?: number;
  fileName?: string;
  fileSize?: number;
}

/** Step 2 of seeker onboarding: verify the AI-extracted profile (Stitch "AI Extraction & Calibration"). */
export function ProfileReview() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const state = (useLocation().state ?? {}) as NavState;
  const { data, error, loading, reload } = useFetch(() => api.get<{ profile: SeekerProfile; user: { name: string } }>('/seeker/profile'));
  const { data: feed } = useFetch(() => api.get<{ total: number; jobs: Array<{ salaryMin: number; salaryMax: number }> }>('/seeker/matches?limit=100'));
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && !draft) setDraft(draftFromProfile(data.profile, data.user.name || user?.name || ''));
  }, [data, draft, user]);

  if (error) return <div className="max-w-4xl mx-auto p-space-lg"><ErrorBox message={error} onRetry={reload} /></div>;
  if (loading || !draft || !data) {
    return (
      <div className="max-w-[1280px] mx-auto px-margin-sm lg:px-margin-lg pt-space-xl flex flex-col gap-space-md">
        <Skeleton className="h-16" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const resume = data.profile.resumes[data.profile.resumes.length - 1];
  const confidence = state.parsed?.confidence ?? resume?.confidence ?? 0;
  const parser = state.parser ?? resume?.parserUsed ?? 'local';
  const checks: Array<[string, string, boolean]> = [
    ['Contact & identity', `${draft.name || 'Name missing'} • ${draft.location || 'location not set'}`, !!draft.name],
    ['Tech stacks & seniority', `${draft.yearsExperience} yrs • ${draft.skills.slice(0, 3).join(', ') || 'no skills yet'}`, draft.skills.length >= 3],
    ['Experience & education', `${draft.experience.length} roles • ${draft.education.length} schools`, draft.experience.length > 0],
    ['PH salary calibration', draft.salaryTarget ? `${peso(Number(draft.salaryTarget))} / mo target` : 'Set a target below', !!draft.salaryTarget],
  ];
  const salaries = (feed?.jobs ?? []).map((j) => (j.salaryMin + j.salaryMax) / 2).sort((a, b) => a - b);
  const median = salaries.length ? salaries[Math.floor(salaries.length / 2)] : 0;

  const activate = async () => {
    setBusy(true);
    try {
      await api.put('/seeker/profile', { ...draftToPayload(draft), onboardingComplete: true });
      await refresh();
      toast.success('Profile activated — your matches are live');
      navigate('/seeker');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <div className="max-w-[1280px] mx-auto px-margin-sm lg:px-margin-lg pt-space-xl pb-32">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <Stepper active={2} />
          <div className="flex items-center gap-space-sm px-space-md py-space-xs rounded-full bg-secondary-container/40 text-on-secondary-container self-start">
            <Icon name="auto_awesome" size={20} fill className="text-secondary" />
            <span className="font-label-prominent text-label-prominent">
              Parsed by <span className="text-secondary font-bold">{parser === 'gemini' ? 'Gemini' : parser === 'mock' ? 'demo fixture' : 'Findry local engine'}</span>
              {state.parseMs ? ` in ${(state.parseMs / 1000).toFixed(1)}s` : ''}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start mt-space-lg">
          {/* Left: diagnostics */}
          <div className="lg:col-span-5 flex flex-col gap-space-lg lg:sticky lg:top-20">
            <div className="card p-space-lg">
              <div className="flex items-start justify-between gap-space-sm mb-space-md">
                <div className="flex items-center gap-space-md min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-error-container/40 text-error flex items-center justify-center shrink-0">
                    <Icon name={resume?.mimeType?.includes('word') ? 'description' : 'picture_as_pdf'} size={28} fill />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-title-card text-title-card text-on-surface truncate">{state.fileName ?? resume?.originalName ?? 'No file uploaded'}</h2>
                    <div className="caption flex items-center gap-space-xs mt-0.5">
                      {(state.fileSize ?? resume?.size) ? <span>{((state.fileSize ?? resume!.size) / 1024 / 1024).toFixed(1)} MB</span> : <span>Manual entry</span>}
                      {resume && (
                        <>
                          <span>•</span>
                          <span className="text-secondary font-semibold">{new Date(resume.uploadedAt).toLocaleDateString('en-PH')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => navigate('/seeker/onboarding')} className="btn-ghost h-9 px-space-sm shrink-0">
                  <Icon name="file_upload" size={16} /> Replace
                </button>
              </div>
              <div className="bg-surface-container-low rounded-xl p-space-md mb-space-md">
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-label-prominent text-label-prominent text-secondary flex items-center gap-space-xs">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary" />
                    </span>
                    Extraction complete
                  </span>
                  <span className="caption font-semibold">Ready for review</span>
                </div>
                <Bar value={100} tone="bg-secondary" />
              </div>
              <div className="space-y-space-sm">
                {checks.map(([t, d, ok]) => (
                  <div key={t} className="flex items-center justify-between p-space-sm rounded-lg bg-surface">
                    <div className="flex items-center gap-space-sm min-w-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${ok ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>
                        <Icon name={ok ? 'check' : 'priority_high'} size={14} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-label-prominent text-label-prominent text-on-surface">{t}</p>
                        <p className="caption truncate">{d}</p>
                      </div>
                    </div>
                    <span className={`pill shrink-0 ${ok ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>{ok ? 'Verified' : 'Needs input'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-space-lg">
              <div className="flex items-center justify-between gap-space-md mb-space-md">
                <div>
                  <p className="kicker text-outline">Parsing confidence</p>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mt-0.5">{confidence}% engine fidelity</h3>
                </div>
                <MatchRing score={confidence} size={64} stroke={5} />
              </div>
              {(state.parsed?.highlights?.length || data.profile.highlights.length) > 0 ? (
                <div className="rounded-lg bg-secondary-container/20 p-space-sm flex items-start gap-space-sm">
                  <Icon name="insights" size={18} fill className="text-secondary mt-0.5" />
                  <p className="font-body-sm text-body-sm text-on-secondary-fixed-variant">
                    Quantified achievements found: {(state.parsed?.highlights ?? data.profile.highlights).slice(0, 2).map((h) => `"${h}"`).join(' and ')}. Impact phrasing like this draws more interview invites from BGC fintech employers.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-surface-container-low p-space-sm flex items-start gap-space-sm">
                  <Icon name="lightbulb" size={18} className="text-tertiary mt-0.5" />
                  <p className="caption">No quantified achievements detected. Adding numbers ("cut load time 40%") to your experience descriptions makes employers 3× more likely to shortlist you.</p>
                </div>
              )}
            </div>

            <div className="bg-surface-container-low rounded-xl p-space-md flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                  <Icon name="hub" size={22} />
                </div>
                <div>
                  <p className="font-label-prominent text-label-prominent text-on-surface">{feed?.total ?? '—'} live openings to match</p>
                  <p className="caption">Taguig BGC • Makati CBD • Cebu • Remote PH</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-salary-metric text-salary-metric text-secondary font-bold">{median ? peso(median, { compact: true }) : '—'}</span>
                <p className="caption">Median live salary</p>
              </div>
            </div>
          </div>

          {/* Right: editor */}
          <div className="lg:col-span-7 card p-space-lg">
            <div className="flex items-center gap-space-xs mb-1">
              <span className="pill bg-primary-fixed text-primary uppercase font-bold tracking-wider">Review &amp; calibrate</span>
              <span className="caption text-outline">• Step 2 of 3</span>
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Verify your AI-extracted profile</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 mb-space-lg">Fix anything the parser got wrong, set your compensation, and choose who can see you.</p>
            <ProfileEditor draft={draft} onChange={setDraft} />
          </div>
        </div>
      </div>

      {/* Sticky commit bar */}
      <div className="fixed bottom-0 left-0 w-full bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.06)] py-space-md z-40">
        <div className="max-w-[1280px] mx-auto px-margin-sm lg:px-margin-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="hidden md:flex items-center gap-space-sm caption">
            <span className="w-8 h-8 rounded-full bg-secondary-container/50 text-secondary flex items-center justify-center">
              <Icon name="verified_user" size={18} />
            </span>
            <div>
              <p className="font-label-prominent text-label-prominent text-on-surface">Data Privacy Act (RA 10173) compliant</p>
              <p className="text-outline">Your resume is parsed privately. Never sold or trained on public models.</p>
            </div>
          </div>
          <button type="button" onClick={activate} disabled={busy || draft.skills.length === 0} className="btn-primary w-full md:w-auto h-12 px-space-xl font-headline-sm text-[16px] font-bold">
            <Icon name="bolt" size={20} fill />
            {busy ? 'Activating…' : `Activate profile & view ${feed?.total ?? ''} AI matches`}
            <Icon name="arrow_forward" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
