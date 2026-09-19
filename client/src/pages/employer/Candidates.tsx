import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MatchBreakdownPanel } from '../../components/match';
import { Avatar, EmptyState, ErrorBox, Icon, MatchRing, Modal, NumberField, Skeleton } from '../../components/ui';
import { api, qs } from '../../lib/api';
import { formatDateTime, peso, pesoRange, statusLabel, timeAgo, workSetupLabel } from '../../lib/format';
import { toast, useFetch } from '../../lib/hooks';
import type { Application, ApplicationStatus, Candidate, JobSummary, MatchBreakdown } from '../../lib/types';

/** Employer candidate pipeline — AI-ranked list (left) + side-by-side dossier (right). */
export function EmployerCandidates() {
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const jobId = sp.get('jobId') ?? '';
  const status = sp.get('status') ?? '';
  const [q, setQ] = useState('');
  const key = qs({ jobId, status });
  const { data, error, loading, reload } = useFetch(() => api.get<{ applications: Application[]; jobs: Array<{ id: string; title: string }> }>(`/applications/pipeline${key}`), [key]);
  const [selected, setSelected] = useState<string | null>(null);

  const list = useMemo(() => {
    const all = data?.applications ?? [];
    if (!q.trim()) return all;
    const t = q.toLowerCase();
    return all.filter((a) => [a.candidate?.name, a.candidate?.headline, a.candidate?.location, a.candidate?.lastCompany, ...(a.candidate?.skills ?? [])].some((s) => s?.toLowerCase().includes(t)));
  }, [data, q]);

  useEffect(() => {
    if (list.length && (!selected || !list.some((a) => a.id === selected))) setSelected(list[0].id);
  }, [list, selected]);

  const shortlisted = (data?.applications ?? []).filter((a) => a.status !== 'rejected').length;

  return (
    <div className="px-margin-sm lg:px-space-lg py-space-md flex flex-col gap-space-lg max-w-[1440px] mx-auto w-full">
      {/* Search + filters */}
      <div className="card p-space-md flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm">
          <div className="relative flex-1">
            <Icon name="smart_toy" size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
            <input className="field pl-11 pr-4 focus:ring-secondary/40" placeholder="Filter candidates by name, skill, company, city…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search candidates" />
          </div>
          <div className="relative sm:min-w-[280px]">
            <select className="field appearance-none bg-surface-container font-label-prominent text-label-prominent focus:ring-secondary/40" value={jobId} onChange={(e) => setSp(e.target.value ? { jobId: e.target.value, ...(status ? { status } : {}) } : status ? { status } : {})}>
              <option value="">All roles</option>
              {(data?.jobs ?? []).map((j) => (
                <option key={j.id} value={j.id}>
                  Role: {j.title}
                </option>
              ))}
            </select>
            <Icon name="expand_more" size={20} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" />
          </div>
        </div>
        <div className="flex items-center gap-space-sm flex-wrap min-w-0">
          <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1 caption max-w-full overflow-x-auto" role="tablist" aria-label="Filter by status">
            {['', 'submitted', 'viewed', 'interview', 'offer', 'rejected'].map((s) => (
              <button key={s} type="button" role="tab" aria-selected={status === s} onClick={() => setSp(s ? { ...(jobId ? { jobId } : {}), status: s } : jobId ? { jobId } : {})} className={`px-space-sm py-space-xs rounded whitespace-nowrap ${status === s ? 'bg-surface-container-lowest shadow-sm font-semibold text-secondary' : 'hover:text-on-surface'}`}>
                {s ? statusLabel[s] : 'All'}
              </button>
            ))}
          </div>
          <Link to="/employer/jobs/new" className="btn-secondary h-11 whitespace-nowrap">
            <Icon name="add" size={20} /> Post new job
          </Link>
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        <div className="xl:col-span-5 flex flex-col gap-space-md">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-space-xs">
              <span className="font-title-card text-title-card text-on-surface font-bold">Candidates</span>
              <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container caption font-bold">{shortlisted} available</span>
            </div>
            <div className="flex items-center gap-1 caption">
              Best match first <Icon name="arrow_downward" size={14} />
            </div>
          </div>
          {loading && !data && [1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />)}
          {data && list.length === 0 && <EmptyState icon="person_search" title="No candidates here yet" body={q ? 'No one matches that search.' : 'Applications will appear here, ranked by match score, as soon as seekers apply.'} />}
          {list.map((a) => (
            <CandidateCard
              key={a.id}
              app={a}
              selected={selected === a.id}
              onSelect={() => {
                if (window.innerWidth < 1280) navigate(`/employer/candidates/${a.id}`);
                else setSelected(a.id);
              }}
            />
          ))}
        </div>
        <div className="hidden xl:block xl:col-span-7 sticky top-20">{selected ? <CandidateDossier applicationId={selected} onChanged={reload} /> : data && list.length === 0 ? null : <Skeleton className="h-96" />}</div>
      </div>
    </div>
  );
}

