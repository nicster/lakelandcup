import Link from 'next/link';
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
          <header className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.25em] text-lake-gold mb-3">Restricted</p>
            <h1 className="text-2xl font-bold text-lake-ice tracking-tight">Commissioner Login</h1>
            <p className="text-lake-ice-muted text-sm mt-2">
              Enter password to access admin area.
            </p>
            <div className="w-10 h-0.5 bg-lake-gold mx-auto mt-5" />
          </header>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-lake-error/20 border border-lake-error/30">
              <p className="text-lake-error text-sm text-center">
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
                className="w-full px-4 py-3 rounded-lg bg-lake-blue-dark/50 border border-lake-blue-light/30 text-lake-ice placeholder-lake-ice/60 focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/50 transition-colors"
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
          <Link
            href="/"
            className="text-lake-ice-muted hover:text-lake-ice text-sm transition-colors"
          >
            &larr; Back to Lakeland Cup
          </Link>
        </div>
      </div>
    </div>
  );
}
