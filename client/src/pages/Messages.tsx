import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar, EmptyState, ErrorBox, Icon, Monogram, Skeleton } from '../components/ui';
import { api } from '../lib/api';
import { timeAgo } from '../lib/format';
import { toast, useFetch } from '../lib/hooks';
import type { ChatMessage, Conversation, Role } from '../lib/types';

/**
 * In-app messaging between an employer and a candidate who applied.
 * One conversation per application; polled every 8s (no sockets needed for a demo).
 */
export function Messages({ role }: { role: Role }) {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useFetch(() => api.get<{ conversations: Conversation[] }>(`/messages/conversations?as=${role}`), [role]);
  const convos = data?.conversations ?? [];

  useEffect(() => {
    const t = setInterval(reload, 15000);
    return () => clearInterval(t);
  }, [reload]);

  // On desktop auto-open the first conversation
  useEffect(() => {
    if (!applicationId && convos.length && window.innerWidth >= 1024) navigate(`/${role}/messages/${convos[0].applicationId}`, { replace: true });
  }, [applicationId, convos, navigate, role]);

  const accent = role === 'seeker' ? 'text-primary' : 'text-secondary';

  return (
    <div className="max-w-[1280px] mx-auto px-margin-sm lg:px-margin-lg py-space-lg">
      <div className="flex items-end justify-between mb-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Messages</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">{role === 'seeker' ? 'Direct line to the hiring teams reviewing you.' : 'Talk to shortlisted candidates — no email chains.'}</p>
        </div>
        <span className="caption hidden sm:flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-secondary" /> Auto-refreshing
        </span>
      </div>
      {error && <ErrorBox message={error} onRetry={reload} />}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        <aside className={`lg:col-span-4 card overflow-hidden ${applicationId ? 'hidden lg:block' : ''}`} aria-label="Conversations">
          {loading && !data && (
            <div className="p-space-md flex flex-col gap-space-sm">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          )}
          {data && convos.length === 0 && (
            <div className="p-space-md">
              <EmptyState icon="forum" title="No conversations yet" body={role === 'seeker' ? 'Apply to a role — employers can message you once your application is in.' : 'Conversations open automatically for every applicant in your pipeline.'} />
            </div>
          )}
          <ul className="divide-y divide-surface-container">
            {convos.map((c) => {
              const active = c.applicationId === applicationId;
              return (
                <li key={c.applicationId}>
                  <Link to={`/${role}/messages/${c.applicationId}`} className={`flex items-center gap-space-sm p-space-md transition-colors ${active ? 'bg-surface-container' : 'hover:bg-surface-container-low'}`}>
                    {c.counterpart.monogram ? <Monogram text={c.counterpart.monogram} size={44} /> : <Avatar name={c.counterpart.name} url={c.counterpart.avatarUrl} size={44} />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-space-xs">
                        <span className="font-label-prominent text-label-prominent text-on-surface truncate">{c.counterpart.name}</span>
                        <span className="caption text-outline shrink-0">{timeAgo(c.updatedAt)}</span>
                      </div>
                      <span className="caption block truncate">{c.jobTitle}</span>
                      <span className={`font-body-sm text-body-sm truncate block ${c.unread ? 'text-on-surface font-semibold' : 'text-on-surface-variant'}`}>
                        {c.lastMessage ? `${c.lastMessage.mine ? 'You: ' : ''}${c.lastMessage.body}` : 'No messages yet — say hello'}
                      </span>
                    </div>
                    {c.unread > 0 && <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${role === 'seeker' ? 'bg-primary text-on-primary' : 'bg-secondary text-on-secondary'}`}>{c.unread}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>
        <section className={`lg:col-span-8 ${applicationId ? '' : 'hidden lg:block'}`}>
          {applicationId ? (
            <Thread applicationId={applicationId} role={role} accent={accent} onSent={reload} />
          ) : (
            <div className="card p-space-xl h-[60vh] flex flex-col items-center justify-center text-center gap-space-sm">
              <Icon name="forum" size={40} className="text-outline-variant" />
              <p className="font-body-md text-body-md text-on-surface-variant">Select a conversation</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Thread({ applicationId, role, accent, onSent }: { applicationId: string; role: Role; accent: string; onSent: () => void }) {
  const navigate = useNavigate();
  const { data, error, loading, reload, setData } = useFetch(() => api.get<{ jobTitle?: string; status: string; counterpart: { name?: string; avatarUrl?: string; company: string }; messages: ChatMessage[] }>(`/messages/${applicationId}`), [applicationId]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(reload, 8000);
    return () => clearInterval(t);
  }, [reload]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [data?.messages.length]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !data) return;
    setBusy(true);
    try {
      const r = await api.post<{ message: ChatMessage }>(`/messages/${applicationId}`, { body: text.trim() });
      setData({ ...data, messages: [...data.messages, r.message] });
      setText('');
      onSent();
    } catch (e2) {
      toast.error((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !data) return <Skeleton className="h-[60vh]" />;
  if (!data) return null;
  const title = role === 'seeker' ? data.counterpart.company : data.counterpart.name ?? 'Candidate';
  const sub = role === 'seeker' ? `${data.counterpart.name ?? 'Recruiter'} • ${data.jobTitle}` : data.jobTitle;

  return (
    <div className="card flex flex-col h-[70vh] lg:h-[72vh]">
      <div className="p-space-md flex items-center gap-space-sm border-b border-surface-container">
        <button type="button" onClick={() => navigate(`/${role}/messages`)} className="lg:hidden text-on-surface-variant" aria-label="Back to conversations">
          <Icon name="arrow_back" size={22} />
        </button>
        <Avatar name={title} url={data.counterpart.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <p className="font-label-prominent text-label-prominent text-on-surface truncate">{title}</p>
          <p className="caption truncate">{sub}</p>
        </div>
        <span className="pill bg-surface-container text-on-surface-variant capitalize">{data.status}</span>
        <Link to={role === 'seeker' ? '/seeker/applications' : `/employer/candidates/${applicationId}`} className={`caption font-semibold ${accent} hidden sm:inline`}>
          {role === 'seeker' ? 'Tracker' : 'Dossier'}
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-space-md flex flex-col gap-space-sm bg-surface-container-low/40">
        {data.messages.length === 0 && <p className="caption text-center my-auto">No messages yet. {role === 'employer' ? 'Introduce yourself and propose next steps.' : 'Ask about the role, timeline or compensation.'}</p>}
        {data.messages.map((m) => (
          <div key={m.id} className={`max-w-[80%] rounded-2xl px-space-md py-space-sm ${m.mine ? `self-end ${role === 'seeker' ? 'bg-primary text-on-primary' : 'bg-secondary text-on-secondary'}` : 'self-start bg-surface-container-lowest text-on-surface shadow-xs'}`}>
            <p className="font-body-md text-body-md whitespace-pre-wrap">{m.body}</p>
            <span className={`caption block mt-1 ${m.mine ? 'text-inverse-on-surface/80' : 'text-outline'}`}>
              {timeAgo(m.at)}
              {m.mine && m.readAt ? ' • Read' : ''}
            </span>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="p-space-sm flex items-end gap-space-sm border-t border-surface-container">
        <textarea
          className="textarea min-h-[44px] max-h-40 py-2.5"
          rows={1}
          placeholder="Write a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send(e);
            }
          }}
          aria-label="Message"
        />
        <button type="submit" disabled={busy || !text.trim()} className={`${role === 'seeker' ? 'btn-primary' : 'btn-secondary'} h-11 w-11 !p-0`} aria-label="Send">
          <Icon name="send" size={20} />
        </button>
      </form>
    </div>
  );
}
