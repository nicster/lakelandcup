import Link from 'next/link';
import { LakeCupIcon } from '@/components/icons/HockeyIcons';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md text-center">
        <LakeCupIcon className="w-16 h-16 text-lake-ice/20 mx-auto mb-6" />
        <p className="text-[clamp(0.7rem,0.65rem+0.2vw,0.85rem)] uppercase tracking-[0.25em] text-lake-gold mb-3">
          Off-side
        </p>
        <h1 className="text-[clamp(1.875rem,1.4rem+1.5vw,2.5rem)] font-bold text-lake-ice tracking-tight leading-tight mb-3">
          This page isn&rsquo;t on the ice.
        </h1>
        <p className="text-lake-ice-muted mb-8">
          The link may have changed or the team you&rsquo;re looking for has been waived.
        </p>
        <div className="w-12 h-0.5 bg-lake-gold mx-auto mb-8" />
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
          <Link href="/" className="text-lake-gold hover:text-lake-gold/80 transition-colors">
            Home
          </Link>
          <Link href="/hall-of-fame" className="text-lake-gold hover:text-lake-gold/80 transition-colors">
            Hall of Fame
          </Link>
          <Link href="/history" className="text-lake-gold hover:text-lake-gold/80 transition-colors">
            History
          </Link>
          <Link href="/drafts" className="text-lake-gold hover:text-lake-gold/80 transition-colors">
            Drafts
          </Link>
        </div>
      </div>
    </div>
  );
}
