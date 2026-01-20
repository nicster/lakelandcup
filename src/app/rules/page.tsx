import { db, rules } from '@/lib/db';
import { asc } from 'drizzle-orm';

// Default rules content (from 2023 revised manual)
const defaultRules = [
  {
    section: 'general',
    title: 'General Statistics',
    content: `
- **Type:** Dynasty League
- **Number of teams:** 12
- **Number of roster positions:** 24
- **Number of prospect draft picks per year:** 2
- **Number of possible prospects:** Up to 10
- **Total roster:** 24-34 (depending on prospect roster)
    `.trim(),
  },
  {
    section: 'roster',
    title: 'Roster Positions',
    content: `
The roster consists of a total of 24 active players. In addition to these players each team has up to 10 prospects. These 24 active players are comprised of the following roster positions:

- 4 Centers
- 4 Left Wings
- 4 Right Wings
- 6 Defensemen
- 2 Goalies
- 4 Bench spots

This results in 24 players which roughly corresponds to an actual NHL roster (20 active players for each game, 23 players on active roster).

In addition to these 24 roster spots a player has **1 Injured Reserve spot** and **2 Injured Reserve Plus spots** available.
    `.trim(),
  },
  {
    section: 'prospects',
    title: 'Prospects',
    content: `
Before every season each player has 2 prospect draft picks to use on players from the draft class of the corresponding year. The order of draft picks is determined as follows:

### Draft Lottery (Picks 1-4)

The 4 teams not participating in the Playoffs are included in the lottery-draft for the first 4 picks. Chances to win the first overall pick:

- **9th place:** 50% chance
- **10th place:** 25% chance
- **11th place:** 15% chance
- **12th place:** 10% chance

The draft lottery is performed by the commissioner ahead of the draft by running the chances through a self-programmed algorithm. Results are communicated to every GM (Livestream, WhatsApp, etc.)

### Remaining First Round (Picks 5-12)

- Playoff teams eliminated in Quarter-Finals are ranked in reverse order of regular season results (picks 5-8)
- Playoff teams eliminated in Semifinals pick 9th and 10th
- Playoff Final loser picks 11th
- Lakeland Cup Champion picks 12th

### Second Round

Picks 13-24 are determined the same way as the first round.

### Prospect Rights

**The team drafting a player will have rights for 3 years (5 years for goalies).** If the player is not on the active roster after that time span, the team loses rights and the player enters free agency.

Any prospect can be activated to the roster at any time during their rights window, provided one of the 24 active roster positions is free.

Every team must make space for upcoming draft picks during the keeper determination process. A team can activate more than 2 prospects per year if it has more picks in the upcoming draft.

The current prospects of each team are visible at **lakelandcup.com**. Before picking up a free agent, always check that no other team holds rights to that player.
    `.trim(),
  },
  {
    section: 'trades',
    title: 'Trades',
    content: `
Trades including only active players will be conducted over the official Yahoo interface.

If the trade contains a draft pick or a prospect, **both parties must inform the commissioner individually in writing** of the assets to be swapped. If either party does not comply with these rules, the trade will be rejected.
    `.trim(),
  },
  {
    section: 'end-of-season',
    title: 'End of Season',
    content: `
By the end of the season a team keeps **23 or 24 players** including newly admitted prospects.

Every team which keeps 23 players has the right to pick a player for this free roster spot in the **Free Agent Draft**. The ranking order is determined in reverse order of the regular season.

A team cannot drop more players by the end of the season, because otherwise it could grab all the players coming into the NHL from other leagues. With this rule every team is limited to grab at most one such player. This should also enforce teams to improve their roster with either trades or free agent additions.
    `.trim(),
  },
  {
    section: 'draft',
    title: 'Draft',
    content: `
**The attendance of the draft is absolutely mandatory.** Teams who are not able to attend must enter a draft list which will be used for auto-picking. Otherwise, the community picks the best available prospect of the NHL Entry Draft.

### Draft Hosting

The owner of the first overall pick has to organize the draft happening, during which the cup handover also takes place. If the first overall pick is traded, this duty is traded as well.

### Rule Changes

The draft happening is also the venue for deciding on possible rule changes. Any manager wishing to propose a rule change must submit it to the commissioner **in writing before the draft**, so all propositions can be transmitted to every GM beforehand.

To accept a rule change, a **majority vote** is required. Any GM who cannot attend may give their vote to the commissioner in writing.
    `.trim(),
  },
  {
    section: 'franchises',
    title: 'Franchises',
    content: `
After the 2016/17 season there will be no new teams allowed. **Teams can only be transferred** from that point on.
    `.trim(),
  },
  {
    section: 'waiver',
    title: 'Waiver Priority',
    content: `
The waiver priority is **carried over from the previous year**.
    `.trim(),
  },
  {
    section: 'fa-playoffs',
    title: 'FA Picks During Playoff Period',
    content: `
Teams not participating in the playoffs have the right to claim **maximally one player** as a Free Agent pick during the 3-week playoff period.
    `.trim(),
  },
];

// Book icon component
function BookIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

// Simple markdown-like renderer
function RenderContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 text-lake-ice/80 mb-4 ml-2">
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const formatInline = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-lake-ice font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={index} className="text-lg font-semibold text-lake-gold mt-6 mb-3">
          {trimmed.slice(4)}
        </h3>
      );
    } else if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      elements.push(
        <p
          key={index}
          className="text-lake-ice/80 mb-4"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
        />
      );
    }
  });

  flushList();

  return <>{elements}</>;
}

async function getRules() {
  try {
    const results = await db
      .select()
      .from(rules)
      .orderBy(asc(rules.sortOrder));

    return results.length > 0 ? results : null;
  } catch {
    return null;
  }
}

export default async function RulesPage() {
  const dbRules = await getRules();
  const rulesData = dbRules || defaultRules.map((r, i) => ({ ...r, id: i, sortOrder: i, updatedAt: null }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Page Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-lake-blue-light/30 mb-4">
          <BookIcon className="w-8 h-8 text-lake-gold" />
        </div>
        <h1 className="text-3xl font-bold text-lake-ice mb-2">League Manual</h1>
        <p className="text-lake-ice/60">
          Official rules and regulations of the Lakeland Cup
        </p>
      </div>

      {/* Table of Contents */}
      <nav className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6 mb-8">
        <h2 className="text-sm font-semibold text-lake-ice/50 uppercase tracking-wider mb-4">
          Contents
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rulesData.map((rule) => (
            <li key={rule.section}>
              <a
                href={`#${rule.section}`}
                className="text-lake-ice/70 hover:text-lake-gold transition-colors text-sm"
              >
                {rule.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Rules Sections */}
      <div className="space-y-12">
        {rulesData.map((rule) => (
          <section
            key={rule.section}
            id={rule.section}
            className="scroll-mt-20"
          >
            <h2 className="text-xl font-bold text-lake-gold mb-4 pb-2 border-b border-lake-blue-light/20">
              {rule.title}
            </h2>
            <div className="prose-lake">
              <RenderContent content={rule.content} />
            </div>
          </section>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-12 pt-8 border-t border-lake-blue-light/20 text-center">
        <p className="text-lake-ice/40 text-sm">
          Originally published September 19, 2016. Revised September 30, 2023.
          <br />
          Contact the commissioner for rule clarifications or amendments.
        </p>
      </div>
    </div>
  );
}
