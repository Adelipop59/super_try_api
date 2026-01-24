import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateImageUrl() {
  console.log('Starting migration of imageUrl to images...');

  // Trouver tous les produits qui ont un imageUrl mais pas d'images
  const productsWithImageUrl = await prisma.product.findMany({
    where: {
      imageUrl: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      images: true,
    },
  });

  console.log(`Found ${productsWithImageUrl.length} products with imageUrl`);

  for (const product of productsWithImageUrl) {
    console.log(`\nMigrating product: ${product.name}`);
    console.log(`  Current imageUrl: ${product.imageUrl}`);
    console.log(`  Current images: ${JSON.stringify(product.images)}`);

    // Si images est null ou vide, créer un array avec imageUrl
    if (
      !product.images ||
      (Array.isArray(product.images) && product.images.length === 0)
    ) {
      const newImages = [
        {
          url: product.imageUrl!,
          order: 0,
          isPrimary: true,
        },
      ];

      await prisma.product.update({
        where: { id: product.id },
        data: {
          images: newImages as any,
        },
      });

      console.log(`  ✅ Migrated to images array`);
    } else {
      console.log(`  ⏭️  Already has images array, skipping`);
    }
  }

  console.log('\n✅ Migration complete!');
  await prisma.$disconnect();
}

migrateImageUrl().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
