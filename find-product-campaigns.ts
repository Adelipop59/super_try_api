import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Trouver le produit ps5 Pro
  const product = await prisma.product.findFirst({
    where: {
      name: {
        contains: 'ps5 Pro'
      }
    },
    select: {
      id: true,
      name: true,
      images: true
    }
  });

  if (!product) {
    console.log('Produit ps5 Pro non trouvé');
    return;
  }

  console.log('Produit:', product.name);
  console.log('Images:', product.images);

  // Trouver les campagnes avec ce produit
  const offers = await prisma.offer.findMany({
    where: {
      productId: product.id
    },
    include: {
      campaign: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });

  console.log('\nCampagnes utilisant ce produit:', offers.length);
  offers.forEach(offer => {
    console.log(`  - ${offer.campaign.title} (ID: ${offer.campaign.id})`);
  });

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
