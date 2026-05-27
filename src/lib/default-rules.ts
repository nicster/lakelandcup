// Canonical defaults for the league manual — from the 2023 revised manual.
// Used as the fallback when the DB has no rule rows, and as the source for
// `POST /api/admin/rules/bootstrap` (which seeds these into the DB so the
// commissioner can edit them via the admin UI).

export interface DefaultRule {
  section: string;
  title: string;
  content: string;
  sortOrder: number;
}

export const DEFAULT_RULES: DefaultRule[] = [
  {
    section: 'general',
    title: 'General Statistics',
    sortOrder: 0,
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
    sortOrder: 1,
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
    sortOrder: 2,
    content: `
Before every season each player has 2 prospect draft picks to use on players from the draft class of the corresponding year. The order of draft picks is determined as follows:

### Draft Lottery (Picks 1-4)

The 4 teams not participating in the Playoffs are included in the lottery-draft for the first 4 picks. Chances to win the first overall pick:

- **12th place:** 50% chance
- **11th place:** 25% chance
- **10th place:** 15% chance
- **9th place:** 10% chance

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
    sortOrder: 3,
    content: `
Trades including only active players will be conducted over the official Yahoo interface.

If the trade contains a draft pick or a prospect, **both parties must inform the commissioner individually in writing** of the assets to be swapped. If either party does not comply with these rules, the trade will be rejected.
    `.trim(),
  },
  {
    section: 'end-of-season',
    title: 'End of Season',
    sortOrder: 4,
    content: `
By the end of the season a team keeps **23 or 24 players** including newly admitted prospects.

Every team which keeps 23 players has the right to pick a player for this free roster spot in the **Free Agent Draft**. The ranking order is determined in reverse order of the regular season.

A team cannot drop more players by the end of the season, because otherwise it could grab all the players coming into the NHL from other leagues. With this rule every team is limited to grab at most one such player. This should also enforce teams to improve their roster with either trades or free agent additions.
    `.trim(),
  },
  {
    section: 'draft',
    title: 'Draft',
    sortOrder: 5,
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
    sortOrder: 6,
    content: `
After the 2016/17 season there will be no new teams allowed. **Teams can only be transferred** from that point on.
    `.trim(),
  },
  {
    section: 'waiver',
    title: 'Waiver Priority',
    sortOrder: 7,
    content: `
The waiver priority is **carried over from the previous year**.
    `.trim(),
  },
  {
    section: 'fa-playoffs',
    title: 'FA Picks During Playoff Period',
    sortOrder: 8,
    content: `
Teams not participating in the playoffs have the right to claim **maximally one player** as a Free Agent pick during the 3-week playoff period.
    `.trim(),
  },
];
