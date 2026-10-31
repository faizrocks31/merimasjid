-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Masjid" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Masjid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "upiId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasjidUser" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "invitedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasjidUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "memberNo" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "fatherName" TEXT,
    "phone" TEXT,
    "alternatePhone" TEXT,
    "address" TEXT,
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "telegramChatId" TEXT,
    "notifyTelegram" INTEGER NOT NULL DEFAULT 1,
    "notifyInApp" INTEGER NOT NULL DEFAULT 1,
    "notifyEmail" INTEGER NOT NULL DEFAULT 0,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContributionCategory" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "restrictedPurpose" BOOLEAN NOT NULL DEFAULT false,
    "reportingGroup" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "defaultAmountPaise" INTEGER,
    "frequency" TEXT,
    "collectionMode" TEXT,
    "schedulingRules" TEXT,
    "defaultDueDay" INTEGER,
    "defaultGraceDays" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,

    CONSTRAINT "ContributionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContributionPlan" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "dueDay" INTEGER NOT NULL DEFAULT 10,
    "graceDays" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContributionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanAmountHistory" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "changedBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanAmountHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuesPeriod" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "expectedAmountPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuesPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionEvent" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "expectedAmountPaise" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "applicableMonth" INTEGER,
    "applicableYear" INTEGER,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionEventAssignment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "expectedAmountPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionEventAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "donorMemberId" TEXT,
    "donorNameSnapshot" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "referenceNo" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "enteredBy" TEXT NOT NULL,
    "notes" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "duesPeriodId" TEXT,
    "categoryId" TEXT NOT NULL,
    "allocatedAmountPaise" INTEGER NOT NULL,
    "purposeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectionEventId" TEXT,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptEvent" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptSequence" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReceiptSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "expenseNo" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "payee" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "referenceNo" TEXT,
    "description" TEXT,
    "attachmentUrl" TEXT,
    "enteredBy" TEXT NOT NULL,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reversal" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "originalPaymentId" TEXT NOT NULL,
    "reversalPaymentId" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reversal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashSession" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "collectorId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openingCashPaise" INTEGER NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),
    "countedCashPaise" INTEGER,
    "expectedCashPaise" INTEGER,
    "differencePaise" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,

    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TRIAL',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "billingReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasjidNotificationSettings" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "telegramEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultTemplates" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasjidNotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Masjid_slug_key" ON "Masjid"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "MasjidUser_userId_idx" ON "MasjidUser"("userId");

