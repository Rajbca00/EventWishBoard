import 'server-only';
import { getAdminIdentity, type AdminIdentity } from './supabase/server';
import { isDemoMode } from './env';

/** Stand-in identity so the dashboard is explorable before Supabase exists. */
const DEMO_ADMIN: AdminIdentity = {
  id: 'demo-organiser',
  email: 'demo@layanbee.com',
  role: 'owner',
};

/**
 * Who is signed in, or null.
 *
 * In demo mode there is no auth provider at all, so the dashboard opens for
 * anyone who can reach the dev server. That is fine for a local sandbox with
 * throwaway data, and impossible once Supabase credentials are present.
 */
export async function currentAdmin(): Promise<AdminIdentity | null> {
  if (isDemoMode()) return DEMO_ADMIN;
  return getAdminIdentity();
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor() {
    super('Sign in to continue');
  }
}

export async function requireAdminOrThrow(): Promise<AdminIdentity> {
  const admin = await currentAdmin();
  if (!admin) throw new UnauthorizedError();
  return admin;
}

export type { AdminIdentity };
