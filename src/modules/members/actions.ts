"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { memberSchema } from "@/lib/validation";
import { parseISODate } from "@/lib/dates";
import { nextMemberNumber } from "@/lib/receipts/numbering";
import { writeAudit } from "@/modules/audit/write";
import { hashPassword } from "@/lib/auth";
import { checkLimit } from "@/lib/subscription";

export type MemberFormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

function parse(formData: FormData) {
  return memberSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    fatherName: String(formData.get("fatherName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    alternatePhone: String(formData.get("alternatePhone") ?? ""),
    email: String(formData.get("email") ?? ""),
    address: String(formData.get("address") ?? ""),
    joinDate: String(formData.get("joinDate") ?? "") || undefined,
    status: String(formData.get("status") ?? "ACTIVE"),
    notes: String(formData.get("notes") ?? ""),
    createPortalAccount: formData.get("createPortalAccount") === "on",
    portalEmail: String(formData.get("portalEmail") ?? ""),
    portalPassword: String(formData.get("portalPassword") ?? ""),
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
  });
}

function fieldErrorsOf(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0] ?? "form")] = i.message;
  return out;
}

export async function createMemberAction(_prev: MemberFormState, formData: FormData): Promise<MemberFormState> {
  const user = await requireStaff();
  assertCan(user.role, "member:write");

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message, fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }
  const input = parsed.data;

  const portalEmail = input.email?.trim().toLowerCase();
  const portalPhone = input.phone?.replace(/\D/g, "");
  const shouldCreatePortal = Boolean(portalEmail && portalPhone);
  if (portalEmail) {
    const duplicateUser = await prisma.user.findFirst({
      where: { email: { equals: portalEmail, mode: "insensitive" } },
      select: { id: true },
    });
    const duplicateMember = await prisma.member.findFirst({
      where: { masjidId: user.masjidId!, email: { equals: portalEmail, mode: "insensitive" } },
      select: { id: true },
    });
    if (duplicateUser || duplicateMember) {
      return { error: "This email is already in use.", fieldErrors: { email: "Already in use" } };
    }
  }

  // Check for duplicate phone in this masjid BEFORE transaction
  if (input.phone) {
    const rawPhone = input.phone.replace(/\D/g, "");
    const existing = await prisma.member.findFirst({
      where: { masjidId: user.masjidId!, phone: rawPhone },
      select: { id: true, memberNo: true, fullName: true },
    });
    if (existing) {
      return { error: "User Already Exist", fieldErrors: { phone: "User Already Exist" } };
    }
  }

  try {
    const member = await prisma.$transaction(async (tx) => {
      // Check member limit before creating
      const currentMemberCount = await tx.member.count({
        where: { masjidId: user.masjidId! },
      });
      const limitCheck = await checkLimit(user.masjidId!, "members", currentMemberCount);
      if (!limitCheck.allowed) {
        throw new Error(`MEMBER_LIMIT_EXCEEDED:${limitCheck.limit}`);
      }

      // Idempotency: a repeated submission returns the original record.
      const existing = await tx.member.findFirst({
        where: { masjidId: user.masjidId!, idempotencyKey: input.idempotencyKey },
        select: { id: true, memberNo: true },
      });
      if (existing) {
        return { id: existing.id, memberNo: existing.memberNo, duplicate: true };
      }

      const memberNo = await nextMemberNumber(tx, user.masjidId!);

      let portalUserId: string | null = null;
      if (shouldCreatePortal && portalEmail && portalPhone) {
        const [takenUser, takenMemberEmail] = await Promise.all([
          tx.user.findFirst({ where: { email: { equals: portalEmail, mode: "insensitive" } }, select: { id: true } }),
          tx.member.findFirst({
            where: { masjidId: user.masjidId!, email: { equals: portalEmail, mode: "insensitive" } },
            select: { id: true },
          }),
        ]);
        if (takenUser || takenMemberEmail) throw new Error("PORTAL_EMAIL_TAKEN");
        const created = await tx.user.create({
          data: {
            name: input.fullName,
            email: portalEmail,
            passwordHash: await hashPassword(portalPhone),
            phone: portalPhone,
          },
        });
        portalUserId = created.id;
      }

      const created = await tx.member.create({
        data: {
          masjidId: user.masjidId!,
          memberNo,
          fullName: input.fullName,
          fatherName: input.fatherName ?? null,
          phone: input.phone ? input.phone.replace(/\D/g, "") : null,
          alternatePhone: input.alternatePhone ? input.alternatePhone.replace(/\D/g, "") : null,
          email: input.email ? input.email.toLowerCase() : null,
          address: input.address ?? null,
          joinDate: input.joinDate ? (parseISODate(input.joinDate) ?? new Date()) : new Date(),
          status: input.status,
          notes: input.notes ?? null,
          userId: portalUserId,
          idempotencyKey: input.idempotencyKey,
        },
      });

      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "member.create",
        entityType: "Member",
        entityId: created.id,
        after: { memberNo, fullName: input.fullName },
      });

      return created;
    });

    if ("duplicate" in member && member.duplicate) {
      revalidatePath("/members");
      redirect(`/members/${member.id}`);
    }

    revalidatePath("/members");
    redirect(`/members/${member.id}`);
  } catch (err) {
    if ((err instanceof Error && err.message === "PORTAL_EMAIL_TAKEN") || (err instanceof Error && "code" in err && err.code === "P2002")) {
      return { error: "This email is already in use.", fieldErrors: { email: "Already in use" } };
    }
    if (err instanceof Error && err.message.startsWith("MEMBER_LIMIT_EXCEEDED:")) {
      const limit = err.message.split(":")[1];
      return { error: `Member limit exceeded. Your plan allows a maximum of ${limit} members.` };
    }
    // Next's redirect() throws a control-flow error; rethrow it.
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("createMemberAction failed", err);
    return { error: "Could not save the member." };
  }
}

