// Type augmentation for Forum-related backend methods added after bindgen.
// These will be auto-generated into backend.d.ts after pnpm bindgen is run.
export interface ForumBackendExtensions {
  deleteForumPost(
    postId: string,
  ): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }>;
}
