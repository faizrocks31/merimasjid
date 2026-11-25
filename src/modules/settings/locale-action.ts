"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale, type Locale } from "@/i18n/config";
import { LOCALE_COOKIE } from "@/i18n";

export async function setLocaleAction(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
