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

  if (!campaign || campaign.offers.length === 0) {
    console.log('Pas de campagne trouvée');
    return;
  }

  const offer = campaign.offers[0];
  
  console.log('Offer expectedPrice type:', typeof offer.expectedPrice);
  console.log('Offer expectedPrice value:', offer.expectedPrice);
  console.log('Product images type:', typeof offer.product.images);
  console.log('Product images value:', offer.product.images);

  // Simuler le formatCampaignResponse
  const formatted = {
    expectedPrice: offer.expectedPrice?.toString() || '0',
    product: {
      name: offer.product.name,
      images: offer.product.images,
    }
  };

  console.log('\nFormatted result:');
  console.log(JSON.stringify(formatted, null, 2));

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
