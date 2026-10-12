export type SheetCopy={id:string;sourceId:string;copyNumber:number;sourceRevision:number};
export type CopyStatus={available:boolean;copies:SheetCopy[]};
export const unavailableCopies:CopyStatus={available:false,copies:[]};
