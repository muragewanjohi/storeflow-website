/**
 * Analytics Provider Component
 * 
 * Wrapper component that includes the analytics tracker
 * Use this in layouts that need analytics tracking
 */

'use client';

import AnalyticsTracker from './analytics-tracker';

export default function AnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AnalyticsTracker />
      {children}
    </>
  );
}
