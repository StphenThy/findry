import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { animate, createTimeline, stagger, svg, utils } from 'animejs';
import { FindryMark, FindryWordmark, Icon, Logo } from '../../components/ui';
import { TB, TB_LEFT, useAnime, whenVisible } from '../../lib/anime';
import { Footer } from '../../layouts/shared';

/* ── Page ────────────────────────────────────────────────────────────── */

/** Brand landing page — every illustration is a hand-drawn SVG animated with anime.js. */
export function Landing() {
  // Every CTA goes through the login page — the role is chosen there, never here.
  const startHref = '/login?role=seeker';
  const hireHref = '/login?role=employer';

  const page = useAnime<HTMLDivElement>((root) => {
    // Generic scroll-in reveal for anything tagged data-reveal.
    root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      utils.set(el, { opacity: 0, translateY: 28 });
      animate(el, { opacity: 1, translateY: 0, duration: 800, ease: 'outCubic', autoplay: whenVisible(el) });
    });
  });

  return (
    <div ref={page} className="flex flex-col w-full min-h-screen overflow-x-hidden">
      <header className="w-full">
        <div className="max-w-7xl mx-auto px-margin-sm md:px-margin flex items-center justify-between h-16">
          <Logo />
          <nav className="flex items-center gap-space-sm">
            <Link to="/signup" className="btn-ghost">
              Create account
            </Link>
            <Link to="/login" className="btn-primary">
              Sign in <Icon name="login" size={16} />
            </Link>
          </nav>
        </div>
      </header>

      <Hero startHref={startHref} hireHref={hireHref} />

      {/* What Findry does */}
      <section className="max-w-7xl mx-auto w-full px-margin-sm md:px-margin lg:px-margin-lg mt-space-xl md:mt-16">
        <div className="max-w-2xl" data-reveal>
          <span className="kicker text-primary">What Findry does</span>
          <h2 className="font-headline-lg text-headline-lg md:text-[40px] md:leading-[48px] text-on-surface mt-1 tracking-tight">Your profile, read the way a great recruiter would.</h2>
          <p className="font-body-md text-body-md md:text-body-lg text-on-surface-variant mt-space-sm">Findry turns a resume and a job post into a match you can actually inspect — no black-box score, no keyword bingo.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md mt-space-lg">
          <Feature title="Reads your resume" body="Skills, experience and education are extracted in seconds. You confirm every line before it goes live.">
            <ResumeIllustration />
          </Feature>
          <Feature title="Weighs three signals" body="Skills overlap, experience level and education — weighted, reproducible, and one tap from the full breakdown.">
            <MatchRingIllustration />
          </Feature>
          <Feature title="Shows the gap" body="See exactly which skill would lift your score — and what it is worth on the Philippine market.">
            <SkillGapIllustration />
          </Feature>
        </div>
      </section>

      {/* Two portals, one engine */}
      <section className="max-w-7xl mx-auto w-full px-margin-sm md:px-margin lg:px-margin-lg mt-space-xl md:mt-20">
        <div className="card p-space-lg md:p-space-xl grid grid-cols-1 lg:grid-cols-2 gap-space-lg items-center overflow-hidden" data-reveal>
          <div>
            <span className="kicker text-secondary">Built for both sides</span>
            <h2 className="font-headline-lg text-headline-lg md:text-[36px] md:leading-[44px] text-on-surface mt-1 tracking-tight">Two portals. One matching engine.</h2>
            <p className="font-body-md text-body-md md:text-body-lg text-on-surface-variant mt-space-sm">
              Job seekers and employers each get their own portal and their own account — a seeker account never opens the hiring side, and vice versa. Both sides see the same explainable score, so nothing gets lost in translation.
            </p>
            <ul className="mt-space-md space-y-space-xs font-body-md text-body-md text-on-surface">
              {['Seekers: explainable match %, transparent ₱ ranges, live application tracker', 'Employers: AI-suggested skills, ranked shortlists, side-by-side evidence', 'In-app messaging on both sides — no email chains'].map((t) => (
                <li key={t} className="flex items-start gap-space-sm">
                  <span className="w-5 h-5 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center mt-0.5 shrink-0">
                    <Icon name="check" size={14} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <PortalsIllustration />
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-7xl mx-auto w-full px-margin-sm md:px-margin lg:px-margin-lg mt-space-xl md:mt-20 mb-space-xl">
        <div className="relative rounded-2xl bg-primary text-on-primary p-space-lg md:p-space-xl overflow-hidden" data-reveal>
          <CtaBackdrop />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div>
              <h2 className="font-headline-lg text-headline-lg md:text-[36px] md:leading-[44px] tracking-tight">Find the role — or the person — that actually fits.</h2>
              <p className="font-body-md text-body-md md:text-body-lg text-on-primary/80 mt-space-xs">Free for Philippine talent and employers. Upload a resume or post a job in under two minutes.</p>
            </div>
            <Link to="/login" className="btn bg-surface-container-lowest text-primary hover:bg-primary-fixed px-space-lg py-3 shrink-0 shadow-md">
              Sign in to get started <Icon name="arrow_forward" size={18} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ── Hero ────────────────────────────────────────────────────────────── */

function Hero({ startHref, hireHref }: { startHref: string; hireHref: string }) {
  const counter = useRef({ value: 0 });
  const ref = useAnime<HTMLDivElement>((root) => {
    const pct = root.querySelector<SVGTextElement>('.h-pct');

    // Initial states (set here rather than in markup so reduced-motion users see the finished page).
    utils.set('.h-word, .h-sub, .h-cta, .h-tagline', { opacity: 0, translateY: 18 });
    utils.set('.h-node', { opacity: 0, scale: 0 });
    utils.set('.h-ring-label, .h-dot', { opacity: 0 });
    utils.set('.fm-f', { opacity: 0, translateX: -14, translateY: 10 });
    utils.set('.fm-bubble', { opacity: 0, scale: 0 });
    utils.set('.h-wordmark', { opacity: 0, translateX: -8 });
    const links = svg.createDrawable('.h-link', 0, 0);
    const ring = svg.createDrawable('.h-ring', 0, 0);
    const signal = svg.createDrawable('.fm-signal-line', 0, 0);

    createTimeline({ defaults: { ease: 'outCubic' } })
      // logo lockup
      .add('.fm-f', { opacity: 1, translateX: 0, translateY: 0, duration: 700, ease: 'outExpo' })
      .add('.fm-bubble', { opacity: 1, scale: 1, duration: 600, ease: 'outBack(2)' }, '-=350')
      .add(signal, { draw: '0 1', duration: 350, delay: stagger(90), ease: 'outSine' }, '-=250')
      .add('.h-wordmark', { opacity: 1, translateX: 0, duration: 500 }, '-=500')
      .add('.h-tagline', { opacity: 1, translateY: 0, duration: 400 }, '-=300')
      // copy
      .add('.h-word', { opacity: 1, translateY: 0, duration: 650, delay: stagger(55) }, '-=200')
      .add('.h-sub', { opacity: 1, translateY: 0, duration: 550 }, '-=350')
      .add('.h-cta', { opacity: 1, translateY: 0, duration: 500, delay: stagger(90) }, '-=350')
      .add('.h-node', { opacity: 1, scale: 1, duration: 650, delay: stagger(80, { from: 'center' }), ease: 'outBack(1.7)' }, '-=900')
      .add(links, { draw: '0 1', duration: 1000, delay: stagger(90), ease: 'inOutSine' }, '-=350')
      .add(ring, { draw: '0 0.92', duration: 1300, ease: 'outCubic' }, '-=450')
      .add(counter.current, { value: 92, duration: 1300, ease: 'outCubic', modifier: utils.round(0), onUpdate: () => pct && (pct.textContent = `${counter.current.value}%`) }, '<<')
      .add('.h-ring-label', { opacity: 1, scale: [0.85, 1], duration: 450 }, '-=700')
      .add('.h-dot', { opacity: 1, duration: 300 }, '-=300');

    // Ambient loops: breathing blob + dots riding the connection paths.
    animate('#h-blob', { d: svg.morphTo('#h-blob-alt'), duration: 6000, alternate: true, loop: true, ease: 'inOutSine' });
    animate('.h-dot-a', { ...svg.createMotionPath('#h-link-a'), duration: 3200, loop: true, ease: 'inOutSine', delay: 2400 });
    animate('.h-dot-b', { ...svg.createMotionPath('#h-link-b'), duration: 3600, loop: true, ease: 'inOutSine', delay: 2900 });
    animate('.h-dot-c', { ...svg.createMotionPath('#h-link-c'), duration: 3000, loop: true, ease: 'inOutSine', delay: 3300 });
    animate('.h-pulse', { scale: [1, 1.18], opacity: [0.35, 0], duration: 2200, loop: true, ease: 'outSine', delay: 2600 });
  });

  const words = 'Job matching you can actually explain.'.split(' ');

  return (
    <div ref={ref} className="relative w-full overflow-hidden bg-gradient-to-b from-surface-container-high/60 via-surface to-background">
      <div className="absolute -top-40 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-20 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-7xl mx-auto px-margin-sm md:px-margin lg:px-margin-lg pt-space-lg md:pt-space-xl pb-space-xl grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-space-lg lg:gap-space-xl items-center">
        <div className="relative z-10">
          {/* logo lockup */}
          <div className="flex items-center gap-space-sm mb-space-lg">
            <FindryMark size={72} uid="hero" className="shrink-0" />
            <div>
              <FindryWordmark className="h-wordmark inline-block text-[40px] leading-none" />
              <div className="h-tagline kicker text-on-surface-variant mt-1.5 flex items-center gap-1.5">
                <Icon name="bolt" size={13} className="text-secondary" /> AI Job Matching Platform · Philippines
              </div>
            </div>
          </div>
          <h1 className="font-display-hero text-display-hero-mobile md:text-display-hero text-on-surface tracking-tight">
            {words.map((w, i) => (
              <span key={i} className={`h-word inline-block mr-[0.22em] ${i >= 4 ? 'text-primary' : ''}`}>
                {w}
              </span>
            ))}
          </h1>
          <p className="h-sub mt-space-md text-body-md md:text-body-lg text-on-surface-variant max-w-xl">
            Findry reads your resume, weighs it against every verified Philippine job post, and shows you the score <em>and</em> the reasons — skills, experience, education, and the gap worth closing. Salaries in ₱, always visible.
          </p>
          <div className="mt-space-lg flex flex-col sm:flex-row gap-space-sm">
            <Link to={startHref} className="h-cta btn-primary px-space-lg py-3 text-[15px]">
              Get matched <Icon name="arrow_forward" size={18} />
            </Link>
            <Link to={hireHref} className="h-cta btn-outline px-space-lg py-3 text-[15px]">
              <Icon name="work" size={18} /> I'm hiring
            </Link>
          </div>
          <div className="h-sub mt-space-lg flex flex-wrap items-center gap-x-space-md gap-y-space-xs caption">
            <span className="flex items-center gap-1">
              <Icon name="verified" size={16} className="text-secondary" /> Verified PH employers
            </span>
            <span className="flex items-center gap-1">
              <Icon name="payments" size={16} className="text-primary" /> Transparent ₱ ranges
            </span>
            <span className="flex items-center gap-1">
              <Icon name="lock" size={16} className="text-tertiary" /> Free, no agency fees
            </span>
          </div>
        </div>
        <HeroIllustration />
      </div>
    </div>
  );
}

/** Candidates → weighted match ring → jobs. Links are drawn, nodes pop, dots ride the paths. */
function HeroIllustration() {
  const candidates = [110, 220, 330];
  const jobs = [110, 220, 330];
  return (
    <svg viewBox="0 0 560 440" className="w-full max-w-[560px] mx-auto h-auto" role="img" aria-label="Candidates connected to jobs through Findry's match score">
      <defs>
        <linearGradient id="h-grad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#dce1ff" />
          <stop offset="1" stopColor="#85f8c4" />
        </linearGradient>
        <linearGradient id="h-ring-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#0037b0" />
          <stop offset="1" stopColor="#006c4a" />
        </linearGradient>
      </defs>

      {/* morphing backdrop */}
      <path id="h-blob" d="M280 50 C370 50 465 120 470 220 C475 320 380 400 280 400 C180 400 90 320 90 220 C90 120 190 50 280 50 Z" fill="url(#h-grad)" opacity="0.45" />
      <path id="h-blob-alt" d="M280 70 C390 30 480 140 455 235 C430 330 395 385 280 385 C165 385 105 340 95 235 C85 130 170 110 280 70 Z" fill="none" opacity="0" />

      {/* connections */}
      {candidates.map((y, i) => (
        <path key={`c${i}`} id={i === 0 ? 'h-link-a' : i === 2 ? 'h-link-c' : undefined} className="h-link" d={`M100 ${y} C155 ${y} 135 220 188 220`} fill="none" stroke="#0037b0" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      ))}
      {jobs.map((y, i) => (
        <path key={`j${i}`} id={i === 1 ? 'h-link-b' : undefined} className="h-link" d={`M372 220 C425 220 405 ${y} 458 ${y}`} fill="none" stroke="#006c4a" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      ))}

      {/* riding dots */}
      <circle className="h-dot h-dot-a" r="5" fill="#0037b0" />
      <circle className="h-dot h-dot-c" r="5" fill="#311fca" />
      <circle className="h-dot h-dot-b" r="5" fill="#006c4a" />

      {/* candidate nodes */}
      {candidates.map((y, i) => (
        <g key={`cn${i}`} className="h-node" style={TB}>
          <circle cx="72" cy={y} r="28" fill="#fff" stroke="#dce1ff" strokeWidth="3" />
          <circle cx="72" cy={y - 6} r="8" fill="#0037b0" />
          <path d={`M56 ${y + 16} a16 12 0 0 1 32 0`} fill="#0037b0" />
          {i === 1 && <circle cx="94" cy={y - 20} r="7" fill="#82f5c1" stroke="#fff" strokeWidth="2" />}
        </g>
      ))}

      {/* job nodes */}
      {jobs.map((y, i) => (
        <g key={`jn${i}`} className="h-node" style={TB}>
          <rect x="460" y={y - 24} width="64" height="48" rx="12" fill="#fff" stroke="#85f8c4" strokeWidth="3" />
          <rect x="478" y={y - 8} width="28" height="18" rx="3" fill="#006c4a" />
          <rect x="486" y={y - 13} width="12" height="6" rx="2" fill="#006c4a" />
          <rect x="478" y={y + 1} width="28" height="2" fill="#85f8c4" />
        </g>
      ))}

      {/* match ring */}
      <g className="h-node" style={TB}>
        <circle className="h-pulse" cx="280" cy="220" r="92" fill="none" stroke="#0037b0" strokeWidth="2" style={TB} />
        <circle cx="280" cy="220" r="104" fill="#fff" />
        <circle cx="280" cy="220" r="92" fill="none" stroke="#e2e7ff" strokeWidth="12" />
        <circle className="h-ring" cx="280" cy="220" r="92" fill="none" stroke="url(#h-ring-grad)" strokeWidth="12" strokeLinecap="round" transform="rotate(-90 280 220)" />
      </g>
      <g className="h-ring-label" style={TB}>
        <text className="h-pct" x="280" y="214" textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="52" fill="#131b2e" letterSpacing="-2">
          92%
        </text>
        <text x="280" y="246" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="13" fill="#006c4a" letterSpacing="1">
          STRONG MATCH
        </text>
        <text x="280" y="268" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fill="#747686">
          skills 45 · exp 30 · edu 25
        </text>
      </g>
    </svg>
  );
}

/* ── Feature illustrations ───────────────────────────────────────────── */

function Feature({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="card p-space-lg flex flex-col gap-space-sm" data-reveal>
      <div className="rounded-lg bg-surface-container-low p-space-sm">{children}</div>
      <h3 className="font-title-card text-title-card text-on-surface mt-space-xs">{title}</h3>
      <p className="font-body-sm text-body-sm text-on-surface-variant">{body}</p>
    </div>
  );
}

/** A resume being parsed: outline draws, lines fill in, scan beam sweeps, skill chips pop out. */
function ResumeIllustration() {
  const ref = useAnime<HTMLDivElement>((root) => {
    const el = root.querySelector('svg')!;
    utils.set('.r-chip', { opacity: 0, scale: 0 });
    utils.set('.r-scan', { opacity: 0 });
    const doc = svg.createDrawable('.r-doc', 0, 0);
    const lines = svg.createDrawable('.r-line', 0, 0);
    const wires = svg.createDrawable('.r-wire', 0, 0);
    createTimeline({ defaults: { ease: 'inOutSine' }, autoplay: whenVisible(el) })
      .add(doc, { draw: '0 1', duration: 900 })
      .add(lines, { draw: '0 1', duration: 500, delay: stagger(90) }, '-=300')
      .add('.r-scan', { opacity: [0, 0.9, 0], translateY: [0, 130], duration: 1100, ease: 'inOutQuad' }, '-=500')
      .add(wires, { draw: '0 1', duration: 500, delay: stagger(120) }, '-=500')
      .add('.r-chip', { opacity: 1, scale: 1, duration: 550, delay: stagger(120), ease: 'outBack(1.8)' }, '-=450');
  });
  return (
    <div ref={ref}>
      <svg viewBox="0 0 240 200" className="w-full h-auto" role="img" aria-label="A resume being parsed into skill tags">
        <rect className="r-doc" x="28" y="18" width="112" height="164" rx="10" fill="#fff" stroke="#0037b0" strokeWidth="2.5" />
        <line className="r-line" x1="46" y1="42" x2="104" y2="42" stroke="#131b2e" strokeWidth="5" strokeLinecap="round" />
        <line className="r-line" x1="46" y1="58" x2="86" y2="58" stroke="#747686" strokeWidth="3" strokeLinecap="round" />
        <line className="r-line" x1="46" y1="84" x2="122" y2="84" stroke="#c4c5d7" strokeWidth="3" strokeLinecap="round" />
        <line className="r-line" x1="46" y1="98" x2="114" y2="98" stroke="#c4c5d7" strokeWidth="3" strokeLinecap="round" />
        <line className="r-line" x1="46" y1="112" x2="120" y2="112" stroke="#c4c5d7" strokeWidth="3" strokeLinecap="round" />
        <line className="r-line" x1="46" y1="138" x2="108" y2="138" stroke="#c4c5d7" strokeWidth="3" strokeLinecap="round" />
        <line className="r-line" x1="46" y1="152" x2="118" y2="152" stroke="#c4c5d7" strokeWidth="3" strokeLinecap="round" />
        <rect className="r-scan" x="30" y="30" width="108" height="6" rx="3" fill="#82f5c1" />
        {[
          [62, 'React', '#dce1ff', '#0037b0'],
          [100, 'TypeScript', '#85f8c4', '#00714e'],
          [138, 'Node.js', '#e2dfff', '#3323cc'],
        ].map(([y, label, bg, fg]) => (
          <g key={label as string}>
            <path className="r-wire" d={`M140 ${(y as number) + 14} C 152 ${(y as number) + 14} 150 ${(y as number) + 14} 162 ${(y as number) + 14}`} fill="none" stroke="#c4c5d7" strokeWidth="2" strokeDasharray="3 3" />
            <g className="r-chip" style={TB}>
              <rect x="162" y={y as number} width="68" height="28" rx="14" fill={bg as string} />
              <text x="196" y={(y as number) + 18} textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="11" fill={fg as string}>
                {label}
              </text>
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** The 45 / 30 / 25 weighting drawn as three arcs, counter ticking to the score. */
function MatchRingIllustration() {
  const counter = useRef({ value: 0 });
  const ref = useAnime<HTMLDivElement>((root) => {
    const el = root.querySelector('svg')!;
    const pct = root.querySelector<SVGTextElement>('.m-pct');
    utils.set('.m-label', { opacity: 0, translateX: -6 });
    utils.set('.m-center', { opacity: 0, scale: 0.8 });
    const arcs = svg.createDrawable('.m-arc', 0, 0);
    createTimeline({ autoplay: whenVisible(el) })
      .add(arcs, { draw: '0 1', duration: 700, delay: stagger(600), ease: 'inOutCubic' })
      .add('.m-label', { opacity: 1, translateX: 0, duration: 400, delay: stagger(600), ease: 'outCubic' }, 200)
      .add('.m-center', { opacity: 1, scale: 1, duration: 500, ease: 'outBack(1.5)' }, '-=1200')
      .add(counter.current, { value: 87, duration: 1500, ease: 'outCubic', modifier: utils.round(0), onUpdate: () => pct && (pct.textContent = `${counter.current.value}%`) }, '<<');
  });
  // circle centre (92,100) r 64 — arcs start at 12 o'clock and run clockwise: 162°, 108°, 90°.
  return (
    <div ref={ref}>
      <svg viewBox="0 0 240 200" className="w-full h-auto" role="img" aria-label="Match score built from skills, experience and education">
        <circle cx="92" cy="100" r="64" fill="none" stroke="#e2e7ff" strokeWidth="14" />
        <path className="m-arc" d="M92 36 A64 64 0 0 1 111.8 160.9" fill="none" stroke="#006c4a" strokeWidth="14" strokeLinecap="butt" />
        <path className="m-arc" d="M111.8 160.9 A64 64 0 0 1 28 100" fill="none" stroke="#0037b0" strokeWidth="14" />
        <path className="m-arc" d="M28 100 A64 64 0 0 1 92 36" fill="none" stroke="#311fca" strokeWidth="14" />
        <g className="m-center" style={TB}>
          <circle cx="92" cy="100" r="50" fill="#fff" />
          <text className="m-pct" x="92" y="106" textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" fontSize="30" fill="#131b2e" letterSpacing="-1">
            87%
          </text>
          <text x="92" y="124" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="9" fill="#747686" letterSpacing="1">
            STRONG FIT
          </text>
        </g>
        {[
          [58, 'Skills', '45%', '#006c4a'],
          [100, 'Experience', '30%', '#0037b0'],
          [142, 'Education', '25%', '#311fca'],
        ].map(([y, label, w, color]) => (
          <g key={label as string} className="m-label">
            <rect x="160" y={(y as number) - 6} width="12" height="12" rx="3" fill={color as string} />
            <text x="178" y={(y as number) + 4} fontFamily="Inter, sans-serif" fontSize="11" fill="#434655">
              {label}
            </text>
            <text x="178" y={(y as number) + 18} fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="700" fontSize="12" fill={color as string}>
              {w}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Skill bars grow against a dashed "required" line; the gap skill gets its salary-delta tag. */
function SkillGapIllustration() {
  const ref = useAnime<HTMLDivElement>((root) => {
    const el = root.querySelector('svg')!;
    utils.set('.g-fill', { scaleX: 0 });
    utils.set('.g-tag', { opacity: 0, scale: 0.6 });
    utils.set('.g-text', { opacity: 0 });
    const req = svg.createDrawable('.g-req', 0, 0);
    createTimeline({ autoplay: whenVisible(el) })
      .add('.g-text', { opacity: 1, duration: 300, delay: stagger(80) })
      .add('.g-fill', { scaleX: 1, duration: 900, delay: stagger(140), ease: 'outExpo' }, '-=200')
      .add(req, { draw: '0 1', duration: 600, ease: 'inOutSine' }, '-=500')
      .add('.g-tag', { opacity: 1, scale: 1, duration: 500, ease: 'outBack(2)' }, '-=100')
      .add('.g-tag', { translateY: [0, -3, 0], duration: 1600, loop: true, ease: 'inOutSine' });
  });
  const rows: Array<[string, number, string]> = [
    ['React', 1, '#006c4a'],
    ['TypeScript', 0.9, '#006c4a'],
    ['Docker', 0.32, '#ba1a1a'],
    ['SQL', 0.7, '#0037b0'],
  ];
  return (
    <div ref={ref}>
      <svg viewBox="0 0 240 200" className="w-full h-auto" role="img" aria-label="Skill bars showing Docker as the gap worth closing">
        {rows.map(([label, v, color], i) => {
          const y = 34 + i * 40;
          return (
            <g key={label}>
              <text className="g-text" x="12" y={y + 4} fontFamily="Inter, sans-serif" fontSize="11" fontWeight="600" fill="#434655">
                {label}
              </text>
              <rect x="86" y={y - 6} width="140" height="12" rx="6" fill="#e2e7ff" />
              <rect className="g-fill" x="86" y={y - 6} width={140 * v} height="12" rx="6" fill={color} style={TB_LEFT} />
            </g>
          );
        })}
        <line className="g-req" x1="184" y1="18" x2="184" y2="184" stroke="#747686" strokeWidth="1.5" strokeDasharray="4 4" />
        <text className="g-text" x="184" y="196" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="9" fill="#747686">
          required
        </text>
        <g className="g-tag" style={TB}>
          <rect x="150" y="88" width="72" height="22" rx="11" fill="#131b2e" />
          <path d="M160 110 l6 6 l6 -6" fill="#131b2e" />
          <text x="186" y="103" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="10" fill="#82f5c1">
            +₱12k / mo
          </text>
        </g>
      </svg>
    </div>
  );
}

/** Seeker and employer panels sharing one key, with a token shuttling between them. */
function PortalsIllustration() {
  const ref = useAnime<HTMLDivElement>((root) => {
    const el = root.querySelector('svg')!;
    utils.set('.p-panel, .p-key', { opacity: 0, scale: 0.85 });
    utils.set('.p-shuttle', { opacity: 0 });
    const rails = svg.createDrawable('.p-rail', 0, 0);
    createTimeline({ autoplay: whenVisible(el) })
      .add('.p-panel', { opacity: 1, scale: 1, duration: 600, delay: stagger(150), ease: 'outBack(1.4)' })
      .add(rails, { draw: '0 1', duration: 800, ease: 'inOutSine' }, '-=200')
      .add('.p-key', { opacity: 1, scale: 1, duration: 500, ease: 'outBack(2)' }, '-=400')
      .add('.p-shuttle', { opacity: 1, duration: 250 })
      .add('.p-shuttle', { ...svg.createMotionPath('#p-rail-path'), duration: 2400, loop: true, alternate: true, ease: 'inOutQuad' });
  });
  return (
    <div ref={ref}>
      <svg viewBox="0 0 480 200" className="w-full h-auto" role="img" aria-label="One login switching between the seeker and employer portals">
        <path id="p-rail-path" className="p-rail" d="M140 100 C 190 40 290 160 340 100" fill="none" stroke="#c4c5d7" strokeWidth="2.5" strokeDasharray="5 5" />
        <g className="p-panel" style={TB}>
          <rect x="20" y="40" width="120" height="120" rx="14" fill="#fff" stroke="#dce1ff" strokeWidth="3" />
          <circle cx="80" cy="82" r="16" fill="#0037b0" />
          <path d="M52 124 a28 20 0 0 1 56 0" fill="#0037b0" />
          <rect x="44" y="136" width="72" height="8" rx="4" fill="#dce1ff" />
          <text x="80" y="30" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="11" fill="#0037b0" letterSpacing="1">
            SEEKER
          </text>
        </g>
        <g className="p-panel" style={TB}>
          <rect x="340" y="40" width="120" height="120" rx="14" fill="#fff" stroke="#85f8c4" strokeWidth="3" />
          <rect x="372" y="70" width="56" height="56" rx="6" fill="#006c4a" />
          {[0, 1, 2].map((r) =>
            [0, 1].map((c) => <rect key={`${r}${c}`} x={382 + c * 24} y={80 + r * 14} width="12" height="8" rx="1.5" fill="#85f8c4" />),
          )}
          <rect x="364" y="136" width="72" height="8" rx="4" fill="#85f8c4" />
          <text x="400" y="30" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="11" fill="#006c4a" letterSpacing="1">
            EMPLOYER
          </text>
        </g>
        <g className="p-key" style={TB}>
          <circle cx="240" cy="100" r="26" fill="#131b2e" />
          <circle cx="234" cy="96" r="7" fill="none" stroke="#82f5c1" strokeWidth="3" />
          <path d="M239 101 l12 12 M247 109 l4 -4 M243 105 l4 -4" stroke="#82f5c1" strokeWidth="3" strokeLinecap="round" fill="none" />
          <text x="240" y="150" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="10" fill="#434655">
            same score, both sides
          </text>
        </g>
        <g className="p-shuttle" style={TB}>
          <circle r="9" fill="#fff" stroke="#131b2e" strokeWidth="2.5" />
          <path d="M-4 0 h8 M1 -3 l3 3 l-3 3" stroke="#131b2e" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </div>
  );
}

/** Drifting outline shapes behind the closing CTA. */
function CtaBackdrop() {
  const ref = useAnime<HTMLDivElement>(() => {
    const shapes = svg.createDrawable('.b-shape', 0, 0);
    animate(shapes, { draw: '0 1', duration: 2400, delay: stagger(300), ease: 'inOutSine', loop: true, alternate: true });
    animate('.b-shape', { translateY: [0, -10, 0], rotate: [0, 6, 0], duration: 6000, delay: stagger(400), loop: true, ease: 'inOutSine' });
  });
  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <svg viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice" className="w-full h-full opacity-30">
        <circle className="b-shape" cx="700" cy="60" r="80" fill="none" stroke="#fff" strokeWidth="2" style={TB} />
        <rect className="b-shape" x="560" y="120" width="120" height="120" rx="28" fill="none" stroke="#82f5c1" strokeWidth="2" style={TB} />
        <path className="b-shape" d="M60 180 L140 40 L220 180 Z" fill="none" stroke="#fff" strokeWidth="2" style={TB} />
        <circle className="b-shape" cx="380" cy="200" r="40" fill="none" stroke="#82f5c1" strokeWidth="2" style={TB} />
      </svg>
    </div>
  );
}
