export const peso = (n: number | undefined | null, opts: { compact?: boolean } = {}) => {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  if (opts.compact) return `₱${Math.round(n / 1000)}k`;
  return `₱${Math.round(n).toLocaleString('en-PH')}`;
};

export const pesoRange = (min: number, max: number, compact = false) =>
  min && max ? `${peso(min, { compact })} – ${peso(max, { compact })}` : min ? `${peso(min, { compact })}+` : 'Undisclosed';

/**
 * Rough monthly net take-home under the TRAIN law (2023+ brackets) after
 * SSS / PhilHealth / Pag-IBIG. Purely indicative — shown as "est.".
 */
export function estimateNetMonthly(gross: number): number {
  if (!gross) return 0;
  const sss = Math.min(1350, gross * 0.045);
  const philhealth = Math.min(5000, gross * 0.025);
  const pagibig = 200;
  const taxable = gross - sss - philhealth - pagibig;
  let tax = 0;
  if (taxable > 666666) tax = 183541.8 + (taxable - 666666) * 0.35;
  else if (taxable > 166666) tax = 33541.8 + (taxable - 166666) * 0.3;
  else if (taxable > 66666) tax = 8541.8 + (taxable - 66666) * 0.25;
  else if (taxable > 33333) tax = 1875 + (taxable - 33333) * 0.2;
  else if (taxable > 20833) tax = (taxable - 20833) * 0.15;
  return Math.round(taxable - tax);
}

export function timeAgo(iso: string | Date | undefined): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const time = d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  if (same(d, today)) return `Today at ${time} PHT`;
  if (same(d, tomorrow)) return `Tomorrow at ${time} PHT`;
  return `${d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })} at ${time} PHT`;
}

export function daysUntil(iso: string | undefined): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export const responseBadge = (hours: number | undefined) => {
  if (!hours) return null;
  if (hours <= 24) return 'Usually responds within 24 hours';
  if (hours <= 48) return 'Usually responds within 2 days';
  if (hours <= 96) return 'Usually responds within 4 days';
  return 'Usually responds within a week';
};

export const workSetupLabel: Record<string, string> = {
  hybrid: 'Hybrid',
  remote: 'Remote (PH)',
  onsite: 'Onsite',
};

export const statusLabel: Record<string, string> = {
  submitted: 'Submitted',
  viewed: 'Viewed & Screened',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Not selected',
};

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
