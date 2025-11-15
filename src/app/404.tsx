/**
 * 404 Page - Tenant Not Found
 * 
 * Shown when tenant cannot be resolved from hostname
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-gray-700">
          Store Not Found
        </h2>
        <p className="mt-4 text-gray-600">
          The store you're looking for doesn't exist or has been removed.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

