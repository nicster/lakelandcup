import Link from 'next/link';

const adminSections = [
  {
    title: 'Seasons',
    description: 'Manage championship history and season records',
    href: '/admin/seasons',
    icon: 'trophy',
    status: 'coming-soon',
  },
  {
    title: 'Trades',
    description: 'Record and track player trades between teams',
    href: '/admin/trades',
    icon: 'arrows',
    status: 'coming-soon',
  },
  {
    title: 'Draft Lottery',
    description: 'Run the annual draft lottery for non-playoff teams',
    href: '/admin/lottery',
    icon: 'dice',
    status: 'coming-soon',
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
  };

  return (
    <svg
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
        <p className="text-lake-ice/60 mt-1">
          Manage league data and run commissioner tasks
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-4">
          <p className="text-lake-ice/50 text-sm">Total Seasons</p>
          <p className="text-2xl font-bold text-lake-ice">9</p>
        </div>
        <div className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-4">
          <p className="text-lake-ice/50 text-sm">Active Teams</p>
          <p className="text-2xl font-bold text-lake-ice">12</p>
        </div>
        <div className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-4">
          <p className="text-lake-ice/50 text-sm">Draft Picks Recorded</p>
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
                    <span className="text-xs px-2 py-0.5 rounded-full bg-lake-blue-light/30 text-lake-ice/50">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-sm text-lake-ice/60 mt-1">
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
