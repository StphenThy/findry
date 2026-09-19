import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { estimateNetMonthly, peso, pesoRange, responseBadge, statusLabel, workSetupLabel } from '../lib/format';
import { toast, useFetch } from '../lib/hooks';
import type { Application, Job } from '../lib/types';
import { GapAdvicePanel, MatchBreakdownPanel, SkillsMatrix } from './match';
import { Avatar, ErrorBox, Icon, Modal, Monogram, Skeleton } from './ui';
import { useAuth } from '../lib/auth';

const PERK_ICONS: Array<[RegExp, string, string]> = [
  [/hmo|maxicare|health|medical/i, 'medical_services', 'text-secondary'],
  [/13th|14th|bonus|incentive/i, 'redeem', 'text-tertiary'],
  [/remote|fiber|wfh|allowance|stipend/i, 'home_work', 'text-primary'],
  [/macbook|laptop|monitor|equipment|gear/i, 'laptop_mac', 'text-secondary'],
  [/sss|philhealth|pag-ibig|statutory/i, 'account_balance', 'text-primary'],
  [/equity|stock/i, 'trending_up', 'text-tertiary'],
  [/meal|food/i, 'restaurant', 'text-secondary'],
];
const perkIcon = (b: string) => PERK_ICONS.find(([re]) => re.test(b)) ?? [null, 'check_circle', 'text-secondary'];

/**
 * Full job dossier: used as the right pane on the seeker home (desktop) and as
 * the standalone /seeker/jobs/:id page (mobile + deep links).
 */
