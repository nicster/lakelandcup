import Image from "next/image";
import { db, seasons, members } from '@/lib/db';
import { desc, eq } from 'drizzle-orm';

async function getLatestChampion() {
  try {
    const result = await db
      .select({
        year: seasons.year,
        champion: {
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
          width={200}
          height={200}
          className="mx-auto drop-shadow-2xl mb-4"
          priority
        />
        <p className="text-lake-ice/40 text-sm tracking-widest uppercase mb-8">
          Est. 2013
        </p>

        {/* Defending Champion */}
        {latestChampion?.champion && (
          <div className="pt-8 border-t border-lake-blue-light/20">
            <p className="text-sm text-lake-gold uppercase tracking-wider mb-3">
              {latestChampion.year} Champion
            </p>
            <div className="flex items-center justify-center gap-3">
              {latestChampion.champion.logo && (
                <Image
                  src={`/images/teams/${latestChampion.champion.logo}`}
                  alt={`${latestChampion.champion.name} logo`}
                  width={48}
                  height={48}
                  className="rounded-full border-2 border-lake-gold/50"
                />
              )}
              <h2 className="text-2xl font-bold text-lake-ice">
                {latestChampion.champion.name}
              </h2>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
