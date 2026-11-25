import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});

async function main() {
  // Check payments
  const payments = await p.payment.findMany({
    select: { amountPaise: true },
    take: 10000
  });
  console.log('Payments - Total:', payments.length, 'Fractional:', payments.filter(i => i.amountPaise % 100 !== 0).length);

  // Check expenses
  const expenses = await p.expense.findMany({
    select: { amountPaise: true },
    take: 10000
  });
  console.log('Expenses - Total:', expenses.length, 'Fractional:', expenses.filter(i => i.amountPaise % 100 !== 0).length);

  // Check collection definitions
  const colDefs = await p.collectionDefinition.findMany({
    select: { defaultAmountPaise: true },
    take: 10000
  });
  console.log('CollectionDef - Total:', colDefs.length, 'Fractional:', colDefs.filter(i => i.defaultAmountPaise && i.defaultAmountPaise % 100 !== 0).length);

  // Check dues periods
  const dues = await p.duesPeriod.findMany({
    select: { expectedAmountPaise: true },
    take: 10000
  });
  console.log('DuesPeriod - Total:', dues.length, 'Fractional expected:', dues.filter(i => i.expectedAmountPaise % 100 !== 0).length);

  // Check allocations
  const allocations = await p.paymentAllocation.findMany({
    select: { allocatedAmountPaise: true },
    take: 10000
  });
  console.log('Allocations - Total:', allocations.length, 'Fractional amount:', allocations.filter(i => i.allocatedAmountPaise % 100 !== 0).length);

  // Check collection events
  const events = await p.collectionEvent.findMany({
    select: { expectedAmountPaise: true },
    take: 10000
  });
  console.log('CollectionEvents - Total:', events.length, 'Fractional:', events.filter(i => i.expectedAmountPaise !== null && i.expectedAmountPaise % 100 !== 0).length);

  // Check collection event assignments
  const eventAssignments = await p.collectionEventAssignment.findMany({
    select: { expectedAmountPaise: true },
    take: 10000
  });
  console.log('EventAssignments - Total:', eventAssignments.length, 'Fractional:', eventAssignments.filter(i => i.expectedAmountPaise !== null && i.expectedAmountPaise % 100 !== 0).length);

  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
});