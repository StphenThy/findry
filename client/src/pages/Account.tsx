import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Icon, PasswordField, PasswordHints, passwordOk } from '../components/ui';
import { useAuth } from '../lib/auth';
import { toast } from '../lib/hooks';
import type { Role } from '../lib/types';

/**
 * Account settings — the login itself (name, email, password), shared by both
 * portals. Role-specific details (resume, company) live on the profile pages.
 */
export function AccountSettings({ role }: { role: Role }) {
  const { user } = useAuth();
  if (!user) return null;
  const profileHref = `/${role}/profile`;
  return (
    <div className="max-w-[880px] mx-auto w-full px-margin-sm lg:px-margin-lg py-space-lg flex flex-col gap-space-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface tracking-tight">Account settings</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Your sign-in details. Looking for your {role === 'seeker' ? 'resume and skills' : 'company details'}?{' '}
          <Link to={profileHref} className="text-primary font-semibold hover:underline">
            Edit your {role === 'seeker' ? 'profile' : 'company profile'}
          </Link>
          .
        </p>
      </div>

      <div className="card p-space-lg flex items-center gap-space-md">
        <Avatar name={user.name} url={user.avatarUrl} size={56} />
        <div className="min-w-0">
          <p className="font-title-card text-title-card text-on-surface truncate">{user.name}</p>
          <p className="caption truncate">{user.email}</p>
          <span className={`pill mt-1 ${role === 'seeker' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-secondary-fixed text-on-secondary-fixed'}`}>{role === 'seeker' ? 'Job Seeker account' : 'Employer account'}</span>
        </div>
      </div>

      <DetailsForm />
      <PasswordForm />

      <div className="rounded-xl bg-surface-container-low p-space-md flex items-start gap-space-sm">
        <Icon name="shield" size={20} className="text-secondary" />
        <p className="caption">
          Changing your password signs you out on every other device. Accounts lock for 15 minutes after 5 wrong password attempts. Your data is handled under the Data Privacy Act (RA 10173) and never sold.
        </p>
      </div>
    </div>
  );
}

function DetailsForm() {
  const { user, updateAccount } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty = name.trim() !== user?.name || email.trim().toLowerCase() !== user?.email;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await updateAccount({ name: name.trim(), email: email.trim() });
      toast.success('Account details saved');
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-space-lg flex flex-col gap-space-md">
      <div>
        <h2 className="font-headline-sm text-headline-sm text-on-surface">Details</h2>
        <p className="caption">The name shown on your account and the email you sign in with.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        <div>
          <label className="label" htmlFor="acct-name">
            Full name
          </label>
          <input id="acct-name" required minLength={2} maxLength={80} className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="acct-email">
            Email
          </label>
          <input id="acct-email" type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
      </div>
      {err && (
        <p className="caption text-error flex items-center gap-1" role="alert">
          <Icon name="error" size={14} /> {err}
        </p>
      )}
      <div className="flex justify-end">
        <button type="submit" disabled={busy || !dirty} className="btn-primary h-10 px-space-lg">
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mismatch = confirm.length > 0 && confirm !== next;
  const ready = current.length > 0 && passwordOk(next) && next === confirm;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setErr(null);
    try {
      await changePassword(current, next);
      toast.success('Password changed — other devices have been signed out');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-space-lg flex flex-col gap-space-md">
      <div>
        <h2 className="font-headline-sm text-headline-sm text-on-surface">Password</h2>
        <p className="caption">Use at least 8 characters with a letter and a number.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        <div className="md:col-span-2">
          <label className="label" htmlFor="pw-current">
            Current password
          </label>
          <PasswordField id="pw-current" value={current} onChange={setCurrent} autoComplete="current-password" className="md:max-w-[calc(50%-0.5rem)]" />
        </div>
        <div>
          <label className="label" htmlFor="pw-new">
            New password
          </label>
          <PasswordField id="pw-new" value={next} onChange={setNext} autoComplete="new-password" minLength={8} />
          <PasswordHints value={next} />
        </div>
        <div>
          <label className="label" htmlFor="pw-confirm">
            Confirm new password
          </label>
          <PasswordField id="pw-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          {mismatch && <p className="caption text-error mt-1">Passwords don't match.</p>}
        </div>
      </div>
      {err && (
        <p className="caption text-error flex items-center gap-1" role="alert">
          <Icon name="error" size={14} /> {err}
        </p>
      )}
      <div className="flex justify-end">
        <button type="submit" disabled={busy || !ready} className="btn-primary h-10 px-space-lg">
          {busy ? 'Updating…' : 'Change password'}
        </button>
      </div>
    </form>
  );
}
