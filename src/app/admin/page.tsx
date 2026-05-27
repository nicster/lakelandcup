import Link from 'next/link';

const adminSections = [
  {
    title: 'Teams',
    description: 'Edit franchise names, GMs, jersey colors, and logos',
    href: '/admin/teams',
    icon: 'shield',
    status: 'active',
  },
  {
    title: 'Seasons',
    description: 'Record champion, runner-up, and final score by year',
    href: '/admin/seasons',
    icon: 'trophy',
    status: 'active',
  },
  {
    title: 'Drafts',
    description: 'Record picks, players, and pick trades by draft year',
    href: '/admin/drafts',
    icon: 'clipboard',
    status: 'active',
  },
  {
    title: 'Trades',
    description: 'Record pick movements and trades between teams',
    href: '/admin/trades',
    icon: 'arrows',
    status: 'active',
  },
  {
    title: 'Rafters',
    description: 'Retired numbers — players with 10+ years on one franchise',
    href: '/admin/franchise-players',
    icon: 'banner',
    status: 'active',
  },
  {
    title: 'Rosters',
    description: 'Snapshot each season’s rosters so the candidates detector can work',
    href: '/admin/rosters',
    icon: 'list',
    status: 'active',
  },
  {
    title: 'Rules',
    description: 'Edit the league manual section by section',
    href: '/admin/rules',
    icon: 'book',
    status: 'active',
  },
  {
    title: 'Draft Lottery',
    description: 'Run the annual draft lottery for non-playoff teams',
    href: '/admin/lottery',
    icon: 'dice',
    status: 'active',
  },
];

function SectionIcon({ name, className = '' }: { name: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    trophy: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
      />
    ),
    arrows: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    ),
    dice: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25"
      />
    ),
    clipboard: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2zM9 7h6"
      />
    ),
    shield: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12c0 5.25-4.5 9-9 9s-9-3.75-9-9c0-1.92.6-3.69 1.62-5.15.18-.26.36-.51.55-.74C6.64 4.27 9.16 3 12 3s5.36 1.27 6.83 3.11c.19.23.37.48.55.74A8.93 8.93 0 0121 12z"
      />
    ),
    banner: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3v18l4.5-3 4.5 3 4.5-3 4.5 3V3M7.5 7.5h9M7.5 12h9"
      />
    ),
    book: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    ),
    list: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    ),
  };

  return (
    <svg aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      {icons[name]}
    </svg>
  );
}

export default function AdminDashboard() {
  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-lake-ice">Admin Dashboard</h1>
        <p className="text-lake-ice-muted mt-1">
          Manage league data and run commissioner tasks
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-4">
          <p className="text-lake-ice-muted text-sm">Total Seasons</p>
          <p className="text-2xl font-bold text-lake-ice">9</p>
        </div>
        <div className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-4">
          <p className="text-lake-ice-muted text-sm">Active Teams</p>
          <p className="text-2xl font-bold text-lake-ice">12</p>
        </div>
        <div className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-4">
          <p className="text-lake-ice-muted text-sm">Draft Picks Recorded</p>
          <p className="text-2xl font-bold text-lake-ice">216</p>
        </div>
      </div>

      {/* Admin Sections */}
      <h2 className="text-lg font-semibold text-lake-ice mb-4">Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {adminSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6 hover:border-lake-gold/30 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-lake-blue-light/20 flex items-center justify-center group-hover:bg-lake-gold/20 transition-colors">
                <SectionIcon
                  name={section.icon}
                  className="w-6 h-6 text-lake-gold"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lake-ice group-hover:text-lake-gold transition-colors">
                    {section.title}
                  </h3>
                  {section.status === 'coming-soon' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-lake-blue-light/30 text-lake-ice-muted">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-sm text-lake-ice-muted mt-1">
                  {section.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
