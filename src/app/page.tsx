import Image from "next/image";
import Link from "next/link";
import { db, seasons, members, lotteryResults } from '@/lib/db';
import { desc, eq, and } from 'drizzle-orm';

// Force dynamic rendering to fetch fresh data on each request
export const dynamic = 'force-dynamic';

async function getLatestChampion() {
  try {
    const result = await db
      .select({
        year: seasons.year,
        champion: {
          id: members.id,
          name: members.name,
          owner: members.owner,
          logo: members.logo,
        },
      })
      .from(seasons)
      .leftJoin(members, eq(seasons.championId, members.id))
      .orderBy(desc(seasons.year))
      .limit(1);

    return result[0] || null;
  } catch {
    return null;
  }
}

async function getCurrentYearLottery() {
  try {
    const currentYear = new Date().getFullYear().toString();
    const result = await db
      .select({ year: lotteryResults.year })
      .from(lotteryResults)
      .where(and(
        eq(lotteryResults.year, currentYear),
        eq(lotteryResults.isPublished, true)
      ))
      .limit(1);

    return result[0] || null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const [latestChampion, currentLottery] = await Promise.all([
    getLatestChampion(),
    getCurrentYearLottery(),
  ]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="text-center">
        <Image
          src="/images/lakelandcup_2.png"
          alt="Lakeland Cup"
          width={280}
          height={280}
          className="mx-auto drop-shadow-2xl mb-6"
          priority
        />
        <p className="text-lake-ice/40 text-base tracking-widest uppercase mb-10">
          Est. 2013
        </p>

        {/* Current Year Lottery */}
        {currentLottery && (
          <div className="mb-10">
            <Link
              href="/lottery"
              className="inline-flex items-center gap-2 px-6 py-3 bg-lake-gold/20 border border-lake-gold/40 rounded-lg text-lake-gold hover:bg-lake-gold/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />
              </svg>
              {currentLottery.year} Draft Lottery Results
            </Link>
          </div>
        )}

        {/* Defending Champion */}
        {latestChampion?.champion && (
          <div className="pt-10 border-t border-lake-blue-light/20">
            <p className="text-base text-lake-gold uppercase tracking-wider mb-4">
              {latestChampion.year} Champion
            </p>
            <Link
              href={`/teams/${latestChampion.champion.id}`}
              className="flex items-center justify-center gap-4 hover:opacity-80 transition-opacity"
            >
              {latestChampion.champion.logo && (
                <Image
                  src={`/images/teams/${latestChampion.champion.logo}`}
                  alt={`${latestChampion.champion.name} logo`}
                  width={64}
                  height={64}
                  className="rounded-full border-2 border-lake-gold/50"
                />
              )}
              <h2 className="text-3xl font-bold text-lake-ice hover:text-lake-gold transition-colors">
                {latestChampion.champion.name}
              </h2>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
