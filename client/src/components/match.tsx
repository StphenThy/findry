import { useState } from 'react';
import { api } from '../lib/api';
import type { GapAdvice, MatchBreakdown } from '../lib/types';
import { Bar, Icon, SkillPill } from './ui';

/**
 * "Why you match" — the expandable transparency panel: three weighted
 * components (skills / experience / education) plus the colour-coded skill matrix.
 */
export function MatchBreakdownPanel({ match, compact = false, defaultOpen = true, subject = 'you' }: { match: MatchBreakdown; compact?: boolean; defaultOpen?: boolean; subject?: 'you' | 'they' }) {
  const [open, setOpen] = useState(defaultOpen);
  const rows = [
    { key: 'Skills overlap', score: match.skills.score, weight: match.weights.skills, tone: 'bg-secondary', text: 'text-secondary', note: `${match.skills.requiredMatched.length}/${match.skills.requiredMatched.length + match.skills.requiredMissing.length} required · ${match.skills.preferredMatched.length}/${match.skills.preferredMatched.length + match.skills.preferredMissing.length} preferred` },
    { key: 'Experience level', score: match.experience.score, weight: match.weights.experience, tone: 'bg-primary', text: 'text-primary', note: match.experience.requiredYears ? `${match.experience.years} yrs actual vs ${match.experience.requiredYears}+ required` : `${match.experience.years} yrs experience` },
    { key: 'Education', score: match.education.score, weight: match.weights.education, tone: 'bg-tertiary', text: 'text-tertiary', note: match.education.note },
  ];
  return (
    <section aria-label="Match breakdown" className="rounded-xl bg-surface-container-low p-space-md flex flex-col gap-space-sm">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center justify-between w-full text-left">
        <span className="flex items-center gap-space-sm">
          <Icon name="psychology" size={22} className="text-primary" />
          <span className="font-title-card text-title-card text-on-surface">Why {subject} match: {match.score}% fit breakdown</span>
        </span>
        <Icon name={open ? 'expand_less' : 'expand_more'} size={22} className="text-on-surface-variant" />
      </button>
      {open && (
        <>
          {!compact && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Score = skills × {match.weights.skills}% + experience × {match.weights.experience}% + education × {match.weights.education}%. Every component is computed from {subject === 'you' ? 'your' : 'the candidate’s'} profile — nothing is a black box.
            </p>
          )}
          <div className={`grid grid-cols-1 ${compact ? '' : 'md:grid-cols-3'} gap-space-sm`}>
            {rows.map((r) => (
              <div key={r.key} className="bg-surface-container-lowest rounded-lg p-space-sm flex flex-col gap-space-xs shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="kicker text-on-surface-variant">{r.key}</span>
                  <span className={`font-label-prominent text-label-prominent font-bold ${r.text}`}>{r.score}%</span>
                </div>
                <Bar value={r.score} tone={r.tone} />
                <span className="caption">
                  {r.weight}% weight · {r.note}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export function SkillsMatrix({ match, title = 'Skills alignment matrix' }: { match: MatchBreakdown; title?: string }) {
  const { requiredMatched, requiredMissing, preferredMatched, preferredMissing } = match.skills;
  return (
    <section aria-label={title} className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <h3 className="font-title-card text-title-card text-on-surface font-bold">{title}</h3>
        <span className="caption">
          <span className="inline-block w-2 h-2 rounded-full bg-secondary mr-1" /> matched &nbsp;
          <span className="inline-block w-2 h-2 rounded-full bg-outline-variant mr-1" /> missing
        </span>
      </div>
      <div className="flex flex-col gap-space-xs">
        <span className="kicker text-on-surface-variant">
          Must-have stack ({requiredMatched.length}/{requiredMatched.length + requiredMissing.length} matched)
        </span>
        <div className="flex flex-wrap gap-space-xs">
          {requiredMatched.map((s) => (
            <SkillPill key={s} name={s} tone="matched" />
          ))}
          {requiredMissing.map((s) => (
            <SkillPill key={s} name={s} tone="missing" />
          ))}
          {!requiredMatched.length && !requiredMissing.length && <span className="caption">No required skills listed.</span>}
        </div>
      </div>
      {(preferredMatched.length > 0 || preferredMissing.length > 0) && (
        <div className="flex flex-col gap-space-xs">
          <span className="kicker text-on-surface-variant">
            Preferred &amp; ecosystem ({preferredMatched.length} matched, {preferredMissing.length} bridgeable)
          </span>
          <div className="flex flex-wrap gap-space-xs">
            {preferredMatched.map((s) => (
              <SkillPill key={s} name={s} tone="matched" />
            ))}
            {preferredMissing.map((s) => (
              <SkillPill key={s} name={s} tone="missing" />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** "How to improve this match" — lazily asks the API (Gemini or local) for gap advice. */
export function GapAdvicePanel({ jobId, match }: { jobId: string; match: MatchBreakdown }) {
  const [state, setState] = useState<{ loading: boolean; advice: GapAdvice[] | null; projected: number | null; provider?: string; error?: string }>({ loading: false, advice: null, projected: null });
  const missing = [...match.skills.requiredMissing, ...match.skills.preferredMissing];
  if (!missing.length) {
    return (
      <div className="rounded-lg bg-secondary-container/30 p-space-md flex items-center gap-space-sm">
        <Icon name="verified" size={22} className="text-secondary" fill />
        <div>
          <span className="font-label-prominent text-label-prominent text-on-surface">You cover every listed skill for this role.</span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Your remaining score comes from experience and education weighting.</p>
        </div>
      </div>
    );
  }
  const load = async () => {
    setState({ loading: true, advice: null, projected: null });
    try {
      const r = await api.post<{ advice: GapAdvice[]; projectedScore: number; provider: string }>(`/seeker/jobs/${jobId}/gap-advice`);
      setState({ loading: false, advice: r.advice, projected: r.projectedScore, provider: r.provider });
    } catch (e) {
      setState({ loading: false, advice: null, projected: null, error: (e as Error).message });
    }
  };
  return (
    <div className="rounded-lg bg-surface-container-high p-space-md flex flex-col gap-space-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div className="flex items-start gap-space-sm">
          <Icon name="school" size={24} className="text-tertiary" />
          <div>
            <span className="font-label-prominent text-label-prominent text-on-surface">How to improve this match</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              You're missing <strong className="text-on-surface">{missing.slice(0, 3).join(', ')}</strong>
              {missing.length > 3 ? ` and ${missing.length - 3} more` : ''}. {state.projected ? `Closing these gaps would lift you to ~${state.projected}%.` : 'See a suggested learning path for each gap.'}
            </p>
          </div>
        </div>
        {!state.advice && (
          <button type="button" onClick={load} disabled={state.loading} className="btn bg-tertiary hover:bg-tertiary-container text-on-tertiary px-space-md py-space-xs whitespace-nowrap shrink-0">
            {state.loading ? 'Thinking…' : 'Show me how'}
          </button>
        )}
      </div>
      {state.error && <p className="caption text-error">{state.error}</p>}
      {state.advice && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
          {state.advice.map((a) => (
            <li key={a.skill} className="bg-surface-container-lowest rounded-lg p-space-sm flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-label-prominent text-label-prominent text-on-surface">{a.skill}</span>
                {a.salaryImpact && <span className="caption text-secondary font-bold">{a.salaryImpact}</span>}
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{a.why}</p>
              <p className="caption flex items-center gap-1">
                <Icon name="menu_book" size={14} className="text-primary" /> {a.resource}
                {a.estimatedHours ? ` · ~${a.estimatedHours}h` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
      {state.provider && <span className="caption text-outline">Advice generated by {state.provider === 'gemini' ? 'Gemini' : 'Findry local engine'}.</span>}
    </div>
  );
}
