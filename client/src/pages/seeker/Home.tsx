import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { JobCard } from '../../components/JobCard';
import { JobDetailPanel } from '../../components/JobDetailPanel';
import { EmptyState, ErrorBox, Icon, MatchRing, Skeleton } from '../../components/ui';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { peso } from '../../lib/format';
import { useDebounced, useFetch } from '../../lib/hooks';
import type { Job } from '../../lib/types';

interface Filters {
  q: string;
  location: string;
  workSetup: string;
  industry: string;
  salaryMin: number;
  sort: 'match' | 'newest' | 'salary';
}
const DEFAULT: Filters = { q: '', location: '', workSetup: '', industry: '', salaryMin: 0, sort: 'match' };
const LOCATIONS = ['', 'Taguig', 'Makati', 'Pasig', 'Quezon City', 'Cebu', 'Davao', 'Remote'];
const INDUSTRIES = ['', 'Fintech', 'SaaS', 'HR Tech', 'Banking', 'Social', 'E-commerce'];

function useFeed(filters: Filters) {
  const debouncedQ = useDebounced(filters.q, 350);
  const key = qs({ ...filters, q: debouncedQ, salaryMin: filters.salaryMin || undefined, limit: 60 });
  return useFetch(() => api.get<{ jobs: Job[]; total: number; profileCompletion: { percent: number; missing: string[] }; emptyHint?: string }>(`/seeker/matches${key}`), [key]);
}

/** Seeker home: greeting + completion gauge, filter bar, AI-ranked feed (left) and job dossier (right on desktop). */
export function SeekerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>(DEFAULT);
  const { data, error, loading, reload, setData } = useFeed(filters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const jobs = data?.jobs ?? [];

  useEffect(() => {
    if (jobs.length && (!selectedId || !jobs.some((j) => j.id === selectedId))) setSelectedId(jobs[0].id);
  }, [jobs, selectedId]);

  const patchJob = (next: Job) => data && setData({ ...data, jobs: data.jobs.map((j) => (j.id === next.id ? { ...j, ...next, match: j.match } : j)) });
  const completion = data?.profileCompletion;
  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <div className="flex flex-col w-full">
      {/* Greeting + filters */}
      <section className="w-full bg-surface-container-lowest shadow-sm">
        <div className="max-w-[1280px] mx-auto px-margin-sm lg:px-margin-lg py-space-lg flex flex-col gap-space-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-sm flex-wrap">
                <span className="caption flex items-center gap-space-xs">
                  <span className="w-2 h-2 rounded-full bg-secondary" /> {data ? `${data.total} open roles match your profile` : 'Finding your matches…'}
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface tracking-tight">Mabuhay, {firstName}</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Here are the roles that fit your skills, experience and salary expectations.</p>
            </div>
            {completion && <CompletionCard percent={completion.percent} missing={completion.missing} />}
          </div>
          <FilterBar filters={filters} onChange={setFilters} />
        </div>
      </section>

      {/* Master / detail */}
      <div className="max-w-[1280px] w-full mx-auto px-margin-sm lg:px-margin-lg py-margin flex flex-col lg:flex-row gap-gutter">
        <section aria-label="AI job matches" className="w-full lg:w-5/12 flex flex-col gap-space-md">
          <div className="flex items-center justify-between mb-space-xs">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Your matches</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Best fit first — tap a card to see why</p>
            </div>
            <div className="flex items-center gap-space-xs bg-surface-container rounded-lg p-1 caption" role="tablist">
              {(['match', 'newest', 'salary'] as const).map((s) => (
                <button key={s} type="button" role="tab" aria-selected={filters.sort === s} onClick={() => setFilters({ ...filters, sort: s })} className={`px-space-sm py-space-xs rounded capitalize ${filters.sort === s ? 'bg-surface-container-lowest shadow-sm font-semibold text-primary' : 'hover:text-on-surface'}`}>
                  {s === 'match' ? 'Ranked' : s}
                </button>
              ))}
            </div>
          </div>
          {error && <ErrorBox message={error} onRetry={reload} />}
          {loading && !data && [1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)}
          {data && jobs.length === 0 && (
            <EmptyState
              icon="travel_explore"
              title="No matches yet"
              body={data.emptyHint ?? 'Try widening your filters.'}
              action={
                completion && completion.percent < 60 ? (
                  <Link to="/seeker/profile" className="btn-primary">
                    Complete your profile
                  </Link>
                ) : (
                  <button type="button" onClick={() => setFilters(DEFAULT)} className="btn-ghost">
                    Reset filters
                  </button>
                )
              }
            />
          )}
          {jobs.map((j) => (
            <JobCard
              key={j.id}
              job={j}
              selected={selectedId === j.id}
              onSelect={() => {
                if (window.innerWidth < 1024) navigate(`/seeker/jobs/${j.id}`);
                else setSelectedId(j.id);
              }}
            />
          ))}
        </section>
        <section aria-label="Selected role details" className="hidden lg:block w-full lg:w-7/12">
          {selectedId ? <div className="sticky top-20"><JobDetailPanel jobId={selectedId} onChanged={patchJob} /></div> : data && jobs.length === 0 ? null : <Skeleton className="h-96" />}
        </section>
      </div>
    </div>
  );
}

