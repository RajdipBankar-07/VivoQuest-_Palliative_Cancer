import { connectDatabase } from '../apps/api/src/config/database.js';
import { seedAdminDemoData } from '../apps/api/src/services/adminService.js';
async function run() {
  await connectDatabase();
  await seedAdminDemoData();
  console.log('Admin demo data seeded successfully!');
  process.exit(0);
}
run().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
