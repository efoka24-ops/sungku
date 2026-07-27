const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Upsert super admin account
  const user = await p.user.upsert({
    where: { email: 'emm.foka@gmail.com' },
    update: { isAdmin: true, emailVerified: true },
    create: {
      name: 'Emmanuel Foka',
      email: 'emm.foka@gmail.com',
      emailVerified: true,
      isAdmin: true,
      kycStatus: 'VERIFIED',
    },
  });
  console.log('Super admin ready:', user.id, user.email, 'isAdmin:', user.isAdmin);
}

main().finally(() => p.$disconnect());
