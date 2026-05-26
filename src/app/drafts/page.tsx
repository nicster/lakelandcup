import Link from 'next/link';
import { db, draftPicks } from '@/lib/db';
import { desc, sql } from 'drizzle-orm';
import { PuckIcon } from '@/components/icons/HockeyIcons';

export const revalidate = 3600;

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
      <header className="mb-10">
        <p className="text-[clamp(0.7rem,0.65rem+0.2vw,0.85rem)] uppercase tracking-[0.25em] text-lake-gold mb-3">Prospect Drafts</p>
        <h1 className="text-[clamp(1.875rem,1.4rem+1.5vw,2.5rem)] font-bold text-lake-ice tracking-tight leading-tight">Draft History</h1>
        <p className="text-[clamp(1rem,0.92rem+0.25vw,1.125rem)] text-lake-ice-muted mt-2 max-w-xl">
          Every prospect class, from every season.
        </p>
        <div className="w-12 h-0.5 bg-lake-gold mt-6" />
      </header>

      {/* Draft Years Grid */}
      {draftYears.length === 0 ? (
        <div className="text-center py-16 bg-lake-blue/20 rounded-lg border border-lake-blue-light/20">
          <PuckIcon className="w-12 h-12 text-lake-ice-muted mx-auto mb-4" />
          <p className="text-lake-ice-muted mb-2">No draft data yet</p>
          <p className="text-lake-ice-muted text-sm">
            Check back once draft history is imported.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {draftYears.map((draft, index) => (
            <Link
              key={draft.year}
              href={`/drafts/${draft.year}`}
              className={`group rounded-lg border p-6 transition-all ${
                index === 0
                  ? 'bg-gradient-to-b from-lake-blue/45 to-lake-blue/20 border-lake-gold/40 shadow-lg shadow-lake-blue-darkest/40 hover:from-lake-blue/60'
                  : 'bg-lake-blue/30 border-lake-blue-light/20 hover:bg-lake-blue/50 hover:border-lake-gold/30'
              }`}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-lake-gold group-hover:text-lake-gold/90 mb-2">
                  {draft.year}
                </div>
                <div className="text-lake-ice-muted text-sm">
                  {draft.pickCount} picks
                </div>
                {index === 0 && (
                  <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-lake-gold/80">
                    Latest
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
