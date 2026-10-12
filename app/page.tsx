import { Editor } from "@/components/editor/Editor";
import { catalogEntry } from "@/lib/catalog";
import { notFound } from "next/navigation";
import { Catalog } from "@/components/catalog/Catalog";
import { pageIdentity,accessProfile } from "@/lib/access";

export default async function Home({ searchParams }: { searchParams: Promise<{ blad?: string | string[]; exempel?: string }> }) {
  const { blad, exempel } = await searchParams;
  const returnTo = typeof blad === "string" ? `/?blad=${encodeURIComponent(blad)}` : exempel === "1" ? "/?exempel=1" : "/produktblad";
  const user=await pageIdentity(returnTo);const profile=await accessProfile(user.id);
  if (!profile.admin && profile.schools.length === 0) return <main className="login-page"><section className="login-card"><h1>Du är inloggad</h1><p>Du har åtkomst till Produktblad via Astar Studio. En Produktblad-administratör behöver tilldela dig en skola innan du kan öppna biblioteket.</p><form action="/api/portal/logout" method="post"><button className="save-button">Logga ut</button></form></section></main>;
  if (blad === undefined && exempel !== "1") return <Catalog allowedSchools={profile.admin ? null : profile.schools} />;
  const entry = typeof blad === "string" ? catalogEntry(blad) : undefined;
  if (blad !== undefined && !entry) notFound();
  if(!profile.admin && (!entry || !profile.schools.includes(entry.school))) notFound();
  return <Editor key={entry?.id ?? "example"} entry={entry} />;
}
