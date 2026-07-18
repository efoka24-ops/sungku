import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Full wipe of campaign + test data. Admin users are kept so you can still log in.
async function main() {
  const contribs = await prisma.contribution.deleteMany({});
  const reports = await prisma.report.deleteMany({});
  const campaigns = await prisma.campaign.deleteMany({});
  const apiKeys = await prisma.apiKey.deleteMany({});
  const partners = await prisma.partner.deleteMany({});
  const otps = await prisma.otpToken.deleteMany({});
  const users = await prisma.user.deleteMany({ where: { isAdmin: false } });

  console.log(
    `Wiped: ${campaigns.count} campaigns, ${contribs.count} contributions, ${reports.count} reports, ` +
      `${partners.count} partners, ${apiKeys.count} api keys, ${otps.count} otp tokens, ${users.count} non-admin users.`
  );
  const remainingUsers = await prisma.user.findMany({ select: { email: true } });
  console.log(`Remaining users (admins kept): ${remainingUsers.map((u) => u.email).join(", ") || "none"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
