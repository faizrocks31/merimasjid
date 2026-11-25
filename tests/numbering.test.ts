import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { nextExpenseNumber, nextMemberNumber, nextReceiptNumber } from "@/lib/receipts/numbering";
import { financialYearLabel } from "@/lib/dates";

let masjidId = "";

beforeAll(async () => {
  const masjid = await prisma.masjid.findFirst({ where: { slug: "jama-masjid" } }) ?? (await prisma.masjid.findFirst());
  if (!masjid) throw new Error("Seed the database before running these tests (npm run seed).");
  masjidId = masjid.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("receipt numbering", () => {
  it("starts each masjid + financial year at 000001 and increments", async () => {
    const fy = "2099-00";
    await prisma.receiptSequence.deleteMany({ where: { masjidId, financialYear: fy } });

    const date = new Date("2099-05-10T00:00:00+05:30");
    expect(financialYearLabel(date, 4)).toBe(fy);

    const first = await prisma.$transaction((tx) => nextReceiptNumber(tx, masjidId, "TST", date, 4));
    const second = await prisma.$transaction((tx) => nextReceiptNumber(tx, masjidId, "TST", date, 4));

    expect(first.receiptNo).toBe(`TST-${fy}-000001`);
    expect(second.receiptNo).toBe(`TST-${fy}-000002`);
    expect(second.sequence).toBe(2);
  });

  it("keeps separate sequences per financial year", async () => {
    const fyA = "2098-99";
    const fyB = "2097-98";
    await prisma.receiptSequence.deleteMany({ where: { masjidId, financialYear: { in: [fyA, fyB] } } });

    const a = await prisma.$transaction((tx) =>
      nextReceiptNumber(tx, masjidId, "TST", new Date("2098-06-01T00:00:00+05:30"), 4),
    );
    const b = await prisma.$transaction((tx) =>
      nextReceiptNumber(tx, masjidId, "TST", new Date("2097-06-01T00:00:00+05:30"), 4),
    );

    expect(a.receiptNo).toBe(`TST-${fyA}-000001`);
    expect(b.receiptNo).toBe(`TST-${fyB}-000001`);
  });

  it("never reuses a number after the sequence advances", async () => {
    const fy = "2096-97";
    await prisma.receiptSequence.deleteMany({ where: { masjidId, financialYear: fy } });
    const date = new Date("2096-07-01T00:00:00+05:30");

    const issued: string[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await prisma.$transaction((tx) => nextReceiptNumber(tx, masjidId, "TST", date, 4));
      issued.push(r.receiptNo);
    }

    expect(new Set(issued).size).toBe(5);
    expect(issued.at(-1)).toBe(`TST-${fy}-000005`);
  });

  it("allocates member numbers without collisions", async () => {
    const memberNo = await prisma.$transaction((tx) => nextMemberNumber(tx, masjidId));
    expect(memberNo).toMatch(/^MAS-\d{6}$/);
  });

  it("increments member numbers sequentially", async () => {
    // Cleanup any existing sequence rows for a clean start
    await prisma.memberSequence.deleteMany({ where: { masjidId } });
    await prisma.member.deleteMany({ where: { masjidId } });

    const first = await prisma.$transaction((tx) => nextMemberNumber(tx, masjidId));
    const second = await prisma.$transaction((tx) => nextMemberNumber(tx, masjidId));
    expect(first).toBe("MAS-000001");
    expect(second).toBe("MAS-000002");
  });

  it("handles boundary transition from 9 to 10 digits", async () => {
    // Ensure a clean state
    await prisma.memberSequence.deleteMany({ where: { masjidId } });
    await prisma.member.deleteMany({ where: { masjidId } });

    // Pre‑create a member with number MAS-000009
    await prisma.member.create({
      data: {
        masjidId,
        memberNo: "MAS-000009",
        fullName: "Boundary Test",
      },
    });

    const next = await prisma.$transaction((tx) => nextMemberNumber(tx, masjidId));
    expect(next).toBe("MAS-000010");
  });

  it("handles concurrent allocations without duplicates (10 parallel)", async () => {
    // Clean state again
    await prisma.memberSequence.deleteMany({ where: { masjidId } });
    await prisma.member.deleteMany({ where: { masjidId } });

    const promises = Array.from({ length: 10 }, () =>
      prisma.$transaction((tx) => nextMemberNumber(tx, masjidId)),
    );
    const results = await Promise.all(promises);
    expect(new Set(results).size).toBe(10);
    const sorted = results.sort();
    expect(sorted[0]).toBe("MAS-000001");
    expect(sorted[9]).toBe("MAS-000010");
  });

  it("initializes sequence from existing members to avoid conflicts", async () => {
    // Clean state
    await prisma.memberSequence.deleteMany({ where: { masjidId } });
    await prisma.member.deleteMany({ where: { masjidId } });

    // Pre‑create three members with numbers 000001‑000003
    await prisma.member.createMany({
      data: [
        { masjidId, memberNo: "MAS-000001", fullName: "M1" },
        { masjidId, memberNo: "MAS-000002", fullName: "M2" },
        { masjidId, memberNo: "MAS-000003", fullName: "M3" },
      ],
    });

    const next = await prisma.$transaction((tx) => nextMemberNumber(tx, masjidId));
    expect(next).toBe("MAS-000004");
  });

  it("transaction rollback does not persist sequence advance", async () => {
    // Clean state
    await prisma.memberSequence.deleteMany({ where: { masjidId } });
    await prisma.member.deleteMany({ where: { masjidId } });

    const first = await prisma.$transaction((tx) => nextMemberNumber(tx, masjidId));
    expect(first).toBe("MAS-000001");

    let rolledBackNumber = "";
    try {
      await prisma.$transaction(async (tx) => {
        rolledBackNumber = await nextMemberNumber(tx, masjidId);
        expect(rolledBackNumber).toBe("MAS-000002");
        throw new Error("Intentional rollback");
      });
    } catch (e) {
      // expected
    }

    const next = await prisma.$transaction((tx) => nextMemberNumber(tx, masjidId));
    expect(next).toBe("MAS-000002");
  });

});
