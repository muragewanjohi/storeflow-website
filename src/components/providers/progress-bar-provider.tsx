/**
 * Progress Bar Provider
 * 
 * Displays a loading bar at the top of the page during navigation
 */

'use client';

import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';

export default function ProgressBarProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ProgressBar
        height="3px"
        color="hsl(var(--primary))"
        options={{ showSpinner: false }}
        shallowRouting
      />
    </>
  );
}
