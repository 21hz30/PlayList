import LandingPage from "@/components/landing-page";
import { getAdminSession } from "@/app/admin-auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const admin = await getAdminSession();
  return <LandingPage isAdmin={Boolean(admin)} />;
}
