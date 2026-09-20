import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useDisplayPrefs } from '../lib/hooks';
import type { Role } from '../lib/types';
import { Avatar, Icon, Toggle } from '../components/ui';

/**
 * "Signed in as Job Seeker • Name" pill + avatar menu. An account is
 * registered under exactly one role, so there is no portal switching here.
 */
export function AccountPill({ role }: { role: Role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-space-md">
      <div className="hidden md:flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-surface-container text-on-surface-variant">
        <span className={`w-2 h-2 rounded-full ${role === 'seeker' ? 'bg-primary' : 'bg-secondary'}`} />
        <span className="caption font-medium">
          Signed in as {role === 'seeker' ? 'Job Seeker' : 'Employer'} • {user?.name}
        </span>
      </div>
      <AvatarMenu role={role} onLogout={() => { logout(); navigate('/'); }} />
    </div>
  );
}

function AvatarMenu({ role, onLogout }: { role: Role; onLogout: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const prefs = useDisplayPrefs();
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40" aria-haspopup="menu" aria-expanded={open} aria-label="Account menu">
        <Avatar name={user?.name ?? ''} url={user?.avatarUrl} size={32} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-72 card shadow-xl p-space-sm z-50 animate-fade-in">
          <div className="px-space-sm py-space-xs">
            <p className="font-label-prominent text-label-prominent text-on-surface truncate">{user?.name}</p>
            <p className="caption truncate">{user?.email}</p>
            <div className="flex gap-1 mt-1">
              {user?.roles.map((r) => (
                <span key={r} className={`pill ${r === role ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                  {r}
                </span>
              ))}
            </div>
          </div>
          <div className="my-space-xs h-px bg-surface-container-high" />
          <Link to={`/${role}/profile`} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg hover:bg-surface-container font-body-sm text-body-sm text-on-surface">
            <Icon name={role === 'seeker' ? 'account_circle' : 'domain'} size={18} /> {role === 'seeker' ? 'My profile' : 'Company profile'}
          </Link>
          <Link to={`/${role}/account`} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg hover:bg-surface-container font-body-sm text-body-sm text-on-surface">
            <Icon name="manage_accounts" size={18} /> Account settings
          </Link>
          <div className="my-space-xs h-px bg-surface-container-high" />
          <p className="kicker text-on-surface-variant px-space-sm pt-1">Display</p>
          <div className="flex items-center justify-between px-space-sm py-space-xs">
            <span className="font-body-sm text-body-sm text-on-surface flex items-center gap-space-xs">
              <Icon name="contrast" size={18} /> High contrast
            </span>
            <Toggle on={prefs.highContrast} onChange={prefs.setHighContrast} label="High contrast mode" tone="bg-primary" />
          </div>
          <div className="flex items-center justify-between px-space-sm py-space-xs">
            <span className="font-body-sm text-body-sm text-on-surface flex items-center gap-space-xs">
              <Icon name="format_size" size={18} /> Larger text
            </span>
            <Toggle on={prefs.largeText} onChange={prefs.setLargeText} label="Larger text" tone="bg-primary" />
          </div>
          <div className="my-space-xs h-px bg-surface-container-high" />
          <button type="button" role="menuitem" onClick={onLogout} className="w-full flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg hover:bg-error-container/30 font-body-sm text-body-sm text-error text-left">
            <Icon name="logout" size={18} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="w-full bg-surface-container-low mt-margin-lg pb-20 lg:pb-0">
      <div className="max-w-[1280px] mx-auto px-margin-sm lg:px-margin-lg py-margin flex flex-col md:flex-row items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-sm">
          <span className="font-headline-sm text-headline-sm text-primary font-bold">Findry</span>
          <span className="caption">© {new Date().getFullYear()} Findry. Built for the Philippine tech job market.</span>
        </div>
        <div className="flex items-center gap-space-md text-on-surface-variant">
          <Link className="font-body-sm text-body-sm hover:text-on-surface transition-colors" to="/privacy">
            Privacy Policy (RA 10173)
          </Link>
          <Link className="font-body-sm text-body-sm hover:text-on-surface transition-colors" to="/terms">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
