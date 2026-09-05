'use client';

import Link from 'next/link';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ContextualHelpProps {
  title: string;
  description: string;
  learnMoreHref?: string;
  learnMoreLabel?: string;
}

export default function ContextualHelp({
  title,
  description,
  learnMoreHref,
  learnMoreLabel = 'Learn more',
}: Readonly<ContextualHelpProps>) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Help: ${title}`}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <QuestionMarkCircleIcon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        {learnMoreHref && (
          <Link
            href={learnMoreHref}
            className="inline-block text-sm font-medium text-[#0025cc] hover:underline"
          >
            {learnMoreLabel}
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}
