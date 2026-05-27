import Image from 'next/image';
import Link from 'next/link';
import { db, members, seasons } from '@/lib/db';
import {
  TEAM_TIMELINES,
  ACTIVE_SEASON,
  firstSeasonOf,
} from '@/lib/franchises';

export const dynamic = 'force-dynamic';

interface Plaque {
  id: number;
  name: string;
  owner: string | null;
  formerNames: string[];
  logo: string | null;
  foundedYear: string; // "2013"
  cups: number;
}

async function getActiveFranchises(): Promise<Plaque[]> {
  try {
    const [allMembers, allSeasons] = await Promise.all([
      db.select().from(members),
      db.select({ championId: seasons.championId }).from(seasons),
    ]);

    // Aggregate championship counts by member.id.
    const cupsById = new Map<number, number>();
    for (const s of allSeasons) {
      if (s.championId == null) continue;
      cupsById.set(s.championId, (cupsById.get(s.championId) ?? 0) + 1);
    }

    const byName = new Map(allMembers.map((m) => [m.name, m]));

    // Active = timeline includes ACTIVE_SEASON.
    const activeNames = Object.entries(TEAM_TIMELINES)
      .filter(([, t]) => t.seasons.includes(ACTIVE_SEASON))
      .map(([name]) => name);

    const plaques: Plaque[] = [];
    for (const name of activeNames) {
      const m = byName.get(name);
      if (!m) continue;
      const timeline = TEAM_TIMELINES[name];
      const formerNames = timeline.formerNames ?? [];

      // Sum cups across the franchise's current row AND any predecessor rows
      // that may carry attribution in the seasons table.
      let cups = cupsById.get(m.id) ?? 0;
      for (const fn of formerNames) {
        const fm = byName.get(fn);
        if (fm) cups += cupsById.get(fm.id) ?? 0;
      }

      const first = firstSeasonOf(name) ?? '';
      plaques.push({
        id: m.id,
        name: m.name,
        owner: m.owner,
        formerNames,
        logo: m.logo,
        foundedYear: first.split('-')[0],
        cups,
      });
    }

    // Founding year ascending, then alphabetical — older franchises lead.
    plaques.sort((a, b) => {
      const yearDiff = parseInt(a.foundedYear, 10) - parseInt(b.foundedYear, 10);
      if (yearDiff !== 0) return yearDiff;
      return a.name.localeCompare(b.name);
    });

    return plaques;
  } catch (err) {
    console.error('DB query failed:', err);
    return [];
  }
}

