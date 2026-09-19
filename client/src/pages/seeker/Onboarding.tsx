import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/ui';
import { api } from '../../lib/api';
import { toast } from '../../lib/hooks';
import type { ParsedResume, SeekerProfile } from '../../lib/types';

const STAGES = ['Reading your file…', 'Extracting your skills…', 'Mapping experience & education…', 'Calibrating against the PH salary index…'];

/** Step 1 of seeker onboarding: resume upload with the "Extracting your skills..." animation. */
export function SeekerOnboarding() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!busy) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(STAGES.length - 1, s + 1)), 900);
    return () => clearInterval(t);
  }, [busy]);

  const pick = (f: File | undefined) => {
    setErr(null);
    if (!f) return;
    if (!/\.(pdf|docx|txt)$/i.test(f.name)) return setErr('Please upload a PDF, DOCX or TXT file.');
    if (f.size > 8 * 1024 * 1024) return setErr('File is larger than 8 MB.');
    setFile(f);
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    const form = new FormData();
    form.append('resume', file);
    try {
      const r = await api.upload<{ parsed: ParsedResume; parser: string; parseMs: number; profile: SeekerProfile }>('/seeker/resume', form);
      toast.success(`Extracted ${r.parsed.skills.length} skills in ${(r.parseMs / 1000).toFixed(1)}s`);
      navigate('/seeker/onboarding/review', { state: { parsed: r.parsed, parser: r.parser, parseMs: r.parseMs, fileName: file.name, fileSize: file.size } });
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-margin-sm lg:px-margin-lg pt-space-xl pb-space-xl">
      <Stepper active={1} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start mt-space-lg">
        <div className="lg:col-span-7 card p-space-lg md:p-space-xl">
          <div className="flex items-center gap-space-xs mb-1">
            <span className="pill bg-primary-fixed text-primary uppercase font-bold tracking-wider">Upload resume</span>
            <span className="caption text-outline">• Step 1 of 3</span>
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Let the AI read your resume</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 mb-space-lg">We extract your skills, work history and education, then you confirm everything before matches go live.</p>

          {!busy ? (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  pick(e.dataTransfer.files[0]);
                }}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                className={`rounded-xl border-2 border-dashed p-space-xl flex flex-col items-center text-center gap-space-sm cursor-pointer transition-colors ${drag ? 'border-primary bg-primary-fixed/40' : 'border-outline-variant bg-surface-container-low hover:bg-surface-container'}`}
              >
                <span className="w-14 h-14 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
                  <Icon name={file ? 'description' : 'upload_file'} size={30} />
                </span>
                {file ? (
                  <>
                    <span className="font-title-card text-title-card text-on-surface">{file.name}</span>
                    <span className="caption">{(file.size / 1024 / 1024).toFixed(2)} MB • click to change</span>
                  </>
                ) : (
                  <>
                    <span className="font-title-card text-title-card text-on-surface">Drop your resume here, or click to browse</span>
                    <span className="caption">PDF • DOCX • TXT • up to 8 MB</span>
                  </>
                )}
                <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,application/pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
              </div>
              {err && (
                <p className="caption text-error mt-space-sm flex items-center gap-1" role="alert">
                  <Icon name="error" size={14} /> {err}
                </p>
              )}
              <div className="mt-space-lg flex flex-col sm:flex-row items-center justify-between gap-space-sm">
                <span className="caption flex items-center gap-1 text-outline">
                  <Icon name="verified_user" size={14} className="text-secondary" /> Parsed privately. Never sold or used to train public models.
                </span>
                <div className="flex items-center gap-space-sm">
                  <Link to="/seeker/onboarding/review" className="btn-ghost h-11">
                    Skip — fill in manually
                  </Link>
                  <button type="button" onClick={upload} disabled={!file} className="btn-primary h-11 px-space-lg">
                    <Icon name="auto_awesome" size={18} /> Parse with AI
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-surface-container-low p-space-xl flex flex-col items-center text-center gap-space-md" aria-live="polite">
              <span className="relative flex h-16 w-16">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-30" />
                <span className="relative inline-flex rounded-full h-16 w-16 bg-primary text-on-primary items-center justify-center">
                  <Icon name="psychology" size={32} />
                </span>
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface">{STAGES[stage]}</span>
              <ul className="flex flex-col gap-1 text-left w-full max-w-xs">
                {STAGES.map((s, i) => (
                  <li key={s} className={`flex items-center gap-space-xs caption ${i < stage ? 'text-secondary' : i === stage ? 'text-primary font-semibold' : 'text-outline'}`}>
                    <Icon name={i < stage ? 'check_circle' : i === stage ? 'progress_activity' : 'radio_button_unchecked'} size={14} className={i === stage ? 'animate-spin' : ''} /> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 flex flex-col gap-space-md">
          <div className="card p-space-lg">
            <h3 className="font-title-card text-title-card text-on-surface mb-space-sm">What gets extracted</h3>
            <ul className="flex flex-col gap-space-sm">
              {[
                ['Tech stacks & seniority', 'React, Node.js, AWS… normalised so "ReactJS" and "React" match the same jobs.', 'code'],
                ['Work experience', 'Companies, titles, dates — with overlapping roles de-duplicated for total years.', 'work_history'],
                ['Education & honors', 'Degree, school, and Latin honors if listed.', 'school'],
                ['Quantified highlights', '"Reduced bundle by 42%" style achievements employers love.', 'insights'],
              ].map(([t, d, i]) => (
                <li key={t} className="flex items-start gap-space-sm">
                  <span className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                    <Icon name={i} size={18} />
                  </span>
                  <span>
                    <span className="font-label-prominent text-label-prominent text-on-surface block">{t}</span>
                    <span className="caption">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-surface-container p-space-md flex items-start gap-space-sm">
            <Icon name="tips_and_updates" size={22} className="text-secondary" />
            <p className="caption">
              <strong className="text-on-surface">Tip:</strong> a text-based PDF parses best. Scanned images can't be read yet — export from Word or Google Docs instead.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Stepper({ active }: { active: 1 | 2 | 3 }) {
  const steps = ['Upload resume', 'AI extraction & review', 'Match feed activation'];
  return (
    <div className="card p-space-md">
      <div className="flex items-center gap-space-sm flex-wrap">
        {steps.map((s, i) => {
          const n = i + 1;
          const done = n < active;
          const cur = n === active;
          return (
            <div key={s} className="flex items-center gap-space-sm">
              <div className={`flex items-center gap-space-xs font-label-prominent text-label-prominent ${done ? 'text-secondary' : cur ? 'text-primary' : 'text-outline font-normal'}`}>
                {cur ? (
                  <span className="relative flex h-6 w-6">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-35" />
                    <span className="relative inline-flex rounded-full h-6 w-6 bg-primary text-on-primary items-center justify-center font-bold text-[12px]">{n}</span>
                  </span>
                ) : (
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[12px] ${done ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>{done ? <Icon name="check" size={15} /> : n}</span>
                )}
                <span>
                  {n}. {s}
                </span>
                {cur && <span className="pill bg-primary-fixed text-on-primary-fixed text-[10px] font-bold uppercase">Live</span>}
              </div>
              {i < steps.length - 1 && <span className={`w-6 h-[2px] hidden sm:block ${done ? 'bg-secondary-container' : 'bg-surface-container-highest'}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
