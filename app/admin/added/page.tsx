import Link from "next/link";
import { redirect } from "next/navigation";
import { pageIdentity, requireAdmin, HttpError } from "@/lib/access";
import { AppSidebar } from "@/components/AppSidebar";
import { AddedSheets } from "@/components/AddedSheets";
export default async function AddedSheetsPage() {
  const user = await pageIdentity("/admin/added");
  try { await requireAdmin(user.id); } catch (error) {
    if (error instanceof HttpError && error.status === 403) redirect("/produktblad");
    throw error;
  }
  return <><AppSidebar /><main className="admin-page"><span className="eyebrow-ui">CENTRAL ADMINISTRATION</span><h1>Tillagda produktblad</h1>
    <nav className="admin-section-links" aria-label="Adminflikar"><Link href="/admin">Översikt</Link><Link href="/admin/added" aria-current="page">Tillagda produktblad</Link><Link href="/admin/trash">Skräpkorg</Link></nav><AddedSheets /></main></>;
}
