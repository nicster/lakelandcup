import Image from "next/image";
import Link from "next/link";
import { db, seasons, members, lotteryResults } from '@/lib/db';
import { desc, eq, and } from 'drizzle-orm';
import Confetti from '@/components/Confetti';
import { FaceOffIcon } from '@/components/icons/HockeyIcons';

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
        <h1 className="sr-only">Lakeland Cup</h1>
        <Image
          src="/images/lakelandcup_2.png"
          alt="Lakeland Cup"
          width={280}
          height={280}
          className="mx-auto drop-shadow-2xl mb-6"
          priority
        />
        <p className="text-lake-ice-muted text-base tracking-widest uppercase mb-10">
          Est. 2013
        </p>

        {/* Current Year Lottery */}
        {currentLottery && (
          <div className="mb-10">
            <Link
              href="/lottery"
              className="inline-flex items-center gap-2 px-6 py-3 bg-lake-gold/20 border border-lake-gold/40 rounded-lg text-lake-gold hover:bg-lake-gold/30 transition-colors"
            >
              <FaceOffIcon className="w-5 h-5" />
              {currentLottery.year} Draft Lottery Results
            </Link>
          </div>
        )}

        {/* Defending Champion */}
        {latestChampion?.champion && (
          <>
            <Confetti />
            <div className="champion-reveal pt-10 border-t border-lake-blue-light/20">
              <p className="text-base text-lake-gold uppercase tracking-[0.25em] mb-1">
                {latestChampion.year} Champions
              </p>
              <p className="text-lake-ice-muted text-xs tracking-widest uppercase mb-6">Lakeland Cup</p>
              <Link
                href={`/teams/${latestChampion.champion.id}`}
                className="inline-flex items-center justify-center gap-4 hover:opacity-80 transition-opacity"
              >
                {latestChampion.champion.logo && (
                  <span className="champion-aura relative inline-block">
                    <Image
                      src={`/images/teams/${latestChampion.champion.logo}`}
                      alt={`${latestChampion.champion.name} logo`}
                      width={80}
                      height={80}
                      className="rounded-full border-2 border-lake-gold relative z-10"
                    />
                  </span>
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
