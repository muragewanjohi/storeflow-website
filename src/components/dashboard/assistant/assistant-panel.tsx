/**
 * Dashboard AI Assistant — persistent panel (DA.4, docs/DASHBOARD_AI_ASSISTANT_PLAN.md)
 *
 * The UI for the assistant built in DA.0-DA.3: a floating bubble, reachable
 * from every dashboard screen (mounted once in DashboardLayoutClient), that
 * expands into a chat panel. Talks to two backends depending on mode:
 *
 *  - 'assistant' mode (default): POST /api/assistant/chat — handles
 *    data_query, help_question, configuration_guidance (routing), next_steps,
 *    and unclear. History sent as plain {role, content} text turns.
 *    next_steps returns real, clickable setup-checklist links (same items
 *    the dashboard home page's checklist widget shows), rendered the same
 *    way help_question's cited-article links are.
 *  - 'product_intake' mode: entered when configuration_guidance hands off a
 *    'product_intake' target. Drives POST /api/products/ai-intake directly
 *    (per that route's own established contract — assistant turns are
 *    JSON.stringify(data), not plain text, so the model keeps track of what
 *    it's already collected). When that flow signals done:true, this
 *    component resolves the collected category NAME to a real category_id
 *    (GET /api/categories) and calls the existing POST /api/products to
 *    actually create the product, then drops back to 'assistant' mode.
 *
 *    The conversational intake is text-only — Claude has no channel to
 *    receive an image file through a chat turn, so a product photo can
 *    never be part of that conversation itself (found as a real gap: a user
 *    added a product this way and it never asked for a picture, unlike the
 *    manual /dashboard/products/new form). The fix is a UI-level follow-up
 *    step, not a chat question: once the product is created, the
 *    confirmation message carries an inline photo-upload prompt (see
 *    `photoPrompt` on DisplayMessage) using the exact same upload primitives
 *    the manual form uses — compressImageForMobile() +
 *    uploadImageWithProgress('/api/products/upload', ...) from
 *    @/lib/media/mobile-image-upload — then PUTs the result onto the new
 *    product via PUT /api/products/[id]. Skippable; never blocks anything.
 *
 *  - 'delivery_zone_intake' mode (AI Phase 7.1): entered when
 *    configuration_guidance hands off a 'delivery_zone' target. Drives
 *    POST /api/delivery-zones/ai-intake, same JSON.stringify(data)-as-
 *    assistant-turn contract as product_intake. On done:true, calls the
 *    existing POST /api/admin/delivery-zones directly (no id resolution
 *    needed — unlike product_intake's category, a zone has no foreign key
 *    to look up), then drops back to 'assistant' mode.
 *
 * Both backends already enforce their own auth/tenant/quota/rate-limit
 * checks — this component does no authorization logic of its own, only
 * renders their responses and forwards user input.
 *
 * Discoverability (DA.7, added after "how does a new merchant find this?"):
 * three complementary, low-risk pieces, none of which required touching
 * dashboard-client.tsx's existing (multi-instance, per-item-special-cased)
 * checklist rendering:
 *  1. First-run spotlight: a one-time pulsing tooltip on the bubble itself,
 *     shown after a short delay unless already dismissed. Purely a
 *     localStorage nudge (DUKANEST_SPOTLIGHT_KEY) — not tied to any server
 *     state, since "have they NOTICED the bubble" isn't a business fact
 *     worth persisting across devices the way "have they TRIED it" is.
 *  2. Getting-started checklist item ('assistant', added to
 *     buildGettingStartedProgress() + the getting-started route's items
 *     array): completed the first time a message is actually sent — see
 *     markAssistantTried(). Its href is a plain `/dashboard?openAssistant=1`
 *     query param rather than a special onClick, so it renders through the
 *     exact same generic <Link href> fallback every other non-special
 *     checklist item already uses. This component reads that param on
 *     mount, opens itself, and strips it via history.replaceState.
 *  3. Suggested-prompt chips: shown only when the conversation is still
 *     just the welcome message — one tap sends a real example question, the
 *     fastest way to learn what the assistant can actually do.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { compressImageForMobile, uploadImageWithProgress } from '@/lib/media/mobile-image-upload';

type ApiRole = 'user' | 'assistant';
interface ApiMessage {
  role: ApiRole;
  content: string;
}

interface CitedArticle {
  title: string;
  slug: string;
  url: string;
}

interface NextStep {
  id: string;
  label: string;
  href: string;
  cta: string;
}

interface PhotoPrompt {
  productId: string;
  productName: string;
  status: 'pending' | 'uploading' | 'done' | 'skipped' | 'error';
  progress?: number;
  errorText?: string;
}

interface DisplayMessage {
  id: string;
  role: ApiRole;
  text: string;
  citedArticles?: CitedArticle[];
  nextSteps?: NextStep[];
  photoPrompt?: PhotoPrompt;
  isError?: boolean;
}

type Mode = 'assistant' | 'product_intake' | 'delivery_zone_intake';

interface CollectedProduct {
  name: string | null;
  price: number | null;
  stockQuantity: number | null;
  category: string | null;
  sku: string | null;
  // Basic services support (docs/SERVICES_PLAN.md)
  requiresShipping?: boolean | null;
  // Basic deposit support (docs/SERVICES_PLAN.md, S-Dep.9)
  depositType?: string | null;
  depositValue?: number | null;
}

/**
 * Re-validated the same way every other model-produced value in this
 * codebase is (e.g. B2.1's color/font re-checking) — never trusted raw
 * against the real 'none'|'fixed'|'percentage' enum
 * (@/lib/products/validation.ts), since the create-product route's zod
 * schema REJECTS (400s) an off-enum string outright rather than
 * defaulting it, which would otherwise silently break this flow on a rare
 * model slip.
 */
