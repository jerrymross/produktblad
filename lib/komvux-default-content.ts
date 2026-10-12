import { KOMVUX_DEFAULT_CONTENT, type SheetData } from "@/lib/sheet";

// User-supplied Kock PDF adapted as editable Komvux starter text.
export const KOMVUX_REFERENCE_CONTENT: Partial<SheetData> = {
  ...KOMVUX_DEFAULT_CONTENT,
  profession: "***",
  whyTitle: "Varför bli ***?",
  intro: "Drömmer du om att jobba inom ***?\nDå ska du läsa en utbildning till *** med oss!",
  why: "Som *** arbetar du direkt med *** och *** varje dag. Du lär dig *** för olika tillfällen. Allt från *** till *** samt ***.\nMed *** som förändras och *** som utvecklas, kommer det alltid att finnas en efterfrågan efter dig som kan *** på ett professionellt sätt.",
  learn: "Du lär dig om *** och hur de hanteras på ett säkert sätt. Du får grundläggande kunskaper i *** samt lär dig ***.\nDu får också kunskap om ***, till exempel ***, och om hur *** är organiserat för att arbetet ska flyta smidigt och ge *** bästa möjliga service. Genom arbetsplatsförlagt lärande (APL) får du *** tillsammans med erfarna *** och arbeta med ***. Samtidigt bygger du värdefulla kontakter i ***.",
  process: "För att du ska få ut det mesta av utbildningen och lära dig snabbt får du praktisera de teorier som du läser direkt i skolan. Praktiken upptar cirka *** av studietiden – och skolan stöttar dig i letandet av en praktikplats om du inte hittar en själv.",
  form: "***. Utbildningens längd är ca *** veckor och ges på ***, vilket motsvarar *** %. Antal poäng är ***.",
  contactOneName: "***",
  contactOneRole: "***",
  contactOneEmail: "***",
  contactTwoName: "***",
  contactTwoRole: "***",
  contactTwoEmail: "***",
};
