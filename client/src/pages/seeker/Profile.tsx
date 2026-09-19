import { useEffect, useRef, useState } from 'react';
import { ErrorBox, Icon, Skeleton } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { toast, useFetch } from '../../lib/hooks';
import type { ParsedResume, SeekerProfile } from '../../lib/types';
import { CompletionCard } from './Home';
import { ProfileEditor, draftFromProfile, draftToPayload } from './ProfileEditor';
import type { ProfileDraft } from './ProfileEditor';

/** Seeker profile: editable sections + resume versioning / re-upload. */
export function SeekerProfilePage() {
  const { user, refresh } = useAuth();
  const { data, error, loading, reload, setData } = useFetch(() => api.get<{ profile: SeekerProfile; user: { name: string } }>('/seeker/profile'));
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data) {
      setDraft(draftFromProfile(data.profile, data.user.name || user?.name || ''));
      setDirty(false);
    }
  }, [data, user]);

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const r = await api.put<{ profile: SeekerProfile }>('/seeker/profile', draftToPayload(draft));
      setData({ profile: r.profile, user: { name: draft.name } });
      await refresh();
      setDirty(false);
      toast.success('Profile saved — matches re-scored');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reupload = async (f: File | undefined) => {
    if (!f) return;
    setUploading(true);
    const form = new FormData();
    form.append('resume', f);
    try {
      const r = await api.upload<{ parsed: ParsedResume; profile: SeekerProfile; parser: string }>('/seeker/resume', form);
      setData({ profile: r.profile, user: { name: r.parsed.fullName ?? draft?.name ?? '' } });
      toast.success(`New resume version parsed (${r.parsed.skills.length} skills). Review the changes and save.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (error) return <div className="max-w-4xl mx-auto p-space-lg"><ErrorBox message={error} onRetry={reload} /></div>;
  if (loading || !draft || !data) return <div className="max-w-[1280px] mx-auto px-margin-sm lg:px-margin-lg py-space-lg"><Skeleton className="h-96" /></div>;
  const p = data.profile;

  return (
    <div className="max-w-[1280px] mx-auto px-margin-sm lg:px-margin-lg py-space-lg pb-32 flex flex-col gap-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">My profile</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Everything employers score you on. Changes re-rank your matches instantly.</p>
        </div>
        <CompletionCard percent={p.completion.percent} missing={p.completion.missing} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        <div className="lg:col-span-8 card p-space-lg">
          <ProfileEditor
            draft={draft}
            onChange={(d) => {
              setDraft(d);
              setDirty(true);
            }}
          />
        </div>
        <aside className="lg:col-span-4 flex flex-col gap-space-md lg:sticky lg:top-20">
          <div className="card p-space-lg">
            <div className="flex items-center justify-between mb-space-sm">
              <h3 className="font-title-card text-title-card text-on-surface">Resume versions</h3>
              <span className="caption">{p.resumes.length} on file</span>
            </div>
            {p.resumes.length === 0 && <p className="caption">No resume uploaded yet.</p>}
            <ul className="flex flex-col gap-space-xs">
              {[...p.resumes].reverse().map((r, i) => (
                <li key={r._id ?? i} className={`p-space-sm rounded-lg flex items-center gap-space-sm ${i === 0 ? 'bg-primary-fixed/40' : 'bg-surface-container-low'}`}>
                  <Icon name={r.mimeType?.includes('word') ? 'description' : 'picture_as_pdf'} size={22} className={i === 0 ? 'text-primary' : 'text-outline'} />
                  <div className="min-w-0 flex-1">
                    <p className="font-label-prominent text-label-prominent text-on-surface truncate">{r.originalName}</p>
                    <p className="caption">
                      v{p.resumes.length - i} • {new Date(r.uploadedAt).toLocaleDateString('en-PH')} • {r.parserUsed} • {r.confidence}% confidence
                    </p>
                  </div>
                  {i === 0 && <span className="pill bg-primary text-on-primary">Current</span>}
                </li>
              ))}
            </ul>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => reupload(e.target.files?.[0])} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-ghost w-full mt-space-md h-11">
              <Icon name={uploading ? 'progress_activity' : 'file_upload'} size={18} className={uploading ? 'animate-spin' : ''} /> {uploading ? 'Parsing…' : 'Upload new version'}
            </button>
            <p className="caption mt-space-xs">A new version re-runs extraction and merges new skills into your profile.</p>
          </div>

          <div className="card p-space-lg">
            <h3 className="font-title-card text-title-card text-on-surface mb-space-sm">Verification</h3>
            <ul className="flex flex-col gap-space-xs">
              <li className="flex items-center justify-between caption">
                <span className="flex items-center gap-1">
                  <Icon name="link" size={16} /> LinkedIn profile
                </span>
                <span className={`pill ${p.linkedinVerified ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>{p.linkedinVerified ? 'Verified' : 'Add URL'}</span>
              </li>
              <li className="flex items-center justify-between caption">
                <span className="flex items-center gap-1">
                  <Icon name="description" size={16} /> Resume on file
                </span>
                <span className={`pill ${p.resumes.length ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>{p.resumes.length ? 'Yes' : 'Missing'}</span>
              </li>
              <li className="flex items-center justify-between caption">
                <span className="flex items-center gap-1">
                  <Icon name="visibility_off" size={16} /> Ghost mode
                </span>
                <span className={`pill ${p.ghostMode ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>{p.ghostMode ? `On (${p.hiddenCompanies.length})` : 'Off'}</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {dirty && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 w-full bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.06)] py-space-sm z-40">
          <div className="max-w-[1280px] mx-auto px-margin-sm lg:px-margin-lg flex items-center justify-between gap-space-md">
            <span className="font-body-sm text-body-sm text-on-surface-variant">You have unsaved changes.</span>
            <div className="flex gap-space-sm">
              <button type="button" onClick={() => reload()} className="btn-ghost h-10">
                Discard
              </button>
              <button type="button" onClick={save} disabled={busy} className="btn-primary h-10">
                {busy ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
