import { pageIdentity } from "@/lib/access";
import { NewSheet } from "@/components/NewSheet";
import "./new-sheet.css";
export default async function NewSheetPage() {
  await pageIdentity("/new");
  return <NewSheet />;
}
