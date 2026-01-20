import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen ice-texture flex flex-col items-center justify-center px-4">
      {/* Main content container */}
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo */}
        <div className="puck-drop opacity-0 fade-in-1">
          <Image
            src="/images/lakelandcup_2.png"
            alt="Lakeland Cup"
            width={280}
            height={280}
            className="mx-auto drop-shadow-2xl"
            priority
          />
        </div>

        {/* Coming Soon Badge */}
        <div className="puck-drop opacity-0 fade-in-3">
          <div className="inline-block">
            <div className="shimmer rounded-full px-6 py-3 border border-lake-gold/30">
              <span className="text-lake-gold font-medium tracking-wide uppercase text-sm">
                Coming Soon
              </span>
            </div>
          </div>
        </div>

        {/* Feature icons */}
        <div className="puck-drop opacity-0 fade-in-4 pt-8 grid grid-cols-3 md:grid-cols-5 gap-4 text-xs text-lake-ice/50 max-w-lg mx-auto">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-lake-blue/30 flex items-center justify-center">
              <TrophyIcon />
            </div>
            <span>Hall of Fame</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-lake-blue/30 flex items-center justify-center">
              <DraftIcon />
            </div>
            <span>Draft History</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-lake-blue/30 flex items-center justify-center">
              <LotteryIcon />
            </div>
            <span>Draft Lottery</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-lake-blue/30 flex items-center justify-center">
              <TradeIcon />
            </div>
            <span>Trade Tracker</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-lake-blue/30 flex items-center justify-center">
              <RulesIcon />
            </div>
            <span>Rules</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 text-lake-ice/30 text-xs">
        Est. 2013
      </footer>
    </main>
  );
}

// Simple SVG icons
function TrophyIcon() {
  return (
    <svg className="w-5 h-5 text-lake-gold/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
    </svg>
  );
}

function DraftIcon() {
  return (
    <svg className="w-5 h-5 text-lake-gold/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function LotteryIcon() {
  return (
    <svg className="w-5 h-5 text-lake-gold/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-8.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-7.5A2.25 2.25 0 018.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 00-2.25 2.25v6" />
    </svg>
  );
}

function TradeIcon() {
  return (
    <svg className="w-5 h-5 text-lake-gold/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function RulesIcon() {
  return (
    <svg className="w-5 h-5 text-lake-gold/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}
