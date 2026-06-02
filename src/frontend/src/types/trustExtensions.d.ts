import type { Principal } from "@icp-sdk/core/principal";

export interface CreditedContributionDetail {
  contributionId: string;
  description: string;
  payer: Principal;
  buzzAmount: bigint;
  earned: bigint;
  saveCount: bigint;
}

export interface TrustTransaction {
  saver: Principal;
  savedAt: bigint;
  saveNumber: bigint;
  totalBuzzCost: bigint;
  earned: bigint;
  contributionIds: string[];
  contributionDetails: CreditedContributionDetail[];
}

export interface SavedOkResult {
  contributions: CreditedContributionDetail[];
}

export type SaveResult =
  | { ok: SavedOkResult }
  | { noNewTrust: { reason: string } }
  | { err: string };

export interface ContributionView {
  id: string;
  nodeId: string;
  description: string;
  payer: Principal;
  buzzAmount: bigint;
  alreadyCredited: boolean;
}

export interface TrustBackendExtensions {
  savePublishedGraph(
    publishedGraphId: string,
    selectedContributionIds: string[],
  ): Promise<SaveResult>;
  getGraphContributions(publishedGraphId: string): Promise<ContributionView[]>;
  ensureContributionsMigrated(publishedGraphId: string): Promise<void>;
  getMyTrustBalance(): Promise<bigint>;
  hasUserSavedGraph(publishedGraphId: string): Promise<boolean>;
  getMyTrustTransactions(): Promise<TrustTransaction[]>;
}
