'use client';

import { BRAND, PLAY_STORE_URL } from '@/lib/marketing/constants';
import { trackEvent } from '@/lib/analytics/google-analytics';

type PlayStoreBadgeProps = Readonly<{
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}>;

const sizeClasses = {
  sm: 'h-10 px-3 gap-2 text-xs',
  md: 'h-12 px-4 gap-2.5 text-sm',
  lg: 'h-14 px-5 gap-3 text-base',
} as const;

export function PlayStoreBadge({
  variant = 'dark',
  size = 'md',
  className = '',
}: PlayStoreBadgeProps) {
  const isDark = variant === 'dark';

  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        trackEvent('play_store_click', {
          location: 'marketing',
          variant,
        })
      }
      className={`group inline-flex items-center rounded-xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${sizeClasses[size]} ${
        isDark
          ? 'border-white/20 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
          : 'border-[#0c0528]/10 bg-[#0c0528] text-white hover:bg-[#0c0528]/90'
      } ${className}`}
      aria-label="Get DukaNest on Google Play"
    >
      <GooglePlayIcon className={size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-7 w-7' : 'h-6 w-6'} />
      <span className="flex flex-col items-start leading-none">
        <span className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-white/70' : 'text-white/60'}`}>
          Get it on
        </span>
        <span className="font-semibold">Google Play</span>
      </span>
    </a>
  );
}

function GooglePlayIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.6 1.8c-.3.2-.6.6-.6 1.1v18.2c0 .5.3.9.6 1.1l.1.1 10.2-10.2v-.2L3.7 1.7l-.1.1z"
        fill={BRAND.primary}
      />
      <path
        d="M16.3 12.9l-2.7-2.7-.2.2v.2l2.7 2.7 3.2-1.8c.9-.5.9-1.3 0-1.8l-3.2-1.8z"
        fill="#34A853"
      />
      <path
        d="M13.4 10.2L3.6 20l.1.1c.4.3 1 .3 1.6-.1l8.1-4.7-3.2-2.7v-.1z"
        fill="#FBBC04"
      />
      <path
        d="M13.4 13.8l3.2-2.7L5.3 1.9c-.6-.4-1.2-.4-1.6-.1l9.7 12z"
        fill="#EA4335"
      />
    </svg>
  );
}
