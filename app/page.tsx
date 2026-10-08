import { Editor } from "@/components/editor/Editor";
import { catalog } from "@/lib/catalog";
import { notFound } from "next/navigation";
import { Catalog } from "@/components/catalog/Catalog";

export default async function Home({ searchParams }: { searchParams: Promise<{ blad?: string | string[]; exempel?: string }> }) {
  const { blad, exempel } = await searchParams;
  if (blad === undefined && exempel !== "1") return <Catalog />;
  const entry = typeof blad === "string" ? catalog.find(item => item.id === blad) : undefined;
  if (blad !== undefined && !entry) notFound();
  return <Editor key={entry?.id ?? "example"} entry={entry} />;
}
