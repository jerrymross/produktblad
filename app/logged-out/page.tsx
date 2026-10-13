import { appPath } from "@/lib/app-path";
export default function LoggedOut() {
  return <main className="login-page"><section className="login-card"><h1>Du är utloggad från Produktblad</h1><p>Din inloggning i Astar Studio är kvar. Logga ut i portalen om du vill avsluta den också.</p><a className="save-button" href={appPath("/api/portal/login")}>Logga in via Astar Studio</a></section></main>;
}