-- CreateIndex
CREATE INDEX "MasjidUser_masjidId_status_idx" ON "MasjidUser"("masjidId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MasjidUser_masjidId_userId_key" ON "MasjidUser"("masjidId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_telegramChatId_key" ON "Member"("telegramChatId");

-- CreateIndex
CREATE INDEX "Member_masjidId_status_idx" ON "Member"("masjidId", "status");

-- CreateIndex
CREATE INDEX "Member_masjidId_fullName_idx" ON "Member"("masjidId", "fullName");

-- CreateIndex
CREATE INDEX "Member_masjidId_phone_idx" ON "Member"("masjidId", "phone");

-- CreateIndex
CREATE INDEX "Member_userId_idx" ON "Member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_masjidId_memberNo_key" ON "Member"("masjidId", "memberNo");

-- CreateIndex
CREATE UNIQUE INDEX "ContributionCategory_masjidId_code_key" ON "ContributionCategory"("masjidId", "code");

-- CreateIndex
CREATE INDEX "ContributionPlan_masjidId_memberId_idx" ON "ContributionPlan"("masjidId", "memberId");

-- CreateIndex
CREATE INDEX "ContributionPlan_masjidId_status_idx" ON "ContributionPlan"("masjidId", "status");

-- CreateIndex
CREATE INDEX "PlanAmountHistory_planId_effectiveFrom_idx" ON "PlanAmountHistory"("planId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "DuesPeriod_masjidId_status_dueDate_idx" ON "DuesPeriod"("masjidId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "DuesPeriod_masjidId_memberId_idx" ON "DuesPeriod"("masjidId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "DuesPeriod_planId_periodStart_periodEnd_key" ON "DuesPeriod"("planId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "CollectionEvent_masjidId_categoryId_status_idx" ON "CollectionEvent"("masjidId", "categoryId", "status");

-- CreateIndex
CREATE INDEX "CollectionEvent_masjidId_dueDate_idx" ON "CollectionEvent"("masjidId", "dueDate");

-- CreateIndex
CREATE INDEX "CollectionEventAssignment_memberId_status_idx" ON "CollectionEventAssignment"("memberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionEventAssignment_eventId_memberId_key" ON "CollectionEventAssignment"("eventId", "memberId");

-- CreateIndex
CREATE INDEX "Payment_masjidId_paymentDate_idx" ON "Payment"("masjidId", "paymentDate");

-- CreateIndex
CREATE INDEX "Payment_masjidId_donorMemberId_idx" ON "Payment"("masjidId", "donorMemberId");

-- CreateIndex
CREATE INDEX "Payment_masjidId_status_idx" ON "Payment"("masjidId", "status");

-- CreateIndex
CREATE INDEX "Payment_masjidId_mode_idx" ON "Payment"("masjidId", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_masjidId_receiptNo_key" ON "Payment"("masjidId", "receiptNo");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_masjidId_idempotencyKey_key" ON "Payment"("masjidId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentAllocation_masjidId_paymentId_idx" ON "PaymentAllocation"("masjidId", "paymentId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_duesPeriodId_idx" ON "PaymentAllocation"("duesPeriodId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_collectionEventId_idx" ON "PaymentAllocation"("collectionEventId");

-- CreateIndex
CREATE INDEX "ReceiptEvent_masjidId_paymentId_idx" ON "ReceiptEvent"("masjidId", "paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptSequence_masjidId_financialYear_key" ON "ReceiptSequence"("masjidId", "financialYear");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_masjidId_name_key" ON "ExpenseCategory"("masjidId", "name");

-- CreateIndex
CREATE INDEX "Expense_masjidId_date_idx" ON "Expense"("masjidId", "date");

-- CreateIndex
CREATE INDEX "Expense_masjidId_approvalStatus_idx" ON "Expense"("masjidId", "approvalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_masjidId_expenseNo_key" ON "Expense"("masjidId", "expenseNo");

-- CreateIndex
CREATE UNIQUE INDEX "Reversal_originalPaymentId_key" ON "Reversal"("originalPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Reversal_reversalPaymentId_key" ON "Reversal"("reversalPaymentId");

-- CreateIndex
CREATE INDEX "Reversal_masjidId_idx" ON "Reversal"("masjidId");

-- CreateIndex
CREATE INDEX "CashSession_masjidId_status_idx" ON "CashSession"("masjidId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_masjidId_createdAt_idx" ON "AuditLog"("masjidId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_masjidId_entityType_entityId_idx" ON "AuditLog"("masjidId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "Subscription_masjidId_idx" ON "Subscription"("masjidId");

-- CreateIndex
CREATE INDEX "NotificationLog_masjidId_createdAt_idx" ON "NotificationLog"("masjidId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MasjidNotificationSettings_masjidId_key" ON "MasjidNotificationSettings"("masjidId");

-- AddForeignKey
ALTER TABLE "MasjidUser" ADD CONSTRAINT "MasjidUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasjidUser" ADD CONSTRAINT "MasjidUser_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributionCategory" ADD CONSTRAINT "ContributionCategory_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributionPlan" ADD CONSTRAINT "ContributionPlan_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContributionCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributionPlan" ADD CONSTRAINT "ContributionPlan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributionPlan" ADD CONSTRAINT "ContributionPlan_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAmountHistory" ADD CONSTRAINT "PlanAmountHistory_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContributionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuesPeriod" ADD CONSTRAINT "DuesPeriod_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuesPeriod" ADD CONSTRAINT "DuesPeriod_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ContributionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuesPeriod" ADD CONSTRAINT "DuesPeriod_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionEvent" ADD CONSTRAINT "CollectionEvent_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionEvent" ADD CONSTRAINT "CollectionEvent_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContributionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionEventAssignment" ADD CONSTRAINT "CollectionEventAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionEventAssignment" ADD CONSTRAINT "CollectionEventAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CollectionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_enteredBy_fkey" FOREIGN KEY ("enteredBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_donorMemberId_fkey" FOREIGN KEY ("donorMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContributionCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_duesPeriodId_fkey" FOREIGN KEY ("duesPeriodId") REFERENCES "DuesPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_collectionEventId_fkey" FOREIGN KEY ("collectionEventId") REFERENCES "CollectionEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptEvent" ADD CONSTRAINT "ReceiptEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptEvent" ADD CONSTRAINT "ReceiptEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptEvent" ADD CONSTRAINT "ReceiptEvent_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptSequence" ADD CONSTRAINT "ReceiptSequence_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_enteredBy_fkey" FOREIGN KEY ("enteredBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reversal" ADD CONSTRAINT "Reversal_reversalPaymentId_fkey" FOREIGN KEY ("reversalPaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reversal" ADD CONSTRAINT "Reversal_originalPaymentId_fkey" FOREIGN KEY ("originalPaymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reversal" ADD CONSTRAINT "Reversal_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasjidNotificationSettings" ADD CONSTRAINT "MasjidNotificationSettings_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

