export const TEMPLATE_VERSION = "kock-1.1.0-prototyp";
export const EYEBROW_OPTIONS = ["KOMVUX", "ARBETSMARKNADSUTBILDNING"] as const;

export function defaultHeadings(profession: string) {
  return {
    whyTitle: profession.toLocaleLowerCase("sv") === "kock" ? "Varför bli kock?" : "Om utbildningen",
    learnTitle: "Det här lär du dig",
    processTitle: "Så här går det till.",
    formTitle: "Utbildningsform.",
    audienceTitle: "Vem kan söka?",
    financeTitle: "Ekonomisk kompensation.",
  };
}

export type SheetData = {
  eyebrow: string;
  titleLine: string;
  titlePrefix: string;
  profession: string;
  intro: string;
  whyTitle: string;
  learnTitle: string;
  processTitle: string;
  formTitle: string;
  audienceTitle: string;
  financeTitle: string;
  why: string;
  learn: string;
  process: string;
  form: string;
  audience: string;
  finance: string;
  about: string;
  address: string;
  contactOneName: string;
  contactOneRole: string;
  contactOneEmail: string;
  contactTwoName: string;
  contactTwoRole: string;
  contactTwoEmail: string;
  qrUrl: string;
  image: string;
};

// Användarens förinställda Komvuxtexter, beställda 8 oktober 2026.
export const KOMVUX_DEFAULT_CONTENT: Pick<SheetData, "process" | "form" | "audience" | "finance"> = {
  process: "För att du ska få ut det mesta av utbildningen och lära dig snabbt får du praktisera de teorier som du läser direkt i skolan. Praktiken upptar cirka 15% av studietiden – och skolan stöttar dig i letandet av en praktikplats om du inte hittar en själv.",
  form: "Klassrum, lärling. Utbildningens längd är ca 50 veckor och ges på heltid, vilket motsvarar 100 %. Antal poäng är 1200.",
  audience: "Du behöver ha gått klart grundskolan eller motsvarande för att söka till den här utbildningen på Astar. Utbildningen riktar sig främst till dig som är över 20 år. Du som inte har svenska som modersmål behöver också ha läst grundläggande svenska som andraspråk eller göra ett nivåtest hos din hemkommun.",
  finance: "Du kan ansöka om lån eller bidrag hos CSN, ansökan görs via CSN:s hemsida: www.csn.se",
};

// Layoutreferensens övriga text är exempeldata, inte faktagranskad utbildningsinformation.
export const exampleSheet: SheetData = {
  ...defaultHeadings("kock"),
  ...KOMVUX_DEFAULT_CONTENT,
  eyebrow: "KOMVUX",
  titleLine: "Utbilda dig",
  titlePrefix: "till",
  profession: "kock",
  intro: "Drömmer du om att jobba i köket?\nDå ska du läsa en utbildning till Kock med oss!",
  why: "Som kock arbetar du direkt med råvaror och skapar rätter som serveras till gäster varje dag. Du lär dig laga mat för olika tillfällen. Allt från vardagsrätter till festmåltider samt restauranger, hotell, skolor, catering eller event.\nMed mattrender som förändras och restaurangbranschen utvecklas, kommer det alltid att finnas en efterfrågan efter dig som kan laga, planera och presentera maten på ett professionellt sätt.",
  learn: "Du lär dig om olika råvaror och hur de hanteras på ett säkert sätt. Du får grundläggande kunskaper i näringslära, hygienregler och livsmedelssäkerhet samt lär dig laga balanserade måltider.\nDu får också kunskap om olika typer av kost, till exempel allergianpassad och vegetarisk kost, och om hur ett kök är organiserat för att arbetet ska flyta smidigt och ge gästen bästa möjliga service. Genom arbetsplatsförlagt lärande (APL) får du laga mat tillsammans med erfarna kockar i riktiga kök och arbeta med verkliga menyer. Samtidigt bygger du värdefulla kontakter i restaurang- och livsmedelsbranschen.",
  about: "Astar är ett av Sveriges största utbildningsföretag. Vår ambition är att bidra till en stark och livskraftig arbetsmarknad. Vi erbjuder en bred variation av utbildningar och kurser inom olika områden och samarbetar tätt med de branscher som vi utbildar för.",
  address: "Industrivägen 28  901 30 Umeå",
  contactOneName: "LenaMaria Nilsson",
  contactOneRole: "Administratör",
  contactOneEmail: "lenamaria.nilsson@astar.se",
  contactTwoName: "Amanda Rönsen Olheden",
  contactTwoRole: "APL-Samordnare",
  contactTwoEmail: "amanda.olheden@astar.se",
  qrUrl: "https://example.org/produktblad",
  image: "/reference-hero.jpg",
};

