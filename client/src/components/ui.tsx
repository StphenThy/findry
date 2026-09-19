import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast as toastBus } from '../lib/hooks';
import type { Toast } from '../lib/hooks';
import { initials } from '../lib/format';

/* ── Icon (Material Symbols) ─────────────────────────────────────────── */
export function Icon({ name, size = 20, fill = false, className = '' }: { name: string; size?: number; fill?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined shrink-0 ${className}`}
      style={{ fontSize: size, fontVariationSettings: fill ? "'FILL' 1" : undefined }}
    >
      {name}
    </span>
  );
}

/* ── Logo ─────────────────────────────────────────────────────────────── */
/**
 * The Findry mark as a vector: a gradient "F" with a candidate bubble punched
 * out of it and three green signal strokes. Every piece carries a `fm-*` class
 * so anime.js can draw / pop it in (see the landing page); `uid` keeps the
 * gradient and mask ids unique when several marks share a page.
 */
export function FindryMark({ size = 28, uid = 'fm', className = '' }: { size?: number; uid?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-grad`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f6fea" />
          <stop offset="1" stopColor="#0a2d8e" />
        </linearGradient>
        <mask id={`${uid}-hole`}>
          <rect width="100" height="100" fill="#fff" />
          <circle cx="40" cy="43" r="21.5" fill="#000" />
        </mask>
        <clipPath id={`${uid}-bubble`}>
          <circle cx="40" cy="43" r="17.5" />
        </clipPath>
      </defs>
      <path
        className="fm-f"
        d="M31 2 H91 C95.5 2 99 5.5 99 10 V13 C99 18 95 22 90 22 H60 V60 C60 64.5 56.5 68 52 68 H36 L26 88 C25.3 89.8 23.5 91 21.5 91 H0 L24.5 5.5 C25.5 3.4 27.5 2 31 2 Z"
        fill={`url(#${uid}-grad)`}
        mask={`url(#${uid}-hole)`}
      />
      <g className="fm-bubble">
        <circle cx="40" cy="43" r="17.5" fill="#1d4ed8" />
        <g clipPath={`url(#${uid}-bubble)`}>
          <circle cx="40" cy="37.5" r="5.5" fill="#fff" />
          <path d="M27 62 a13 11 0 0 1 26 0 z" fill="#fff" />
        </g>
      </g>
      <g className="fm-signal" stroke="#2fb98a" strokeWidth="4.5" strokeLinecap="round" fill="none">
        <line className="fm-signal-line" x1="66" y1="33" x2="72" y2="30.5" />
        <line className="fm-signal-line" x1="66" y1="43" x2="78" y2="43" />
        <line className="fm-signal-line" x1="66" y1="53" x2="72" y2="55.5" />
      </g>
    </svg>
  );
}

/** Wordmark: navy "Findry" with the green i-dot from the logo. */
export function FindryWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-headline-sm font-extrabold tracking-tight text-[#0c2a66] ${className}`}>
      F<span className="relative">
        ı<span className="absolute rounded-full bg-[#2fb98a]" style={{ width: '0.2em', height: '0.2em', left: '0.06em', top: '0.04em' }} />
      </span>
      ndry
    </span>
  );
}

export function Logo({ size = 'md', to = '/' }: { size?: 'sm' | 'md' | 'lg'; to?: string }) {
  const px = size === 'lg' ? 40 : size === 'sm' ? 26 : 32;
  return (
    <Link to={to} className="flex items-center gap-space-xs shrink-0" aria-label="Findry home">
      <FindryMark size={px} uid={`logo-${size}`} />
      <FindryWordmark className={size === 'lg' ? 'text-headline-md' : 'text-headline-sm'} />
    </Link>
  );
}

/* ── Match ring ─────────────────────────────────────────────────────── */
export function matchTone(score: number): { text: string; stroke: string; bg: string; label: string } {
  if (score >= 90) return { text: 'text-secondary', stroke: 'text-secondary', bg: 'bg-secondary-container text-on-secondary-container', label: 'High Match' };
  if (score >= 80) return { text: 'text-primary', stroke: 'text-primary', bg: 'bg-primary-fixed text-on-primary-fixed', label: 'Strong Fit' };
  if (score >= 65) return { text: 'text-tertiary', stroke: 'text-tertiary', bg: 'bg-tertiary-fixed text-on-tertiary-fixed', label: 'Potential' };
  return { text: 'text-on-surface-variant', stroke: 'text-outline', bg: 'bg-surface-container text-on-surface-variant', label: 'Low Match' };
}

