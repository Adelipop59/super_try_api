import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const campaign = await prisma.campaign.findFirst({
    where: {
      title: {
        contains: 'Campaign DEMO OK',
      },
    },
    include: {
      products: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!campaign) {
    console.log('Campagne non trouvée');
    return;
  }

  console.log('Campaign:', campaign.title);
  console.log('totalSlots:', campaign.totalSlots);
  console.log('availableSlots:', campaign.availableSlots);
  console.log('\nCampaignProduct:');
  if (campaign.products && campaign.products.length > 0) {
    const cp = campaign.products[0];
    console.log('  expectedPrice:', cp.expectedPrice);
    console.log('  shippingCost:', cp.shippingCost);
    console.log('  bonus:', cp.bonus);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