function sanitizeCollectedDeposit(
  depositType: string | null | undefined,
  depositValue: number | null | undefined,
): { deposit_type: 'none' | 'fixed' | 'percentage'; deposit_value: number | null } {
  if (depositType === 'fixed' && typeof depositValue === 'number' && depositValue > 0) {
    return { deposit_type: 'fixed', deposit_value: depositValue };
  }
  if (
    depositType === 'percentage' &&
    typeof depositValue === 'number' &&
    depositValue > 0 &&
    depositValue <= 100
  ) {
    return { deposit_type: 'percentage', deposit_value: depositValue };
  }
  return { deposit_type: 'none', deposit_value: null };
}

interface CollectedZone {
  name: string | null;
  price: number | null;
  locations: string[];
}

const WELCOME_TEXT =
  "Hi! I can answer questions about your store's data, help you understand DukaNest's features, walk you through adding a new product or sale, suggest categories/pricing for your business, write a social/WhatsApp/SMS post or a blog post to share with your customers, or tell you what to set up next. What can I help with?";
const GENERIC_ERROR_TEXT = 'Something went wrong reaching the assistant. Please try again.';
const INTAKE_START: ApiMessage = { role: 'user', content: '(Start the product intake conversation.)' };
const ZONE_INTAKE_START: ApiMessage = { role: 'user', content: '(Start the delivery zone setup conversation.)' };
const SPOTLIGHT_DISMISSED_KEY = 'dukanest_assistant_spotlight_dismissed';
const SPOTLIGHT_SHOW_DELAY_MS = 1500;
const SPOTLIGHT_AUTO_HIDE_MS = 10000;

