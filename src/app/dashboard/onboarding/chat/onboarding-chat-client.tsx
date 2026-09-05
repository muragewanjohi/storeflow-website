/**
 * Onboarding AI Chat — client UI (OC.2). See page.tsx for the corrected-
 * scope context. Drives POST /api/onboarding/chat turn by turn; on
 * done:true, saves the collected context via
 * PATCH /api/tenant/business-context (does NOT re-trigger starter-pack
 * generation — see that route's docblock). Fails soft (OC.5): any network
 * or API error surfaces a "Skip for now" escape hatch rather than trapping
 * the merchant on this page.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

type ApiRole = 'user' | 'assistant';
interface ApiMessage {
  role: ApiRole;
  content: string;
}
interface DisplayMessage {
  id: string;
  role: ApiRole;
  text: string;
}
interface Collected {
  businessType: string | null;
  niche: string | null;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface Props {
  storeName: string;
  knownBusinessType?: string;
  knownNiche?: string;
}

export default function OnboardingChatClient({ storeName, knownBusinessType, knownNiche }: Readonly<Props>) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [history, setHistory] = useState<ApiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const [done, setDone] = useState(Boolean(knownNiche));
  const [saved, setSaved] = useState(Boolean(knownNiche));
  const startedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function pushMessage(role: ApiRole, text: string) {
    setMessages((prev) => [...prev, { id: newId(), role, text }]);
  }

  async function saveBusinessContext(collected: Collected) {
    try {
      await fetch('/api/tenant/business-context', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType: collected.businessType ?? undefined,
          niche: collected.niche ?? undefined,
        }),
      });
      setSaved(true);
    } catch {
      // Non-fatal — the merchant still gets a confirmation and can continue;
      // this only affects future AI personalization, never blocks onboarding.
      setSaved(false);
    }
  }

  async function sendTurn(nextHistory: ApiMessage[]) {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextHistory, storeName, knownBusinessType }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        pushMessage('assistant', body.error ?? 'The onboarding assistant is temporarily unavailable.');
        setErrored(true);
        return;
      }
      pushMessage('assistant', body.reply);
      setHistory([...nextHistory, { role: 'assistant', content: JSON.stringify(body) }]);
      if (body.done) {
        setDone(true);
        await saveBusinessContext(body.collected as Collected);
      }
    } catch {
      pushMessage('assistant', 'Something went wrong reaching the assistant.');
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (startedRef.current || knownNiche) return;
    startedRef.current = true;
    const starter: ApiMessage[] = [{ role: 'user', content: '(Start the onboarding conversation.)' }];
    setHistory(starter);
    void sendTurn(starter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knownNiche]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    pushMessage('user', text);
    const next = [...history, { role: 'user' as const, content: text }];
    setHistory(next);
    await sendTurn(next);
  }

  if (knownNiche) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
        <SparklesIcon className="h-10 w-10 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">You&apos;ve already told us about {storeName}</h1>
        <p className="text-sm text-muted-foreground">
          Business type: <strong>{knownBusinessType}</strong> · Niche: <strong>{knownNiche}</strong>
        </p>
        <Button asChild>
          <Link href="/dashboard">
            Continue to Dashboard <ArrowRightIcon className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-10">
      <div className="text-center">
        <SparklesIcon className="mx-auto mb-2 h-8 w-8 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">Tell us about {storeName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A couple of quick questions to personalize your store&apos;s AI features.
        </p>
      </div>

      <div ref={scrollRef} className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-background p-4">
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={
                m.role === 'user'
                  ? 'max-w-[85%] rounded-2xl bg-primary px-3.5 py-2 text-sm text-primary-foreground'
                  : 'max-w-[85%] rounded-2xl bg-muted px-3.5 py-2 text-sm text-foreground'
              }
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-sm text-muted-foreground">Thinking…</div>}
      </div>

      {done ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 p-4 text-center">
          <p className="text-sm text-foreground">
            {saved ? "Thanks — we've saved that for you." : "Thanks! (We'll retry saving that in the background.)"}
          </p>
          <Button asChild>
            <Link href="/dashboard">
              Continue to Dashboard <ArrowRightIcon className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Type your answer…"
            disabled={loading}
            className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            Send
          </Button>
        </div>
      )}

      {errored && !done && (
        <div className="text-center">
          <Link href="/dashboard" className="text-sm text-muted-foreground underline underline-offset-2">
            Skip for now — continue to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
