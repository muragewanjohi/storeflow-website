/**
 * Storefront Error Components
 * 
 * Reusable error and empty state components for storefront pages
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ExclamationTriangleIcon, 
  ShoppingBagIcon,
  MagnifyingGlassIcon,
  HomeIcon 
} from '@heroicons/react/24/outline';

interface ErrorStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

/**
 * Error State Component
 */
export function ErrorState({
  title = 'Something went wrong',
  message = 'We encountered an error while loading this page. Please try again.',
  actionLabel = 'Go Home',
  actionHref = '/',
  onAction,
}: Readonly<ErrorStateProps>) {
  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            <p className="text-muted-foreground mb-6">{message}</p>
            {onAction ? (
              <Button onClick={onAction}>{actionLabel}</Button>
            ) : (
              <Link href={actionHref}>
                <Button>{actionLabel}</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Empty State Component
 */
export function EmptyState({
  title,
  message,
  icon: Icon = ShoppingBagIcon,
  actionLabel,
  actionHref,
  onAction,
}: {
  title: string;
  message: string;
  icon?: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{message}</p>
      {actionLabel && (
        onAction ? (
          <Button onClick={onAction}>{actionLabel}</Button>
        ) : actionHref ? (
          <Link href={actionHref}>
            <Button>{actionLabel}</Button>
          </Link>
        ) : null
      )}
    </div>
  );
}

/**
 * Not Found State Component
 */
export function NotFoundState({
  title = 'Page Not Found',
  message = "The page you're looking for doesn't exist.",
  actionLabel = 'Go Home',
  actionHref = '/',
}: Readonly<{
  title?: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
}>) {
  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MagnifyingGlassIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            <p className="text-muted-foreground mb-6">{message}</p>
            <Link href={actionHref}>
              <Button>
                <HomeIcon className="w-4 h-4 mr-2" />
                {actionLabel}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