export async function updateMemberAction(_prev: MemberFormState, formData: FormData): Promise<MemberFormState> {
  const user = await requireStaff();
  assertCan(user.role, "member:write");

  const memberId = String(formData.get("memberId") ?? "");
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message, fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }
  const input = parsed.data;

  const existing = await prisma.member.findFirst({ where: { id: memberId, masjidId: user.masjidId! } });
  if (!existing) return { error: "Member not found in this Masjid." };

  const portalEmail = input.email?.trim().toLowerCase();
  const portalPhone = input.phone?.replace(/\D/g, "");
  const linkedUserId = existing.userId;

  if (portalEmail) {
    const [duplicateUser, duplicateMember] = await Promise.all([
      prisma.user.findFirst({
        where: {
          email: { equals: portalEmail, mode: "insensitive" },
          ...(linkedUserId ? { NOT: { id: linkedUserId } } : {}),
        },
        select: { id: true },
      }),
      prisma.member.findFirst({
        where: {
          masjidId: user.masjidId!,
          email: { equals: portalEmail, mode: "insensitive" },
          NOT: { id: existing.id },
        },
        select: { id: true },
      }),
    ]);
    if (duplicateUser || duplicateMember) {
      return { error: "This email is already in use.", fieldErrors: { email: "Already in use" } };
    }
  }

  // Check for duplicate phone (excluding this member)
  if (input.phone) {
    const rawPhone = input.phone.replace(/\D/g, "");
    const duplicate = await prisma.member.findFirst({
      where: { masjidId: user.masjidId!, phone: rawPhone, NOT: { id: existing.id } },
      select: { id: true, memberNo: true, fullName: true },
    });
    if (duplicate) {
      return { error: "User Already Exist", fieldErrors: { phone: "User Already Exist" } };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      let userId = existing.userId;
      if (portalEmail && userId) {
        const collision = await tx.user.findFirst({
          where: { email: { equals: portalEmail, mode: "insensitive" }, NOT: { id: userId } },
          select: { id: true },
        });
        if (collision) throw new Error("PORTAL_EMAIL_TAKEN");
        await tx.user.update({ where: { id: userId }, data: { email: portalEmail, name: input.fullName } });
      } else if (portalEmail && portalPhone && !userId) {
        const collision = await tx.user.findFirst({ where: { email: { equals: portalEmail, mode: "insensitive" } }, select: { id: true } });
        if (collision) throw new Error("PORTAL_EMAIL_TAKEN");
        const createdUser = await tx.user.create({
          data: { name: input.fullName, email: portalEmail, phone: portalPhone, passwordHash: await hashPassword(portalPhone) },
        });
        userId = createdUser.id;
      }

      await tx.member.update({
        where: { id: existing.id },
        data: {
          userId,
          fullName: input.fullName,
          fatherName: input.fatherName ?? null,
          phone: input.phone ? input.phone.replace(/\D/g, "") : null,
          alternatePhone: input.alternatePhone ? input.alternatePhone.replace(/\D/g, "") : null,
          email: input.email ? input.email.toLowerCase() : null,
          address: input.address ?? null,
          joinDate: input.joinDate ? (parseISODate(input.joinDate) ?? existing.joinDate) : existing.joinDate,
          status: input.status,
          notes: input.notes ?? null,
        },
      });

      await writeAudit(tx, {
        masjidId: user.masjidId,
        actorUserId: user.id,
        action: "member.update",
        entityType: "Member",
        entityId: existing.id,
        before: { fullName: existing.fullName, phone: existing.phone, status: existing.status },
        after: { fullName: input.fullName, phone: input.phone ? input.phone.replace(/\D/g, "") : null, status: input.status },
      });
    });

    revalidatePath("/members");
    revalidatePath(`/members/${existing.id}`);
    redirect(`/members/${existing.id}`);
  } catch (err) {
    if (err instanceof Error && err.message === "PORTAL_EMAIL_TAKEN") {
      return { error: "This email is already in use.", fieldErrors: { email: "Already in use" } };
    }
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return { error: "This email is already in use.", fieldErrors: { email: "Already in use" } };
    }
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("updateMemberAction failed", err);
    return { error: "Could not update the member." };
  }
}
