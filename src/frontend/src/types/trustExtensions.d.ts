export interface TrustBackendExtensions {
  savePublishedGraph(
    publishedGraphId: string,
    selectedNodes: string[],
  ): Promise<{ ok: string } | { err: string }>;
  getMyTrustBalance(): Promise<bigint>;
}
