// Text budgets for suggestions, not a replacement for the rendered A4 overflow check.
export const aiTextFields = {
  intro: {label:"Ingress",limit:180},
  why: {label:"Om utbildningen / varför välja yrket?",limit:650},
  learn: {label:"Det här lär du dig",limit:800},
  process: {label:"Så här går det till",limit:500},
  form: {label:"Utbildningsform och fakta",limit:350},
  audience: {label:"Vem kan söka?",limit:450},
  finance: {label:"Ekonomisk kompensation",limit:350},
  start: {label:"Utbildningsstart",limit:180},
} as const;
export type AiTextField = keyof typeof aiTextFields;
export function isAiTextField(value: string): value is AiTextField {return Object.hasOwn(aiTextFields,value);}
export type AiTextResult = {text:string;missingFacts:string[];field:AiTextField;maxCharacters:number};
