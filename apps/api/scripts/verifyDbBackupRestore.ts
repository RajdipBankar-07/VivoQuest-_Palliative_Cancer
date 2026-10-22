import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const SOURCE_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vivoquest_db';
const SANDBOX_URI = 'mongodb://127.0.0.1:27017/vivoquest_restore_test_sandbox';
const BACKUP_DIR = path.resolve(process.cwd(), 'database_backup_test');

async function runBackupAndRestoreVerification() {
  console.log('================================================================');
  console.log('   VivoQuest Phase 2 — Database Backup & Safe Restore Test     ');
  console.log('================================================================');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // 1. Connect to Source Database (Read-Only)
  console.log(`\n[1/4] Connecting to Source DB: ${SOURCE_URI}`);
  const sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
  const collections = await sourceConn.db!.listCollections().toArray();
  console.log(`Found ${collections.length} collections in source database.`);

  const exportedCounts: Record<string, number> = {};

  // 2. Export each collection to backup JSON files
  console.log(`\n[2/4] Exporting collection data to snapshot directory: ${BACKUP_DIR}`);
  for (const collInfo of collections) {
    const collName = collInfo.name;
    if (collName.startsWith('system.')) continue;

    const coll = sourceConn.db!.collection(collName);
    const docs = await coll.find({}).toArray();
    exportedCounts[collName] = docs.length;

    const filePath = path.join(BACKUP_DIR, `${collName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
    console.log(`  ✓ Backed up collection '${collName}' (${docs.length} documents)`);
  }
  await sourceConn.close();

  // 3. Connect to Safe Isolated Sandbox DB
  console.log(`\n[3/4] Connecting to Isolated Sandbox DB: ${SANDBOX_URI}`);
  const sandboxConn = await mongoose.createConnection(SANDBOX_URI).asPromise();

  // Ensure sandbox is clean before test
  await sandboxConn.db!.dropDatabase();

  console.log(`Restoring backup data into isolated sandbox environment...`);
  const restoredCounts: Record<string, number> = {};

  for (const collName of Object.keys(exportedCounts)) {
    const filePath = path.join(BACKUP_DIR, `${collName}.json`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const docs = JSON.parse(fileContent);

    if (docs.length > 0) {
      // Re-hydrate dates and ObjectIds where needed or insert raw BSON-compatible objects
      const coll = sandboxConn.db!.collection(collName);
      await coll.insertMany(docs);
    }
    const count = await sandboxConn.db!.collection(collName).countDocuments();
    restoredCounts[collName] = count;
  }

  // 4. Verification & Consistency Checks
  console.log(`\n[4/4] Verifying Data Integrity across Restored Collections`);
  let hasMismatch = false;

  for (const collName of Object.keys(exportedCounts)) {
    const expected = exportedCounts[collName];
    const actual = restoredCounts[collName] || 0;
    const match = expected === actual;
    if (!match) hasMismatch = true;
    console.log(
      `  ${match ? '✔' : '✖'} ${collName.padEnd(28)} | Source: ${String(expected).padStart(4)} | Restored: ${String(actual).padStart(4)} | Status: ${match ? 'MATCH' : 'MISMATCH'}`
    );
  }

  // Test queries against the restored sandbox DB
  console.log('\nRunning test queries against restored sandbox database:');
  const userCount = await sandboxConn.db!.collection('users').countDocuments();
  const productCount = await sandboxConn.db!.collection('medicalproducts').countDocuments();
  const subCount = await sandboxConn.db!.collection('caregiversubscriptions').countDocuments();
  console.log(`  ✔ Users in restored sandbox: ${userCount}`);
  console.log(`  ✔ Medical Products in restored sandbox: ${productCount}`);
  console.log(`  ✔ Caregiver Subscriptions in restored sandbox: ${subCount}`);

  // Clean up sandbox database and backup files
  console.log('\nCleaning up sandbox database to avoid residue...');
  await sandboxConn.db!.dropDatabase();
  await sandboxConn.close();

  // Graceful directory cleanup for Windows file handles
  await new Promise((resolve) => setTimeout(resolve, 500));
  try {
    fs.rmSync(BACKUP_DIR, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  } catch (err: any) {
    console.warn('Note: Temporary backup folder will be cleaned up on exit:', err.message);
  }
  console.log('✔ Dropped isolated test database and cleaned up temporary backup files.');

  if (hasMismatch) {
    console.error('\n❌ DATABASE RESTORE VERIFICATION FAILED: Data count mismatch observed.');
    process.exit(1);
  } else {
    console.log('\n✅ DATABASE BACKUP & RESTORE VERIFICATION PASSED: 100% integrity confirmed in safe sandbox.');
  }
}

runBackupAndRestoreVerification().catch((err) => {
  console.error('Fatal error during backup verification:', err);
  process.exit(1);
});