function CandidateCard({ app, selected, onSelect }: { app: Application; selected: boolean; onSelect: () => void }) {
  const c = app.candidate;
  const m = app.matchBreakdown;
  const matched = [...(m?.skills?.requiredMatched ?? []), ...(m?.skills?.preferredMatched ?? [])].slice(0, 3);
  const missing = (m?.skills?.requiredMissing ?? []).slice(0, 1);
  const statusTone: Record<ApplicationStatus, string> = { submitted: 'bg-surface-container text-on-surface-variant', viewed: 'bg-surface-container text-primary', interview: 'bg-secondary-container text-on-secondary-container', offer: 'bg-secondary text-on-secondary', rejected: 'bg-error-container/50 text-on-error-container' };
  return (
    <article onClick={onSelect} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()} aria-pressed={selected} className={`cursor-pointer p-space-md rounded-xl bg-surface-container-lowest relative overflow-hidden transition-all duration-200 ${selected ? 'shadow-md ring-2 ring-secondary/80' : 'shadow-sm hover:shadow-md'} ${app.status === 'rejected' ? 'opacity-70' : ''}`}>
      {selected && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-secondary" />}
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm min-w-0 flex-1">
          <div className="relative shrink-0">
            <Avatar name={c?.name ?? '?'} url={c?.avatarUrl} size={48} square />
            {c?.linkedinVerified && (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-secondary text-on-secondary rounded-full flex items-center justify-center" title="LinkedIn verified">
                <Icon name="check" size={11} />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-title-card text-title-card text-on-surface font-bold truncate">{c?.name}</h4>
              <span className={`pill ${statusTone[app.status]} font-semibold`}>{statusLabel[app.status]}</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
              {c?.headline} • {c?.yearsExperience} yrs exp
            </p>
            <p className="caption text-outline mt-0.5 truncate">
              {c?.lastCompany ? `${c.lastCompany} • ` : ''}
              {app.job?.title}
            </p>
          </div>
        </div>
        <MatchRing score={app.matchScore} size={48} showLabel />
      </div>
      <div className="mt-space-sm flex flex-wrap gap-1.5">
        {matched.map((s) => (
          <span key={s} className="pill bg-secondary-container text-on-secondary-container">
            <Icon name="check" size={12} /> {s}
          </span>
        ))}
        {missing.map((s) => (
          <span key={s} className="pill bg-error-container/40 text-on-error-container">
            <Icon name="close" size={12} /> {s}
          </span>
        ))}
      </div>
      <div className="mt-space-sm flex items-center justify-between caption bg-surface-container-low p-2 rounded-lg gap-space-xs">
        <span className="font-semibold text-secondary">{c?.salaryTarget ? `${peso(c.salaryTarget, { compact: true })}/mo ask` : 'Salary undisclosed'}</span>
        <span>{c?.noticeDays === 0 ? 'Immediate' : `Notice: ${c?.noticeDays}d`}</span>
        <span className="truncate">{c?.location?.split(',')[0]}</span>
      </div>
    </article>
  );
}

/* ── Dossier (right pane + mobile page) ──────────────────────────────── */

interface Detail {
  application: Application;
  job: JobSummary | null;
  candidate: Candidate | null;
  viewer: 'employer' | 'seeker';
}

export function CandidateDossier({ applicationId, onChanged }: { applicationId: string; onChanged?: () => void }) {
  const { data, error, loading, reload } = useFetch(() => api.get<Detail>(`/applications/${applicationId}`), [applicationId]);
  const [modal, setModal] = useState<'interview' | 'offer' | 'reject' | null>(null);
  const [form, setForm] = useState({ interviewAt: '', interviewNote: 'Technical interview via Google Meet', offerSalary: 0, offerExpiresDays: 7, offerPerks: 'Day 1 HMO + 2 Dependents\nGuaranteed 13th Month Pay', note: '' });

  useEffect(() => {
    if (data?.job) setForm((f) => ({ ...f, offerSalary: data.candidate?.salaryTarget ?? data.job!.salaryMax }));
  }, [data]);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !data) return <div className="card p-space-lg flex flex-col gap-space-md"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
  if (!data || !data.candidate || !data.job) return <ErrorBox message="Candidate not found" />;
  const { application: a, candidate: c, job } = data;
  const m: MatchBreakdown = a.liveMatch ?? a.matchBreakdown;
  const ask = c.salaryTarget ?? 0;
  const inBudget = ask > 0 && ask >= job.salaryMin && ask <= job.salaryMax;

  const move = async (status: ApplicationStatus) => {
    try {
      const body: Record<string, unknown> = { status, note: form.note || undefined };
      if (status === 'interview') {
        body.interviewAt = form.interviewAt ? new Date(form.interviewAt).toISOString() : undefined;
        body.interviewNote = form.interviewNote;
      }
      if (status === 'offer') {
        body.offerSalary = Number(form.offerSalary);
        body.offerExpiresAt = new Date(Date.now() + form.offerExpiresDays * 86_400_000).toISOString();
        body.offerPerks = form.offerPerks.split('\n').map((s) => s.trim()).filter(Boolean);
      }
      await api.patch(`/applications/${a.id}/status`, body);
      toast.success(status === 'interview' ? 'Interview scheduled — candidate notified in their tracker' : status === 'offer' ? 'Offer sent' : status === 'rejected' ? 'Candidate marked not selected' : 'Status updated');
      setModal(null);
      reload();
      onChanged?.();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const rows: Array<{ req: string; kind: 'required' | 'preferred'; has: boolean }> = [
    ...m.skills.requiredMatched.map((s) => ({ req: s, kind: 'required' as const, has: true })),
    ...m.skills.requiredMissing.map((s) => ({ req: s, kind: 'required' as const, has: false })),
    ...m.skills.preferredMatched.map((s) => ({ req: s, kind: 'preferred' as const, has: true })),
    ...m.skills.preferredMissing.map((s) => ({ req: s, kind: 'preferred' as const, has: false })),
  ];

  return (
    <div className="flex flex-col gap-space-lg animate-fade-in">
      <div className="card shadow-md p-space-lg relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md min-w-0">
            <Avatar name={c.name} url={c.avatarUrl} size={80} square className="ring-4 ring-surface-container" />
            <div className="min-w-0">
              <div className="flex items-center gap-space-xs flex-wrap">
                <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">{c.name}</h2>
                {c.linkedinVerified && (
                  <span className="pill bg-secondary-container text-on-secondary-container font-bold">
                    <Icon name="verified_user" size={13} /> LinkedIn verified
                  </span>
                )}
                {c.education?.[0]?.degree && <span className="pill bg-surface-container text-on-surface-variant">{c.education[0].degree}</span>}
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                {c.headline} • Applying for <strong className="text-on-surface">{job.title}</strong>
              </p>
              <div className="flex items-center gap-space-md mt-2 text-on-surface-variant font-body-sm text-body-sm flex-wrap">
                <span className="flex items-center gap-1">
                  <Icon name="pin_drop" size={16} className="text-secondary" /> {c.location || '—'}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="schedule" size={16} className="text-secondary" /> {c.noticeDays === 0 ? 'Immediate start' : `Notice: ${c.noticeDays} days`}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="home_work" size={16} className="text-secondary" /> {c.workSetup.map((w) => workSetupLabel[w]).join(' / ')}
                </span>
              </div>
            </div>
          </div>
          <div className={`p-space-sm rounded-xl flex flex-col justify-center min-w-[200px] ${inBudget ? 'bg-secondary-container/30' : 'bg-surface-container'}`}>
            <span className="kicker text-secondary">Salary alignment</span>
            <div className="font-salary-metric text-salary-metric text-on-secondary-container font-extrabold mt-0.5">
              {ask ? peso(ask) : 'Undisclosed'} <span className="text-xs font-normal">/ mo</span>
            </div>
            <div className={`flex items-center gap-1 mt-1 caption font-bold ${inBudget ? 'text-secondary' : 'text-on-surface-variant'}`}>
              <Icon name={inBudget ? 'check_circle' : 'info'} size={15} />
              <span>{inBudget ? `Within ${pesoRange(job.salaryMin, job.salaryMax, true)} budget` : ask ? `Budget is ${pesoRange(job.salaryMin, job.salaryMax, true)}` : 'Ask in interview'}</span>
            </div>
          </div>
        </div>

        {/* Quick facts */}
        <div className="mt-space-lg grid grid-cols-1 md:grid-cols-3 gap-space-sm">
          {[
            ['psychology', 'AI assessment', m.label],
            ['code_blocks', 'Experience vs requirement', `${m.experience.years} yrs / ${m.experience.requiredYears || 'open'}`],
            ['currency_exchange', 'Status', `${statusLabel[a.status]} • applied ${timeAgo(a.createdAt)}`],
          ].map(([i, k, v]) => (
            <div key={k} className="bg-surface-container-low p-space-sm rounded-lg flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-secondary shrink-0">
                <Icon name={i} size={22} />
              </div>
              <div className="min-w-0">
                <span className="caption block">{k}</span>
                <span className="font-label-prominent text-label-prominent text-on-surface font-bold truncate block">{v}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Side-by-side */}
        <div className="mt-space-lg">
          <div className="flex items-center justify-between mb-space-sm">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Side-by-side match breakdown</h3>
            <span className="caption text-secondary font-semibold">
              {m.skills.requiredMatched.length + m.skills.preferredMatched.length} matched • {m.skills.requiredMissing.length + m.skills.preferredMissing.length} gaps
            </span>
          </div>
          <div className="overflow-hidden rounded-xl bg-surface-container-low">
            <div className="grid grid-cols-12 bg-surface-container-high p-space-sm kicker text-on-surface-variant">
              <div className="col-span-5">Job requirement</div>
              <div className="col-span-5">Candidate resume evidence</div>
              <div className="col-span-2 text-right">AI signal</div>
            </div>
            <div className="divide-y divide-surface-container">
              {rows.map((r) => (
                <div key={r.req} className="grid grid-cols-12 p-space-sm items-center bg-surface-container-lowest">
                  <div className="col-span-5">
                    <span className="font-label-prominent text-label-prominent text-on-surface">{r.req}</span>
                    <p className="caption">{r.kind === 'required' ? 'Must-have' : 'Preferred'}</p>
                  </div>
                  <div className="col-span-5">
                    {r.has ? (
                      <>
                        <span className="font-body-sm text-body-sm text-on-surface">Listed on profile</span>
                        <p className="caption text-secondary">{evidence(c, r.req)}</p>
                      </>
                    ) : (
                      <>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">Not found on resume</span>
                        <p className="caption text-outline">{r.kind === 'required' ? 'Verify in interview' : 'Learnable in 1–2 sprints'}</p>
                      </>
                    )}
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <span className={`pill font-bold ${r.has ? 'bg-secondary-container text-on-secondary-container' : r.kind === 'required' ? 'bg-error-container/50 text-on-error-container' : 'bg-surface-container text-on-surface-variant'}`}>{r.has ? 'Match' : r.kind === 'required' ? 'Gap' : 'Bridgeable'}</span>
                  </div>
                </div>
              ))}
              {rows.length === 0 && <p className="caption p-space-sm">This job lists no skills.</p>}
            </div>
          </div>
        </div>

        <div className="mt-space-lg">
          <MatchBreakdownPanel match={m} compact defaultOpen={false} subject="they" />
        </div>

        {/* Screening answer */}
        {a.screeningAnswer && (
          <div className="mt-space-lg">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-space-xs">Screening answer</h3>
            <p className="caption mb-1">{job.screeningQuestion}</p>
            <p className="font-body-sm text-body-sm text-on-surface bg-surface-container-low rounded-lg p-space-md leading-relaxed">{a.screeningAnswer}</p>
          </div>
        )}

        {/* Highlights + experience */}
        {(c.highlights?.length ?? 0) > 0 && (
          <div className="mt-space-lg">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-space-sm">Quantified career highlights</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs">
              {c.highlights!.map((h) => (
                <li key={h} className="caption bg-secondary-container/20 rounded-lg p-space-sm flex items-start gap-1 text-on-surface">
                  <Icon name="insights" size={14} className="text-secondary mt-0.5" /> {h}
                </li>
              ))}
            </ul>
          </div>
        )}
        {(c.experience?.length ?? 0) > 0 && (
          <div className="mt-space-lg">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-space-sm">Experience</h3>
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-surface-container-highest" />
              {c.experience!.map((x, i) => (
                <div key={i} className="relative">
                  <span className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full ring-4 ring-surface-container-lowest ${i === 0 ? 'bg-secondary' : 'bg-primary'}`} />
                  <div className="flex items-center justify-between gap-space-sm flex-wrap">
                    <span className="font-title-card text-title-card text-on-surface font-bold">
                      {x.title} • {x.company}
                    </span>
                    <span className="caption">
                      {x.from ?? ''} — {x.to ?? ''}
                      {x.location ? ` • ${x.location}` : ''}
                    </span>
                  </div>
                  {x.description && <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{x.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        {(c.education?.length ?? 0) > 0 && (
          <div className="mt-space-lg">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-space-sm">Education</h3>
            {c.education!.map((e, i) => (
              <p key={i} className="font-body-sm text-body-sm text-on-surface">
                <strong>{e.degree ?? 'Degree'}</strong> — {e.school}
                {e.honors ? ` • ${e.honors}` : ''} <span className="caption">{e.from || e.to ? `(${e.from ?? ''}–${e.to ?? ''})` : ''}</span>
              </p>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-space-xl pt-space-md flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-low p-space-md rounded-xl">
          <div className="flex flex-wrap items-center gap-space-sm">
            {a.status !== 'interview' && a.status !== 'offer' && a.status !== 'rejected' && (
              <button type="button" onClick={() => setModal('interview')} className="btn-secondary h-11 font-bold shadow-md">
                <Icon name="calendar_add_on" size={20} /> Schedule technical interview
              </button>
            )}
            {a.status === 'interview' && (
              <button type="button" onClick={() => setModal('offer')} className="btn-secondary h-11 font-bold shadow-md">
                <Icon name="handshake" size={20} /> Extend offer
              </button>
            )}
            {a.status === 'offer' && (
              <span className="pill bg-secondary text-on-secondary font-bold h-9 px-space-md">
                <Icon name="verified" size={16} /> Offer sent: {peso(a.offerSalary)}/mo
              </span>
            )}
            <Link to={`/employer/messages/${a.id}`} className="btn-outline h-11">
              <Icon name="chat" size={20} className="text-secondary" /> Direct message
            </Link>
          </div>
          {a.status !== 'rejected' && (
            <button type="button" onClick={() => setModal('reject')} className="btn-danger h-11">
              <Icon name="close" size={18} /> Not selected
            </button>
          )}
        </div>
        {a.interviewAt && a.status === 'interview' && (
          <p className="caption mt-space-sm flex items-center gap-1 text-primary font-semibold">
            <Icon name="event_available" size={16} /> {a.interviewNote ?? 'Interview'} — {formatDateTime(a.interviewAt)}
          </p>
        )}
      </div>

      {/* Modals */}
      <Modal open={modal === 'interview'} onClose={() => setModal(null)} title="Schedule technical interview">
        <label className="label">Date &amp; time (PHT)</label>
        <input type="datetime-local" className="field" value={form.interviewAt} onChange={(e) => setForm({ ...form, interviewAt: e.target.value })} />
        <label className="label mt-space-md">Format / note shown to candidate</label>
        <input className="field" value={form.interviewNote} onChange={(e) => setForm({ ...form, interviewNote: e.target.value })} />
        <div className="flex justify-end gap-space-sm mt-space-lg">
          <button type="button" onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
          <button type="button" onClick={() => move('interview')} className="btn-secondary"><Icon name="calendar_add_on" size={18} /> Confirm interview</button>
        </div>
      </Modal>
      <Modal open={modal === 'offer'} onClose={() => setModal(null)} title="Extend a formal offer">
        <label className="label">Monthly base salary (gross)</label>
        <NumberField prefix="₱" suffix="/ mo" step={1000} bold value={form.offerSalary} onChange={(v) => setForm({ ...form, offerSalary: Number(v) })} />
        <p className="caption mt-1">
          Candidate asked {ask ? peso(ask) : '—'} • job range {pesoRange(job.salaryMin, job.salaryMax)}
        </p>
        <label className="label mt-space-md">Offer valid for (days)</label>
        <NumberField min={1} max={30} suffix="days" value={form.offerExpiresDays} onChange={(v) => setForm({ ...form, offerExpiresDays: Number(v) })} />
        <label className="label mt-space-md">Perks (one per line)</label>
        <textarea className="textarea" rows={3} value={form.offerPerks} onChange={(e) => setForm({ ...form, offerPerks: e.target.value })} />
        <div className="flex justify-end gap-space-sm mt-space-lg">
          <button type="button" onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
          <button type="button" onClick={() => move('offer')} className="btn-secondary"><Icon name="handshake" size={18} /> Send offer</button>
        </div>
      </Modal>
      <Modal open={modal === 'reject'} onClose={() => setModal(null)} title="Mark as not selected">
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">The candidate sees this reason in their tracker. Transparent feedback keeps your response-time badge healthy.</p>
        <textarea className="textarea" rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={`e.g. Strong profile, but we need hands-on ${m.skills.requiredMissing[0] ?? 'production'} experience for this role.`} />
        <div className="flex justify-end gap-space-sm mt-space-lg">
          <button type="button" onClick={() => setModal(null)} className="btn-ghost">Cancel</button>
          <button type="button" onClick={() => move('rejected')} className="btn bg-error text-on-error px-space-md py-space-sm">Confirm</button>
        </div>
      </Modal>
    </div>
  );
}

function evidence(c: Candidate, skill: string): string {
  const hit = c.experience?.find((e) => (e.description ?? '').toLowerCase().includes(skill.toLowerCase()));
  if (hit) return `Used at ${hit.company}`;
  return `${c.yearsExperience} yrs overall • ${c.lastCompany ?? 'recent role'}`;
}

/** Mobile / deep-link page for a single application dossier. */
export function CandidatePage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  if (!applicationId) return null;
  return (
    <div className="px-margin-sm lg:px-space-lg py-space-md max-w-4xl mx-auto flex flex-col gap-space-md">
      <button type="button" onClick={() => navigate('/employer/candidates')} className="caption font-semibold text-secondary flex items-center gap-1 self-start">
        <Icon name="arrow_back" size={16} /> Back to pipeline
      </button>
      <CandidateDossier applicationId={applicationId} />
    </div>
  );
}
