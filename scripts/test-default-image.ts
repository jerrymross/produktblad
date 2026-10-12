import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { catalog, initialSheet } from "../lib/catalog";
import { defaultImagePath, withDefaultImage, isBundledImage } from "../lib/education-images";
import { exampleSheet } from "../lib/sheet";

async function main() {
  for (const entry of catalog) {
    const image = defaultImagePath(entry.title);
    assert.ok(isBundledImage(image), entry.title);
    assert.ok(image.endsWith(" 1.jpg"), entry.title);
    assert.equal(initialSheet(entry).image, image);
    await access(`public${image}`);
  }
  assert.equal(withDefaultImage(exampleSheet, "Kock", 0).image, defaultImagePath("Kock"));
  assert.strictEqual(withDefaultImage(exampleSheet, "Kock", 1), exampleSheet);
  for (const image of ["/api/media/saved", "data:image/jpeg;base64,saved", "/education-heroes/Kock 2.jpg"]) {
    const content = { ...exampleSheet, image };
    assert.strictEqual(withDefaultImage(content, "Kock", 0), content);
    assert.strictEqual(withDefaultImage(content, "Kock", 3), content);
  }
  assert.equal(withDefaultImage(exampleSheet, "Kock", 0, "/api/media/library-one").image, "/api/media/library-one");
  assert.ok(!isBundledImage("/education-heroes/../../secrets.jpg"));
  console.log("OK: Bild 1 för alla 136 blad; filer finns, sparade/lokala bildval bevaras och privata bibliotekets bild 1 kan användas.");
}
void main();
