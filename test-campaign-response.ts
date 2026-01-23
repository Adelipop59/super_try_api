import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const campaign = await prisma.campaign.findFirst({
    where: {
      title: {
        contains: 'Campaign DEMO OK'
      }
    },
    include: {
      offers: {
        include: {
          product: true
        }
      }
    }
  });

  if (!campaign) {
    console.log('Campagne non trouvée');
    return;
  }

  console.log('Campaign:', campaign.title);
  console.log('\nOffers:');
  campaign.offers.forEach(offer => {
    console.log('  Product:', offer.product.name);
    console.log('  expectedPrice:', offer.expectedPrice);
    console.log('  shippingCost:', offer.shippingCost);
    console.log('  bonus:', offer.bonus);
    console.log('  images:', typeof offer.product.images, offer.product.images);
  });

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
