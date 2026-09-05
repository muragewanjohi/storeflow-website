'use client';

import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { BookOpen } from 'lucide-react';

interface ContextualHelpPanelProps {
  title: string;
  description: string;
  tips?: string[];
  learnMoreHref?: string;
  triggerLabel?: string;
}

export default function ContextualHelpPanel({
  title,
  description,
  tips = [],
  learnMoreHref,
  triggerLabel = 'Open Help',
}: Readonly<ContextualHelpPanelProps>) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" />
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="left-auto top-0 right-0 translate-x-0 translate-y-0 h-screen w-full max-w-md rounded-none border-l border-t-0 border-r-0 border-b-0 data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-top-0">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="leading-relaxed">{description}</DialogDescription>
        </DialogHeader>
        {tips.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Quick tips</p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
              {tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
        {learnMoreHref && (
          <Link href={learnMoreHref} className="text-sm font-medium text-[#0025cc] hover:underline">
            Open full guide
          </Link>
        )}
      </DialogContent>
    </Dialog>
  );
}
