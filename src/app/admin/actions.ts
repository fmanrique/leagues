"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { logout, requireUser, cookieSecure } from "@/lib/auth";

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/admin/login");
}

export async function selectLigaAction(ligaId: string): Promise<void> {
  await requireUser(["superadmin"]);
  const cookieStore = await cookies();
  cookieStore.set("calccio_liga", ligaId, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/admin",
  });
  redirect("/admin");
}