export function JobDetailPanel({ jobId, onChanged }: { jobId: string; onChanged?: (job: Job) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading, reload, setData } = useFetch(() => api.get<{ job: Job; similar: Job[] }>(`/seeker/jobs/${jobId}`), [jobId]);
  const [applyOpen, setApplyOpen] = useState(false);
  const [answer, setAnswer] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAnswer('');
    setNote('');
  }, [jobId]);

  if (loading && !data) {
    return (
      <div className="card p-space-lg flex flex-col gap-space-md">
        <Skeleton className="h-20" />
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (error || !data) return <ErrorBox message={error ?? 'Job not found'} onRetry={reload} />;
  const { job, similar } = data;
  const m = job.match!;
  const netMin = estimateNetMonthly(job.salaryMin);
  const netMax = estimateNetMonthly(job.salaryMax);
  const badge = responseBadge(job.employer?.avgResponseHours);

  const toggleSave = async () => {
    try {
      const r = await api.post<{ saved: boolean }>(`/seeker/saved/${job.id}`);
      const next = { ...job, saved: r.saved };
      setData({ job: next, similar });
      onChanged?.(next);
      toast.success(r.saved ? 'Job saved to your bookmarks' : 'Removed from bookmarks');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ application: Application }>('/applications', { jobId: job.id, screeningAnswer: answer || undefined, coverNote: note || undefined });
      const next = { ...job, applied: true, applicationId: r.application.id, applicationStatus: r.application.status };
      setData({ job: next, similar });
      onChanged?.(next);
      setApplyOpen(false);
      if (r.application.status === 'rejected') toast.show('Submitted — but this role auto-screens on minimum experience. Check your tracker for details.', 'info');
      else toast.success(`Applied to ${job.employer?.companyName} — track it in Applications`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const applyButton = (big = false) =>
    job.applied ? (
      <Link to="/seeker/applications" className={`btn-ghost ${big ? 'h-12 px-space-xl' : 'h-11 px-space-lg'}`}>
        <Icon name="task_alt" size={18} className="text-secondary" /> Applied · {statusLabel[job.applicationStatus ?? 'submitted']}
      </Link>
    ) : (
      <button type="button" onClick={() => (job.screeningQuestion ? setApplyOpen(true) : submit())} disabled={busy} className={`btn-primary ${big ? 'h-12 px-space-xl' : 'h-11 px-space-lg'}`}>
        <Icon name="bolt" size={18} fill /> {big ? 'Confirm & Instant Apply (1-Click)' : 'One-Click AI Apply'}
      </button>
    );

  return (
    <div className="card shadow-md p-space-lg lg:p-space-xl flex flex-col gap-space-lg animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-md">
        <div className="flex items-start gap-space-md min-w-0">
          <Monogram text={job.employer?.monogram || '??'} size={64} className="shadow-sm" />
          <div className="flex flex-col gap-space-xs min-w-0">
            <div className="flex items-center gap-space-xs flex-wrap">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{job.employer?.companyName}</span>
              {job.employer?.verified && <Icon name="verified" size={20} fill className="text-primary" />}
              {job.employer?.verificationLabel && <span className="pill bg-secondary-container text-on-secondary-container font-semibold">{job.employer.verificationLabel}</span>}
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold tracking-tight">{job.title}</h2>
            <div className="flex items-center gap-space-md text-on-surface-variant font-body-sm text-body-sm flex-wrap">
              <span className="flex items-center gap-space-xs">
                <Icon name="location_on" size={16} className="text-outline" /> {job.location || 'Philippines'}
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-space-xs">
                <Icon name="schedule" size={16} className="text-outline" /> {job.employmentType.replace('-', ' ')} • {workSetupLabel[job.workSetup]}
              </span>
              {badge && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-space-xs">⚡ {badge}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-space-sm shrink-0">
          <button type="button" onClick={toggleSave} className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${job.saved ? 'bg-primary-fixed text-primary' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`} aria-label={job.saved ? 'Remove bookmark' : 'Save this job'} aria-pressed={!!job.saved}>
            <Icon name="bookmark" size={20} fill={!!job.saved} />
          </button>
          {applyButton()}
        </div>
      </div>

      {/* Salary strip */}
      <div className="rounded-xl bg-surface-container p-space-md flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-col">
          <span className="kicker text-on-surface-variant">Disclosed salary range</span>
          <span className="font-headline-md text-headline-md text-secondary font-extrabold">
            {pesoRange(job.salaryMin, job.salaryMax)} <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">/ month (gross)</span>
          </span>
          {netMin > 0 && (
            <span className="caption">
              Est. net take-home: {peso(netMin)} – {peso(netMax)} under TRAIN law computations
            </span>
          )}
        </div>
        <div className="flex items-center gap-space-md flex-wrap">
          <div className="flex flex-col">
            <span className="kicker text-on-surface-variant">Min. experience</span>
            <span className="font-label-prominent text-label-prominent text-on-surface">{job.minYears ? `${job.minYears}+ years` : 'Open'}</span>
          </div>
          <div className="flex flex-col">
            <span className="kicker text-on-surface-variant">Your target</span>
            <span className="font-label-prominent text-label-prominent text-on-surface">{salaryFit(job)}</span>
          </div>
        </div>
      </div>

      <MatchBreakdownPanel match={m} />
      <SkillsMatrix match={m} />
      <GapAdvicePanel jobId={job.id} match={m} />

      {/* Perks */}
      {job.benefits.length > 0 && (
        <section aria-label="Benefits" className="flex flex-col gap-space-md">
          <h3 className="font-title-card text-title-card text-on-surface font-bold">Philippine standard perks &amp; benefits</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
            {job.benefits.map((b) => {
              const [, icon, tone] = perkIcon(b);
              return (
                <div key={b} className="flex items-start gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
                  <Icon name={icon as string} size={22} className={tone as string} />
                  <span className="font-label-prominent text-label-prominent text-on-surface">{b}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Description */}
      <section className="flex flex-col gap-space-sm">
        <h3 className="font-title-card text-title-card text-on-surface font-bold">Role architecture &amp; mission</h3>
        <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed whitespace-pre-line">{job.description || 'No description provided.'}</p>
        {job.responsibilities.length > 0 && (
          <ul className="flex flex-col gap-space-xs mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
            {job.responsibilities.map((r) => (
              <li key={r} className="flex items-start gap-space-xs">
                <Icon name="chevron_right" size={16} className="text-primary mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        )}
        {job.employer?.description && (
          <p className="caption mt-space-xs">
            <strong className="text-on-surface">About {job.employer.companyName}:</strong> {job.employer.description}
          </p>
        )}
      </section>

      {/* Similar jobs */}
      {similar.length > 0 && (
        <section aria-label="Similar jobs" className="flex flex-col gap-space-sm">
          <h3 className="font-title-card text-title-card text-on-surface font-bold">Similar roles you may like</h3>
          <div className="flex gap-space-sm overflow-x-auto pb-1 -mx-1 px-1">
            {similar.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(`/seeker/jobs/${s.id}`)}
                className="min-w-[220px] max-w-[240px] text-left bg-surface-container-low hover:bg-surface-container rounded-lg p-space-sm flex flex-col gap-1 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="caption font-semibold truncate">{s.employer?.companyName}</span>
                  {s.match && <span className="font-label-tag text-label-tag font-bold text-primary">{s.match.score}%</span>}
                </div>
                <span className="font-label-prominent text-label-prominent text-on-surface line-clamp-2">{s.title}</span>
                <span className="caption text-secondary font-semibold">{pesoRange(s.salaryMin, s.salaryMax, true)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <div className="pt-space-md flex flex-col sm:flex-row items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-sm">
          <Avatar name={user?.name ?? ''} url={user?.avatarUrl} />
          <div className="flex flex-col">
            <span className="caption font-medium">Applying with profile dossier:</span>
            <span className="font-label-prominent text-label-prominent text-on-surface font-bold">
              {user?.name} • {m.label} ({m.score}% fit)
            </span>
          </div>
        </div>
        {applyButton(true)}
      </div>

      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title={`Apply to ${job.employer?.companyName}`}>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
          Your profile dossier ({m.score}% fit) is attached automatically. {job.employer?.companyName} asks one screening question before your application reaches the hiring team.
        </p>
        <label className="label">{job.screeningQuestion}</label>
        <textarea className="textarea" rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer in 3–6 sentences. Concrete examples and numbers help." />
        <label className="label mt-space-md">Note to the hiring team (optional)</label>
        <textarea className="textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything they should know — notice period, preferred setup…" />
        <div className="flex justify-end gap-space-sm mt-space-md">
          <button type="button" onClick={() => setApplyOpen(false)} className="btn-ghost">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={busy || answer.trim().length < 20} className="btn-primary">
            <Icon name="bolt" size={18} fill /> {busy ? 'Submitting…' : 'Submit application'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function salaryFit(job: Job): string {
  // The seeker's target isn't on the job object; the breakdown panel handles budget alignment server-side for employers.
  // Here we only describe the range midpoint so the strip has a stable third column.
  const mid = (job.salaryMin + job.salaryMax) / 2;
  return mid ? `${peso(mid, { compact: true })} midpoint` : '—';
}