export function MatchRing({ score, size = 48, stroke = 3.5, showLabel = false, className = '' }: { score: number; size?: number; stroke?: number; showLabel?: boolean; className?: string }) {
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const tone = matchTone(score);
  const fontSize = size >= 60 ? 18 : size >= 44 ? 13 : 11;
  return (
    <div className={`flex flex-col items-center shrink-0 ${className}`} role="img" aria-label={`${score}% match — ${tone.label}`}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke="currentColor" strokeWidth={stroke} className="text-surface-container-highest" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.min(100, Math.max(0, score)) / 100)}
            className={`${tone.stroke} transition-all duration-700`}
          />
        </svg>
        <span className={`absolute font-salary-metric font-bold leading-none ${tone.text}`} style={{ fontSize }}>
          {score}
          <span className="text-[9px] font-bold">%</span>
        </span>
      </div>
      {showLabel && <span className={`font-caption-micro text-[10px] font-bold mt-1 ${tone.text}`}>{tone.label}</span>}
    </div>
  );
}

/* ── Skill pills ──────────────────────────────────────────────────────── */
export type PillTone = 'matched' | 'missing' | 'neutral' | 'preferred' | 'gap';

export function SkillPill({ name, tone = 'neutral', onRemove, onClick, icon }: { name: string; tone?: PillTone; onRemove?: () => void; onClick?: () => void; icon?: string }) {
  const cls: Record<PillTone, string> = {
    matched: 'bg-secondary-container text-on-secondary-container font-semibold',
    preferred: 'bg-primary-fixed/60 text-on-primary-fixed font-semibold',
    missing: 'bg-surface-container-high text-on-surface-variant',
    gap: 'bg-error-container/40 text-on-error-container',
    neutral: 'bg-surface-container text-on-surface',
  };
  const iconName = icon ?? (tone === 'matched' || tone === 'preferred' ? 'check_circle' : tone === 'missing' ? 'warning' : tone === 'gap' ? 'close' : undefined);
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={`pill ${cls[tone]} ${onClick ? 'hover:bg-surface-container-high transition-colors' : ''}`}>
      {iconName && <Icon name={iconName} size={13} className={tone === 'missing' ? 'text-error' : ''} />}
      {name}
      {onRemove && (
        <button type="button" onClick={onRemove} className="ml-0.5 opacity-70 hover:opacity-100 hover:text-error" aria-label={`Remove ${name}`}>
          <Icon name="close" size={13} />
        </button>
      )}
    </Tag>
  );
}

