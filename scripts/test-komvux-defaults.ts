import assert from "node:assert/strict";
import { catalog, initialSheet } from "../lib/catalog";
import { withUnsavedProgramDefaults } from "../lib/default-content";
import { KOMVUX_REFERENCE_CONTENT } from "../lib/komvux-default-content";
import { exampleSheet, isSheetData } from "../lib/sheet";

const existing = { ...exampleSheet, why: "Egen inledning", learn: "", intro: "", contactOneName: "Min kontakt" };
const frozen = JSON.stringify(existing);
const opened = withUnsavedProgramDefaults(existing, "Komvux", 0);
assert.equal(opened.why, existing.why);
assert.equal(opened.contactOneName, existing.contactOneName);
assert.equal(opened.learn, KOMVUX_REFERENCE_CONTENT.learn);
assert.equal(opened.form, KOMVUX_REFERENCE_CONTENT.form);
assert.equal(opened.process, KOMVUX_REFERENCE_CONTENT.process);
assert.ok(!opened.form.includes("1200"));
assert.ok(!opened.form.includes("50 veckor"));
assert.ok(!opened.process.includes("15%"));
assert.equal(JSON.stringify(existing), frozen);
assert.deepEqual(withUnsavedProgramDefaults(opened, "Komvux", 0), opened);
assert.strictEqual(withUnsavedProgramDefaults(existing, "Komvux", 1), existing);
assert.equal(withUnsavedProgramDefaults({ ...existing, form: "Min utbildningsform", process: "Mitt upplägg" }, "Komvux", 0).form, "Min utbildningsform");
assert.strictEqual(withUnsavedProgramDefaults(existing, "Annat program", 0), existing);
for (const entry of catalog.filter(item => item.program === "Komvux")) {
  const content = initialSheet(entry);
  assert.ok(isSheetData(content));
  assert.equal(content.layout, "standard");
  assert.equal(content.profession, "***");
  assert.equal(content.whyTitle, "Varför bli ***?");
  assert.ok(content.learn.includes("***"));
  assert.equal(content.form, KOMVUX_REFERENCE_CONTENT.form);
  assert.equal(content.audience, exampleSheet.audience);
  assert.equal(content.finance, exampleSheet.finance);
}
assert.ok(exampleSheet.form.includes("1200"));
console.log("OK: Komvux får PDF-standardtext med ***, gamla osparade standardvärden ersätts, egen text och kontakter bevaras, återöppning är stabil och sparade blad/exempelblad skyddas.");
