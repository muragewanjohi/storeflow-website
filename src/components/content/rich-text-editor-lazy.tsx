/**
 * Lazy-loaded Rich Text Editor
 * 
 * Lazy loads TipTap editor to reduce initial bundle size
 * 
 * Day 38: Performance Optimization - Code Splitting
 */

import dynamic from 'next/dynamic';

// Lazy load the rich text editor (TipTap is heavy)
const RichTextEditor = dynamic(
  () => import('./rich-text-editor'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[200px] border rounded-md p-4 animate-pulse bg-muted">
        <div className="h-4 bg-background rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-background rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-background rounded w-5/6"></div>
      </div>
    ),
  }
);

export default RichTextEditor;