export function CompletionCard({ percent, missing }: { percent: number; missing: string[] }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-space-md flex items-center gap-space-md shadow-sm lg:min-w-[320px] lg:max-w-[420px]">
      <MatchRing score={percent} size={56} stroke={4} />
      <div className="flex flex-col gap-space-xs min-w-0">
        <div className="flex items-center justify-between gap-space-xs">
          <span className="font-label-prominent text-label-prominent text-on-surface truncate">Profile {percent}% complete</span>
          {percent < 100 && <span className="caption text-secondary font-bold">+{Math.min(15, 100 - percent)}% boost available</span>}
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">{percent >= 100 ? 'Your profile is complete.' : `Next: ${missing[0]} to improve your matches.`}</p>
        {percent < 100 && (
          <Link to="/seeker/profile" className="caption font-semibold text-primary hover:text-primary-container flex items-center gap-space-xs">
            Complete profile <Icon name="arrow_forward" size={14} />
          </Link>
        )}
      </div>
    </div>
  );
}

const SALARY_STEPS = [0, 50000, 80000, 100000, 150000, 200000];

/** Compact filter toolbar: one row of controls, quick-filter chips underneath. */
export function FilterBar({ filters, onChange, withSearch = false }: { filters: Filters; onChange: (f: Filters) => void; withSearch?: boolean }) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });
  const active = Object.entries(filters).filter(([k, v]) => k !== 'sort' && k !== 'q' && v !== '' && v !== 0).length;
  return (
    <div className="card p-space-sm md:p-space-md flex flex-col gap-space-sm">
      <div className={`grid grid-cols-2 ${withSearch ? 'lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]' : 'lg:grid-cols-4'} gap-space-sm`}>
        {withSearch && (
          <div className="relative col-span-2 lg:col-span-1">
            <Icon name="search" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input className="field pl-10" placeholder="Search titles, skills, companies…" value={filters.q} onChange={(e) => set('q', e.target.value)} aria-label="Search jobs" />
          </div>
        )}
        <select className="field" value={filters.location} onChange={(e) => set('location', e.target.value)} aria-label="Location">
          {LOCATIONS.map((l) => (
            <option key={l} value={l}>
              {l || 'Any location'}
            </option>
          ))}
        </select>
        <select className="field" value={filters.salaryMin} onChange={(e) => set('salaryMin', Number(e.target.value))} aria-label="Minimum monthly salary">
          {SALARY_STEPS.map((v) => (
            <option key={v} value={v}>
              {v ? `${peso(v, { compact: true })}+ / mo` : 'Any salary'}
            </option>
          ))}
        </select>
        <select className="field" value={filters.workSetup} onChange={(e) => set('workSetup', e.target.value)} aria-label="Work setup">
          <option value="">Any work setup</option>
          <option value="hybrid">Hybrid</option>
          <option value="remote">Remote (PH)</option>
          <option value="onsite">Onsite</option>
        </select>
        <select className="field" value={filters.industry} onChange={(e) => set('industry', e.target.value)} aria-label="Industry">
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>
              {i || 'Any industry'}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-space-xs flex-wrap">
        {[
          ['Fintech · Remote', { industry: 'Fintech', workSetup: 'remote' }],
          ['₱150k+ · Hybrid', { salaryMin: 150000, workSetup: 'hybrid' }],
          ['Cebu', { location: 'Cebu' }],
        ].map(([label, patch]) => (
          <button key={label as string} type="button" onClick={() => onChange({ ...filters, ...(patch as Partial<Filters>) })} className="pill bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors">
            {label as string}
          </button>
        ))}
        {active > 0 && (
          <button type="button" onClick={() => onChange({ ...DEFAULT, q: filters.q, sort: filters.sort })} className="ml-auto caption font-semibold text-primary hover:underline flex items-center gap-1">
            <Icon name="close" size={14} /> Clear {active} filter{active === 1 ? '' : 's'}
          </button>
        )}
      </div>
    </div>
  );
}

/** Browse: grid of all jobs with filters + search (each card links to the detail page). */
export function SeekerBrowse() {
  const [filters, setFilters] = useState<Filters>(DEFAULT);
  const { data, error, loading, reload } = useFeed(filters);
  const jobs = data?.jobs ?? [];
  return (
    <div className="max-w-[1280px] mx-auto px-margin-sm lg:px-margin-lg py-space-lg flex flex-col gap-space-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Browse all roles</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Every card shows your explainable match %.</p>
      </div>
      <FilterBar filters={filters} onChange={setFilters} withSearch />
      <div className="flex items-center justify-between">
        <span className="caption">{data ? `${data.total} roles` : ''}</span>
        <div className="flex items-center gap-space-xs bg-surface-container rounded-lg p-1 caption">
          {(['match', 'newest', 'salary'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setFilters({ ...filters, sort: s })} className={`px-space-sm py-space-xs rounded capitalize ${filters.sort === s ? 'bg-surface-container-lowest shadow-sm font-semibold text-primary' : ''}`}>
              {s === 'match' ? 'Best match' : s}
            </button>
          ))}
        </div>
      </div>
      {error && <ErrorBox message={error} onRetry={reload} />}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
        {loading && !data && [1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-64" />)}
        {jobs.map((j) => (
          <JobCard key={j.id} job={j} href={`/seeker/jobs/${j.id}`} />
        ))}
      </div>
      {data && jobs.length === 0 && <EmptyState icon="search_off" title="Nothing matches these filters" body={data.emptyHint} action={<button type="button" onClick={() => setFilters(DEFAULT)} className="btn-ghost">Reset filters</button>} />}
    </div>
  );
}

/** Standalone job page (mobile tap-through and deep links). */
export function SeekerJobPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const key = useMemo(() => id ?? '', [id]);
  if (!key) return null;
  return (
    <div className="max-w-4xl mx-auto px-margin-sm lg:px-margin-lg py-space-lg flex flex-col gap-space-md">
      <button type="button" onClick={() => navigate(-1)} className="caption font-semibold text-primary flex items-center gap-1 self-start">
        <Icon name="arrow_back" size={16} /> Back to matches
      </button>
      <JobDetailPanel jobId={key} />
    </div>
  );
}