// A small filled pip per championship. Up to 4 visible; anything beyond
// shows as "+N" so the row stays tight on narrow tiles.
function CupPips({ count }: { count: number }) {
  if (count === 0) return null;
  const visible = Math.min(count, 4);
  const overflow = count - visible;
  return (
    <div
      className="flex items-center justify-center gap-1"
      aria-label={`${count} ${count === 1 ? 'championship' : 'championships'}`}
    >
      {Array.from({ length: visible }).map((_, i) => (
        <span
          key={i}
          className="block w-1.5 h-1.5 rounded-full bg-lake-gold"
          aria-hidden="true"
        />
      ))}
      {overflow > 0 && (
        <span
          className="text-[10px] font-medium text-lake-gold tabular-nums leading-none"
          aria-hidden="true"
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

function FranchisePlaque({ plaque, priority }: { plaque: Plaque; priority?: boolean }) {
  return (
    <Link
      href={`/teams/${plaque.id}`}
      className="group relative flex flex-col items-center text-center px-4 pt-7 pb-7
                 h-full min-h-[280px]
                 bg-lake-blue/15 hover:bg-lake-blue/30 transition-colors duration-300
                 rounded-md overflow-hidden"
      aria-label={plaque.name}
    >
      {/* Founded year, pinned top-right */}
      <span className="absolute top-2.5 right-3 text-[11px] tracking-[0.16em] uppercase text-lake-ice-muted tabular-nums">
        Est. {plaque.foundedYear}
      </span>

      {/* Circular plinth — overflow-hidden + rounded-full clips the logo's
          square PNG bounding box to a circle so every crest reads as a
          medallion regardless of source artwork shape. object-cover fills
          the full circle (any whitespace already baked into the source
          PNG serves as the breathing room). First-row plaques ship with
          priority so the LCP candidate isn't lazy-loaded. */}
      <div
        className="relative w-[120px] h-[120px] mb-4 rounded-full overflow-hidden
                   bg-lake-blue-dark/40 ring-1 ring-lake-gold/35
                   transition-transform duration-300 group-hover:scale-[1.04]
                   group-hover:ring-lake-gold/60"
      >
        {plaque.logo ? (
          <Image
            src={`/images/teams/${plaque.logo}`}
            alt=""
            fill
            sizes="120px"
            priority={priority}
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full" aria-hidden="true" />
        )}
      </div>

      {/* Hairline gold rule between logo and nameplate */}
      <div className="w-8 h-px bg-lake-gold/50 mb-3" aria-hidden="true" />

      {/* Nameplate */}
      <h3 className="text-base font-semibold text-lake-ice group-hover:text-lake-gold transition-colors leading-tight">
        {plaque.name}
      </h3>
      {plaque.owner && plaque.owner !== 'Unknown' && (
        <p className="text-xs text-lake-ice-muted mt-1 italic">{plaque.owner}</p>
      )}
      {plaque.formerNames.length > 0 && (
        <p className="text-[11px] text-lake-ice-muted mt-2 leading-snug">
          fka {plaque.formerNames.join(' · ')}
        </p>
      )}

      {/* Pushes the championship row to the bottom of the tile so every
          plaque shares the same baseline regardless of content length. */}
      <div className="flex-1" aria-hidden="true" />

      {/* Championship row — fixed-height slot. Even when a franchise has
          zero cups, the slot reserves the same space so tile heights match. */}
      <div className="h-4 mt-3 flex items-center justify-center">
        {plaque.cups > 0 && <CupPips count={plaque.cups} />}
      </div>
    </Link>
  );
}

export default async function TeamsIndexPage() {
  const plaques = await getActiveFranchises();
  const totalCups = plaques.reduce((n, p) => n + p.cups, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <header className="mb-12">
        <p className="text-[clamp(0.7rem,0.65rem+0.2vw,0.85rem)] uppercase tracking-[0.25em] text-lake-gold mb-3">
          The Clubhouse
        </p>
        <h1 className="text-[clamp(1.875rem,1.4rem+1.5vw,2.5rem)] font-bold text-lake-ice tracking-tight leading-tight">
          Franchises
        </h1>
        <p className="text-[clamp(1rem,0.92rem+0.25vw,1.125rem)] text-lake-ice-muted mt-2 max-w-xl">
          Twelve crests, twelve GMs. Click any to enter the room.
        </p>
        <div className="w-12 h-0.5 bg-lake-gold mt-6" />
      </header>

      {plaques.length === 0 ? (
        <div className="text-center py-16 bg-lake-blue/20 rounded-lg border border-lake-blue-light/20">
          <p className="text-lake-ice-muted">No active franchises on record.</p>
        </div>
      ) : (
        <>
          {/* Section meta — small, before the grid. Sets the rhythm: the
              grid below is the page's center of gravity. */}
          <div className="flex items-baseline justify-between mb-6 border-b border-lake-blue-light/15 pb-3">
            <h2 className="text-xs uppercase tracking-[0.22em] text-lake-ice-muted">
              Active &middot; {plaques.length}
            </h2>
            {totalCups > 0 && (
              <span className="text-xs text-lake-ice-muted tabular-nums">
                {totalCups} cup{totalCups === 1 ? '' : 's'} raised
              </span>
            )}
          </div>

          <ul
            role="list"
            className="grid gap-3 auto-rows-fr grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
            {plaques.map((p, i) => (
              <li key={p.id}>
                {/* The first row at the widest breakpoint (4 cols) is the
                    LCP candidate — preload those logos. */}
                <FranchisePlaque plaque={p} priority={i < 4} />
              </li>
            ))}
          </ul>

          {/* Legend for the cup pips. */}
          <p className="text-[11px] text-lake-ice-muted mt-8 max-w-prose leading-relaxed">
            Gold pips count Lakeland Cups raised.
          </p>
        </>
      )}
    </div>
  );
}
