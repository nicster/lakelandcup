import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-lake-blue-light/20 bg-lake-blue-dark/50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Left side - branding */}
          <div className="text-center md:text-left">
            <p className="text-lake-ice/50 text-sm">
              Lakeland Cup Fantasy Hockey League
            </p>
            <p className="text-lake-ice/30 text-xs mt-1">
              Est. 2013 &middot; Dynasty League
            </p>
          </div>

          {/* Right side - links */}
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/admin"
              className="text-lake-ice/30 hover:text-lake-ice/50 transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
