import { Link } from 'react-router-dom';
import { pesoRange, responseBadge, timeAgo, workSetupLabel } from '../lib/format';
import type { Job } from '../lib/types';
import { Icon, MatchRing, Monogram } from './ui';

/**
 * Job card used in the seeker feed and browse grid. Reads top-down:
 * company → title → where/how → pay → the skills that matched and the ones
 * that didn't → status. Skills are chips so the eye can scan them.
 */
export function JobCard({ job, selected = false, onSelect, href }: { job: Job; selected?: boolean; onSelect?: () => void; href?: string }) {
  const m = job.match;
  const badge = responseBadge(job.employer?.avgResponseHours);
  const matched = m ? [...m.skills.requiredMatched, ...m.skills.preferredMatched] : [];
  const missing = m ? [...m.skills.requiredMissing, ...m.skills.preferredMissing] : [];
  const body = (
    <>
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm min-w-0">
          <Monogram text={job.employer?.monogram || '??'} size={40} />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-label-prominent text-label-prominent text-on-surface truncate">{job.employer?.companyName ?? 'Company'}</span>
              {job.employer?.verified && <Icon name="verified" size={15} fill className="text-primary" />}
            </div>
            <p className="caption truncate">{job.employer?.industry || job.industry}</p>
          </div>
        </div>
        {m && <MatchRing score={m.score} size={44} showLabel />}
      </div>

      <h3 className="font-title-card text-title-card text-on-surface font-bold mt-space-sm leading-snug">{job.title}</h3>
      <p className="caption mt-0.5 flex items-center gap-1.5 flex-wrap">
        <span className="flex items-center gap-1">
          <Icon name="location_on" size={14} /> {job.location || 'Philippines'}
        </span>
        <span aria-hidden="true">·</span>
        <span>{workSetupLabel[job.workSetup]}</span>
        <span aria-hidden="true">·</span>
        <span>{timeAgo(job.createdAt)}</span>
      </p>

      <div className="mt-space-sm flex items-baseline justify-between gap-space-sm flex-wrap">
        <span className="font-salary-metric text-salary-metric text-on-surface font-extrabold">
          {pesoRange(job.salaryMin, job.salaryMax)} <span className="caption font-medium">/ mo</span>
        </span>
        {job.benefits[0] && (
          <span className="caption text-secondary font-semibold truncate max-w-[60%]">
            <Icon name="check_circle" size={13} className="align-[-2px]" /> {job.benefits.slice(0, 2).join(' · ')}
          </span>
        )}
      </div>

      {m && (matched.length > 0 || missing.length > 0) && (
        <div className="mt-space-sm flex flex-wrap gap-1.5">
          {matched.slice(0, 4).map((s) => (
            <span key={s} className="pill bg-secondary-container/60 text-on-secondary-container font-medium">
              <Icon name="check" size={12} /> {s}
            </span>
          ))}
          {missing.slice(0, 2).map((s) => (
            <span key={s} className="pill bg-surface-container-lowest text-on-surface-variant border border-dashed border-outline-variant font-medium">
              <Icon name="add" size={12} /> {s}
            </span>
          ))}
          {missing.length > 2 && <span className="pill bg-transparent text-outline">+{missing.length - 2} more</span>}
        </div>
      )}

      <div className="mt-space-sm pt-space-sm border-t border-outline-variant/30 flex items-center justify-between gap-space-sm">
        {job.applied ? (
          <span className="pill bg-secondary-container text-on-secondary-container font-semibold">
            <Icon name="task_alt" size={13} /> Applied
          </span>
        ) : badge ? (
          <span className="caption flex items-center gap-1">
            <Icon name="bolt" size={14} className="text-secondary" /> {badge}
          </span>
        ) : (
          <span className="caption flex items-center gap-1">
            <Icon name="fiber_new" size={16} className="text-primary" /> New listing
          </span>
        )}
        <span className={`caption font-semibold flex items-center gap-0.5 ${selected ? 'text-primary' : 'text-on-surface-variant'}`}>
          {href ? 'View' : selected ? 'Viewing' : 'Details'} <Icon name="chevron_right" size={16} />
        </span>
      </div>
    </>
  );
  const cls = `card p-space-md relative transition-all duration-200 text-left w-full block ${selected ? 'border-primary/60 ring-2 ring-primary/15' : 'hover:border-outline-variant hover:shadow-sm'}`;
  if (href) {
    return (
      <Link to={href} className={cls}>
        {body}
      </Link>
    );
  }
  return (
    <article className={`${cls} cursor-pointer`} onClick={onSelect} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect?.()} aria-pressed={selected}>
      {body}
    </article>
  );
}
