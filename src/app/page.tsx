import Image from "next/image";
import Link from "next/link";
import { db, seasons, members } from '@/lib/db';
import { desc, eq } from 'drizzle-orm';

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

export default async function Home() {
  const latestChampion = await getLatestChampion();

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
