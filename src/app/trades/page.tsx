import Image from 'next/image';
import Link from 'next/link';
import { db, trades, tradeAssets, members } from '@/lib/db';
import { desc, asc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { CrossedSticksIcon } from '@/components/icons/HockeyIcons';

export const dynamic = 'force-dynamic';

type AssetRow = {
  id: number;
  fromTeamId: number;
  fromTeamName: string | null;
  fromTeamLogo: string | null;
  toTeamId: number;
  toTeamName: string | null;
  toTeamLogo: string | null;
  assetKind: string;
  pickYear: string | null;
  pickRound: number | null;
  pickOriginalTeamName: string | null;
  playerName: string | null;
  description: string | null;
  condition: string | null;
};

type TradeWithAssets = {
  id: number;
  name: string | null;
  tradeDate: string;
  season: string | null;
  notes: string | null;
  assets: AssetRow[];
};

async function getTrades(): Promise<TradeWithAssets[]> {
  try {
    const fromTeam = alias(members, 'from_team');
    const toTeam = alias(members, 'to_team');
    const origTeam = alias(members, 'orig_team');

    const allTrades = await db
      .select()
      .from(trades)
      .orderBy(desc(trades.tradeDate), desc(trades.id));

    if (allTrades.length === 0) return [];

    const allAssets = await db
      .select({
        id: tradeAssets.id,
        tradeId: tradeAssets.tradeId,
        sortOrder: tradeAssets.sortOrder,
        fromTeamId: tradeAssets.fromTeamId,
        toTeamId: tradeAssets.toTeamId,
        assetKind: tradeAssets.assetKind,
        pickYear: tradeAssets.pickYear,
        pickRound: tradeAssets.pickRound,
        playerName: tradeAssets.playerName,
        description: tradeAssets.description,
        condition: tradeAssets.condition,
        fromTeamName: fromTeam.name,
        fromTeamLogo: fromTeam.logo,
        toTeamName: toTeam.name,
        toTeamLogo: toTeam.logo,
        pickOriginalTeamName: origTeam.name,
      })
      .from(tradeAssets)
      .leftJoin(fromTeam, eq(tradeAssets.fromTeamId, fromTeam.id))
      .leftJoin(toTeam, eq(tradeAssets.toTeamId, toTeam.id))
      .leftJoin(origTeam, eq(tradeAssets.pickOriginalTeamId, origTeam.id))
      .orderBy(asc(tradeAssets.tradeId), asc(tradeAssets.sortOrder), asc(tradeAssets.id));

    return allTrades.map((t) => ({
      id: t.id,
      name: t.name,
      tradeDate: t.tradeDate,
      season: t.season,
      notes: t.notes,
      assets: allAssets
        .filter((a) => a.tradeId === t.id)
        .map((a) => ({
          id: a.id,
          fromTeamId: a.fromTeamId,
          fromTeamName: a.fromTeamName,
          fromTeamLogo: a.fromTeamLogo,
          toTeamId: a.toTeamId,
          toTeamName: a.toTeamName,
          toTeamLogo: a.toTeamLogo,
          assetKind: a.assetKind,
          pickYear: a.pickYear,
          pickRound: a.pickRound,
          pickOriginalTeamName: a.pickOriginalTeamName,
          playerName: a.playerName,
          description: a.description,
          condition: a.condition,
        })),
    }));
  } catch (err) {
    console.error('DB query failed:', err);
    return [];
  }
}

function formatTradeDate(iso: string): string {
  // Accepts "YYYY-MM-DD" or "YYYY-MM" or "YYYY"; render whatever we got.
  const [y, m, d] = iso.split('-');
  if (!m) return y;
  const monthName = new Date(`${y}-${m}-01`).toLocaleString('en-US', { month: 'long' });
  return d ? `${monthName} ${parseInt(d, 10)}, ${y}` : `${monthName} ${y}`;
}

function describeAsset(a: AssetRow): { primary: string; secondary?: string } {
  if (a.assetKind === 'pick' && a.pickYear && a.pickRound) {
    const round = a.pickRound === 1 ? '1st round' : a.pickRound === 2 ? '2nd round' : `Round ${a.pickRound}`;
    const primary = `${a.pickYear} · ${round}`;
    const secondary =
      a.pickOriginalTeamName && a.pickOriginalTeamName !== a.fromTeamName
        ? `originally ${a.pickOriginalTeamName}`
        : undefined;
    return { primary, secondary };
  }
  if (a.assetKind === 'player' && a.playerName) {
    return { primary: a.playerName, secondary: 'player' };
  }
  return { primary: a.description ?? '—' };
}

function TeamColumn({
  teamId,
  teamName,
  teamLogo,
  assets,
}: {
  teamId: number;
  teamName: string | null;
  teamLogo: string | null;
  assets: AssetRow[];
}) {
  return (
    <div className="flex-1 min-w-0">
      {/* Team head */}
      <Link
        href={`/teams/${teamId}`}
        className="flex items-center gap-2 mb-3 group"
      >
        {teamLogo && (
          <Image
            src={`/images/teams/${teamLogo}`}
            alt=""
            width={28}
            height={28}
            className="rounded-full flex-shrink-0"
          />
        )}
        <span className="font-semibold text-lake-ice truncate group-hover:text-lake-gold transition-colors">
          {teamName ?? 'Unknown'}
        </span>
      </Link>
      <p className="text-[11px] uppercase tracking-[0.18em] text-lake-ice-muted mb-2">Received</p>
      {assets.length === 0 ? (
        <p className="text-lake-ice-muted text-sm italic">nothing</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {assets.map((a) => {
            const { primary, secondary } = describeAsset(a);
            return (
              <li key={a.id}>
                <div className="text-lake-ice tabular-nums">{primary}</div>
                {secondary && (
                  <div className="text-lake-ice-muted text-xs">{secondary}</div>
                )}
                {a.condition && (
                  <div className="mt-1 text-xs text-lake-gold/90 leading-snug">
                    <span className="inline-block w-3 h-px bg-lake-gold/60 align-middle mr-1.5" />
                    {a.condition}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TradeRow({ trade }: { trade: TradeWithAssets }) {
  // Group assets by recipient (to_team)
  const teamsInTrade = new Map<
    number,
    { teamName: string | null; teamLogo: string | null; received: AssetRow[] }
  >();
  for (const a of trade.assets) {
    if (!teamsInTrade.has(a.toTeamId)) {
      teamsInTrade.set(a.toTeamId, {
        teamName: a.toTeamName,
        teamLogo: a.toTeamLogo,
        received: [],
      });
    }
    teamsInTrade.get(a.toTeamId)!.received.push(a);
  }
  const parties = Array.from(teamsInTrade.entries());

  return (
    <article className="border-t border-lake-blue-light/15 pt-8 pb-2">
      {/* Date spine + optional name */}
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-6">
        <time
          dateTime={trade.tradeDate}
          className="text-xs uppercase tracking-[0.2em] text-lake-gold tabular-nums"
        >
          {formatTradeDate(trade.tradeDate)}
        </time>
        {trade.name && (
          <h3 className="text-lake-ice font-semibold text-lg leading-tight">
            {trade.name}
          </h3>
        )}
        {trade.season && (
          <span className="text-xs text-lake-ice-muted tabular-nums">
            {trade.season} season
          </span>
        )}
      </header>

      {/* Exchange ledger */}
      {parties.length === 2 ? (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-x-8 gap-y-6 items-start">
          <TeamColumn
            teamId={parties[0][0]}
            teamName={parties[0][1].teamName}
            teamLogo={parties[0][1].teamLogo}
            assets={parties[0][1].received}
          />
          {/* Spine */}
          <div className="hidden md:flex flex-col items-center pt-12 text-lake-ice-muted">
            <div className="w-px h-12 bg-lake-blue-light/30" />
            <CrossedSticksIcon className="w-5 h-5 my-2 text-lake-ice-muted" />
            <div className="w-px h-12 bg-lake-blue-light/30" />
          </div>
          <TeamColumn
            teamId={parties[1][0]}
            teamName={parties[1][1].teamName}
            teamLogo={parties[1][1].teamLogo}
            assets={parties[1][1].received}
          />
        </div>
      ) : (
        // Multi-party: stack each team's "received" block
        <div className="space-y-6">
          {parties.map(([teamId, info]) => (
            <TeamColumn
              key={teamId}
              teamId={teamId}
              teamName={info.teamName}
              teamLogo={info.teamLogo}
              assets={info.received}
            />
          ))}
        </div>
      )}

      {trade.notes && (
        <p className="mt-6 text-sm text-lake-ice-muted italic max-w-2xl leading-relaxed">
          {trade.notes}
        </p>
      )}
    </article>
  );
}

export default async function TradesPage() {
  const data = await getTrades();

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <header className="mb-12">
        <p className="text-[clamp(0.7rem,0.65rem+0.2vw,0.85rem)] uppercase tracking-[0.25em] text-lake-gold mb-3">
          The Ledger
        </p>
        <h1 className="text-[clamp(1.875rem,1.4rem+1.5vw,2.5rem)] font-bold text-lake-ice tracking-tight leading-tight">
          Trades &amp; Pick Movements
        </h1>
        <p className="text-[clamp(1rem,0.92rem+0.25vw,1.125rem)] text-lake-ice-muted mt-2 max-w-xl">
          Who sent what, to whom, and on what condition.
        </p>
        <div className="w-12 h-0.5 bg-lake-gold mt-6" />
      </header>

      {data.length === 0 ? (
        <div className="text-center py-20">
          <CrossedSticksIcon className="w-16 h-16 text-lake-ice/20 mx-auto mb-6" />
          <p className="text-lake-ice-muted mb-2">
            The ledger is empty.
          </p>
          <p className="text-lake-ice-muted/80 text-sm">
            Trades will appear here as the commissioner records them.
          </p>
        </div>
      ) : (
        <div>
          {data.map((trade) => (
            <TradeRow key={trade.id} trade={trade} />
          ))}
        </div>
      )}
    </div>
  );
}
