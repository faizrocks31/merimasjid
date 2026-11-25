import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const member = await prisma.member.findFirst({ where: { phone: '9208203432' } })
console.log('Full Name:', member?.fullName)
console.log('Phone:', member?.phone)
console.log('Alternate Phone:', member?.alternatePhone)
console.log('Email:', member?.email)
await prisma.$disconnect()