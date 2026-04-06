import Image from "next/image";
import Link from "next/link";
import { db, seasons, members, lotteryResults } from '@/lib/db';
import { desc, eq, and } from 'drizzle-orm';
import Confetti from '@/components/Confetti';

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
          <>
            <Confetti />
            <div className="pt-10 border-t border-lake-blue-light/20">
              <div className="flex items-center justify-center gap-2 mb-1">
                <svg className="w-4 h-4 text-lake-gold animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                </svg>
                <p className="text-base text-lake-gold uppercase tracking-wider animate-pulse">
                  {latestChampion.year} Champions
                </p>
                <svg className="w-4 h-4 text-lake-gold animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                </svg>
              </div>
              <p className="text-lake-ice/40 text-xs tracking-widest uppercase mb-6">Lakeland Cup</p>
              <Link
                href={`/teams/${latestChampion.champion.id}`}
                className="flex items-center justify-center gap-4 hover:opacity-80 transition-opacity"
              >
                {latestChampion.champion.logo && (
                  <Image
                    src={`/images/teams/${latestChampion.champion.logo}`}
                    alt={`${latestChampion.champion.name} logo`}
                    width={80}
                    height={80}
                    className="rounded-full border-2 border-lake-gold champion-glow"
                  />
                )}
                <h2 className="text-3xl font-bold text-lake-gold">
                  {latestChampion.champion.name}
                </h2>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
