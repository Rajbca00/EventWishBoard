/**
 * Preflight check for the Supabase connection.
 *
 * Setting this up has several independent steps — URL, keys, SQL migration,
 * storage buckets — and when one is missed the app fails somewhere far away
 * with a vague message. This checks each step in order and stops at the first
 * real problem, telling you exactly what to do about it.
 *
 * Run: npm run check
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env.local');

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const info = (m) => console.log(`    \x1b[2m${m}\x1b[0m`);

function fail(message, ...hints) {
  bad(message);
  hints.forEach(info);
  console.log('');
  process.exit(1);
}

console.log('\nChecking your Supabase setup\n');

/* ---------------------------------------------------------------- 1. env file */

if (!existsSync(envPath)) {
  fail('No .env.local found', 'Run:  cp .env.example .env.local', 'Then paste your Supabase values into it.');
}

const env = {};
for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const i = trimmed.indexOf('=');
  if (i < 0) continue;
  env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}
ok('.env.local found');

const isPlaceholder = (v) =>
  !v || /YOUR[-_]PROJECT|xxxxxxxx|your-anon-key|your-service-role-key|change-me/i.test(v);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const publishable =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

const stillTemplate = [
  ['NEXT_PUBLIC_SUPABASE_URL', url],
  ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', publishable],
  ['SUPABASE_SECRET_KEY', secret],
].filter(([, value]) => isPlaceholder(value));

if (stillTemplate.length) {
  bad(`${stillTemplate.length} value(s) still contain the example placeholder:`);
  stillTemplate.forEach(([key]) => info(`- ${key}`));
  console.log('');
  info('Open .env.local and replace them with your real values from:');
  info('Supabase dashboard -> your project -> Settings -> API Keys');
  console.log('');
  process.exit(1);
}
ok('All three values are filled in');

if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url)) {
  fail(
    `That does not look like a Supabase project URL: ${url}`,
    'It should look like: https://abcdefghijkl.supabase.co',
    'No trailing slash, no /rest/v1 path.',
  );
}
ok(`URL looks right: ${url}`);

/* ---------------------------------------------------------------- 2. reachable */

const headers = { apikey: secret, Authorization: `Bearer ${secret}` };

async function call(path, init = {}) {
  const response = await fetch(`${url}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  return response;
}

try {
  const response = await call('/rest/v1/', { method: 'GET' });
  if (response.status === 401) {
    fail(
      'The project is reachable, but the secret key was rejected (401)',
      'Copy it again from Settings -> API Keys -> Secret keys -> Reveal.',
      'Make sure you used the SECRET key, not the publishable one.',
    );
  }
  ok('Project is reachable and the secret key works');
} catch (error) {
  fail(
    `Could not reach ${url}`,
    `(${error.cause?.code ?? error.message})`,
    'Check the URL for typos, and that the project is not paused',
    'in the Supabase dashboard.',
  );
}

/* ---------------------------------------------------------------- 3. schema */

const tables = ['events', 'wishes', 'assets', 'admin_users', 'scans'];
const missing = [];

for (const table of tables) {
  const response = await call(`/rest/v1/${table}?select=*&limit=1`);
  if (response.status === 404 || response.status === 400) missing.push(table);
}

if (missing.length) {
  fail(
    `The database is missing ${missing.length} of ${tables.length} tables: ${missing.join(', ')}`,
    'The SQL migration has not been run yet. In the Supabase dashboard:',
    'SQL Editor -> New query -> paste all of supabase/migrations/0001_init.sql -> Run',
  );
}
ok('All tables exist');

const statsResponse = await call('/rest/v1/event_stats?select=event_id&limit=1');
if (statsResponse.ok) ok('event_stats view exists');
else bad('event_stats view is missing — re-run the migration (the dashboard counters need it)');

/* ---------------------------------------------------------------- 4. storage */

const bucketResponse = await call('/storage/v1/bucket');
if (bucketResponse.ok) {
  const buckets = await bucketResponse.json();
  const byId = new Map(buckets.map((b) => [b.id, b]));

  if (!byId.has('assets')) bad('Storage bucket "assets" is missing — re-run the migration');
  else ok('Storage bucket "assets" exists (public)');

  const memories = byId.get('memories');
  if (!memories) {
    bad('Storage bucket "memories" is missing — re-run the migration');
  } else if (memories.public) {
    bad('Storage bucket "memories" is PUBLIC — guest selfies would be exposed');
    info('Set it to private in Storage -> memories -> Settings, or re-run the migration.');
  } else {
    ok('Storage bucket "memories" exists and is private');
  }
} else {
  bad('Could not list storage buckets');
}

/* ---------------------------------------------------------------- 5. admins */

const adminResponse = await call('/rest/v1/admin_users?select=email');
if (adminResponse.ok) {
  const admins = await adminResponse.json();
  if (admins.length === 0) {
    bad('No admin users yet — you will not be able to sign in at /admin');
    info('1. Authentication -> Users -> Add user (tick "Auto Confirm User")');
    info('2. Copy the new user UUID, then in the SQL editor run:');
    info("   insert into public.admin_users (id, email, role)");
    info("   values ('<uuid>', '<email>', 'owner');");
  } else {
    ok(`${admins.length} admin user(s): ${admins.map((a) => a.email).join(', ')}`);
  }
}

/* ---------------------------------------------------------------- 6. misc */

if (isPlaceholder(env.IP_HASH_SALT)) {
  bad('IP_HASH_SALT is still the default — set it to a random string');
  info('node -e "console.log(crypto.randomUUID())"');
} else {
  ok('IP_HASH_SALT is set');
}

console.log('\n\x1b[32mReady.\x1b[0m Restart the dev server and open /admin to create your first event.\n');
