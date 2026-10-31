import { NextResponse } from "next/server";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { can, type Permission } from "@/lib/permissions";

/**
 * Authorization for file routes (PDF, CSV).
 *
 * Pages are guarded by their layout, which redirects; route handlers have no
 * layout, so an unguarded throw from `requireStaff` surfaces as a 500. These
 * handlers are opened by a browser navigation, so the right answers are a
 * redirect for a signed-out visitor and 403 for a signed-in one who may not
 * have the data — never a 500.
 */
export async function authorizeFileRequest(
  request: Request,
  permission: Permission,
): Promise<{ user: CurrentUser } | { response: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return { response: NextResponse.redirect(new URL("/login", request.url)) };
  }
  if (user.role === ROLES.MEMBER || !user.masjidId) {
    return { response: new NextResponse("Forbidden", { status: 403 }) };
  }
  if (user.masjid?.status === "SUSPENDED" && user.role !== ROLES.SUPER_ADMIN) {
    return { response: new NextResponse("This Masjid is suspended.", { status: 403 }) };
  }
  if (!can(user.role, permission)) {
    return { response: new NextResponse("Forbidden", { status: 403 }) };
  }
  return { user };
}
