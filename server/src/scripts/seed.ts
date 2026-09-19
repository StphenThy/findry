/**
 * `npm run seed` — (re)populate the database with demo data.
 * Pass --force to wipe existing collections first.
 */
import { connectDB, disconnectDB } from '../db';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, seed } from '../seed';

(async () => {
  const force = process.argv.includes('--force');
  const { inMemory } = await connectDB();
  if (inMemory) {
    console.warn('[seed] MONGODB_URI is empty — seeding an in-memory DB is pointless. Set MONGODB_URI in server/.env first.');
    await disconnectDB();
    process.exit(1);
  }
  const result = await seed({ force });
  if (result.skipped) console.log('[seed] database already has data — run with --force to reset');
  else {
    console.log('[seed] done. Demo accounts (password: %s):', DEMO_PASSWORD);
    for (const a of DEMO_ACCOUNTS) console.log(`  ${a.email.padEnd(22)} ${a.role}`);
  }
  await disconnectDB();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
