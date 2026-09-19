import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon, Logo } from '../components/ui';
import { AccountPill, Footer } from './shared';

const NAV = [
  { to: '/seeker', label: 'Home', icon: 'explore', end: true },
  { to: '/seeker/browse', label: 'Browse', icon: 'search' },
  { to: '/seeker/applications', label: 'Applications', icon: 'task_alt' },
  { to: '/seeker/messages', label: 'Messages', icon: 'forum' },
  { to: '/seeker/profile', label: 'Profile', icon: 'account_circle' },
];

/** Job-seeker shell: fixed top bar with pill-tab navigation + thumb-friendly bottom dock on mobile. */
export function SeekerLayout() {
  const { pathname } = useLocation();
  const onboarding = pathname.startsWith('/seeker/onboarding');
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="fixed top-0 left-0 w-full z-50 bg-surface-container-lowest/85 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="h-16 max-w-[1280px] mx-auto px-margin-sm lg:px-margin-lg flex items-center justify-between gap-space-md">
          <Logo to="/seeker" />
          {!onboarding && (
            <nav className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-surface-container" aria-label="Seeker navigation">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-space-md h-9 rounded-full font-label-prominent text-label-prominent transition-all ${
                      isActive ? 'bg-surface-container-lowest text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon name={n.icon} size={18} fill={isActive} />
                      {n.label}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          )}
          <AccountPill role="seeker" />
        </div>
      </header>

      <main className="w-full pt-16 flex-1">
        <Outlet />
      </main>
      <Footer />

      {!onboarding && (
        <aside aria-label="Seeker mobile navigation" className="lg:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/30 z-40 px-margin-sm py-space-xs" style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}>
          <div className="max-w-md mx-auto flex items-center justify-around">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-1 min-w-[56px] ${isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
                {({ isActive }) => (
                  <>
                    <Icon name={n.icon} size={22} fill={isActive} />
                    <span className={`font-caption-micro text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{n.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
