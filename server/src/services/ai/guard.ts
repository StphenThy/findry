import crypto from 'crypto';
import { config } from '../../config';
import { AiCache, AiUsage } from '../../models/AiUsage';
import { localProvider } from './local';
import type { AIProvider } from './provider';

/**
 * Budget + cache layer in front of the paid/quota'd provider (Gemini).
 *
 *  1. Cache  — identical inputs are answered from MongoDB, never re-billed.
 *  2. Budget — a per-minute and a per-day ceiling on real calls. Over budget
 *              → the deterministic local engine answers instead (no error).
 *  3. Cooldown — if Gemini itself says "quota exhausted" (429), stop calling
 *              it for a while instead of failing every request.
 *
 * Nothing user-facing breaks when the budget is gone; results just come from
 * the local engine and `provider` in the response says so.
 */

type Kind = 'parseResume' | 'suggestSkills' | 'gapAdvice';

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const today = () => new Date().toISOString().slice(0, 10);

// ── per-minute window (in-memory; one process per Render instance is fine) ──
let minuteStart = Date.now();
let minuteCalls = 0;
function underMinuteBudget(): boolean {
  const now = Date.now();
  if (now - minuteStart >= 60_000) {
    minuteStart = now;
    minuteCalls = 0;
  }
  return minuteCalls < config.ai.perMinuteLimit;
}

// ── quota cooldown ──
let cooldownUntil = 0;
const isQuotaError = (err: unknown) => /429|RESOURCE_EXHAUSTED|quota|rate limit/i.test((err as Error)?.message ?? '');

// ── per-day counter (persisted so restarts don't reset it) ──
let dayCache = { day: '', calls: 0, checkedAt: 0 };
async function todayCalls(): Promise<number> {
  const d = today();
  if (dayCache.day === d && Date.now() - dayCache.checkedAt < 10_000) return dayCache.calls;
  const doc = await AiUsage.findOne({ day: d }).select('calls');
  dayCache = { day: d, calls: doc?.calls ?? 0, checkedAt: Date.now() };
  return dayCache.calls;
}
async function recordCall(kind: Kind) {
  minuteCalls += 1;
  dayCache.calls += 1;
  await AiUsage.updateOne({ day: today() }, { $inc: { calls: 1, [`byKind.${kind}`]: 1 } }, { upsert: true });
}

/** Snapshot for /api/health and logs. */
export async function aiUsageStatus() {
  return {
    today: await todayCalls(),
    dailyLimit: config.ai.dailyLimit,
    perMinuteLimit: config.ai.perMinuteLimit,
    cooldownUntil: cooldownUntil > Date.now() ? new Date(cooldownUntil).toISOString() : null,
  };
}

async function fromCache<T>(key: string): Promise<T | null> {
  const hit = await AiCache.findOne({ key }).select('value').lean();
  return hit ? (hit.value as T) : null;
}
async function toCache(key: string, kind: Kind, value: unknown) {
  await AiCache.updateOne({ key }, { $set: { kind, value, createdAt: new Date() } }, { upsert: true }).catch(() => undefined);
}

/**
 * Runs `real` if cache misses and budget allows; otherwise `fallback`.
 * Local-engine answers are NOT cached, so the next in-budget request still
 * gets a real answer.
 */
async function guarded<T>(kind: Kind, key: string, real: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  const cached = await fromCache<T>(key);
  if (cached) return cached;

  const now = Date.now();
  if (now < cooldownUntil) return fallback();
  if (!underMinuteBudget()) {
    console.warn(`[ai:guard] per-minute budget (${config.ai.perMinuteLimit}) reached — ${kind} served by local engine`);
    return fallback();
  }
  if ((await todayCalls()) >= config.ai.dailyLimit) {
    console.warn(`[ai:guard] daily budget (${config.ai.dailyLimit}) reached — ${kind} served by local engine`);
    return fallback();
  }

  try {
    await recordCall(kind);
    const value = await real();
    await toCache(key, kind, value);
    return value;
  } catch (err) {
    if (isQuotaError(err)) {
      cooldownUntil = Date.now() + config.ai.cooldownMinutes * 60_000;
      console.warn(`[ai:guard] provider quota exhausted — pausing real calls for ${config.ai.cooldownMinutes} min`);
    } else console.warn(`[ai:guard] ${kind} failed, using local engine:`, (err as Error).message);
    return fallback();
  }
}

export function withGuard(real: AIProvider): AIProvider {
  return {
    name: real.name,
    parseResume: (rawText) =>
      guarded('parseResume', `resume:${sha(rawText)}`, () => real.parseResume(rawText), () => localProvider.parseResume(rawText)),
    suggestSkills: (title, description = '') =>
      guarded(
        'suggestSkills',
        `skills:${sha(`${title.trim().toLowerCase()}|${description.trim().toLowerCase().slice(0, 4000)}`)}`,
        () => real.suggestSkills(title, description),
        () => localProvider.suggestSkills(title, description),
      ),
    gapAdvice: (input) => {
      if (!input.missingSkills.length) return Promise.resolve([]);
      const key = `gap:${sha(`${input.jobTitle.trim().toLowerCase()}|${[...input.missingSkills].map((s) => s.toLowerCase()).sort().join(',')}`)}`;
      return guarded('gapAdvice', key, () => real.gapAdvice(input), () => localProvider.gapAdvice(input));
    },
  };
}
