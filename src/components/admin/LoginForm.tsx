'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginForm({ accessDenied = false }: { accessDenied?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError('That email and password did not match.');
      setBusy(false);
      return;
    }

    // The layout re-checks the admin allow-list server-side.
    router.replace('/admin');
    router.refresh();
  };

  const signOut = async () => {
    setBusy(true);
    setError(null);
    await createSupabaseBrowserClient().auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border border-[var(--card-line)] bg-white p-5"
    >
      {accessDenied && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[0.84rem] leading-relaxed text-amber-900" role="alert">
          This account signed in successfully, but it has not been granted dashboard access. Ask an owner to add its user ID to <code>admin_users</code>, or sign out and use an authorised account.
          <button
            type="button"
            onClick={signOut}
            disabled={busy}
            className="mt-2 block font-medium text-amber-950 underline underline-offset-2 disabled:opacity-60"
          >
            Sign out and use another account
          </button>
        </div>
      )}

      <label className="block">
        <span className="mb-1.5 block text-[0.8rem] font-medium text-[var(--ink)]">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 w-full rounded-xl border border-[var(--card-line)] bg-white px-3.5 text-[0.92rem] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[0.8rem] font-medium text-[var(--ink)]">Password</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 w-full rounded-xl border border-[var(--card-line)] bg-white px-3.5 text-[0.92rem] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
        />
      </label>

      {error && (
        <p className="text-[0.84rem] text-[var(--accent-2)]" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="h-11 w-full rounded-full bg-[var(--accent-2)] text-[0.9rem] font-medium text-white transition-colors hover:bg-[var(--accent)] disabled:opacity-60"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
