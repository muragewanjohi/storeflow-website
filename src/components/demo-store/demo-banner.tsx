/**
 * Demo Store Banner
 * 
 * Displays a banner on demo stores to inform visitors
 */

'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export function DemoStoreBanner() {
  return (
    <Alert className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
      <InfoIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertDescription className="text-blue-800 dark:text-blue-200">
        <strong>Demo Store:</strong> This is a demonstration store showcasing our platform features. 
        All products and content are for showcase purposes only. No real purchases can be made.
      </AlertDescription>
    </Alert>
  );
}

