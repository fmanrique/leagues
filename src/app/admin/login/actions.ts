"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { login, loginRateLimited } from "@/lib/auth";

const schema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(128),
  next: z.string().startsWith("/admin").optional(),
});

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) return { error: "Datos inválidos" };

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (loginRateLimited(`${ip}:${parsed.data.username}`)) {
    return { error: "Demasiados intentos. Espera unos minutos." };
  }

  const user = await login(parsed.data.username, parsed.data.password);
  if (user === "inactivo") {
    return { error: "Tu cuenta está desactivada. Contacta al administrador de tu liga." };
  }
  if (!user) return { error: "Usuario o contraseña incorrectos" };

  redirect(parsed.data.next ?? "/admin");
}
