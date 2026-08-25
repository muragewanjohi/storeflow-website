'use client';

/**
 * DA.27 (AI Phase 7.2) — "Draft with AI" control for the Simple Editor tab
 * of the page create/edit form. Generate-then-review only: fills the
 * title/content fields in the form for the merchant to read, edit, and
 * explicitly save — never auto-saves or auto-publishes anything itself.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

type LegalPageType = 'terms' | 'privacy' | 'returns';

const PAGE_TYPE_LABELS: Record<LegalPageType, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  returns: 'Returns & Refunds Policy',
};

export default function LegalPageDraftButton({
  onDrafted,
}: Readonly<{ onDrafted: (draft: { title: string; contentHtml: string }) => void }>) {
  const [pageType, setPageType] = useState<LegalPageType>('terms');
  const [loading, setLoading] = useState(false);

  async function handleDraft() {
    setLoading(true);
    try {
      const response = await fetch('/api/pages/ai-legal-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageType, bucket: 'setup' }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || 'Drafting failed');
      onDrafted({ title: body.title, contentHtml: body.contentHtml });
      toast.success('Draft generated — please review before saving.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Drafting failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <Select value={pageType} onValueChange={(v) => setPageType(v as LegalPageType)}>
        <SelectTrigger className="w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PAGE_TYPE_LABELS) as LegalPageType[]).map((key) => (
            <SelectItem key={key} value={key}>
              {PAGE_TYPE_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" variant="outline" size="sm" onClick={handleDraft} disabled={loading}>
        <Sparkles className="h-4 w-4 mr-2" />
        {loading ? 'Drafting...' : 'Draft with AI'}
      </Button>
      <span className="text-xs text-muted-foreground">Replaces title &amp; content below with an editable draft — review before saving.</span>
    </div>
  );
}
