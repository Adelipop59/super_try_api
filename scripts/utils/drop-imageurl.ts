import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function dropImageUrl() {
  console.log('Dropping image_url column from public schema...');

  // Use proper schema qualification
  await prisma.$executeRawUnsafe(
    'ALTER TABLE public."Product" DROP COLUMN IF EXISTS image_url',
  );

  console.log('✅ Column image_url dropped successfully!');
  await prisma.$disconnect();
}

dropImageUrl().catch((error) => {
  console.error('Failed to drop column:', error);
  process.exit(1);
});