export const textFields: { key: keyof SheetData; label: string; multiline?: boolean; group: string }[] = [
  { key: "eyebrow", label: "Övre etikett", group: "Omslag" },
  { key: "titleLine", label: "Rubrik, rad 1", group: "Omslag" },
  { key: "titlePrefix", label: "Rubrik, inledande ord rad 2", group: "Omslag" },
  { key: "profession", label: "Yrke", group: "Omslag" },
  { key: "intro", label: "Ingress", multiline: true, group: "Omslag" },
  { key: "whyTitle", label: "Rubrik – Varför bli kock?", group: "Innehåll" },
  { key: "why", label: "Text – Varför bli kock?", multiline: true, group: "Innehåll" },
  { key: "learnTitle", label: "Rubrik – Det här lär du dig", group: "Innehåll" },
  { key: "learn", label: "Det här lär du dig", multiline: true, group: "Innehåll" },
  { key: "processTitle", label: "Rubrik – Så här går det till", group: "Innehåll" },
  { key: "process", label: "Så här går det till", multiline: true, group: "Innehåll" },
  { key: "formTitle", label: "Rubrik – Utbildningsform", group: "Innehåll" },
  { key: "form", label: "Utbildningsform", multiline: true, group: "Innehåll" },
  { key: "audienceTitle", label: "Rubrik – Vem kan söka?", group: "Innehåll" },
  { key: "audience", label: "Vem kan söka?", multiline: true, group: "Innehåll" },
  { key: "financeTitle", label: "Rubrik – Ekonomisk kompensation", group: "Innehåll" },
  { key: "finance", label: "Ekonomisk kompensation", multiline: true, group: "Innehåll" },
  { key: "about", label: "Om Astar", multiline: true, group: "Nederdel" },
  { key: "address", label: "Skolans adress", group: "Nederdel" },
  { key: "contactOneName", label: "Kontakt 1 – namn", group: "Nederdel" },
  { key: "contactOneRole", label: "Kontakt 1 – roll", group: "Nederdel" },
  { key: "contactOneEmail", label: "Kontakt 1 – e-post", group: "Nederdel" },
  { key: "contactTwoName", label: "Kontakt 2 – namn", group: "Nederdel" },
  { key: "contactTwoRole", label: "Kontakt 2 – roll", group: "Nederdel" },
  { key: "contactTwoEmail", label: "Kontakt 2 – e-post", group: "Nederdel" },
  { key: "qrUrl", label: "QR-kodens testadress", group: "Nederdel" },
];

export function isSheetData(value: unknown): value is SheetData {
  if (!value || typeof value !== "object") return false;
  const object = value as Record<string, unknown>;
  return EYEBROW_OPTIONS.some(option => object.eyebrow === option)
    && [...textFields.map(field => field.key), "image"].every(key => typeof object[key] === "string" && object[key].length <= (key === "image" ? 7_000_000 : 15_000));
}

// Read old prototype drafts without rewriting their stored snapshots.
export function upgradePreviousDraft(value: unknown, program = "Komvux"): SheetData | null {
  if (!value || typeof value !== "object") return null;
  const old = value as Record<string, unknown>;
  const keys = textFields.map(field => field.key).filter(key => !key.endsWith("Title"));
  if (![...keys, "image"].every(key => typeof old[key] === "string" && old[key].length <= (key === "image" ? 7_000_000 : 15_000))) return null;
  const headings = defaultHeadings(old.profession as string);
  const data = { ...old, ...headings, eyebrow: program === "Komvux" ? "KOMVUX" : "ARBETSMARKNADSUTBILDNING" };
  return isSheetData(data) ? data : null;
}
