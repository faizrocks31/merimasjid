import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { getDictionary } from "@/i18n";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardBody, PageHeader, Button } from "@/components/ui";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlatformMasjidForm } from "../../masjid-form";

export const dynamic = "force-dynamic";

export default async function EditMasjidPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user || user.role !== ROLES.SUPER_ADMIN || !user.isPlatformAdmin) redirect("/dashboard");

  const { id } = await params;
  const { t } = await getDictionary();

  const masjid = await prisma.masjid.findUnique({ where: { id } });
  if (!masjid) redirect("/platform");

  return (
    <>
      <PageHeader
        title="Edit Masjid"
        description={masjid.name}
        actions={
          <Link href={`/platform/masjids/${masjid.id}`}>
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
          <PlatformMasjidForm
            masjid={{
              id: masjid.id,
              name: masjid.name,
              slug: masjid.slug,
              receiptPrefix: masjid.receiptPrefix,
              address: masjid.address,
              phone: masjid.phone,
              email: masjid.email,
              financialYearStartMonth: masjid.financialYearStartMonth,
              receiptFooter: masjid.receiptFooter,
              status: masjid.status,
            }}
          />
        </CardBody>
      </Card>
    </>
  );
}