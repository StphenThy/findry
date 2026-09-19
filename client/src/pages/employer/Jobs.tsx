import { Link } from 'react-router-dom';
import { EmptyState, ErrorBox, Icon, Skeleton } from '../../components/ui';
import { api } from '../../lib/api';
import { pesoRange, timeAgo, workSetupLabel } from '../../lib/format';
import { toast, useFetch } from '../../lib/hooks';
import type { Job } from '../../lib/types';

/** Employer job posts list with per-post stats and status controls. */
export function EmployerJobs() {
  const { data, error, loading, reload, setData } = useFetch(() => api.get<{ jobs: Job[] }>('/employer/jobs'));
  const jobs = data?.jobs ?? [];

  const setStatus = async (j: Job, status: Job['status']) => {
    try {
      const r = await api.put<{ job: Job }>(`/employer/jobs/${j.id}`, { status });
      setData({ jobs: jobs.map((x) => (x.id === j.id ? { ...x, status: r.job.status } : x)) });
      toast.success(status === 'active' ? 'Job is live' : status === 'closed' ? 'Job closed' : 'Saved as draft');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const remove = async (j: Job) => {
    if (!confirm(`Delete "${j.title}" and all its applications? This cannot be undone.`)) return;
    try {
      await api.delete(`/employer/jobs/${j.id}`);
      setData({ jobs: jobs.filter((x) => x.id !== j.id) });
      toast.success('Job deleted');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="px-margin-sm lg:px-space-lg py-space-md flex flex-col gap-space-lg max-w-[1440px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Job posts</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">All your job posts, with applicant counts and average match.</p>
        </div>
        <Link to="/employer/jobs/new" className="btn-secondary h-11 self-start md:self-auto">
          <Icon name="add" size={20} /> Post new job
        </Link>
      </div>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-64" />}
      {data && jobs.length === 0 && <EmptyState icon="work_outline" title="No job posts yet" body="Create your first job post — Findry suggests skills from the title and simulates your talent pool before you publish." action={<Link to="/employer/jobs/new" className="btn-secondary">Post a job</Link>} />}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        {jobs.map((j) => (
          <article key={j.id} className={`card p-space-md flex flex-col gap-space-sm ${j.status !== 'active' ? 'opacity-80' : ''}`}>
            <div className="flex items-start justify-between gap-space-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-space-xs flex-wrap">
                  <h2 className="font-title-card text-title-card text-on-surface font-bold truncate">{j.title}</h2>
                  <span className={`pill ${j.status === 'active' ? 'bg-secondary-container text-on-secondary-container' : j.status === 'draft' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-surface-container text-on-surface-variant'} font-semibold capitalize`}>{j.status}</span>
                </div>
                <p className="caption">
                  {j.department ? `${j.department} • ` : ''}
                  {j.location} • {workSetupLabel[j.workSetup]} • posted {timeAgo(j.createdAt)}
                </p>
              </div>
              <span className="font-salary-metric text-salary-metric text-secondary whitespace-nowrap">{pesoRange(j.salaryMin, j.salaryMax, true)}</span>
            </div>
            <div className="grid grid-cols-4 gap-space-xs text-center">
              {[
                [j.stats?.applicants ?? 0, 'Applicants'],
                [j.stats?.newToday ?? 0, 'New today'],
                [`${j.stats?.avgMatch ?? 0}%`, 'Avg fit'],
                [j.views, 'Views'],
              ].map(([v, l]) => (
                <div key={l as string} className="bg-surface-container-low rounded-lg p-space-xs">
                  <span className="font-headline-sm text-headline-sm text-on-surface block">{v as React.ReactNode}</span>
                  <span className="caption">{l as string}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {j.requiredSkills.slice(0, 5).map((s) => (
                <span key={s} className="pill bg-secondary-container/60 text-on-secondary-fixed-variant">
                  {s}
                </span>
              ))}
              {j.preferredSkills.slice(0, 3).map((s) => (
                <span key={s} className="pill bg-surface-container text-on-surface-variant">
                  {s}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
              <div className="flex gap-space-xs">
                <Link to={`/employer/candidates?jobId=${j.id}`} className="btn-ghost h-9 px-space-sm">
                  <Icon name="group" size={16} /> Candidates
                </Link>
                <Link to={`/employer/jobs/${j.id}/edit`} className="btn-ghost h-9 px-space-sm">
                  <Icon name="edit" size={16} /> Edit
                </Link>
              </div>
              <div className="flex gap-space-xs">
                {j.status !== 'active' ? (
                  <button type="button" onClick={() => setStatus(j, 'active')} className="btn-secondary h-9 px-space-sm">
                    <Icon name="rocket_launch" size={16} /> Publish
                  </button>
                ) : (
                  <button type="button" onClick={() => setStatus(j, 'closed')} className="btn-ghost h-9 px-space-sm">
                    Close
                  </button>
                )}
                <button type="button" onClick={() => remove(j)} className="btn-danger h-9 px-space-sm" aria-label="Delete job">
                  <Icon name="delete" size={16} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
