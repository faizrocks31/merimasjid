import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});

async function main() {
  const allPayments = await p.payment.findMany({
    select: { amountPaise: true },
    take: 10000
  });
  const fractional = allPayments.filter(i => i.amountPaise % 100 !== 0);
  console.log('Total payments:', allPayments.length);
  console.log('Fractional payments:', fractional.length);
  if (fractional.length > 0) {
    console.log('Sample fractional:', fractional.slice(0, 5));
  }
  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
});