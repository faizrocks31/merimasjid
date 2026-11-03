import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Exact target IDs from the reviewed test-masjid candidate list.
const TARGET_IDS = [
  "cmvw565ao001mw0uffx2ydp97", "cmvw557zz001kw0uf7djneo3r", "cmvw52k32001iw0uf3bmlbtts", "cmvw51m85001gw0uf2popqv1t", "cmvw4vdno001ew0ufijqmcgrx",
  "cmvw4ujj2001cw0uf9mmoo6yu", "cmvw4niso0018w0uf67kghku3", "cmvw4hxuz0016w0ufb2vuzdcp", "cmvw4h3ev0014w0uf74htzc91", "cmvw4cyjz0012w0ufne52nmm2",
  "cmvw4c58q0010w0ufn8p3r91r", "cmvw4a509000yw0ufkx7vm6fl", "cmvw497q8000ww0ufniu3eovn", "cmvw44yap000uw0ufg962py5p", "cmvw43qnl000sw0uft6n8dthk",
  "cmvw3zzp2000qw0ufj2dlxqv0", "cmvw3yfsw000ow0ufz5oakdg2", "cmvw3vdtg000mw0ufrr3vjrj0", "cmvw3ttrm000kw0uf0zurim9q", "cmvw0v8j40004w0ufs2f0px9y",
  "cmvw0ek870000w0uf1zjqgk0l", "cmvvb4vka000er4uf8wdthz9a", "cmvvb06zq000cr4ufnpzdhkse", "cmvvaohb6000ar4ufaqlsrn1g", "cmvva31q40008r4ufg3nym2h3",
  "cmvv9ymfr0006r4ufzz17m7cf", "cmvv9uguc0004r4ufge9hhwd0", "cmvv9qjtf0002r4ufvac4k9wm", "cmvv9o4kz0000r4ufuar69v1c", "cmvuncea8002hg8uf57pj0t7q",
  "cmvun9ty0002ag8ufv150olk1", "cmvun8tqs0028g8ufondxq8kb", "cmvun6eza0022g8ufwo6xuj3u", "cmvun5oke0020g8ufjmc66c7f", "cmvun4pwj001yg8uf6q8hc3l3",
  "cmvun2e37001wg8ufseyvghbf", "cmvumy8bh001cg8uf4n818cpy", "cmvtyiuav0079wsufzaxtm1p0", "cmvtyhezy0077wsufmt4hn1sk", "cmvtych2r006wwsufyngnylxs",
  "cmvtx4zep005xwsufu4hkysvq", "cmvtx3z5k005vwsufy2qj0r02", "cmvtx1u7b005twsuf3b24wwa2", "cmvtx0sb3005rwsuflecucx8z", "cmvtwywqi005pwsuf3j30fdk5",
  "cmvtp8v6d0045wsufpzmqp2o1", "cmvtp46se003xwsufoqlkdtpb", "cmvtoqejv003pwsufwgw9bkxf", "cmvtnydbv003fwsuftyo47st5", "cmvtnu8cl0037wsuf284diwhs",
];

async function main() {
  if (TARGET_IDS.length !== 50 || new Set(TARGET_IDS).size !== 50) {
    throw new Error("Target list must contain exactly 50 unique member IDs.");
  }
  const masjid = await prisma.masjid.findUnique({ where: { slug: "test-masjid" }, select: { id: true, name: true } });
  if (!masjid) throw new Error("Target test masjid not found; refusing to delete anything.");

  const deleted = await prisma.$transaction(async (tx) => {
    const eligible = await tx.member.findMany({
      where: {
        id: { in: TARGET_IDS }, masjidId: masjid.id,
        OR: [{ fullName: { startsWith: "Test Member" } }, { fullName: { startsWith: "Playwright Test Member" } }],
        payments: { none: {} }, plans: { none: {} }, duesPeriods: { none: {} },
        collectionEventAssignments: { none: {} }, userId: null,
      },
      select: { id: true },
    });
    if (eligible.length !== 50) throw new Error(`Only ${eligible.length} of the 50 exact IDs still qualify; refusing deletion.`);
    return tx.member.deleteMany({ where: { id: { in: TARGET_IDS }, masjidId: masjid.id } });
  });
  const remaining = await prisma.member.count({ where: { masjidId: masjid.id } });
  console.log(JSON.stringify({ masjid: masjid.name, deleted: deleted.count, remainingMembers: remaining }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
