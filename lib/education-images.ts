import images from "@/fixtures/education-images.json";
import type { SheetData } from "@/lib/sheet";

export const educationKey = (title: string) => title.trim().replace(/\s+/g, " ").toLocaleLowerCase("sv");
export const defaultImagePath = (title: string) => images.find(image => image.education === educationKey(title) && image.slot === 1)?.path ?? "/reference-hero.jpg";
export const isBundledImage = (path: string) => images.some(image => image.path === path);

export function withDefaultImage(content: SheetData, title: string, revision: number, fallback = defaultImagePath(title)): SheetData {
  return revision === 0 && (!content.image || content.image === "/reference-hero.jpg")
    ? { ...content, image: fallback } : content;
}
