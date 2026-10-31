import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getDictionary } from "@/i18n";
import { Card, CardHeader, CardTitle, CardBody, PageHeader, Button } from "@/components/ui";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlatformMasjidForm } from "../masjid-form";

export const dynamic = "force-dynamic";

export default async function NewMasjidPage() {
  const user = await requireUser();
  if (!user || user.role !== ROLES.SUPER_ADMIN || !user.isPlatformAdmin) redirect("/dashboard");

  const { t } = await getDictionary();

  return (
    <>
      <PageHeader
        title="Add New Masjid"
        description="Create a new masjid on the platform"
        actions={
          <Link href="/platform">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Masjid Details</CardTitle>
        </CardHeader>
        <CardBody>
          <PlatformMasjidForm />
        </CardBody>
      </Card>
    </>
  );
}