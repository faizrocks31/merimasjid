-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('WEEKLY', 'MONTHLY', 'SEMI_ANNUAL', 'ANNUAL', 'YEARLY', 'EVENT_BASED', 'OCCASIONAL');

-- CreateEnum
CREATE TYPE "CollectionMode" AS ENUM ('HOUSEHOLD_WISE', 'COMBINED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'OPEN', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'WAIVED');

-- CreateTable
CREATE TABLE "Masjid" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "financialYearStartMonth" INTEGER NOT NULL DEFAULT 4,
    "receiptPrefix" TEXT NOT NULL DEFAULT 'MSA',
    "receiptFooter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "upiId" TEXT
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT NOT NULL,
    "memberNo" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "fatherName" TEXT,
    "phone" TEXT,
    "alternatePhone" TEXT,
    "address" TEXT,
    "joinDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "telegramChatId" TEXT UNIQUE,
    "notifyTelegram" INTEGER NOT NULL DEFAULT 1,
    "notifyInApp" INTEGER NOT NULL DEFAULT 1,
    "notifyEmail" INTEGER NOT NULL DEFAULT 0,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    CONSTRAINT "Member_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContributionCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "restrictedPurpose" BOOLEAN NOT NULL DEFAULT false,
    "reportingGroup" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "defaultAmountPaise" INTEGER,
    "frequency" TEXT,
    "collectionMode" TEXT,
    "schedulingRules" TEXT,
    "defaultDueDay" INTEGER,
    "defaultGraceDays" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    CONSTRAINT "ContributionCategory_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ContributionCategory_masjidId_code_key" ON "ContributionCategory"("masjidId", "code");

-- CreateTable
CREATE TABLE "ContributionPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "dueDay" INTEGER NOT NULL DEFAULT 10,
    "graceDays" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContributionPlan_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContributionPlan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContributionPlan_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContributionCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ContributionPlan_masjidId_memberId_idx" ON "ContributionPlan"("masjidId", "memberId");
-- CreateIndex
CREATE INDEX "ContributionPlan_masjidId_status_idx" ON "ContributionPlan"("masjidId", "status");

-- CreateTable
CREATE TABLE "PlanAmountHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "changedBy" TEXT,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanAmountHistory_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContributionPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlanAmountHistory_planId_effectiveFrom_idx" ON "PlanAmountHistory"("planId", "effectiveFrom");

-- CreateTable
CREATE TABLE "DuesPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "expectedAmountPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DuesPeriod_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DuesPeriod_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContributionPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DuesPeriod_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DuesPeriod_planId_periodStart_periodEnd_key" ON "DuesPeriod"("planId", "periodStart", "periodEnd");
-- CreateIndex
CREATE INDEX "DuesPeriod_masjidId_status_dueDate_idx" ON "DuesPeriod"("masjidId", "status", "dueDate");
-- CreateIndex
CREATE INDEX "DuesPeriod_masjidId_memberId_idx" ON "DuesPeriod"("masjidId", "memberId");

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "donorMemberId" TEXT,
    "donorNameSnapshot" TEXT NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "referenceNo" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "enteredBy" TEXT NOT NULL,
    "notes" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_donorMemberId_fkey" FOREIGN KEY ("donorMemberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_enteredBy_fkey" FOREIGN KEY ("enteredBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_masjidId_receiptNo_key" ON "Payment"("masjidId", "receiptNo");
-- CreateIndex
CREATE UNIQUE INDEX "Payment_masjidId_idempotencyKey_key" ON "Payment"("masjidId", "idempotencyKey");
-- CreateIndex
CREATE INDEX "Payment_masjidId_paymentDate_idx" ON "Payment"("masjidId", "paymentDate");
-- CreateIndex
CREATE INDEX "Payment_masjidId_donorMemberId_idx" ON "Payment"("masjidId", "donorMemberId");
-- CreateIndex
CREATE INDEX "Payment_masjidId_status_idx" ON "Payment"("masjidId", "status");
-- CreateIndex
CREATE INDEX "Payment_masjidId_mode_idx" ON "Payment"("masjidId", "mode");

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "duesPeriodId" TEXT,
    "categoryId" TEXT NOT NULL,
    "allocatedAmountPaise" INTEGER NOT NULL,
    "purposeNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectionEventId" TEXT,
    CONSTRAINT "PaymentAllocation_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentAllocation_duesPeriodId_fkey" FOREIGN KEY ("duesPeriodId") REFERENCES "DuesPeriod" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaymentAllocation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContributionCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PaymentAllocation_masjidId_paymentId_idx" ON "PaymentAllocation"("masjidId", "paymentId");
-- CreateIndex
CREATE INDEX "PaymentAllocation_duesPeriodId_idx" ON "PaymentAllocation"("duesPeriodId");
-- CreateIndex
CREATE INDEX "PaymentAllocation_collectionEventId_idx" ON "PaymentAllocation"("collectionEventId");

-- CreateTable
CREATE TABLE "ReceiptEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReceiptEvent_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReceiptEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReceiptEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ReceiptEvent_masjidId_paymentId_idx" ON "ReceiptEvent"("masjidId", "paymentId");

-- CreateTable
CREATE TABLE "ReceiptSequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ReceiptSequence_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptSequence_masjidId_financialYear_key" ON "ReceiptSequence"("masjidId", "financialYear");

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpenseCategory_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_masjidId_name_key" ON "ExpenseCategory"("masjidId", "name");

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT NOT NULL,
    "expenseNo" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "payee" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "referenceNo" TEXT,
    "description" TEXT,
    "attachmentUrl" TEXT,
    "enteredBy" TEXT NOT NULL,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_enteredBy_fkey" FOREIGN KEY ("enteredBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Expense_masjidId_expenseNo_key" ON "Expense"("masjidId", "expenseNo");
-- CreateIndex
CREATE INDEX "Expense_masjidId_date_idx" ON "Expense"("masjidId", "date");
-- CreateIndex
CREATE INDEX "Expense_masjidId_approvalStatus_idx" ON "Expense"("masjidId", "approvalStatus");

-- CreateTable
CREATE TABLE "Reversal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT NOT NULL,
    "originalPaymentId" TEXT NOT NULL UNIQUE,
    "reversalPaymentId" TEXT UNIQUE,
    "amountPaise" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reversal_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reversal_originalPaymentId_fkey" FOREIGN KEY ("originalPaymentId") REFERENCES "Payment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reversal_reversalPaymentId_fkey" FOREIGN KEY ("reversalPaymentId") REFERENCES "Payment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Reversal_masjidId_idx" ON "Reversal"("masjidId");

-- CreateTable
CREATE TABLE "CashSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT NOT NULL,
    "collectorId" TEXT NOT NULL,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openingCashPaise" INTEGER NOT NULL DEFAULT 0,
    "closedAt" DATETIME,
    "countedCashPaise" INTEGER,
    "expectedCashPaise" INTEGER,
    "differencePaise" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    CONSTRAINT "CashSession_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CashSession_masjidId_status_idx" ON "CashSession"("masjidId", "status");

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AuditLog_masjidId_createdAt_idx" ON "AuditLog"("masjidId", "createdAt");
-- CreateIndex
CREATE INDEX "AuditLog_masjidId_entityType_entityId_idx" ON "AuditLog"("masjidId", "entityType", "entityId");

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TRIAL',
    "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME,
    "billingReference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Subscription_masjidId_idx" ON "Subscription"("masjidId");

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerReference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationLog_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NotificationLog_masjidId_createdAt_idx" ON "NotificationLog"("masjidId", "createdAt");

-- CreateTable
CREATE TABLE "MasjidUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "invitedAt" DATETIME,
    "joinedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MasjidUser_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MasjidUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MasjidUser_masjidId_userId_key" ON "MasjidUser"("masjidId", "userId");
-- CreateIndex
CREATE INDEX "MasjidUser_userId_idx" ON "MasjidUser"("userId");
-- CreateIndex
CREATE INDEX "MasjidUser_masjidId_status_idx" ON "MasjidUser"("masjidId", "status");

-- CreateTable
CREATE TABLE "MasjidNotificationSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT NOT NULL UNIQUE,
    "telegramEnabled" INTEGER NOT NULL DEFAULT 1,
    "emailEnabled" INTEGER NOT NULL DEFAULT 0,
    "inAppEnabled" INTEGER NOT NULL DEFAULT 1,
    "defaultTemplates" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MasjidNotificationSettings_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_masjidId_memberNo_key" ON "Member"("masjidId", "memberNo");
-- CreateIndex
CREATE INDEX "Member_masjidId_status_idx" ON "Member"("masjidId", "status");
-- CreateIndex
CREATE INDEX "Member_masjidId_fullName_idx" ON "Member"("masjidId", "fullName");
-- CreateIndex
CREATE INDEX "Member_masjidId_phone_idx" ON "Member"("masjidId", "phone");
-- CreateIndex
CREATE INDEX "Member_userId_idx" ON "Member"("userId");