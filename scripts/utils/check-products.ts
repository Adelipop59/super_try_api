import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      images: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  console.log('Products in database:');
  products.forEach((product) => {
    console.log('\n-------------------');
    console.log('Name:', product.name);
    console.log('images:', JSON.stringify(product.images, null, 2));
    console.log('createdAt:', product.createdAt);
  });

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
