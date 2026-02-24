import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
};

export default function AdsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
