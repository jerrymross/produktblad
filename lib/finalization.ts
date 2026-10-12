export type Finalization = {
  available: boolean;
  finalized: boolean;
  stateVersion: number;
  changedAt?: string;
  changedBy?: string;
};
export type FinalizationEvent = {
  finalized: boolean;
  revision: number;
  createdAt: string;
  changedBy: string;
};
export const unavailableFinalization: Finalization = { available: false, finalized: false, stateVersion: 0 };
