import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon, Logo, Monogram } from '../components/ui';
import { useAuth } from '../lib/auth';
import { AccountPill } from './shared';

const NAV = [
  { to: '/employer', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/employer/jobs', label: 'Job Posts', icon: 'work_outline' },
  { to: '/employer/candidates', label: 'Candidates', icon: 'group' },
  { to: '/employer/messages', label: 'Messages', icon: 'mail' },
  { to: '/employer/analytics', label: 'Analytics', icon: 'equalizer' },
];

/** Employer shell: fixed sidebar (green accent) on desktop, bottom dock on mobile. */
export function EmployerLayout() {
  const { profiles } = useAuth();
  const { pathname } = useLocation();
  const onboarding = pathname.startsWith('/employer/onboarding');
  const company = profiles?.companyName || '';
  return (
    <div className="min-h-screen bg-surface">
      {!onboarding && (
        <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-surface-container-lowest border-r border-outline-variant/30 z-50 flex-col" aria-label="Employer navigation">
          <div className="h-16 px-space-md flex items-center">
            <Logo to="/employer" />
          </div>
          <Link to="/employer/profile" className="mx-space-sm mb-space-sm p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex items-center gap-space-sm">
            <Monogram text={(company || 'EP').slice(0, 2).toUpperCase()} tone="text-secondary" size={36} />
            <div className="min-w-0">
              <p className="font-label-prominent text-label-prominent text-on-surface truncate">{company || 'Your company'}</p>
              <p className="caption">Employer workspace</p>
            </div>
          </Link>
          <nav className="flex-1 px-space-sm flex flex-col gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex items-center gap-space-sm px-space-sm h-10 rounded-lg transition-colors font-body-md text-body-md ${
                    isActive ? 'bg-secondary-container/60 text-on-secondary-fixed font-semibold' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={n.icon} size={20} fill={isActive} />
                    <span>{n.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="p-space-sm border-t border-outline-variant/30">
            <Link to="/employer/jobs/new" className="btn-secondary h-10 w-full">
              <Icon name="add" size={18} /> Post a job
            </Link>
          </div>
        </aside>
      )}

      <div className={onboarding ? '' : 'lg:pl-64'}>
        <header className={`fixed top-0 ${onboarding ? 'left-0' : 'left-0 lg:left-64'} right-0 h-16 bg-surface-container-lowest/85 backdrop-blur-xl border-b border-outline-variant/30 z-40 flex items-center justify-between px-margin-sm lg:px-space-lg`}>
          <div className={onboarding ? '' : 'lg:hidden'}>
            <Logo to="/employer" />
          </div>
          <div className="ml-auto">
            <AccountPill role="employer" />
          </div>
        </header>

        <main className="w-full pt-16 min-h-screen pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {!onboarding && (
        <aside aria-label="Employer mobile navigation" className="lg:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/30 z-40 px-margin-sm py-space-xs" style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}>
          <div className="max-w-md mx-auto flex items-center justify-around">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-1 min-w-[56px] ${isActive ? 'text-secondary' : 'text-on-surface-variant hover:text-on-surface'}`}>
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
