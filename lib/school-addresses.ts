import type { SheetData } from "@/lib/sheet";

type Assignment = { school: string; program: string; title: string };

// User-supplied visit addresses checked 2026-10-10. See docs/BESOKSADRESSER.md.
const addresses: Record<string, string> = {
  "Borås": "Alidelundsgatan 7, 506 31 Borås",
  "Bromma": "Ranhammarsvägen 12, 168 67 Bromma",
  "Gärdet": "Tegeluddsvägen 92, 115 28 Stockholm",
  "Göteborg": "J A Pripps gata 2, 421 32 Västra Frölunda",
  "Helsingborg": "Nedre Eneborgsvägen 2, 252 18 Helsingborg",
  "Kristianstad": "Karpalundvägen 38, 291 61 Kristianstad",
  "Linköping": "Klostergatan 5 B, 582 23 Linköping",
  "Luleå": "Blomgatan 17 E, 973 31 Luleå",
  "Malmö": "Fosievägen 8, 214 31 Malmö",
  "Nyköping": "Gamla Oxelösundsvägen 1, Nyköping",
  "Solna Centrum": "Solna Torg 3, våning 4, 171 45 Solna",
  "Tyresö": "Vattenkraftsvägen 8, Tyresö",
  "Umeå": "Industrivägen 28, 901 30 Umeå",
  "Uppsala": "Sturegatan 9, 753 14 Uppsala",
  "Västerås": "Norra Källgatan 17, 722 11 Västerås",
  "Örebro": "Skomaskinsgatan 2, 702 27 Örebro",
};

const jonkopingCommerce = new Set([
  "Administratör Bas", "Butikssäljare påbyggnad", "Handel Bas",
  "HR-administratör påbyggnad", "Lager och logistik påbyggnad", "Starta eget",
]);

export function schoolVisitAddress(entry: Assignment): string {
  const { school, program, title } = entry;
  if (school === "Eskilstuna") return program === "Komvux"
    ? "Drottninggatan 12, 632 17 Eskilstuna" : "Mått Johanssons väg 34, 633 46 Eskilstuna";
  if (school === "Jönköping") return jonkopingCommerce.has(title)
    ? "Kompanigatan 8, 553 05 Jönköping" : "Kaserngatan 14, 553 05 Jönköping";
  if (school === "Norrköping") {
    if (/elektriker|barn och fritid/i.test(title)) return "Södra Promenaden 60, 602 39 Norrköping";
    if (/bagare|konditor|kock|restaurang|livsmedel/i.test(title)) return "Sprängstensgatan 1 A, 603 79 Norrköping";
    return "";
  }
  if (school === "Nässjö") return /bagare|konditor|hotell|reception|lokalvård/i.test(title)
    ? "Kaserngatan 14, 553 05 Jönköping" : "";
  if (school === "Skellefteå") return title === "Fastighetsskötare"
    ? "Plåtvägen 9 A, Skellefteå" : "Risbergsgatan 4, 931 36 Skellefteå";
  if (school === "Sundsvall") {
    if (/kock|hotell|reception/i.test(title)) return "Köpmangatan 29, 852 32 Sundsvall";
    if (/servering/i.test(title)) return "Skolhusallén 17 A, 852 32 Sundsvall";
    if (/bygg|elektriker|plattsättare|träarbetare/i.test(title)) return "Björneborgsgatan 41, 854 60 Sundsvall";
    return "";
  }
  return addresses[school] ?? "";
}

export function withVisitAddress(content: SheetData, entry: Assignment): SheetData {
  return content.address.trim() ? content : { ...content, address: schoolVisitAddress(entry) };
}
