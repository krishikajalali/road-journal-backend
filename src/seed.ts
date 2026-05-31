import bcrypt from 'bcryptjs';
import prisma from './config/prisma';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  console.log('🌱 Seeding database...');

  // Delete existing users (entries are immutable, skip if any exist)
  const entryCount = await prisma.journalEntry.count();
  if (entryCount > 0) {
    console.log(`⚠️  ${entryCount} journal entries exist. Skipping entry deletion (entries are permanent).`);
  }

  await prisma.user.deleteMany({});
  console.log('🗑️  Cleared existing users');

  const travelerUsername = process.env.SEED_TRAVELER_USERNAME || 'traveler';
  const travelerPassword = process.env.SEED_TRAVELER_PASSWORD || 'RoadTrip2025!';
  const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@Journal25';

  const travelerHash = await bcrypt.hash(travelerPassword, 12);
  const adminHash = await bcrypt.hash(adminPassword, 12);

  const traveler = await prisma.user.create({
    data: {
      username: travelerUsername,
      passwordHash: travelerHash,
      role: 'TRAVELER',
    },
  });

  const admin = await prisma.user.create({
    data: {
      username: adminUsername,
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });

  console.log('✅ Created users:');
  console.log(`   Traveler: ${traveler.username} (role: TRAVELER)`);
  console.log(`   Admin:    ${admin.username} (role: ADMIN)`);
  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Login credentials:');
  console.log(`   Traveler → username: "${travelerUsername}" / password: "${travelerPassword}"`);
  console.log(`   Admin    → username: "${adminUsername}" / password: "${adminPassword}"`);
}

seed()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
