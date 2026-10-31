"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, PageHeader } from "@/components/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import {
  ContributionCategoriesPanel,
  ExpenseCategoriesPanel,
  MasjidSettingsForm,
  NotificationSettingsForm,
} from "./settings-forms";
import { StaffList } from "../staff/staff-list";
import { Building2, Gift, CreditCard, Bell, UserCheck } from "lucide-react";
import { deleteCategoryAction, deleteExpenseCategoryAction } from "@/modules/settings/actions";

const SETTINGS_TABS = [
  { key: "masjid", label: "Masjid Details", icon: Building2, tooltip: "Masjid Details" },
  { key: "contributionCategories", label: "Contribution Categories", icon: Gift, tooltip: "Contribution Categories" },
  { key: "expenseCategories", label: "Expense Categories", icon: CreditCard, tooltip: "Expense Categories" },
  { key: "notifications", label: "Notifications", icon: Bell, tooltip: "Notifications" },
  { key: "staff", label: "Staff", icon: UserCheck, tooltip: "Staff" },
] as const;

interface MemberOption {
  id: string;
  memberNo: string;
  fullName: string;
}

interface AssignmentItem {
  id: string;
  eventId: string;
  memberId: string;
  memberName: string;
  memberNo: string;
  expectedAmountPaise: number;
  status: string;
}

interface CollectionEventItem {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  startDate: string;
  endDate: string | null;
  dueDate: string;
  expectedAmountPaise: number | null;
  status: string;
  applicableMonth: number | null;
  applicableYear: number | null;
  notes: string | null;
}

interface SettingsPageClientProps {
  labels: Record<string, string>;
  initialTab: string;
  masjid: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    receiptPrefix: string;
    financialYearStartMonth: number;
    receiptFooter: string | null;
  };
  contributionCategoryItems: {
    id: string;
    name: string;
    code: string;
    restrictedPurpose: boolean;
    reportingGroup: string | null;
    description: string | null;
    defaultAmountPaise: number | null;
    frequency: string | null;
    collectionMode: string | null;
    defaultDueDay: number | null;
    defaultGraceDays: number | null;
    meta: string;
    restricted: boolean;
    active: boolean;
  }[];
  collectionEventItems: CollectionEventItem[];
  memberOptions: MemberOption[];
  assignmentItems: AssignmentItem[];
  expenseCategoryItems: {
    id: string;
    name: string;
    active: boolean;
  }[];
  staffMembers: {
    id: string;
    user: { id: string; name: string; email: string; lastLoginAt: string | null };
    role: string;
    status: "ACTIVE" | "INACTIVE";
    isSelf: boolean;
  }[];
  staffLabels: Record<string, string>;
  roleLabels: Record<string, string>;
  notificationSettings: {
    telegramEnabled: boolean;
    emailEnabled: boolean;
    inAppEnabled: boolean;
  };
  botUsername: string | null;
}

export function SettingsPageClient({
  labels,
  initialTab,
  masjid,
  contributionCategoryItems,
  collectionEventItems,
  memberOptions,
  assignmentItems,
  expenseCategoryItems,
  staffMembers,
  staffLabels,
  roleLabels,
  notificationSettings,
  botUsername,
}: SettingsPageClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleDeleteContributionCategory = (item: { id: string; name: string }) => {
    if (!window.confirm(`${labels.confirmDelete} "${item.name}"?`)) return;
    const formData = new FormData();
    formData.set("categoryId", item.id);
    startTransition(async () => {
      const result = await deleteCategoryAction(undefined, formData);
      if (result?.ok) {
        window.location.reload();
      } else {
        alert(result?.error || "Failed to delete category");
      }
    });
  };

  const handleDeleteExpenseCategory = (item: { id: string; name: string }) => {
    if (!window.confirm(`${labels.confirmDelete} "${item.name}"?`)) return;
    const formData = new FormData();
    formData.set("categoryId", item.id);
    startTransition(async () => {
      const result = await deleteExpenseCategoryAction(undefined, formData);
      if (result?.ok) {
        window.location.reload();
      } else {
        alert(result?.error || "Failed to delete category");
      }
    });
  };

  const env = {
    botUsername,
    hasBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
    hasChannelId: !!process.env.TELEGRAM_CHANNEL_ID,
    hasSmtp: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS),
  };

  return (
    <>
      <PageHeader title={labels.settings} description={masjid.name} />

      <Tabs
        defaultValue={initialTab}
        onValueChange={(v) => router.replace(`/settings?tab=${v}`, { scroll: false })}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-5">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="flex items-center justify-center py-3 data-[state=active]:bg-[var(--brand-soft)] data-[state=active]:text-[var(--brand-deep)] relative"
                title={tab.tooltip}
              >
                <Icon className="h-5 w-5" />
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="masjid" className="mt-5">
          <Card>
            <CardHeader><CardTitle>{labels.masjidName}</CardTitle></CardHeader>
            <MasjidSettingsForm
              labels={labels}
              masjid={{
                name: masjid.name,
                address: masjid.address,
                phone: masjid.phone,
                email: masjid.email,
                receiptPrefix: masjid.receiptPrefix,
                financialYearStartMonth: masjid.financialYearStartMonth,
                receiptFooter: masjid.receiptFooter,
              }}
            />
          </Card>
        </TabsContent>

        <TabsContent value="contributionCategories" className="mt-5">
          <ContributionCategoriesPanel
            items={contributionCategoryItems}
            labels={labels}
            onDelete={handleDeleteContributionCategory}
            events={collectionEventItems}
            members={memberOptions}
            assignments={assignmentItems}
          />
        </TabsContent>

        <TabsContent value="expenseCategories" className="mt-5">
          <ExpenseCategoriesPanel
            items={expenseCategoryItems}
            labels={labels}
            onDelete={handleDeleteExpenseCategory}
          />
        </TabsContent>

        <TabsContent value="notifications" className="mt-5">
          <Card>
            <CardHeader><CardTitle>{labels.notifications}</CardTitle></CardHeader>
            <NotificationSettingsForm
              labels={labels}
              settings={notificationSettings}
              env={env}
            />
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="mt-5">
          <Card>
            <CardHeader><CardTitle>{labels.staff}</CardTitle></CardHeader>
            <StaffList
              members={staffMembers}
              labels={staffLabels}
              roleLabels={roleLabels}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}