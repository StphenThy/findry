import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { animate, createTimeline, stagger, svg, utils } from 'animejs';
import { FindryMark, FindryWordmark, Icon, Logo, PasswordField } from '../../components/ui';
import { TB, TB_LEFT, useAnime } from '../../lib/anime';
import { ApiError } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import type { Role } from '../../lib/types';

const ROLES: Array<{ id: Role; label: string; icon: string; blurb: string }> = [
  { id: 'seeker', label: 'Job Seeker', icon: 'explore', blurb: 'Find roles matched to your resume.' },
  { id: 'employer', label: 'Employer', icon: 'groups', blurb: 'Hire from an AI-ranked shortlist.' },
];

const COPY: Record<Role, { title: string; sub: string; aside: string }> = {
  seeker: { title: 'Sign in as a Job Seeker', sub: 'Pick up your matches, applications and messages where you left off.', aside: 'Your resume, matched against every verified Philippine job — with the reasons shown.' },
  employer: { title: 'Sign in as an Employer', sub: 'Back to your jobs, ranked candidates and conversations.', aside: 'Every applicant scored against your stack, with matched and missing skills side by side.' },
};

/**
 * Login with an explicit role choice. The role is carried in the URL
 * (`?role=seeker|employer`) so landing-page CTAs can pre-select it and the
 * page survives a refresh. One email = one account = one role: the server
 * refuses to sign a Job Seeker account into the Employer portal (and vice
 * versa), so a wrong choice just shows that message — no profile is added.
 */