/* ── Progress bar ────────────────────────────────────────────────────── */
export function Bar({ value, tone = 'bg-primary', className = 'h-1.5' }: { value: number; tone?: string; className?: string }) {
  return (
    <div className={`w-full bg-surface-container-highest rounded-full overflow-hidden ${className}`}>
      <div className={`${tone} h-full rounded-full transition-all duration-700`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* ── Avatar / monogram ───────────────────────────────────────────────── */
export function Avatar({ name, url, size = 40, className = '', square = false }: { name: string; url?: string; size?: number; className?: string; square?: boolean }) {
  const shape = square ? 'rounded-xl' : 'rounded-full';
  if (url) return <img src={url} alt={name} width={size} height={size} className={`${shape} object-cover shadow-sm shrink-0 ${className}`} style={{ width: size, height: size }} />;
  return (
    <div className={`${shape} bg-primary-fixed text-primary font-headline-sm font-bold flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials(name) || '?'}
    </div>
  );
}

export function Monogram({ text, tone = 'text-primary', size = 48, className = '' }: { text: string; tone?: string; size?: number; className?: string }) {
  return (
    <div className={`rounded-lg bg-surface-container flex items-center justify-center font-title-card font-bold shrink-0 ${tone} ${className}`} style={{ width: size, height: size, fontSize: size * 0.34 }} aria-hidden="true">
      {text}
    </div>
  );
}

/* ── Empty / loading / error states ──────────────────────────────────── */
export function EmptyState({ icon = 'inbox', title, body, action }: { icon?: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card p-space-xl flex flex-col items-center text-center gap-space-sm">
      <span className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-primary">
        <Icon name={icon} size={28} />
      </span>
      <h3 className="font-title-card text-title-card text-on-surface">{title}</h3>
      {body && <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">{body}</p>}
      {action && <div className="mt-space-xs">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = 'h-24' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl bg-error-container/40 text-on-error-container p-space-md flex items-center justify-between gap-space-md" role="alert">
      <span className="font-body-sm text-body-sm flex items-center gap-space-xs">
        <Icon name="error" size={18} /> {message}
      </span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-label-prominent text-label-prominent underline">
          Retry
        </button>
      )}
    </div>
  );
}

/* ── Modal ───────────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-space-md bg-inverse-surface/40 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`bg-surface-container-lowest w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-t-2xl sm:rounded-xl shadow-xl p-space-lg relative animate-fade-in max-h-[92vh] overflow-y-auto`}
      >
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface" aria-label="Close">
          <Icon name="close" size={20} />
        </button>
        <h2 className="font-headline-sm text-headline-sm text-on-surface pr-8 mb-space-sm">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/* ── Toggle switch ───────────────────────────────────────────────────── */
export function Toggle({ on, onChange, tone = 'bg-secondary', label }: { on: boolean; onChange: (v: boolean) => void; tone?: string; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`toggle ${on ? tone : 'bg-surface-container-highest'}`}>
      <span className={`toggle-knob ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

/* ── Toasts ──────────────────────────────────────────────────────────── */
export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(
    () =>
      toastBus.subscribe((t) => {
        setItems((s) => [...s, t]);
        setTimeout(() => setItems((s) => s.filter((x) => x.id !== t.id)), 3800);
      }),
    [],
  );
  if (!items.length) return null;
  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-md" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={`rounded-xl px-space-md py-space-sm shadow-lg font-body-sm text-body-sm flex items-center gap-space-sm animate-fade-in ${
            t.kind === 'success' ? 'bg-secondary text-on-secondary' : t.kind === 'error' ? 'bg-error text-on-error' : 'bg-inverse-surface text-inverse-on-surface'
          }`}
        >
          <Icon name={t.kind === 'success' ? 'check_circle' : t.kind === 'error' ? 'error' : 'info'} size={18} />
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* ── Stat / KPI card ─────────────────────────────────────────────────── */
export function StatCard({ kicker, value, unit, sub, icon, tone = 'primary', foot }: { kicker: string; value: ReactNode; unit?: string; sub?: string; icon: string; tone?: 'primary' | 'secondary' | 'neutral' | 'tertiary'; foot?: ReactNode }) {
  const toneCls = {
    primary: { k: 'text-on-surface-variant', i: 'bg-primary-fixed text-primary', v: 'text-on-surface' },
    secondary: { k: 'text-secondary', i: 'bg-secondary-container text-on-secondary-container', v: 'text-secondary' },
    tertiary: { k: 'text-tertiary', i: 'bg-tertiary-fixed text-on-tertiary-fixed-variant', v: 'text-on-surface' },
    neutral: { k: 'text-on-surface-variant', i: 'bg-surface-container-high text-on-surface', v: 'text-on-surface' },
  }[tone];
  return (
    <div className="card p-space-md relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-space-sm">
        <span className={`kicker ${toneCls.k}`}>{kicker}</span>
        <span className={`p-1.5 rounded-lg flex items-center justify-center ${toneCls.i}`}>
          <Icon name={icon} size={18} />
        </span>
      </div>
      <div className="flex items-baseline gap-space-xs">
        <span className={`font-headline-md text-headline-md ${toneCls.v}`}>{value}</span>
        {unit && <span className="font-label-tag text-label-tag text-on-surface-variant font-medium">{unit}</span>}
      </div>
      {sub && <p className="caption mt-space-xs truncate">{sub}</p>}
      {foot && <div className="mt-space-sm">{foot}</div>}
    </div>
  );
}

/* ── Section heading ─────────────────────────────────────────────────── */
export function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-space-md mb-space-sm">
      <div>
        <h2 className="font-headline-sm text-headline-sm text-on-surface">{title}</h2>
        {sub && <p className="font-body-sm text-body-sm text-on-surface-variant">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ── Number field with explicit − / + steppers ───────────────────────── */
/**
 * Replaces native `type="number"` inputs (whose tiny spinner gets covered by
 * prefix/suffix overlays). Typing is free-form; the value is formatted with
 * thousands separators on blur. `prefix` (e.g. "₱") and `suffix` (e.g. "/ mo")
 * render inside the control without ever overlapping the buttons.
 */
export function NumberField({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  prefix,
  suffix,
  id,
  className = '',
  bold = false,
  placeholder,
  allowEmpty = false,
}: {
  value: number | '';
  onChange: (v: number | '') => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  id?: string;
  className?: string;
  bold?: boolean;
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  const [text, setText] = useState(value === '' ? '' : value.toLocaleString('en-PH'));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(value === '' ? '' : value.toLocaleString('en-PH'));
  }, [value, focused]);

  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min, n));
  const commit = (raw: string) => {
    const n = Number(raw.replace(/[^\d.-]/g, ''));
    if (raw.trim() === '' || Number.isNaN(n)) {
      if (allowEmpty) onChange('');
      else onChange(min);
      return;
    }
    onChange(clamp(n));
  };
  const nudge = (dir: 1 | -1) => {
    const base = value === '' ? min : value;
    const next = clamp(Math.round((base + dir * step) / step) * step);
    onChange(next);
  };
  const atMin = value !== '' && value <= min;
  const atMax = max !== undefined && value !== '' && value >= max;

  return (
    <div className={`field flex items-center gap-space-xs !px-2 ${className}`}>
      {prefix && <span className="pl-1 font-salary-metric text-salary-metric text-on-surface-variant select-none">{prefix}</span>}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        className={`min-w-0 flex-1 bg-transparent focus:outline-none text-on-surface ${bold ? 'font-headline-sm text-[16px] font-bold' : 'font-body-md text-body-md'}`}
        value={text}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit(text);
        }}
        onChange={(e) => {
          setText(e.target.value);
          commit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            nudge(1);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            nudge(-1);
          }
        }}
      />
      {suffix && <span className="caption whitespace-nowrap select-none">{suffix}</span>}
      <div className="flex items-center gap-0.5 shrink-0" aria-hidden="true">
        <button type="button" tabIndex={-1} disabled={atMin} onClick={() => nudge(-1)} className="w-7 h-7 rounded-md flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:opacity-30 disabled:hover:bg-transparent transition-colors" aria-label="Decrease">
          <Icon name="remove" size={16} />
        </button>
        <button type="button" tabIndex={-1} disabled={atMax} onClick={() => nudge(1)} className="w-7 h-7 rounded-md flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:opacity-30 disabled:hover:bg-transparent transition-colors" aria-label="Increase">
          <Icon name="add" size={16} />
        </button>
      </div>
    </div>
  );
}

/* ── Password field with show / hide ─────────────────────────────────── */
export function PasswordField({
  id,
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder,
  required = true,
  minLength,
  className = '',
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: 'current-password' | 'new-password';
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="field pr-12"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        tabIndex={-1}
      >
        <Icon name={show ? 'visibility_off' : 'visibility'} size={20} />
      </button>
    </div>
  );
}

/** Live checklist for the password policy (8+ chars, a letter, a number). */
export function PasswordHints({ value }: { value: string }) {
  const rules: Array<[string, boolean]> = [
    ['At least 8 characters', value.length >= 8],
    ['Contains a letter', /[A-Za-z]/.test(value)],
    ['Contains a number', /\d/.test(value)],
  ];
  return (
    <ul className="mt-1.5 flex flex-wrap gap-x-space-md gap-y-1" aria-live="polite">
      {rules.map(([label, ok]) => (
        <li key={label} className={`caption flex items-center gap-1 ${ok ? 'text-secondary' : 'text-outline'}`}>
          <Icon name={ok ? 'check_circle' : 'radio_button_unchecked'} size={14} /> {label}
        </li>
      ))}
    </ul>
  );
}

export const passwordOk = (v: string) => v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);
