import type { Principal } from "@icp-sdk/core/principal";

export interface TrustTransaction {
  saver: Principal;
  savedAt: bigint;
  saveNumber: bigint;
  totalBuzzCost: bigint;
  earned: bigint;
}

export interface TrustBackendExtensions {
  savePublishedGraph(
    publishedGraphId: string,
    selectedNodes: string[],
  ): Promise<{ ok: string } | { err: string }>;
  getMyTrustBalance(): Promise<bigint>;
  hasUserSavedGraph(publishedGraphId: string): Promise<boolean>;
  getMyTrustTransactions(): Promise<TrustTransaction[]>;
}
