import { Link } from 'react-router-dom';
import { Avatar, Bar, EmptyState, ErrorBox, Icon, MatchRing, Skeleton, StatCard } from '../../components/ui';
import { api } from '../../lib/api';
import { peso, statusLabel, timeAgo } from '../../lib/format';
import { useFetch } from '../../lib/hooks';
import type { Application, EmployerSummary, Job } from '../../lib/types';

interface Dash {
  company: EmployerSummary;
  activeJobs: number;
  activeTitles: string[];
  totalApplicants: number;
  newToday: number;
  screened: number;
  avgMatch: number;
  byStatus: Record<string, number>;
  avgTimeToFill: number | null;
  totalViews: number;
}

/** Employer dashboard — KPI row, pipeline snapshot, top applicants, active posts. */
export function EmployerDashboard() {
  const { data, error, loading, reload } = useFetch(() => api.get<Dash>('/employer/dashboard'));
  const { data: pipe } = useFetch(() => api.get<{ applications: Application[] }>('/applications/pipeline'));
  const { data: jobsData } = useFetch(() => api.get<{ jobs: Job[] }>('/employer/jobs'));
  const top = (pipe?.applications ?? []).filter((a) => a.status !== 'rejected').slice(0, 5);
  const jobs = (jobsData?.jobs ?? []).filter((j) => j.status === 'active').slice(0, 4);

  if (error) return <div className="p-space-lg"><ErrorBox message={error} onRetry={reload} /></div>;

  return (
    <div className="px-margin-sm lg:px-space-lg py-space-md flex flex-col gap-space-lg max-w-[1440px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <span className="kicker text-secondary">{data?.company.companyName ?? 'Employer'}</span>
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mt-1 tracking-tight">Hiring overview</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Your active posts, new applicants and how well they match.</p>
        </div>
        <Link to="/employer/jobs/new" className="btn-secondary h-11 self-start md:self-auto group">
          <Icon name="add" size={20} className="transition-transform group-hover:rotate-90" /> Post a job
        </Link>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : (
        data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
            <StatCard kicker="Active jobs" value={data.activeJobs} unit={data.activeJobs === 1 ? 'role live' : 'roles live'} sub={data.activeTitles.join(', ') || 'No active posts'} icon="work" tone="secondary" />
            <StatCard kicker="Applicants" value={data.totalApplicants} unit={data.newToday ? `+${data.newToday} today` : 'in total'} icon="group" tone="neutral" foot={<><Bar value={data.totalApplicants ? (data.screened / data.totalApplicants) * 100 : 0} tone="bg-secondary" /><span className="caption block mt-1">{data.screened} reviewed by your team</span></>} />
            <StatCard kicker="Average match" value={`${data.avgMatch}%`} unit="across applicants" icon="bolt" tone="secondary" foot={<span className="caption">Skills 45 · Experience 30 · Education 25</span>} />
            <StatCard kicker="Time to offer" value={data.avgTimeToFill ?? '—'} unit={data.avgTimeToFill ? 'days on average' : 'no offers yet'} sub={`${data.totalViews.toLocaleString()} total post views`} icon="hourglass_top" tone="neutral" />
          </div>
        )
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        <div className="xl:col-span-7 card p-space-md">
          <div className="flex items-center justify-between mb-space-sm">
            <h2 className="font-title-card text-title-card text-on-surface font-bold">Top applicants</h2>
            <Link to="/employer/candidates" className="caption font-semibold text-secondary hover:underline flex items-center gap-1">
              Full pipeline <Icon name="arrow_forward" size={14} />
            </Link>
          </div>
          {!pipe && <Skeleton className="h-40" />}
          {pipe && top.length === 0 && <EmptyState icon="person_search" title="No applicants yet" body="Post a job to start receiving AI-ranked candidates." action={<Link to="/employer/jobs/new" className="btn-secondary">Post a job</Link>} />}
          <ul className="divide-y divide-surface-container">
            {top.map((a) => (
              <li key={a.id}>
                <Link to={`/employer/candidates/${a.id}`} className="flex items-center gap-space-sm py-space-sm hover:bg-surface-container-low rounded-lg px-space-xs transition-colors">
                  <Avatar name={a.candidate?.name ?? '?'} url={a.candidate?.avatarUrl} size={40} square />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-space-xs">
                      <span className="font-label-prominent text-label-prominent text-on-surface truncate">{a.candidate?.name}</span>
                      <span className="pill bg-surface-container text-on-surface-variant">{statusLabel[a.status]}</span>
                    </div>
                    <span className="caption truncate block">
                      {a.candidate?.headline} → {a.job?.title} • {timeAgo(a.createdAt)}
                    </span>
                  </div>
                  <span className="caption text-secondary font-semibold hidden sm:inline">{a.candidate?.salaryTarget ? `${peso(a.candidate.salaryTarget, { compact: true })}/mo ask` : ''}</span>
                  <MatchRing score={a.matchScore} size={40} />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="xl:col-span-5 flex flex-col gap-space-md">
          {data && (
            <div className="card p-space-md">
              <h2 className="font-title-card text-title-card text-on-surface font-bold mb-space-sm">Pipeline snapshot</h2>
              <div className="flex flex-col gap-space-xs">
                {(['submitted', 'viewed', 'interview', 'offer', 'rejected'] as const).map((s) => {
                  const n = data.byStatus[s] ?? 0;
                  const pct = data.totalApplicants ? (n / data.totalApplicants) * 100 : 0;
                  const tone = { submitted: 'bg-outline', viewed: 'bg-primary', interview: 'bg-tertiary', offer: 'bg-secondary', rejected: 'bg-error/60' }[s];
                  return (
                    <div key={s}>
                      <div className="flex justify-between caption mb-1">
                        <span className="font-semibold text-on-surface">{statusLabel[s]}</span>
                        <span>{n}</span>
                      </div>
                      <Bar value={pct} tone={tone} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="card p-space-md">
            <div className="flex items-center justify-between mb-space-sm">
              <h2 className="font-title-card text-title-card text-on-surface font-bold">Active job posts</h2>
              <Link to="/employer/jobs" className="caption font-semibold text-secondary hover:underline">
                Manage
              </Link>
            </div>
            {!jobsData && <Skeleton className="h-24" />}
            {jobsData && jobs.length === 0 && <p className="caption">No active posts.</p>}
            <ul className="flex flex-col gap-space-xs">
              {jobs.map((j) => (
                <li key={j.id} className="flex items-center justify-between gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
                  <div className="min-w-0">
                    <p className="font-label-prominent text-label-prominent text-on-surface truncate">{j.title}</p>
                    <p className="caption">
                      {j.stats?.applicants ?? 0} applicants • avg {j.stats?.avgMatch ?? 0}% • {j.views} views
                    </p>
                  </div>
                  <Link to={`/employer/candidates?jobId=${j.id}`} className="caption font-semibold text-primary whitespace-nowrap">
                    View
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
