const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const member = await prisma.member.findFirst({ where: { phone: '9209766252' } });
  console.log('Full Name:', member?.fullName);
  console.log('Phone:', member?.phone);
  console.log('Alternate Phone:', member?.alternatePhone);
  console.log('Email:', member?.email);
  await prisma.$disconnect();
}
main();