const SUGGESTED_PROMPTS = [
  'What should I do next?',
  'How do I add a product?',
  'How many orders do I have?',
  'Write a social post about my new arrivals',
  'Create a sale for my store',
  'Write a blog post about caring for my products',
] as const;

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([
    { id: 'welcome', role: 'assistant', text: WELCOME_TEXT },
  ]);
  const [mode, setMode] = useState<Mode>('assistant');
  const [assistantHistory, setAssistantHistory] = useState<ApiMessage[]>([]);
  const [intakeHistory, setIntakeHistory] = useState<ApiMessage[]>([]);
  const [zoneIntakeHistory, setZoneIntakeHistory] = useState<ApiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasTriedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Auto-open when reached via the getting-started checklist's "Try it"
  // link (?openAssistant=1) — see the module docblock's discoverability
  // section. Strip the param so a refresh/back-nav doesn't reopen it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openAssistant') !== '1') return;
    setOpen(true);
    params.delete('openAssistant');
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState(null, '', next);
  }, []);

  // First-run spotlight: a one-time nudge, not tied to server state — see
  // the module docblock. Skipped entirely once the panel is opened for any
  // reason (including the effect above).
  useEffect(() => {
    if (open) return;
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(SPOTLIGHT_DISMISSED_KEY) === 'true') return;

    const showTimer = window.setTimeout(() => setShowSpotlight(true), SPOTLIGHT_SHOW_DELAY_MS);
    return () => window.clearTimeout(showTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showSpotlight) return;
    const hideTimer = window.setTimeout(() => dismissSpotlight(), SPOTLIGHT_AUTO_HIDE_MS);
    return () => window.clearTimeout(hideTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSpotlight]);

  function dismissSpotlight() {
    setShowSpotlight(false);
    window.localStorage.setItem(SPOTLIGHT_DISMISSED_KEY, 'true');
  }

  function markAssistantTried() {
    if (hasTriedRef.current) return;
    hasTriedRef.current = true;
    fetch('/api/dashboard/getting-started', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'assistant_tried' }),
    }).catch(() => {
      // Best-effort — worst case the checklist item just doesn't tick off;
      // never worth surfacing an error for.
    });
  }

  function pushMessage(msg: Omit<DisplayMessage, 'id'>): string {
    const id = newId();
    setMessages((prev) => [...prev, { ...msg, id }]);
    return id;
  }

  function updatePhotoPrompt(messageId: string, patch: Partial<PhotoPrompt>) {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId && m.photoPrompt ? { ...m, photoPrompt: { ...m.photoPrompt, ...patch } } : m))
    );
  }

  async function handlePhotoSelected(messageId: string, productId: string, file: File) {
    updatePhotoPrompt(messageId, { status: 'uploading', progress: 0, errorText: undefined });
    try {
      const compressed = await compressImageForMobile(file);
      const { url } = await uploadImageWithProgress('/api/products/upload', compressed, (percent) =>
        updatePhotoPrompt(messageId, { progress: percent })
      );

      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: url }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        updatePhotoPrompt(messageId, { status: 'error', errorText: body.error ?? 'Failed to attach the photo.' });
        return;
      }
      updatePhotoPrompt(messageId, { status: 'done' });
    } catch (err: any) {
      updatePhotoPrompt(messageId, { status: 'error', errorText: err?.message ?? 'Failed to upload the photo.' });
    }
  }

  function handleSkipPhoto(messageId: string) {
    updatePhotoPrompt(messageId, { status: 'skipped' });
  }

  async function resolveCategoryId(categoryName: string | null): Promise<string | null> {
    if (!categoryName) return null;
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) return null;
      const body = await res.json();
      const categories: { id: string; name: string }[] = body.categories ?? [];
      const match = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
      return match?.id ?? null;
    } catch {
      return null;
    }
  }

  async function createProductFromCollected(collected: CollectedProduct) {
    if (!collected.name || collected.price == null) {
      pushMessage({
        role: 'assistant',
        text: "I didn't end up with enough details to create the product — you can finish it from the Products page.",
        isError: true,
      });
      return;
    }

    const category_id = await resolveCategoryId(collected.category);
    // Category is required to save a product (user-requested change) — the
    // AI intake prompt is instructed to always resolve one and never
    // finish without it, but never trust that blindly: if resolution
    // genuinely failed here, fail fast with a clear message instead of
    // letting the save attempt below surface a generic "Validation error".
    if (!category_id) {
      pushMessage({
        role: 'assistant',
        text: collected.category
          ? `I couldn't match "${collected.category}" to one of your existing categories — please finish adding this product from the Products page and pick a category there.`
          : "I need a category to save this product, but didn't get one — please finish adding it from the Products page.",
        isError: true,
      });
      return;
    }

    const { deposit_type, deposit_value } = sanitizeCollectedDeposit(
      collected.depositType,
      collected.depositValue,
    );

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: collected.name,
          price: collected.price,
          // A non-shipped item (service) has no stock tracked at all —
          // null, not 0 (0 would read as "out of stock" at checkout, see
          // docs/SERVICES_PLAN.md).
          stock_quantity: collected.requiresShipping === false ? null : collected.stockQuantity ?? 0,
          sku: collected.sku || undefined,
          category_id,
          requires_shipping: collected.requiresShipping !== false,
          deposit_type,
          deposit_value,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        pushMessage({
          role: 'assistant',
          text: `I collected the details, but creating the product failed: ${body.error ?? 'please try again from the Products page.'}`,
          isError: true,
        });
        return;
      }

      const productId: string | undefined = body.product?.id;
      pushMessage({
        role: 'assistant',
        text: `Done — "${collected.name}" has been added to your products.${productId ? ' Want to add a photo?' : ''}`,
        photoPrompt: productId
          ? { productId, productName: collected.name, status: 'pending' }
          : undefined,
      });
    } catch {
      pushMessage({
        role: 'assistant',
        text: 'I collected the details, but could not reach the server to save the product. You can add it from the Products page.',
        isError: true,
      });
    }
  }

  async function sendIntakeTurn(history: ApiMessage[]) {
    try {
      const res = await fetch('/api/products/ai-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, bucket: 'monthly' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        pushMessage({
          role: 'assistant',
          text: data.error ?? 'Something went wrong — you can add the product from the Products page instead.',
          isError: true,
        });
        setMode('assistant');
        return;
      }

      pushMessage({ role: 'assistant', text: data.reply });
      setIntakeHistory([...history, { role: 'assistant', content: JSON.stringify(data) }]);

      if (data.done) {
        setMode('assistant');
        await createProductFromCollected(data.collected as CollectedProduct);
      }
    } catch {
      pushMessage({ role: 'assistant', text: GENERIC_ERROR_TEXT, isError: true });
      setMode('assistant');
    }
  }

  async function createZoneFromCollected(collected: CollectedZone) {
    if (!collected.name || collected.price == null || collected.locations.length === 0) {
      pushMessage({
        role: 'assistant',
        text: "I didn't end up with enough details to create the delivery zone — you can finish it from the Delivery Zones page.",
        isError: true,
      });
      return;
    }

    try {
      const res = await fetch('/api/admin/delivery-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: collected.name,
          price: collected.price,
          locations: collected.locations,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        pushMessage({
          role: 'assistant',
          text: `I collected the details, but creating the zone failed: ${body.error ?? 'please try again from the Delivery Zones page.'}`,
          isError: true,
        });
        return;
      }

      pushMessage({
        role: 'assistant',
        text: `Done — the "${collected.name}" delivery zone has been created.`,
      });
    } catch {
      pushMessage({
        role: 'assistant',
        text: 'I collected the details, but could not reach the server to save the zone. You can add it from the Delivery Zones page.',
        isError: true,
      });
    }
  }

  async function sendZoneIntakeTurn(history: ApiMessage[]) {
    try {
      const res = await fetch('/api/delivery-zones/ai-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, bucket: 'monthly' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        pushMessage({
          role: 'assistant',
          text: data.error ?? 'Something went wrong — you can add the delivery zone from the Delivery Zones page instead.',
          isError: true,
        });
        setMode('assistant');
        return;
      }

      pushMessage({ role: 'assistant', text: data.reply });
      setZoneIntakeHistory([...history, { role: 'assistant', content: JSON.stringify(data) }]);

      if (data.done) {
        setMode('assistant');
        await createZoneFromCollected(data.collected as CollectedZone);
      }
    } catch {
      pushMessage({ role: 'assistant', text: GENERIC_ERROR_TEXT, isError: true });
      setMode('assistant');
    }
  }

  async function sendAssistantTurn(history: ApiMessage[]) {
    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        pushMessage({
          role: 'assistant',
          text: result.error ?? 'The assistant is temporarily unavailable. Please try again shortly.',
          isError: true,
        });
        return;
      }

      pushMessage({
        role: 'assistant',
        text: result.answer,
        citedArticles: result.data?.citedArticles?.length ? result.data.citedArticles : undefined,
        nextSteps: result.data?.steps?.length ? result.data.steps : undefined,
      });
      setAssistantHistory([...history, { role: 'assistant', content: result.answer }]);

      if (result.intent === 'configuration_guidance' && result.data?.target === 'product_intake') {
        setMode('product_intake');
        setIntakeHistory([INTAKE_START]);
        await sendIntakeTurn([INTAKE_START]);
      } else if (result.intent === 'configuration_guidance' && result.data?.target === 'delivery_zone') {
        setMode('delivery_zone_intake');
        setZoneIntakeHistory([ZONE_INTAKE_START]);
        await sendZoneIntakeTurn([ZONE_INTAKE_START]);
      }
    } catch {
      pushMessage({ role: 'assistant', text: GENERIC_ERROR_TEXT, isError: true });
    }
  }

  async function handleSend(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setInput('');
    pushMessage({ role: 'user', text });
    markAssistantTried();
    setLoading(true);
    try {
      if (mode === 'product_intake') {
        const next = [...intakeHistory, { role: 'user' as const, content: text }];
        setIntakeHistory(next);
        await sendIntakeTurn(next);
      } else if (mode === 'delivery_zone_intake') {
        const next = [...zoneIntakeHistory, { role: 'user' as const, content: text }];
        setZoneIntakeHistory(next);
        await sendZoneIntakeTurn(next);
      } else {
        const next = [...assistantHistory, { role: 'user' as const, content: text }];
        setAssistantHistory(next);
        await sendAssistantTurn(next);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Floating bubble — sits above the mobile bottom nav (which is ~64px tall). */}
      <div
        className={cn(
          'fixed bottom-24 right-4 z-40 md:bottom-6 md:right-6',
          open && 'pointer-events-none opacity-0'
        )}
      >
        {showSpotlight && !open && (
          <div className="absolute bottom-full right-0 mb-3 w-56 rounded-xl border border-border bg-background p-3 text-xs shadow-xl">
            <button
              type="button"
              onClick={dismissSpotlight}
              className="absolute right-1.5 top-1.5 rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
            <p className="pr-4 font-medium text-foreground">👋 Try your AI Assistant</p>
            <p className="mt-0.5 text-muted-foreground">
              Ask about your store, get help with a feature, or find out what to set up next.
            </p>
            <div className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 border-b border-r border-border bg-background" />
          </div>
        )}
        {showSpotlight && !open && (
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
        )}
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            dismissSpotlight();
          }}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
          aria-label="Open DukaNest Assistant"
        >
          <SparklesIcon className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-[60] flex h-[85vh] w-full flex-col rounded-t-2xl border border-border bg-background shadow-2xl md:bottom-6 md:right-6 md:inset-x-auto md:h-[600px] md:w-[380px] md:rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">DukaNest Assistant</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Close assistant"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m) => (
              <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : m.isError
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-muted text-foreground'
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.citedArticles && m.citedArticles.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-border/50 pt-2">
                      {m.citedArticles.map((a) => (
                        <a
                          key={a.slug}
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs font-medium text-primary underline underline-offset-2"
                        >
                          {a.title} →
                        </a>
                      ))}
                    </div>
                  )}
                  {m.nextSteps && m.nextSteps.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
                      {m.nextSteps.map((s) => (
                        <a
                          key={s.id}
                          href={s.href}
                          target={s.href.startsWith('http') ? '_blank' : undefined}
                          rel={s.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                          className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                        >
                          {s.cta} →
                        </a>
                      ))}
                    </div>
                  )}
                  {m.photoPrompt && (
                    <div className="mt-2 border-t border-border/50 pt-2">
                      {(m.photoPrompt.status === 'pending' || m.photoPrompt.status === 'error') && (
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && m.photoPrompt) void handlePhotoSelected(m.id, m.photoPrompt.productId, file);
                                e.target.value = '';
                              }}
                            />
                            Upload photo
                          </label>
                          <button
                            type="button"
                            onClick={() => handleSkipPhoto(m.id)}
                            className="text-xs text-muted-foreground underline underline-offset-2"
                          >
                            Skip
                          </button>
                        </div>
                      )}
                      {m.photoPrompt.status === 'uploading' && (
                        <p className="text-xs text-muted-foreground">Uploading… {m.photoPrompt.progress ?? 0}%</p>
                      )}
                      {m.photoPrompt.status === 'done' && (
                        <p className="text-xs text-primary">Photo added to &quot;{m.photoPrompt.productName}&quot;. ✓</p>
                      )}
                      {m.photoPrompt.status === 'skipped' && (
                        <p className="text-xs text-muted-foreground">Skipped — you can add a photo later from the Products page.</p>
                      )}
                      {m.photoPrompt.status === 'error' && (
                        <p className="mt-1 text-xs text-destructive">{m.photoPrompt.errorText}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-3.5 py-2 text-sm text-muted-foreground">Thinking…</div>
              </div>
            )}
            {/* Suggested prompts — only while the conversation is still just the welcome message, so a first-time user learns what to ask by tapping instead of guessing. */}
            {mode === 'assistant' && messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void handleSend(prompt)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-border p-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your store…"
              disabled={loading}
              className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            <Button
              type="button"
              size="icon"
              onClick={() => void handleSend()}
              disabled={loading || !input.trim()}
              className="shrink-0 rounded-full"
              aria-label="Send message"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
