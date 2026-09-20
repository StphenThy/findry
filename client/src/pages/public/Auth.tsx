import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon, Logo, PasswordField, PasswordHints, passwordOk } from '../../components/ui';
import { ApiError, api } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import { toast } from '../../lib/hooks';
import type { Role } from '../../lib/types';

const INDUSTRIES = ['Fintech & Neo-banking', 'Enterprise SaaS & Cloud', 'HR Tech / SaaS', 'E-commerce Logistics', 'HealthTech', 'BPO / Shared Services', 'Banking Software', 'Social / Media', 'Other'];

function Shell({ title, sub, children, role }: { title: string; sub: string; children: React.ReactNode; role?: Role }) {
  const accent = role === 'employer' ? 'from-secondary-container/50' : 'from-primary-fixed/60';
  return (
    <div className={`min-h-screen bg-gradient-to-b ${accent} via-surface to-surface flex flex-col`}>
      <div className="max-w-7xl mx-auto w-full px-margin-sm md:px-margin h-16 flex items-center">
        <Logo />
      </div>
      <div className="flex-1 flex items-start justify-center px-margin-sm py-space-lg">
        <div className="card w-full max-w-md p-space-lg md:p-space-xl shadow-md animate-fade-in">
          <h1 className="font-headline-md text-headline-md text-on-surface">{title}</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 mb-space-lg">{sub}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Signup (role-tailored) ────────────────────────────────────────────── */
export function Signup() {
  const { user, profiles, activeRole, signup } = useAuth();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const role = (sp.get('role') === 'employer' ? 'employer' : sp.get('role') === 'seeker' ? 'seeker' : null) as Role | null;
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '', industry: INDUSTRIES[0] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [exists, setExists] = useState<{ existingRoles: Role[]; hint: string } | null>(null);

  useEffect(() => setExists(null), [role]);
  if (user && activeRole) return <Navigate to={homeFor(user, profiles, activeRole)} replace />;

  if (!role) {
    return (
      <Shell title="Choose how you'll use Findry" sub="Each account is either a Job Seeker or an Employer — one email per role.">
        <div className="flex flex-col gap-space-sm">
          <button type="button" onClick={() => setSp({ role: 'seeker' })} className="text-left p-space-md rounded-xl bg-surface-container-low hover:bg-primary-fixed/50 transition-colors flex items-center gap-space-md">
            <span className="w-11 h-11 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
              <Icon name="explore" size={24} />
            </span>
            <span>
              <span className="font-title-card text-title-card text-on-surface block">I'm a Job Seeker</span>
              <span className="caption">Upload a resume, get matched, apply in one click.</span>
            </span>
          </button>
          <button type="button" onClick={() => setSp({ role: 'employer' })} className="text-left p-space-md rounded-xl bg-surface-container-low hover:bg-secondary-container/40 transition-colors flex items-center gap-space-md">
            <span className="w-11 h-11 rounded-lg bg-secondary-fixed text-secondary flex items-center justify-center">
              <Icon name="groups" size={24} />
            </span>
            <span>
              <span className="font-title-card text-title-card text-on-surface block">I'm an Employer</span>
              <span className="caption">Post jobs, get AI-ranked candidates, message shortlists.</span>
            </span>
          </button>
        </div>
        <p className="caption mt-space-md text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </Shell>
    );
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setExists(null);
    try {
      const r = await signup({ name: form.name, email: form.email, password: form.password, role, companyName: role === 'employer' ? form.companyName : undefined, industry: role === 'employer' ? form.industry : undefined });
      if (r.verificationRequired) navigate(`/verify-email?email=${encodeURIComponent(r.email)}&role=${role}`, { state: { devCode: r.devCode } });
      else navigate(`/${role}/onboarding`);
    } catch (e2) {
      if (e2 instanceof ApiError && e2.code === 'ACCOUNT_EXISTS') setExists({ existingRoles: (e2.payload.existingRoles as Role[]) ?? [], hint: e2.payload.hint as string });
      else setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const isEmployer = role === 'employer';
  return (
    <Shell role={role} title={isEmployer ? 'Create your employer account' : 'Create your seeker account'} sub={isEmployer ? 'Set up your company, then post your first job with AI-suggested skills.' : 'Next step: upload your resume and let the AI extract your skills.'}>
      <div className="flex items-center gap-2 mb-space-md">
        <span className={`pill ${isEmployer ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-primary-fixed text-on-primary-fixed'} uppercase font-semibold`}>{isEmployer ? 'Employer' : 'Job Seeker'}</span>
        <button type="button" onClick={() => setSp({ role: isEmployer ? 'seeker' : 'employer' })} className="caption text-primary hover:underline">
          Not you? Switch role
        </button>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-space-md">
        <div>
          <label className="label" htmlFor="name">
            {isEmployer ? 'Your name (hiring contact)' : 'Full name'}
          </label>
          <input id="name" required minLength={2} className="field" value={form.name} onChange={set('name')} autoComplete="name" />
        </div>
        {isEmployer && (
          <>
            <div>
              <label className="label" htmlFor="company">
                Company name
              </label>
              <input id="company" required className="field" value={form.companyName} onChange={set('companyName')} autoComplete="organization" />
            </div>
            <div>
              <label className="label" htmlFor="industry">
                Industry
              </label>
              <select id="industry" className="field appearance-none" value={form.industry} onChange={set('industry')}>
                {INDUSTRIES.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <div>
          <label className="label" htmlFor="email">
            Work email
          </label>
          <input id="email" type="email" required className="field" value={form.email} onChange={set('email')} autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <PasswordField id="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="new-password" minLength={8} />
          <PasswordHints value={form.password} />
        </div>

        {exists && (
          <div className="rounded-lg bg-primary-fixed/50 p-space-md flex flex-col gap-space-sm" role="alert">
            <div className="flex items-start gap-space-sm">
              <Icon name="info" size={22} className="text-primary" />
              <div>
                <p className="font-label-prominent text-label-prominent text-on-surface">This email is already registered as {exists.existingRoles[0] === 'employer' ? 'an Employer' : 'a Job Seeker'}.</p>
                <p className="caption mt-0.5">{exists.hint}</p>
              </div>
            </div>
            {exists.existingRoles.includes(role) ? (
              <Link to={`/login?email=${encodeURIComponent(form.email)}&role=${role}`} className="btn-primary h-10">
                Sign in as {isEmployer ? 'Employer' : 'Job Seeker'}
              </Link>
            ) : (
              <button type="button" onClick={() => setForm({ ...form, email: '' })} className="btn-primary h-10">
                Use a different email
              </button>
            )}
          </div>
        )}
        {err && (
          <p className="caption text-error flex items-center gap-1" role="alert">
            <Icon name="error" size={14} /> {err}
          </p>
        )}
        <button type="submit" disabled={busy || !passwordOk(form.password)} className={`${isEmployer ? 'btn-secondary' : 'btn-primary'} h-11 w-full`}>
          {busy ? 'Creating…' : isEmployer ? 'Create employer account' : 'Create account & upload resume'}
        </button>
      </form>
      <p className="caption mt-space-md text-center">
        Already have an account?{' '}
        <Link to={`/login?role=${role}`} className="text-primary font-semibold hover:underline">
          Sign in
        </Link>
      </p>
      <p className="caption mt-space-sm text-center text-outline flex items-center justify-center gap-1">
        <Icon name="verified_user" size={14} className="text-secondary" /> Data Privacy Act (RA 10173) compliant — your resume is never sold.
      </p>
    </Shell>
  );
}

/* ── Verify email (6-digit code sent at signup) ────────────────────────── */
export function VerifyEmail() {
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const email = sp.get('email') ?? '';
  const role: Role = sp.get('role') === 'employer' ? 'employer' : 'seeker';
  const state = (useLocation().state ?? {}) as { devCode?: string };
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>(state.devCode);
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await verifyEmail(email, code, role);
      toast.success('Email verified — welcome to Findry');
      navigate(`/${role}/onboarding`);
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setErr(null);
    setResent(false);
    try {
      const r = await api.post<{ ok: true; devCode?: string }>('/auth/resend-code', { email });
      setDevCode(r.devCode);
      setCode('');
      setResent(true);
    } catch (e2) {
      setErr((e2 as Error).message);
    }
  };

  if (!email) return <Navigate to="/signup" replace />;

  return (
    <Shell role={role} title="Check your email" sub={`We sent a 6-digit code to ${email}. Enter it below to activate your account.`}>
      <form onSubmit={submit} className="flex flex-col gap-space-md">
        <div>
          <label className="label" htmlFor="code">
            Verification code
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            className="field text-center text-[24px] tracking-[0.5em] font-semibold"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••••"
          />
          <p className="caption mt-1">The code expires in 15 minutes. Check your spam folder if it hasn't arrived.</p>
        </div>
        {devCode && (
          <div className="rounded-lg bg-surface-container p-space-md">
            <p className="kicker text-on-surface-variant mb-1">Development mode — email isn't configured, so here's the code:</p>
            <button type="button" onClick={() => setCode(devCode)} className="font-headline-sm text-headline-sm text-primary tracking-[0.3em]">
              {devCode}
            </button>
          </div>
        )}
        {resent && (
          <p className="caption text-secondary flex items-center gap-1" role="status">
            <Icon name="mark_email_read" size={14} /> A new code is on its way.
          </p>
        )}
        {err && (
          <p className="caption text-error flex items-center gap-1" role="alert">
            <Icon name="error" size={14} /> {err}
          </p>
        )}
        <button type="submit" disabled={busy || code.length !== 6} className={`${role === 'employer' ? 'btn-secondary' : 'btn-primary'} h-11 w-full`}>
          {busy ? 'Verifying…' : 'Verify & continue'}
        </button>
      </form>
      <div className="caption mt-space-md text-center flex flex-col gap-1">
        <span>
          Didn't get it?{' '}
          <button type="button" onClick={resend} className="text-primary font-semibold hover:underline">
            Resend code
          </button>
        </span>
        <span>
          Wrong address?{' '}
          <Link to={`/signup?role=${role}`} className="text-primary font-semibold hover:underline">
            Sign up again
          </Link>
        </span>
      </div>
    </Shell>
  );
}

/* ── Forgot password ───────────────────────────────────────────────────── */
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await api.post<{ ok: true; devResetUrl?: string }>('/auth/forgot-password', { email });
      setSent(true);
      setDevUrl(r.devResetUrl ?? null);
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Reset your password" sub="Enter the email you signed up with and we'll send you a link to choose a new password.">
      {sent ? (
        <div className="flex flex-col gap-space-md" role="status">
          <div className="rounded-lg bg-secondary-container/40 p-space-md flex items-start gap-space-sm">
            <Icon name="mark_email_read" size={22} className="text-secondary" />
            <div>
              <p className="font-label-prominent text-label-prominent text-on-surface">Check your inbox</p>
              <p className="caption mt-0.5">If an account exists for {email}, a reset link is on its way. It's valid for one hour.</p>
            </div>
          </div>
          {devUrl && (
            <div className="rounded-lg bg-surface-container p-space-md">
              <p className="kicker text-on-surface-variant mb-1">Development mode — email isn't configured, so here's the link:</p>
              <Link to={devUrl.replace(/^https?:\/\/[^/]+/, '')} className="btn-primary h-10 w-full mt-space-xs">
                Open reset link
              </Link>
            </div>
          )}
          <Link to="/login" className="btn-ghost h-10 w-full">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-space-md">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" type="email" required autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {err && (
            <p className="caption text-error flex items-center gap-1" role="alert">
              <Icon name="error" size={14} /> {err}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-primary h-11 w-full">
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
          <Link to="/login" className="caption text-center text-primary font-semibold hover:underline">
            Back to sign in
          </Link>
        </form>
      )}
    </Shell>
  );
}

/* ── Reset password (from the emailed link) ────────────────────────────── */
export function ResetPassword() {
  const [sp] = useSearchParams();
  const token = sp.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api.post<{ ok: true; role?: Role }>('/auth/reset-password', { token, password });
      toast.success('Password updated — sign in with your new password');
      navigate(r.role ? `/login?role=${r.role}` : '/login');
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <Shell title="Reset link missing" sub="This page needs the link from your reset email.">
        <Link to="/forgot-password" className="btn-primary h-11 w-full">
          Request a new link
        </Link>
      </Shell>
    );
  }

  return (
    <Shell title="Choose a new password" sub="You'll be signed out everywhere else once it's changed.">
      <form onSubmit={submit} className="flex flex-col gap-space-md">
        <div>
          <label className="label" htmlFor="new-password">
            New password
          </label>
          <PasswordField id="new-password" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} />
          <PasswordHints value={password} />
        </div>
        <div>
          <label className="label" htmlFor="confirm-password">
            Confirm new password
          </label>
          <PasswordField id="confirm-password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          {mismatch && <p className="caption text-error mt-1">Passwords don't match.</p>}
        </div>
        {err && (
          <p className="caption text-error flex items-center gap-1" role="alert">
            <Icon name="error" size={14} /> {err}
          </p>
        )}
        <button type="submit" disabled={busy || !passwordOk(password) || password !== confirm} className="btn-primary h-11 w-full">
          {busy ? 'Saving…' : 'Set new password'}
        </button>
      </form>
    </Shell>
  );
}
