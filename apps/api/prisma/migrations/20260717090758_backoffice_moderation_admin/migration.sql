-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reporterEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "targetAmount" INTEGER NOT NULL,
    "deadline" DATETIME,
    "coverImage" TEXT,
    "beneficiary" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIQUE',
    "isTontine" BOOLEAN NOT NULL DEFAULT false,
    "qrCodeDataUrl" TEXT,
    "organizerId" TEXT,
    "moderationStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Campaign_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Campaign" ("beneficiary", "category", "coverImage", "createdAt", "deadline", "description", "id", "isTontine", "organizerId", "qrCodeDataUrl", "slug", "targetAmount", "title", "visibility") SELECT "beneficiary", "category", "coverImage", "createdAt", "deadline", "description", "id", "isTontine", "organizerId", "qrCodeDataUrl", "slug", "targetAmount", "title", "visibility" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycStatus" TEXT NOT NULL DEFAULT 'NONE',
    "kycIdNumber" TEXT,
    "withdrawMethod" TEXT,
    "withdrawPhone" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "id", "kycIdNumber", "kycStatus", "name", "phone", "withdrawMethod", "withdrawPhone") SELECT "createdAt", "email", "emailVerified", "id", "kycIdNumber", "kycStatus", "name", "phone", "withdrawMethod", "withdrawPhone" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
