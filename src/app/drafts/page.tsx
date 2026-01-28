import Link from 'next/link';
import { db, draftPicks } from '@/lib/db';
import { desc, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function DraftIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

async function getDraftYears() {
  try {
    const results = await db
      .select({
        year: draftPicks.year,
        pickCount: sql<number>`count(*)::int`,
      })
      .from(draftPicks)
      .groupBy(draftPicks.year)
      .orderBy(desc(draftPicks.year));

    return results;
  } catch {
    return [];
  }
}

export default async function DraftsPage() {
  const draftYears = await getDraftYears();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-10">
        <div className="flex-shrink-0 w-14 h-14 rounded-full bg-lake-blue-light/30 flex items-center justify-center">
          <DraftIcon className="w-7 h-7 text-lake-gold" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-lake-ice">Draft History</h1>
          <p className="text-lake-ice/60 text-sm">
            Prospect drafts from every season
          </p>
        </div>
      </div>

      {/* Draft Years Grid */}
      {draftYears.length === 0 ? (
        <div className="text-center py-16 bg-lake-blue/20 rounded-lg border border-lake-blue-light/20">
          <DraftIcon className="w-12 h-12 text-lake-ice/30 mx-auto mb-4" />
          <p className="text-lake-ice/50 mb-2">No draft data yet</p>
          <p className="text-lake-ice/30 text-sm">
            Check back once draft history is imported.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {draftYears.map((draft) => (
            <Link
              key={draft.year}
              href={`/drafts/${draft.year}`}
              className="group bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6 hover:bg-lake-blue/50 hover:border-lake-gold/30 transition-all"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-lake-gold group-hover:text-lake-gold/90 mb-2">
                  {draft.year}
                </div>
                <div className="text-lake-ice/50 text-sm">
                  {draft.pickCount} picks
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
