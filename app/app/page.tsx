import SessionApp from "@/components/session-app";
import { getAdminSession } from "@/app/admin-auth";

export const dynamic = "force-dynamic";

export default async function ApplicationPage() {
  const admin = await getAdminSession();
  return <SessionApp role={admin ? "admin" : "guest"} displayName={admin ? "Zimo" : "Guest"} />;
}
