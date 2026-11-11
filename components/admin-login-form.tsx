"use client";

import { useState } from "react";

export default function AdminLoginForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username: fields.get("username"), password: fields.get("password") }),
      });
      if (!response.ok) {
        setError(response.status === 429 ? "Too many attempts. Please wait a few minutes and try again."
          : response.status === 503 ? "Admin sign-in is not configured yet. You can still listen as a guest."
          : "We couldn't sign you in. Check your username and password.");
        return;
      }
      form.reset();
      window.location.replace("/admin");
    } catch {
      setError("Could not connect. Please try again.");
    } finally { setBusy(false); }
  }
  return <form className="admin-login-form" onSubmit={submit}>
    <label htmlFor="admin-username">Username</label>
    <input id="admin-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={64} defaultValue="admin" disabled={busy} />
    <label htmlFor="admin-password">Password</label>
    <input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={256} disabled={busy} aria-describedby={error ? "admin-login-error" : undefined} />
    {error && <p className="admin-login-error" id="admin-login-error" role="alert">{error}</p>}
    <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Enter the studio"}<span aria-hidden="true">↗</span></button>
  </form>;
}