export function Login() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const roleParam = sp.get('role');
  const role: Role | null = roleParam === 'seeker' || roleParam === 'employer' ? roleParam : null;
  const [email, setEmail] = useState(sp.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Role-dependent animation: swap the scene, pop the check on the chosen card.
  const page = useAnime<HTMLDivElement>((root) => {
    const active = role ?? 'chooser';
    root.querySelectorAll<HTMLElement>('[data-scene]').forEach((el) => {
      const on = el.dataset.scene === active;
      utils.set(el, { opacity: on ? 1 : 0, pointerEvents: on ? 'auto' : 'none' });
    });
    if (role) {
      utils.set('.rp-check', { scale: 0, opacity: 0 });
      animate(`.rp-check[data-role="${role}"]`, { scale: 1, opacity: 1, duration: 450, ease: 'outBack(2.5)' });
      animate('.lg-copy', { opacity: [0, 1], translateY: [10, 0], duration: 450, ease: 'outCubic' });
    }
    if (active === 'seeker') seekerScene();
    else if (active === 'employer') employerScene();
    else chooserScene();
  }, [role]);

  const pick = (r: Role) => {
    const next = new URLSearchParams(sp);
    next.set('role', r);
    setSp(next, { replace: true });
    setErr(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!role) {
      setErr('Choose Job Seeker or Employer first.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await login(email, password, role);
      navigate(homeFor(r.user, r.profiles, role));
    } catch (e2) {
      if (e2 instanceof ApiError && e2.code === 'EMAIL_UNVERIFIED') {
        const p = e2.payload as { email?: string; role?: Role; devCode?: string };
        navigate(`/verify-email?email=${encodeURIComponent(p.email ?? email)}&role=${p.role ?? role}`, { state: { devCode: p.devCode } });
        return;
      }
      // Includes the server's ROLE_MISMATCH message ("registered as a Job Seeker account…").
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = role ? COPY[role] : null;
  const accent = role === 'employer' ? 'secondary' : 'primary';

  return (
    <div ref={page} className="min-h-screen grid lg:grid-cols-2 bg-surface">
      {/* ── Left: brand + animated scene ─────────────────────────────── */}
      <LoginAside role={role} aside={copy?.aside} />

      {/* ── Right: role picker + form ────────────────────────────────── */}
      <main className="flex flex-col">
        <div className="px-margin-sm md:px-margin lg:px-margin-lg h-16 lg:h-20 flex items-center justify-between">
          <div className="lg:hidden">
            <Logo />
          </div>
          <Link to="/" className="btn-outline h-10 px-space-md lg:ml-auto">
            <Icon name="arrow_back" size={18} /> Back to home
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center px-margin-sm md:px-margin lg:px-margin-lg pb-space-xl">
          <div className="w-full max-w-xl">
            <div className="lg-copy">
              <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg xl:text-[40px] xl:leading-[48px] text-on-surface tracking-tight">
                {copy ? copy.title : 'Welcome back'}
              </h1>
              <p className="font-body-sm text-body-sm md:text-body-md text-on-surface-variant mt-1">
                {copy ? copy.sub : 'First, tell us how you use Findry.'}
              </p>
            </div>

            {/* role picker */}
            <div className="grid grid-cols-2 gap-space-sm mt-space-lg" role="radiogroup" aria-label="I am a">
              {ROLES.map((r) => {
                const on = role === r.id;
                const p = r.id === 'seeker';
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => pick(r.id)}
                    className={`relative text-left p-space-md rounded-xl transition-all duration-200 flex flex-col gap-space-sm shadow-sm disabled:opacity-40 ${
                      on ? (p ? 'bg-primary-fixed ring-2 ring-primary' : 'bg-secondary-fixed ring-2 ring-secondary') : 'bg-surface-container-lowest hover:bg-surface-container-low hover:shadow-md'
                    }`}
                  >
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${p ? 'bg-primary text-on-primary' : 'bg-secondary text-on-secondary'} ${on ? '' : 'opacity-80'}`}>
                      <Icon name={r.icon} size={22} />
                    </span>
                    <span>
                      <span className="font-title-card text-title-card text-on-surface block">{r.label}</span>
                      <span className="caption block mt-0.5">{r.blurb}</span>
                    </span>
                    <span className={`rp-check absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center ${p ? 'bg-primary text-on-primary' : 'bg-secondary text-on-secondary'} ${on ? '' : 'opacity-0'}`} data-role={r.id} aria-hidden="true">
                      <Icon name="check" size={16} />
                    </span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={submit} className="flex flex-col gap-space-md mt-space-lg">
              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input id="email" type="email" required autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label !mb-0" htmlFor="password">
                    Password
                  </label>
                  <Link to="/forgot-password" className="caption text-primary font-semibold hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <PasswordField id="password" value={password} onChange={setPassword} autoComplete="current-password" />
              </div>
              {err && (
                <p className="caption text-error flex items-center gap-1" role="alert">
                  <Icon name="error" size={14} /> {err}
                </p>
              )}
              <button type="submit" disabled={busy || !role} className={`${accent === 'secondary' ? 'btn-secondary' : 'btn-primary'} h-11 w-full`}>
                {busy ? 'Signing in…' : role ? `Sign in as ${role === 'seeker' ? 'Job Seeker' : 'Employer'}` : 'Choose a role to continue'}
                {!busy && role && <Icon name="arrow_forward" size={18} />}
              </button>
            </form>

            {user && (
              <p className="caption mt-space-md text-center flex items-center justify-center gap-1">
                <Icon name="info" size={14} /> Currently signed in as {user.email}.{' '}
                <button type="button" onClick={logout} className="text-primary font-semibold hover:underline">
                  Sign out
                </button>
              </p>
            )}
            <p className="caption mt-space-md text-center">
              New to Findry?{' '}
              <Link to={role ? `/signup?role=${role}` : '/signup'} className="text-primary font-semibold hover:underline">
                Create {role === 'employer' ? 'an employer' : role === 'seeker' ? 'a seeker' : 'an'} account
              </Link>
            </p>

            <p className="caption mt-space-lg text-center text-outline flex items-center justify-center gap-1">
              <Icon name="verified_user" size={14} className="text-secondary" /> Data Privacy Act (RA 10173) compliant — your data is never sold.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Left panel ──────────────────────────────────────────────────────── */

function LoginAside({ role, aside }: { role: Role | null; aside?: string }) {
  // Runs once: draw the logo lockup in.
  const ref = useAnime<HTMLElement>(() => {
    utils.set('.fm-f', { opacity: 0, translateX: -14, translateY: 10 });
    utils.set('.fm-bubble', { opacity: 0, scale: 0 });
    utils.set('.la-wordmark, .la-tagline', { opacity: 0, translateX: -8 });
    const signal = svg.createDrawable('.fm-signal-line', 0, 0);
    createTimeline({ defaults: { ease: 'outCubic' } })
      .add('.fm-f', { opacity: 1, translateX: 0, translateY: 0, duration: 700, ease: 'outExpo' })
      .add('.fm-bubble', { opacity: 1, scale: 1, duration: 600, ease: 'outBack(2)' }, '-=350')
      .add(signal, { draw: '0 1', duration: 350, delay: stagger(90), ease: 'outSine' }, '-=250')
      .add('.la-wordmark', { opacity: 1, translateX: 0, duration: 500 }, '-=500')
      .add('.la-tagline', { opacity: 1, translateX: 0, duration: 400 }, '-=300');
  });

  const bg = role === 'employer' ? 'from-secondary-container/50 via-surface-container-low to-surface' : role === 'seeker' ? 'from-primary-fixed via-surface-container-low to-surface' : 'from-surface-container-high via-surface-container-low to-surface';

  return (
    <aside ref={ref} className={`hidden lg:flex flex-col relative overflow-hidden bg-gradient-to-br ${bg} transition-colors duration-500 px-margin-lg xl:px-16 py-space-lg`}>
      <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-16 w-[380px] h-[380px] rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
      <Link to="/" className="relative flex items-center gap-space-sm w-fit" aria-label="Findry home">
        <FindryMark size={56} uid="login" />
        <span>
          <FindryWordmark className="la-wordmark inline-block text-[30px] leading-none" />
          <span className="la-tagline kicker text-on-surface-variant block mt-1">AI Job Matching Platform</span>
        </span>
      </Link>

      <div className="relative flex-1 flex flex-col justify-center py-space-lg">
        <div className="relative w-full max-w-[760px] mx-auto aspect-[52/40]">
          <div data-scene="chooser" className="absolute inset-0">
            <ChooserScene />
          </div>
          <div data-scene="seeker" className="absolute inset-0">
            <SeekerScene />
          </div>
          <div data-scene="employer" className="absolute inset-0">
            <EmployerScene />
          </div>
        </div>
      </div>

      <div className="relative">
        <p className="lg-copy font-body-md text-body-md md:text-body-lg text-on-surface-variant max-w-lg">{aside ?? 'Job seeker and employer accounts are separate — pick the side you are signing in to.'}</p>
        <ul className="mt-space-md grid grid-cols-1 xl:grid-cols-3 gap-space-sm max-w-2xl">
          {[
            ['psychology', 'Explainable match score', 'Skills 45 · experience 30 · education 25 — the breakdown is always one tap away.'],
            ['payments', 'Salaries in ₱, up front', 'Every post shows its monthly range and benefits before you apply.'],
            ['verified_user', 'Verified PH employers', 'Companies are checked before their posts go live.'],
          ].map(([icon, title, body]) => (
            <li key={title} className="rounded-xl bg-surface-container-lowest/70 border border-outline-variant/30 p-space-sm flex gap-space-sm">
              <span className="w-9 h-9 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                <Icon name={icon} size={20} />
              </span>
              <span>
                <span className="font-label-prominent text-label-prominent text-on-surface block">{title}</span>
                <span className="caption block mt-0.5">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

/* ── Scenes (viewBox 0 0 520 400) ─────────────────────────────────────── */

/** No role picked yet: both portals, with a pulsing "?" token between them. */
function ChooserScene() {
  return (
    <svg viewBox="0 0 520 400" className="w-full h-full" role="img" aria-label="Seeker and employer portals">
      <path id="ch-rail" className="ch-rail" d="M175 200 C 215 120 305 280 345 200" fill="none" stroke="#c4c5d7" strokeWidth="2.5" strokeDasharray="5 5" />
      <g className="ch-panel" style={TB}>
        <rect x="30" y="120" width="145" height="160" rx="18" fill="#fff" stroke="#dce1ff" strokeWidth="3" />
        <circle cx="102" cy="180" r="22" fill="#0037b0" />
        <path d="M64 240 a38 26 0 0 1 76 0" fill="#0037b0" />
        <rect x="62" y="252" width="80" height="9" rx="4.5" fill="#dce1ff" />
        <text x="102" y="105" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="12" fill="#0037b0" letterSpacing="1.5">
          JOB SEEKER
        </text>
      </g>
      <g className="ch-panel" style={TB}>
        <rect x="345" y="120" width="145" height="160" rx="18" fill="#fff" stroke="#85f8c4" strokeWidth="3" />
        <rect x="382" y="160" width="72" height="72" rx="8" fill="#006c4a" />
        {[0, 1, 2].map((r) => [0, 1].map((c) => <rect key={`${r}${c}`} x={394 + c * 30} y={172 + r * 18} width="16" height="10" rx="2" fill="#85f8c4" />))}
        <rect x="378" y="252" width="80" height="9" rx="4.5" fill="#85f8c4" />
        <text x="417" y="105" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="12" fill="#006c4a" letterSpacing="1.5">
          EMPLOYER
        </text>
      </g>
      <g className="ch-token" style={TB}>
        <circle className="ch-pulse" cx="260" cy="200" r="34" fill="none" stroke="#131b2e" strokeWidth="2" style={TB} />
        <circle cx="260" cy="200" r="34" fill="#131b2e" />
        <text x="260" y="212" textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="32" fill="#82f5c1">
          ?
        </text>
      </g>
      <text className="ch-hint" x="260" y="330" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="13" fill="#434655">
        Which side are you signing in to?
      </text>
    </svg>
  );
}

function chooserScene() {
  utils.set('.ch-panel', { opacity: 0, scale: 0.85 });
  utils.set('.ch-token', { opacity: 0, scale: 0 });
  utils.set('.ch-hint', { opacity: 0 });
  const rail = svg.createDrawable('.ch-rail', 0, 0);
  createTimeline()
    .add('.ch-panel', { opacity: 1, scale: 1, duration: 600, delay: stagger(150), ease: 'outBack(1.4)' })
    .add(rail, { draw: '0 1', duration: 700, ease: 'inOutSine' }, '-=250')
    .add('.ch-token', { opacity: 1, scale: 1, duration: 500, ease: 'outBack(2)' }, '-=400')
    .add('.ch-hint', { opacity: 1, duration: 400 }, '-=200');
  animate('.ch-pulse', { scale: [1, 1.7], opacity: [0.5, 0], duration: 1800, loop: true, ease: 'outSine', delay: 1200 });
  animate('.ch-token', { translateY: [0, -6, 0], duration: 2600, loop: true, ease: 'inOutSine', delay: 1200 });
}

/**
 * Seeker: an abstract resume whose lines light up, feeding an AI ring that
 * routes to three job cards. No names, no numbers — just the mechanism.
 */
function SeekerScene() {
  const jobs = [120, 200, 280];
  return (
    <svg viewBox="0 0 520 400" className="w-full h-full" role="img" aria-label="A resume analysed and routed to matching jobs">
      <defs>
        <linearGradient id="sk-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#0037b0" />
          <stop offset="1" stopColor="#006c4a" />
        </linearGradient>
      </defs>
      {/* resume */}
      <g className="sk-doc-g" style={TB}>
        <rect className="sk-doc" x="40" y="110" width="120" height="180" rx="12" fill="#fff" stroke="#0037b0" strokeWidth="2.5" />
        <circle cx="68" cy="142" r="13" fill="#dce1ff" />
        <circle cx="68" cy="138" r="5" fill="#0037b0" />
        <path d="M58 151 a10 7 0 0 1 20 0" fill="#0037b0" />
        <line className="sk-line" x1="90" y1="136" x2="142" y2="136" stroke="#131b2e" strokeWidth="5" strokeLinecap="round" />
        <line className="sk-line" x1="90" y1="149" x2="126" y2="149" stroke="#747686" strokeWidth="3" strokeLinecap="round" />
        {[178, 194, 210, 226, 250, 266].map((y, i) => (
          <line key={y} className={`sk-line ${i % 2 === 0 ? 'sk-hot' : ''}`} x1="58" y1={y} x2={i % 3 === 1 ? 130 : 142} y2={y} stroke="#c4c5d7" strokeWidth="3" strokeLinecap="round" />
        ))}
      </g>

      {/* resume → ring */}
      <path id="sk-in" className="sk-link" d="M160 200 C 190 200 190 200 214 200" fill="none" stroke="#0037b0" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      {/* ring → jobs */}
      {jobs.map((y, i) => (
        <path key={y} id={`sk-out-${i}`} className="sk-link" d={`M306 200 C 340 200 340 ${y} 372 ${y}`} fill="none" stroke="#006c4a" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      ))}

      {/* AI ring: rotating orbit of dots + a drawn arc */}
      <g className="sk-ring-g" style={TB}>
        <circle cx="260" cy="200" r="46" fill="#fff" />
        <circle cx="260" cy="200" r="46" fill="none" stroke="#e2e7ff" strokeWidth="6" />
        <circle className="sk-arc" cx="260" cy="200" r="46" fill="none" stroke="url(#sk-grad)" strokeWidth="6" strokeLinecap="round" transform="rotate(-90 260 200)" />
        <g className="sk-orbit" style={TB}>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <circle key={a} cx={260 + 32 * Math.cos((a * Math.PI) / 180)} cy={200 + 32 * Math.sin((a * Math.PI) / 180)} r={a % 120 === 0 ? 4 : 2.5} fill={a % 120 === 0 ? '#0037b0' : '#82f5c1'} />
          ))}
        </g>
        <circle className="sk-core" cx="260" cy="200" r="10" fill="#131b2e" style={TB} />
      </g>

      {/* travelling pulses */}
      <circle className="sk-dot sk-dot-in" r="4.5" fill="#0037b0" />
      <circle className="sk-dot sk-dot-out0" r="4.5" fill="#006c4a" />
      <circle className="sk-dot sk-dot-out1" r="4.5" fill="#006c4a" />

      {/* job cards */}
      {jobs.map((y, i) => (
        <g key={y} className="sk-job" style={TB}>
          <rect x="372" y={y - 28} width="118" height="56" rx="12" fill="#fff" stroke={i === 0 ? '#85f8c4' : '#e2e7ff'} strokeWidth="2.5" />
          <rect x="386" y={y - 14} width="28" height="28" rx="7" fill={i === 0 ? '#006c4a' : '#dce1ff'} />
          <rect x="394" y={y - 5} width="12" height="9" rx="2" fill={i === 0 ? '#85f8c4' : '#0037b0'} />
          <line x1="424" y1={y - 8} x2="474" y2={y - 8} stroke="#131b2e" strokeWidth="4" strokeLinecap="round" />
          <line x1="424" y1={y + 6} x2="458" y2={y + 6} stroke="#c4c5d7" strokeWidth="3" strokeLinecap="round" />
          {i === 0 && (
            <g className="sk-badge" style={TB}>
              <circle cx="490" cy={y - 28} r="11" fill="#006c4a" stroke="#fff" strokeWidth="2.5" />
              <path d={`M484.5 ${y - 28} l4 4 l7 -8`} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}

function seekerScene() {
  utils.set('.sk-doc-g, .sk-ring-g', { opacity: 0, scale: 0.85 });
  utils.set('.sk-job', { opacity: 0, translateX: 16 });
  utils.set('.sk-badge', { opacity: 0, scale: 0 });
  utils.set('.sk-dot', { opacity: 0 });
  const doc = svg.createDrawable('.sk-doc', 0, 0);
  const lines = svg.createDrawable('.sk-line', 0, 0);
  const links = svg.createDrawable('.sk-link', 0, 0);
  const arc = svg.createDrawable('.sk-arc', 0, 0);
  createTimeline({ defaults: { ease: 'outCubic' } })
    .add('.sk-doc-g', { opacity: 1, scale: 1, duration: 500, ease: 'outBack(1.4)' })
    .add(doc, { draw: '0 1', duration: 700, ease: 'inOutSine' }, '-=300')
    .add(lines, { draw: '0 1', duration: 400, delay: stagger(60), ease: 'inOutSine' }, '-=400')
    .add('.sk-hot', { stroke: '#0037b0', duration: 500, delay: stagger(120) }, '-=200')
    .add('.sk-ring-g', { opacity: 1, scale: 1, duration: 550, ease: 'outBack(1.6)' }, '-=400')
    .add(links, { draw: '0 1', duration: 600, delay: stagger(110), ease: 'inOutSine' }, '-=250')
    .add(arc, { draw: '0 1', duration: 1200 }, '-=600')
    .add('.sk-job', { opacity: 1, translateX: 0, duration: 450, delay: stagger(120) }, '-=900')
    .add('.sk-badge', { opacity: 1, scale: 1, duration: 450, ease: 'outBack(2.5)' }, '-=200')
    .add('.sk-dot', { opacity: 1, duration: 200 }, '-=300');
  // loops
  animate('.sk-orbit', { rotate: 360, duration: 9000, loop: true, ease: 'linear' });
  animate('.sk-core', { scale: [1, 1.25, 1], duration: 1800, loop: true, ease: 'inOutSine' });
  animate('.sk-dot-in', { ...svg.createMotionPath('#sk-in'), duration: 1600, loop: true, ease: 'inOutSine', delay: 2600 });
  animate('.sk-dot-out0', { ...svg.createMotionPath('#sk-out-0'), duration: 2000, loop: true, ease: 'inOutSine', delay: 3000 });
  animate('.sk-dot-out1', { ...svg.createMotionPath('#sk-out-2'), duration: 2400, loop: true, ease: 'inOutSine', delay: 3400 });
  animate('.sk-badge', { translateY: [0, -3, 0], duration: 2000, loop: true, ease: 'inOutSine', delay: 3500 });
}

/**
 * Employer: a job post feeding a funnel; candidate cards flow in and settle
 * into a ranked stack. Silhouettes and bars only — no names, no scores.
 */
function EmployerScene() {
  const rows = [170, 244, 318];
  const widths = [0.92, 0.72, 0.5];
  const colors = ['#006c4a', '#0037b0', '#311fca'];
  return (
    <svg viewBox="0 0 520 400" className="w-full h-full" role="img" aria-label="A job post feeding a ranked shortlist">
      {/* job post */}
      <g className="em-job" style={TB}>
        <rect x="90" y="40" width="340" height="72" rx="14" fill="#fff" stroke="#85f8c4" strokeWidth="3" />
        <rect x="110" y="58" width="36" height="36" rx="9" fill="#006c4a" />
        <rect x="120" y="70" width="16" height="12" rx="2" fill="#85f8c4" />
        <line x1="160" y1="66" x2="290" y2="66" stroke="#131b2e" strokeWidth="6" strokeLinecap="round" />
        <line x1="160" y1="84" x2="240" y2="84" stroke="#747686" strokeWidth="3.5" strokeLinecap="round" />
        {[0, 1, 2].map((i) => (
          <rect key={i} className="em-req" x={318 + i * 34} y="66" width="26" height="20" rx="10" fill={i === 2 ? '#dce1ff' : '#85f8c4'} style={TB} />
        ))}
      </g>

      {/* funnel */}
      <path className="em-funnel" d="M150 112 L370 112 L300 150 L220 150 Z" fill="#e2e7ff" opacity="0.7" style={{ transformBox: 'fill-box', transformOrigin: 'center top' }} />
      <path id="em-flow" className="em-flow" d="M260 112 C 260 130 260 135 260 150" fill="none" stroke="#c4c5d7" strokeWidth="2" strokeDasharray="4 4" />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} className={`em-particle em-p${i}`} r="4" fill={i % 2 ? '#0037b0' : '#006c4a'} />
      ))}

      {/* ranked rows */}
      {rows.map((y, i) => (
        <g key={y} className="em-row" style={TB}>
          <rect x="90" y={y - 26} width="340" height="56" rx="12" fill="#fff" stroke={i === 0 ? '#85f8c4' : '#e2e7ff'} strokeWidth="2.5" />
          <circle cx="122" cy={y + 2} r="16" fill={i === 0 ? '#dce1ff' : '#eaedff'} />
          <circle cx="122" cy={y - 3} r="6" fill="#0037b0" />
          <path d={`M110 ${y + 13} a12 9 0 0 1 24 0`} fill="#0037b0" />
          <line x1="150" y1={y - 6} x2={210 - i * 10} y2={y - 6} stroke="#131b2e" strokeWidth="4" strokeLinecap="round" />
          <line x1="150" y1={y + 8} x2={196 - i * 8} y2={y + 8} stroke="#c4c5d7" strokeWidth="3" strokeLinecap="round" />
          <rect x="262" y={y - 3} width="140" height="10" rx="5" fill="#e2e7ff" />
          <rect className="em-bar" x="262" y={y - 3} width={140 * widths[i]} height="10" rx="5" fill={colors[i]} style={TB_LEFT} />
          {i === 0 && (
            <g className="em-badge" style={TB}>
              <circle cx="430" cy={y - 26} r="12" fill="#131b2e" stroke="#fff" strokeWidth="2.5" />
              <path d={`M430 ${y - 33} l2.2 4.6 5 .7 -3.6 3.5 .9 5 -4.5 -2.4 -4.5 2.4 .9 -5 -3.6 -3.5 5 -.7z`} fill="#82f5c1" />
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}

function employerScene() {
  utils.set('.em-job', { opacity: 0, translateY: -12 });
  utils.set('.em-req', { scale: 0 });
  utils.set('.em-funnel', { opacity: 0, scaleY: 0 });
  utils.set('.em-row', { opacity: 0, translateY: -18 });
  utils.set('.em-bar', { scaleX: 0 });
  utils.set('.em-badge', { opacity: 0, scale: 0 });
  utils.set('.em-particle', { opacity: 0 });
  const flow = svg.createDrawable('.em-flow', 0, 0);
  createTimeline({ defaults: { ease: 'outCubic' } })
    .add('.em-job', { opacity: 1, translateY: 0, duration: 500 })
    .add('.em-req', { scale: 1, duration: 400, delay: stagger(90), ease: 'outBack(2)' }, '-=200')
    .add('.em-funnel', { opacity: 1, scaleY: 1, duration: 450 }, '-=200')
    .add(flow, { draw: '0 1', duration: 400, ease: 'inOutSine' }, '-=200')
    .add('.em-row', { opacity: 1, translateY: 0, duration: 500, delay: stagger(160), ease: 'outBack(1.2)' }, '-=200')
    .add('.em-bar', { scaleX: 1, duration: 900, delay: stagger(160), ease: 'outExpo' }, '-=500')
    .add('.em-badge', { opacity: 1, scale: 1, duration: 450, ease: 'outBack(2.5)' }, '-=400');
  // loops: applicants keep flowing down the funnel, badge floats
  [0, 1, 2, 3, 4].forEach((i) => {
    animate(`.em-p${i}`, { ...svg.createMotionPath('#em-flow'), duration: 1500, loop: true, ease: 'inQuad', delay: 2800 + i * 300 });
    animate(`.em-p${i}`, { opacity: [0, 1, 0], duration: 1500, loop: true, ease: 'linear', delay: 2800 + i * 300 });
  });
  animate('.em-badge', { translateY: [0, -3, 0], duration: 1800, loop: true, ease: 'inOutSine', delay: 3200 });
}
