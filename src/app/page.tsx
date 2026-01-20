import Image from "next/image";
import Link from "next/link";
import { db, seasons, members } from '@/lib/db';
import { desc, eq } from 'drizzle-orm';

// Simple SVG icons
function TrophyIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
    </svg>
  );
}

function BookIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function DraftIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function TradeIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function ArrowRightIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

async function getLatestChampion() {
  try {
    const result = await db
      .select({
        year: seasons.year,
        champion: {
          name: members.name,
          owner: members.owner,
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

async function getSeasonCount() {
  try {
    const result = await db.select().from(seasons);
    return result.length;
  } catch {
    return 0;
  }
}

export default async function Home() {
  const latestChampion = await getLatestChampion();
  const seasonCount = await getSeasonCount();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8">
            <Image
              src="/images/lakelandcup_2.png"
              alt="Lakeland Cup"
              width={200}
              height={200}
              className="mx-auto drop-shadow-2xl"
              priority
            />
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-lake-ice mb-4">
            Lakeland Cup
          </h1>
          <p className="text-xl text-lake-ice/60 mb-8">
            Fantasy Hockey Dynasty League
          </p>

          {/* Stats row */}
          <div className="flex justify-center gap-8 md:gap-12 text-center mb-12">
            <div>
              <p className="text-3xl font-bold text-lake-gold">{seasonCount || '11+'}</p>
              <p className="text-sm text-lake-ice/50">Seasons</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-lake-ice">12</p>
              <p className="text-sm text-lake-ice/50">Teams</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-lake-ice">2013</p>
              <p className="text-sm text-lake-ice/50">Established</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/hall-of-fame"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-lake-gold text-lake-blue-dark font-semibold rounded-lg hover:bg-lake-gold/90 transition-colors"
            >
              <TrophyIcon className="w-5 h-5" />
              Hall of Fame
            </Link>
            <Link
              href="/rules"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-lake-blue-light/30 text-lake-ice font-semibold rounded-lg border border-lake-blue-light/30 hover:bg-lake-blue-light/40 transition-colors"
            >
              <BookIcon className="w-5 h-5" />
              League Rules
            </Link>
          </div>
        </div>
      </section>

      {/* Defending Champion (if available) */}
      {latestChampion?.champion && (
        <section className="py-12 px-4 bg-lake-blue/20 border-y border-lake-blue-light/20">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-sm text-lake-gold uppercase tracking-wider mb-2">
              {latestChampion.year} Champion
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-lake-ice mb-1">
              {latestChampion.champion.name}
            </h2>
            <p className="text-lake-ice/60">{latestChampion.champion.owner}</p>
          </div>
        </section>
      )}

      {/* Quick Links / Features */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-lake-ice/50 text-center mb-8">
            League Resources
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hall of Fame */}
            <Link
              href="/hall-of-fame"
              className="group p-6 bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 hover:bg-lake-blue/40 hover:border-lake-gold/30 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-lake-gold/20 flex items-center justify-center flex-shrink-0">
                  <TrophyIcon className="w-6 h-6 text-lake-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lake-ice mb-1 group-hover:text-lake-gold transition-colors">
                    Hall of Fame
                  </h3>
                  <p className="text-sm text-lake-ice/50">
                    Past champions and season history
                  </p>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-lake-ice/30 group-hover:text-lake-gold transition-colors" />
              </div>
            </Link>

            {/* Rules */}
            <Link
              href="/rules"
              className="group p-6 bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 hover:bg-lake-blue/40 hover:border-lake-gold/30 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-lake-blue-light/30 flex items-center justify-center flex-shrink-0">
                  <BookIcon className="w-6 h-6 text-lake-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lake-ice mb-1 group-hover:text-lake-gold transition-colors">
                    League Manual
                  </h3>
                  <p className="text-sm text-lake-ice/50">
                    Official rules and regulations
                  </p>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-lake-ice/30 group-hover:text-lake-gold transition-colors" />
              </div>
            </Link>

            {/* Drafts - Coming Soon */}
            <div className="p-6 bg-lake-blue/20 rounded-lg border border-lake-blue-light/10 opacity-60">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-lake-blue-light/20 flex items-center justify-center flex-shrink-0">
                  <DraftIcon className="w-6 h-6 text-lake-ice/50" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lake-ice/70 mb-1">
                    Draft History
                    <span className="ml-2 text-xs font-normal text-lake-ice/40">Coming Soon</span>
                  </h3>
                  <p className="text-sm text-lake-ice/40">
                    Draft boards, lottery, and protection status
                  </p>
                </div>
              </div>
            </div>

            {/* Trades - Coming Soon */}
            <div className="p-6 bg-lake-blue/20 rounded-lg border border-lake-blue-light/10 opacity-60">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-lake-blue-light/20 flex items-center justify-center flex-shrink-0">
                  <TradeIcon className="w-6 h-6 text-lake-ice/50" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lake-ice/70 mb-1">
                    Trade Tracker
                    <span className="ml-2 text-xs font-normal text-lake-ice/40">Coming Soon</span>
                  </h3>
                  <p className="text-sm text-lake-ice/40">
                    Historical trades and transactions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
