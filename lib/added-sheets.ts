export const newSheetPrograms = ["Komvux", "AF", "AF RUB"] as const;
export type AddedSheet = {
  id: string; school: string; program: string; title: string;
  createdAt: string; createdBy: string | null; creatorName: string | null;
  revision: number;
};
