import { redirect } from 'next/navigation';
import LoginForm from '@/components/admin/LoginForm';
import { BrandGlyph } from '@/components/ui/BrandMark';
import { currentAdmin } from '@/lib/admin-auth';
import { isDemoMode } from '@/lib/env';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  // Demo mode has no auth provider, so there is nothing to sign in to.
  if (isDemoMode()) redirect('/admin');
  if (await currentAdmin()) redirect('/admin');

  const { error } = await searchParams;
  const accessDenied = error === 'not-authorized';

  return (
    <div className="admin-shell flex min-h-dvh items-center justify-center bg-cocoa-50 px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandGlyph size={34} className="text-[var(--accent)]" />
          <div>
            <h1 className="font-display text-2xl text-[var(--ink)]">Organiser Dashboard</h1>
            <p className="mt-1 text-[0.88rem] text-[var(--ink-soft)]">
              Sign in to manage your celebrations
            </p>
          </div>
        </div>

        <LoginForm accessDenied={accessDenied} />

        <p className="mt-6 text-center text-[0.78rem] leading-relaxed text-[var(--ink-soft)]">
          Accounts are created in Supabase and added to the <code>admin_users</code> table. See the
          README for the exact steps.
        </p>
      </div>
    </div>
  );
}
