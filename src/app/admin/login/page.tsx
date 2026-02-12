import { redirect } from 'next/navigation';
import { verifyPassword, createSession, isAuthenticated } from '@/lib/auth';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // If already logged in, redirect to admin
  if (await isAuthenticated()) {
    redirect('/admin');
  }

  const params = await searchParams;
  const error = params.error;

  async function login(formData: FormData) {
    'use server';

    const password = formData.get('password') as string;

    if (await verifyPassword(password)) {
      await createSession();
      redirect('/admin');
    } else {
      redirect('/admin/login?error=invalid');
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-lake-blue-light/30 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-lake-gold"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-lake-ice">Commissioner Login</h1>
            <p className="text-lake-ice/60 text-sm mt-1">
              Enter password to access admin area
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
              <p className="text-red-300 text-sm text-center">
                Invalid password. Please try again.
              </p>
            </div>
          )}

          {/* Login Form */}
          <form action={login}>
            <div className="mb-6">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-lake-ice/70 mb-2"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-lg bg-lake-blue-dark/50 border border-lake-blue-light/30 text-lake-ice placeholder-lake-ice/40 focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/50 transition-colors"
                placeholder="Enter commissioner password"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-lg bg-lake-gold text-lake-blue-dark font-semibold hover:bg-lake-gold/90 transition-colors focus:outline-none focus:ring-2 focus:ring-lake-gold/50 focus:ring-offset-2 focus:ring-offset-lake-blue-dark"
            >
              Sign In
            </button>
          </form>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-lake-ice/50 hover:text-lake-ice text-sm transition-colors"
          >
            &larr; Back to Lakeland Cup
          </a>
        </div>
      </div>
    </div>
  );
}
