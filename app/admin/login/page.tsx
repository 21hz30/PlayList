import { redirect } from "next/navigation";
import { getAdminSession } from "@/app/admin-auth";
import AdminLoginForm from "@/components/admin-login-form";
import "@/app/admin-login.css";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect("/admin");
  return <main className="admin-login-page">
    <a className="admin-login-brand" href="/">ZIMO <span>SESSIONS</span><i>✳</i></a>
    <section className="admin-login-card" aria-labelledby="admin-login-title">
      <div className="admin-login-record" aria-hidden="true"><span>Z</span></div>
      <p className="admin-login-eyebrow">BEHIND THE SOUND</p>
      <h1 id="admin-login-title">Welcome back,<br /><em>Zimo.</em></h1>
      <p className="admin-login-intro">Your music. Your choices. Your studio.</p>
      <AdminLoginForm />
      <a className="admin-guest-link" href="/app">Just here to listen? Continue as a guest ↗</a>
    </section>
    <p className="admin-login-footer">A LITTLE MUSIC. A LITTLE MORE YOU.</p>
  </main>;
}
