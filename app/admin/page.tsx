import SessionApp from "@/components/session-app";
import { requireAdminSession } from "@/app/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminSession();
  return <SessionApp role="admin" displayName="Zimo" initialView="studio" />;
}
