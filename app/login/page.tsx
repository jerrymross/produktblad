import { appPath } from "@/lib/app-path";
import { redirect } from "next/navigation";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; invite?: string }> }) {
  const { error, invite } = await searchParams;
  if (invite && /^[a-f0-9]{64}$/.test(invite)) redirect(`/join?invite=${invite}`);
  if (!error) redirect("/api/portal/login");
  return <main className="login-page"><section className="login-card"><span className="eyebrow-ui">ASTAR STUDIO</span><h1>Inloggningen kunde inte slutföras</h1><p>Försök igen via portalen. Kontakta din administratör om du saknar åtkomst till Produktblad.</p><a className="save-button" href={appPath("/api/portal/login")}>Logga in via Astar Studio</a></section></main>;
}
