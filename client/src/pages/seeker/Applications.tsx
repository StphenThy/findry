import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorBox, Icon, MatchRing, Modal, Monogram, Skeleton } from '../../components/ui';
import { api } from '../../lib/api';
import { daysUntil, formatDateTime, peso, pesoRange, responseBadge, timeAgo } from '../../lib/format';
import { toast, useFetch } from '../../lib/hooks';
import type { Application, ApplicationStatus, Job } from '../../lib/types';
import { MatchBreakdownPanel } from '../../components/match';

const COLUMNS: Array<{ status: ApplicationStatus; title: string; dot: string; bg: string }> = [
  { status: 'submitted', title: 'Submitted', dot: 'bg-outline', bg: 'bg-surface-container-low' },
  { status: 'viewed', title: 'Viewed & Screened', dot: 'bg-primary', bg: 'bg-surface-container-low' },
  { status: 'interview', title: 'Interview Stage', dot: 'bg-tertiary', bg: 'bg-surface-container' },
  { status: 'offer', title: 'Offer Stage', dot: 'bg-secondary', bg: 'bg-secondary-container/20' },
];

/** Applications tracker — Kanban swimlanes + Career Copilot skill-gap hub. */
export function SeekerApplications() {
  const { data, error, loading, reload } = useFetch(() => api.get<{ applications: Application[] }>('/applications/mine'));
  const { data: feed } = useFetch(() => api.get<{ jobs: Job[] }>('/seeker/matches?limit=60'));
  const [detail, setDetail] = useState<Application | null>(null);
  const apps = data?.applications ?? [];
  const by = (s: ApplicationStatus) => apps.filter((a) => a.status === s);
  const rejected = by('rejected');

  // Copilot: most frequent missing skills across strong matches → biggest unlock
  const gaps = useMemo(() => {
    const count = new Map<string, { n: number; jobs: Job[] }>();
    for (const j of feed?.jobs ?? []) {
      if (!j.match || j.match.score < 65) continue;
      for (const s of [...j.match.skills.requiredMissing, ...j.match.skills.preferredMissing]) {
        const e = count.get(s) ?? { n: 0, jobs: [] };
        e.n++;
        e.jobs.push(j);
        count.set(s, e);
      }
    }
    return [...count.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 3);
  }, [feed]);

  const withdraw = async (a: Application) => {
    if (!confirm(`Withdraw your application to ${a.employer?.companyName}?`)) return;
    try {
      await api.post(`/applications/${a.id}/withdraw`);
      toast.success('Application withdrawn');
      setDetail(null);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const offers = by('offer');
  const interviews = by('interview');
  const active = apps.filter((a) => a.status !== 'rejected');

  return (
    <div className="max-w-[1280px] mx-auto px-margin-sm lg:px-margin-lg py-margin flex flex-col gap-space-lg">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface tracking-tight">My applications</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-1">Every application from submitted to offer. Statuses update as employers review you.</p>
        </div>
        <Link to="/seeker/browse" className="btn-primary self-start md:self-auto">
          <Icon name="add" size={18} /> Find more roles
        </Link>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm">
        <Pill label="In pipeline" value={active.length} sub="Active applications" icon="send_time_extension" tone="primary" />
        <Pill label="Next steps" value={interviews.length} sub="Interviews scheduled" icon="videocam" tone="secondary" />
        <Pill label="Decisions" value={offers.length} sub="Offers under review" icon="verified" tone="tertiary" />
        <Pill label="Best offer" value={offers.length ? peso(Math.max(...offers.map((o) => o.offerSalary ?? 0)), { compact: true }) : '—'} sub={offers.length ? 'per month' : 'No offers yet'} icon="payments" tone="neutral" />
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-80" />}
      {data && apps.length === 0 && (
        <EmptyState icon="assignment" title="No applications yet" body="Apply to a role from your matches and it will appear here with live status updates." action={<Link to="/seeker" className="btn-primary">See my matches</Link>} />
      )}

      {/* Kanban */}
      {apps.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter items-start">
          {COLUMNS.map((col) => {
            const items = by(col.status);
            return (
              <div key={col.status} className={`flex flex-col gap-space-md ${col.bg} p-space-md rounded-xl shadow-sm min-h-[140px]`}>
                <div className="flex items-center justify-between px-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <h2 className="font-title-card text-title-card text-on-surface font-semibold">{col.title}</h2>
                  </div>
                  <span className="px-space-xs py-0.5 rounded-full bg-surface-container-high font-label-tag text-label-tag text-on-surface-variant">{items.length}</span>
                </div>
                {items.length === 0 && <p className="caption px-space-xs">Nothing here yet.</p>}
                {items.map((a) => (
                  <AppCard key={a.id} app={a} onOpen={() => setDetail(a)} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {rejected.length > 0 && (
        <details className="card p-space-md">
          <summary className="font-label-prominent text-label-prominent text-on-surface-variant cursor-pointer">Not selected / withdrawn ({rejected.length})</summary>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-sm mt-space-sm">
            {rejected.map((a) => (
              <AppCard key={a.id} app={a} onOpen={() => setDetail(a)} muted />
            ))}
          </div>
        </details>
      )}

      {/* Copilot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2 card p-space-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                  <Icon name="smart_toy" size={20} />
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Skills that would unlock the most roles for you</h3>
              </div>
            </div>
            {gaps.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">You cover the listed skills on your strong matches. Keep your profile fresh to stay on top of new roles.</p>
            ) : (
              <div className="flex flex-col gap-space-sm">
                {gaps.map(([skill, g], i) => (
                  <div key={skill} className={`p-space-md rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm ${i === 0 ? 'bg-surface-container-low' : 'bg-surface'}`}>
                    <div className="flex items-start gap-space-md">
                      <div className="p-2 rounded-lg bg-surface-container-highest text-primary shrink-0">
                        <Icon name={i === 0 ? 'cloud' : 'school'} size={26} />
                      </div>
                      <div>
                        <h4 className="font-title-card text-title-card text-on-surface font-bold">Learn {skill}</h4>
                        <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                          Unlocks a higher score on <strong className="text-primary font-bold">{g.n} of your matches</strong> including {g.jobs.slice(0, 2).map((j) => j.employer?.companyName).join(' and ')}.
                        </p>
                      </div>
                    </div>
                    <Link to={`/seeker/jobs/${g.jobs[0].id}`} className="btn-ghost shrink-0 h-10">
                      See learning path
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="bg-gradient-to-br from-surface-container-highest via-surface-container to-surface-container-high p-space-lg rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-space-xs text-on-secondary-container font-label-prominent text-label-prominent mb-space-xs">
              <Icon name="business_center" size={18} /> Hiring for a side-project or startup?
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Hiring? Findry works for employers too</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">Employer accounts are separate from seeker accounts — register one with a different email to post jobs and get AI-ranked candidates.</p>
          </div>
          <Link to="/signup?role=employer" className="btn-secondary mt-space-md">
            Create an employer account <Icon name="arrow_forward" size={16} />
          </Link>
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `${detail.job?.title} — ${detail.employer?.companyName}` : ''} wide>
        {detail && <AppDetail app={detail} onWithdraw={() => withdraw(detail)} />}
      </Modal>
    </div>
  );
}

function Pill({ label, value, sub, icon, tone }: { label: string; value: React.ReactNode; sub: string; icon: string; tone: 'primary' | 'secondary' | 'tertiary' | 'neutral' }) {
  const t = { primary: 'bg-primary-fixed text-primary', secondary: 'bg-secondary-container text-on-secondary-container', tertiary: 'bg-tertiary-fixed text-on-tertiary-fixed-variant', neutral: 'bg-surface-container-high text-on-surface' }[tone];
  return (
    <div className="card p-space-md flex items-center justify-between">
      <div>
        <span className="kicker text-on-surface-variant block font-medium">{label}</span>
        <span className="font-headline-md text-headline-md text-on-surface font-bold">{value}</span>
        <span className="font-body-sm text-body-sm text-on-surface-variant block">{sub}</span>
      </div>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t}`}>
        <Icon name={icon} size={20} />
      </div>
    </div>
  );
}

function AppCard({ app, onOpen, muted = false }: { app: Application; onOpen: () => void; muted?: boolean }) {
  const e = app.employer;
  const featured = app.status === 'interview' && app.interviewAt;
  const offer = app.status === 'offer';
  const expires = daysUntil(app.offerExpiresAt);
  return (
    <button type="button" onClick={onOpen} className={`card p-space-md flex flex-col gap-space-sm text-left w-full relative overflow-hidden transition-shadow hover:shadow-md ${featured || offer ? 'shadow-md' : ''} ${muted ? 'opacity-80' : ''}`}>
      {featured && <div className="w-1.5 h-full bg-primary absolute top-0 left-0" />}
      {offer && <div className="w-1.5 h-full bg-secondary absolute top-0 left-0" />}
      <div className="flex items-start justify-between gap-space-xs w-full">
        <div className="flex items-center gap-space-sm min-w-0 flex-1">
          <Monogram text={e?.monogram ?? '?'} size={40} tone={offer ? 'text-secondary' : 'text-primary'} />
          <div className="min-w-0 flex-1">
            <h3 className="font-title-card text-title-card text-on-surface font-bold leading-tight truncate" title={app.job?.title}>
              {app.job?.title}
            </h3>
            <span className="font-body-sm text-body-sm text-on-surface-variant truncate block">
              {e?.companyName} • {app.job?.location?.split(',')[0]}
            </span>
          </div>
        </div>
        <MatchRing score={app.matchScore} size={40} className="shrink-0" />
      </div>
      {app.job && <div className={`px-space-sm py-1 rounded font-label-prominent text-label-prominent self-start ${app.matchScore >= 85 ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface'}`}>{pesoRange(app.job.salaryMin, app.job.salaryMax)} / mo</div>}

      {app.status === 'submitted' && (
        <p className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low p-space-xs rounded">{app.timeline.at(-1)?.note ?? 'Resume delivered to the hiring manager. Awaiting intake.'}</p>
      )}
      {app.status === 'viewed' && (
        <div className="bg-surface-container-high/50 p-space-sm rounded-lg flex flex-col gap-1">
          <div className="flex items-center gap-1 text-primary font-label-prominent text-label-prominent">
            <Icon name="visibility" size={16} /> Profile viewed {timeAgo(app.viewedAt)}
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{app.employerNote ?? 'Hiring team opened your dossier.'}</p>
        </div>
      )}
      {app.status === 'interview' && (
        <div className={`${featured ? 'bg-surface-variant' : 'bg-surface-container-high/40'} p-space-sm rounded-lg flex flex-col gap-1`}>
          {app.interviewAt ? (
            <>
              <div className="flex items-center gap-1.5 text-primary font-label-prominent text-label-prominent">
                <Icon name="event_available" size={16} /> {app.interviewNote?.split('—')[0] ?? 'Interview scheduled'}
              </div>
              <p className="font-body-sm text-body-sm text-on-surface font-semibold">{formatDateTime(app.interviewAt)}</p>
            </>
          ) : (
            <p className="font-body-sm text-body-sm text-on-surface-variant">{app.employerNote ?? 'Interview stage — awaiting schedule.'}</p>
          )}
        </div>
      )}
      {offer && (
        <div className="bg-secondary-container/30 p-space-sm rounded-lg flex flex-col gap-1">
          <span className="kicker text-secondary">Formal offer received</span>
          <span className="font-salary-metric text-salary-metric text-on-surface font-extrabold">{peso(app.offerSalary)} / mo</span>
          {app.offerPerks?.slice(0, 3).map((p) => (
            <span key={p} className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
              <Icon name="check_circle" size={14} className="text-secondary" /> {p}
            </span>
          ))}
        </div>
      )}
      {app.status === 'rejected' && <p className="caption bg-surface-container-low p-space-xs rounded">{app.timeline.at(-1)?.note ?? 'Not selected for this role.'}</p>}

      <div className="flex items-center justify-between gap-space-sm pt-space-xs caption">
        <span className="flex items-center gap-1 whitespace-nowrap">
          <Icon name="schedule" size={14} /> Applied {timeAgo(app.createdAt)}
        </span>
        {offer && expires !== null ? <span className={`font-medium ${expires <= 3 ? 'text-error' : 'text-secondary'}`}>{expires > 0 ? `Expires in ${expires}d` : 'Expired'}</span> : <span className="text-primary font-medium">{responseBadge(e?.avgResponseHours)?.replace('Usually responds', 'Responds') ?? ''}</span>}
      </div>
    </button>
  );
}

function AppDetail({ app, onWithdraw }: { app: Application; onWithdraw: () => void }) {
  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex flex-wrap items-center gap-space-sm">
        <span className="pill bg-primary-fixed text-on-primary-fixed font-semibold capitalize">{app.status}</span>
        <span className="caption">Applied {timeAgo(app.createdAt)} • Match {app.matchScore}% at time of application</span>
      </div>
      {app.status === 'offer' && (
        <div className="rounded-xl bg-secondary-container/30 p-space-md">
          <span className="kicker text-secondary">Offer</span>
          <div className="font-headline-md text-headline-md text-on-surface font-extrabold">{peso(app.offerSalary)} / mo</div>
          <ul className="mt-1 flex flex-col gap-0.5">
            {app.offerPerks?.map((p) => (
              <li key={p} className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                <Icon name="check_circle" size={14} className="text-secondary" /> {p}
              </li>
            ))}
          </ul>
          {app.offerExpiresAt && <p className="caption mt-1 text-error font-medium">Respond by {new Date(app.offerExpiresAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })}</p>}
          <p className="caption mt-space-sm">Use Messages to accept, decline or counter directly with the employer.</p>
        </div>
      )}
      {app.interviewAt && (
        <div className="rounded-xl bg-surface-variant p-space-md">
          <span className="font-label-prominent text-label-prominent text-primary flex items-center gap-1">
            <Icon name="event_available" size={16} /> {app.interviewNote ?? 'Interview'}
          </span>
          <p className="font-body-md text-body-md text-on-surface font-semibold">{formatDateTime(app.interviewAt)}</p>
        </div>
      )}
      <MatchBreakdownPanel match={app.matchBreakdown} compact defaultOpen={false} />
      <div>
        <h4 className="font-label-prominent text-label-prominent text-on-surface mb-space-xs">Timeline</h4>
        <ol className="relative pl-5 flex flex-col gap-space-sm">
          <span className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-surface-container-highest" />
          {[...app.timeline].reverse().map((t, i) => (
            <li key={i} className="relative">
              <span className={`absolute -left-5 top-1 w-3 h-3 rounded-full ring-4 ring-surface-container-lowest ${i === 0 ? 'bg-primary' : 'bg-outline-variant'}`} />
              <span className="font-label-prominent text-label-prominent text-on-surface capitalize">{t.status}</span>
              <span className="caption block">
                {new Date(t.at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                {t.note ? ` — ${t.note}` : ''}
              </span>
            </li>
          ))}
        </ol>
      </div>
      {app.screeningAnswer && (
        <div>
          <h4 className="font-label-prominent text-label-prominent text-on-surface mb-space-xs">Your screening answer</h4>
          <p className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low rounded-lg p-space-sm">{app.screeningAnswer}</p>
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-space-sm pt-space-sm">
        <div className="flex gap-space-sm">
          <Link to={`/seeker/messages/${app.id}`} className="btn-ghost h-10">
            <Icon name="chat" size={18} className="text-primary" /> Message employer
          </Link>
          {app.job && (
            <Link to={`/seeker/jobs/${app.job.id}`} className="btn-ghost h-10">
              View job
            </Link>
          )}
        </div>
        {app.status !== 'rejected' && (
          <button type="button" onClick={onWithdraw} className="btn-danger h-10">
            Withdraw
          </button>
        )}
      </div>
    </div>
  );
}
