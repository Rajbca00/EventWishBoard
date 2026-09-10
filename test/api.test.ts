import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The HTTP layer, called directly rather than over a socket.
 *
 * The gate is the point of most of this: the seeder writes a hundred rows and
 * uploads a hundred files, and the archive hands back signed URLs to private
 * photos. Neither may answer a stranger. In demo mode `currentAdmin()` returns
 * a stand-in organiser so the sandbox is explorable, so signing out is mocked
 * to prove the gate itself rather than the sandbox's convenience.
 */

const signedOut = () => vi.doMock('@/lib/admin-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/admin-auth')>('@/lib/admin-auth');
  return {
    ...actual,
    currentAdmin: async () => null,
    requireAdminOrThrow: async () => {
      throw new actual.UnauthorizedError();
    },
  };
});

const params = (eventId: string) => ({ params: Promise.resolve({ eventId }) });
const EVENT = 'laya-bee-wedding-001';

beforeEach(() => {
  vi.resetModules();
  delete (globalThis as { __wishWallDemo?: unknown }).__wishWallDemo;
});

afterEach(() => vi.doUnmock('@/lib/admin-auth'));

describe('the test-data endpoint when nobody is signed in', () => {
  beforeEach(signedOut);

  it('refuses to count', async () => {
    const { GET } = await import('@/app/api/admin/events/[eventId]/seed/route');
    const response = await GET(new Request('http://x/') as never, params(EVENT));
    expect(response.status).toBe(401);
  });

  it('refuses to create', async () => {
    const { POST } = await import('@/app/api/admin/events/[eventId]/seed/route');
    const request = new Request('http://x/', {
      method: 'POST',
      body: JSON.stringify({ wishes: [{ message: 'sneaky' }] }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect((await POST(request as never, params(EVENT))).status).toBe(401);
  });

  it('refuses to delete', async () => {
    const { DELETE } = await import('@/app/api/admin/events/[eventId]/seed/route');
    expect((await DELETE(new Request('http://x/') as never, params(EVENT))).status).toBe(401);
  });
});

describe('the archive endpoint when nobody is signed in', () => {
  beforeEach(signedOut);

  it('hands back no manifest and no signed photo URLs', async () => {
    const { GET } = await import('@/app/api/admin/events/[eventId]/archive/route');
    const response = await GET(new Request('http://x/') as never, params(EVENT));

    expect(response.status).toBe(401);
    expect(JSON.stringify(await response.json())).not.toContain('images');
  });
});

describe('the test-data endpoint for a signed-in organiser', () => {
  it('counts, creates and clears', async () => {
    const { GET, POST, DELETE } = await import('@/app/api/admin/events/[eventId]/seed/route');

    expect(await (await GET(new Request('http://x/') as never, params(EVENT))).json()).toEqual({
      seeded: 0,
    });

    const created = await POST(
      new Request('http://x/', {
        method: 'POST',
        body: JSON.stringify({ wishes: [{ message: 'one' }, { message: 'two' }] }),
        headers: { 'Content-Type': 'application/json' },
      }) as never,
      params(EVENT),
    );
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({ created: 2, failed: 0 });

    expect(await (await DELETE(new Request('http://x/') as never, params(EVENT))).json()).toEqual({
      wishes: 2,
      photos: 0,
    });
  });

  it('refuses a batch bigger than the schema allows', async () => {
    const { POST } = await import('@/app/api/admin/events/[eventId]/seed/route');
    const response = await POST(
      new Request('http://x/', {
        method: 'POST',
        body: JSON.stringify({ wishes: Array(11).fill({ message: 'x' }) }),
        headers: { 'Content-Type': 'application/json' },
      }) as never,
      params(EVENT),
    );
    expect(response.status).toBe(400);
  });

  it('refuses a body that is not JSON', async () => {
    const { POST } = await import('@/app/api/admin/events/[eventId]/seed/route');
    const response = await POST(
      new Request('http://x/', { method: 'POST', body: 'not json' }) as never,
      params(EVENT),
    );
    expect(response.status).toBe(400);
  });

  it('is not found for an event that does not exist', async () => {
    const { GET } = await import('@/app/api/admin/events/[eventId]/seed/route');
    expect((await GET(new Request('http://x/') as never, params('no-such-event'))).status).toBe(404);
  });
});

describe('the guest wish endpoint', () => {
  const post = async (body: unknown, headers: Record<string, string> = {}, event = EVENT) => {
    const { POST } = await import('@/app/api/events/[eventId]/wishes/route');
    return POST(
      new Request('http://x/', {
        method: 'POST',
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', ...headers },
      }) as never,
      params(event),
    );
  };

  it('accepts an ordinary wish and returns the wall with it on', async () => {
    const response = await post({ message: 'Wishing you both every happiness' });
    expect(response.status).toBe(201);

    const data = (await response.json()) as { wish: { message: string }; wall: unknown[] };
    expect(data.wish.message).toBe('Wishing you both every happiness');
    expect(Array.isArray(data.wall)).toBe(true);
  });

  it('refuses an empty message with something the guest can act on', async () => {
    const response = await post({ message: '' });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Write a little something first');
  });

  /*
   * The size gate reads Content-Length and answers before buffering, so a
   * hostile client cannot make the server hold a huge body in memory first.
   */
  it('refuses an oversized body before reading it', async () => {
    const response = await post({ message: 'hi' }, { 'content-length': String(50 * 1024 * 1024) });
    expect(response.status).toBe(413);
  });

  it('refuses a body that is not JSON', async () => {
    expect((await post('{ broken')).status).toBe(400);
  });

  it('is not found for an event that does not exist', async () => {
    expect((await post({ message: 'hi' }, {}, 'no-such-event')).status).toBe(404);
  });

  it('never puts a private photo path on the wall it returns', async () => {
    const { GET } = await import('@/app/api/events/[eventId]/wishes/route');
    const response = await GET(new Request('http://x/') as never, params(EVENT));
    const body = JSON.stringify(await response.json());

    expect(response.status).toBe(200);
    expect(body).not.toContain('selfie_path');
    expect(body).not.toContain('ip_hash');
  });
});
