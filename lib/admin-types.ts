export type AdminMember = { id: string; name: string; email: string; role: "admin" | "user"; schools: string[]; createdAt: string };
export type AdminInvitation = { id: string; email: string; role: "admin" | "user"; schools: string[]; expiresAt: string; usedAt: string | null; status: "pending" | "accepted" | "expired" };
export type AdminActivity = { sheetId: string; title: string; school: string; revision: number; changedAt: string; changedBy: string | null; name: string | null; email: string | null };
export type AdminOverviewData = { members: AdminMember[]; invitations: AdminInvitation[]; activity: AdminActivity[]; loadedAt: string };
