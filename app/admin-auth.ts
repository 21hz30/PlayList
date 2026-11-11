import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, readAdminAuthConfig, verifyAdminSession, type AdminIdentity } from "@/lib/admin-auth-core";

export { isSameOriginRequest } from "@/lib/admin-auth-core";

export async function getAdminSession(): Promise<AdminIdentity | null> {
  const config = readAdminAuthConfig(process.env);
  if (!config) return null;
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value, config);
}

export async function requireAdminSession(): Promise<AdminIdentity> {
  const user = await getAdminSession();
  if (!user) redirect("/admin/login");
  return user;
}
