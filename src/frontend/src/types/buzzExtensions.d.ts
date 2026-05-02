// Type augmentation for Buzz-related backend methods added after bindgen.
// These will be auto-generated into backend.d.ts after pnpm bindgen is run.
export interface BuzzBackendExtensions {
  generateBuzzSecret(score: bigint): Promise<string>;
  redeemBuzzSecret(secret: string): Promise<{ ok: string } | { err: string }>;
  getMyTextGameBuzz(): Promise<bigint>;
}
