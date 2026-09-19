import { Link } from 'react-router-dom';
import { Bar, EmptyState, ErrorBox, Icon, Skeleton, StatCard } from '../../components/ui';
import { api } from '../../lib/api';
import { useFetch } from '../../lib/hooks';

interface Analytics {
  perJob: Array<{ id: string; title: string; status: string; views: number; applications: number; conversion: number; avgMatch: number; interview: number; offers: number; daysOpen: number; timeToFill: number | null }>;
  series: Array<{ day: string; count: number }>;
  buckets: Record<string, number>;
  totals: { views: number; applications: number };
}

/** Employer analytics: views, applications, conversion, avg match, time-to-fill, 14-day trend, match distribution. */
export function EmployerAnalytics() {
  const { data, error, loading, reload } = useFetch(() => api.get<Analytics>('/employer/analytics'));
  if (error) return <div className="p-space-lg"><ErrorBox message={error} onRetry={reload} /></div>;
  if (loading || !data) return <div className="p-space-lg"><Skeleton className="h-96" /></div>;

  const max = Math.max(1, ...data.series.map((s) => s.count));
  const totalApps = data.totals.applications;
  const avgMatch = data.perJob.length ? Math.round(data.perJob.reduce((s, j) => s + j.avgMatch * j.applications, 0) / Math.max(1, totalApps)) : 0;
  const fills = data.perJob.filter((j) => j.timeToFill !== null).map((j) => j.timeToFill as number);
  const avgFill = fills.length ? Math.round(fills.reduce((a, b) => a + b, 0) / fills.length) : null;
  const conversion = data.totals.views ? Math.round((totalApps / data.totals.views) * 100) : 0;
  const bucketTone: Record<string, string> = { '90+': 'bg-secondary', '80-89': 'bg-primary', '65-79': 'bg-tertiary', '<65': 'bg-outline' };

  return (
    <div className="px-margin-sm lg:px-space-lg py-space-md flex flex-col gap-space-lg max-w-[1440px] mx-auto w-full">
      <div>
        <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Analytics</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Views, applications, average match score and time-to-fill across every post.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <StatCard kicker="Post views" value={data.totals.views.toLocaleString()} icon="visibility" tone="neutral" sub="All-time, all posts" />
        <StatCard kicker="Applications" value={totalApps} unit={`${conversion}% view→apply`} icon="send" tone="secondary" sub="Conversion from views" />
        <StatCard kicker="Avg match score" value={`${avgMatch}%`} icon="bolt" tone="secondary" sub="Weighted by applicants" />
        <StatCard kicker="Time to fill" value={avgFill ?? '—'} unit={avgFill ? 'days to offer' : 'no offers yet'} icon="hourglass_top" tone="neutral" sub="Post created → first offer" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        <div className="xl:col-span-7 card p-space-md">
          <h2 className="font-title-card text-title-card text-on-surface font-bold mb-space-sm">Applications — last 14 days</h2>
          <div className="flex items-end gap-1 h-40" role="img" aria-label="Applications per day, last 14 days">
            {data.series.map((s) => (
              <div key={s.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <span className="caption text-on-surface font-semibold">{s.count || ''}</span>
                <div className="w-full rounded-t bg-secondary/80 hover:bg-secondary transition-colors" style={{ height: `${(s.count / max) * 100}%`, minHeight: s.count ? 6 : 2 }} title={`${s.day}: ${s.count}`} />
                <span className="caption text-outline text-[9px]">{s.day.slice(3)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="xl:col-span-5 card p-space-md">
          <h2 className="font-title-card text-title-card text-on-surface font-bold mb-space-sm">Match quality distribution</h2>
          <div className="flex flex-col gap-space-sm">
            {Object.entries(data.buckets).map(([k, n]) => (
              <div key={k}>
                <div className="flex justify-between caption mb-1">
                  <span className="font-semibold text-on-surface">{k}% fit</span>
                  <span>
                    {n} ({totalApps ? Math.round((n / totalApps) * 100) : 0}%)
                  </span>
                </div>
                <Bar value={totalApps ? (n / totalApps) * 100 : 0} tone={bucketTone[k]} className="h-2" />
              </div>
            ))}
          </div>
          <p className="caption mt-space-sm">Tip: if most applicants land below 65%, your required-skill list may be too broad — move nice-to-haves into "preferred".</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-space-md flex items-center justify-between">
          <h2 className="font-title-card text-title-card text-on-surface font-bold">Per-post performance</h2>
          <Link to="/employer/jobs/new" className="caption font-semibold text-secondary hover:underline">
            + New post
          </Link>
        </div>
        {data.perJob.length === 0 ? (
          <div className="p-space-md">
            <EmptyState icon="equalizer" title="No posts to analyse yet" action={<Link to="/employer/jobs/new" className="btn-secondary">Post a job</Link>} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-high kicker text-on-surface-variant">
                <tr>
                  {['Role', 'Status', 'Views', 'Applications', 'Conv.', 'Avg match', 'Interviews', 'Offers', 'Days open', 'Time to fill'].map((h) => (
                    <th key={h} className="px-space-sm py-space-sm font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                {data.perJob.map((j) => (
                  <tr key={j.id} className="hover:bg-surface-container-low">
                    <td className="px-space-sm py-space-sm font-semibold text-on-surface">
                      <Link to={`/employer/candidates?jobId=${j.id}`} className="hover:text-secondary">
                        {j.title}
                      </Link>
                    </td>
                    <td className="px-space-sm py-space-sm">
                      <span className={`pill ${j.status === 'active' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'} capitalize`}>{j.status}</span>
                    </td>
                    <td className="px-space-sm py-space-sm">{j.views}</td>
                    <td className="px-space-sm py-space-sm">{j.applications}</td>
                    <td className="px-space-sm py-space-sm">{j.conversion}%</td>
                    <td className="px-space-sm py-space-sm">
                      <span className={`font-bold ${j.avgMatch >= 85 ? 'text-secondary' : j.avgMatch >= 70 ? 'text-primary' : 'text-on-surface-variant'}`}>{j.avgMatch}%</span>
                    </td>
                    <td className="px-space-sm py-space-sm">{j.interview}</td>
                    <td className="px-space-sm py-space-sm">{j.offers}</td>
                    <td className="px-space-sm py-space-sm">{j.daysOpen}d</td>
                    <td className="px-space-sm py-space-sm">{j.timeToFill !== null ? `${j.timeToFill}d` : <span className="text-outline">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="caption flex items-center gap-1">
        <Icon name="info" size={14} /> Match scores are computed from skills (45%), experience (30%) and education (25%) — identical to what candidates see.
      </p>
    </div>
  );
}
