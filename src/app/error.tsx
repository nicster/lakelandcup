'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { LakeCupIcon } from '@/components/icons/HockeyIcons';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md text-center">
        <LakeCupIcon className="w-16 h-16 text-lake-error/40 mx-auto mb-6" />
        <p className="text-[clamp(0.7rem,0.65rem+0.2vw,0.85rem)] uppercase tracking-[0.25em] text-lake-gold mb-3">
          Power play
        </p>
        <h1 className="text-[clamp(1.875rem,1.4rem+1.5vw,2.5rem)] font-bold text-lake-ice tracking-tight leading-tight mb-3">
          Something went wrong.
        </h1>
        <p className="text-lake-ice-muted mb-8">
          We couldn&rsquo;t load this page. The commissioner has been notified.
        </p>
        <div className="w-12 h-0.5 bg-lake-gold mx-auto mb-8" />
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-md bg-lake-gold text-lake-blue-dark font-semibold hover:bg-lake-gold/90 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-md text-lake-gold hover:text-lake-gold/80 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
