import { InternetIdentityProvider } from "@caffeineai/core-infrastructure";
import { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import ReactDOM from "react-dom/client";
import type { ForumPostDetail, ForumPostSummary } from "./backend";
import { ALL_THEMES, DEFAULT_THEME } from "./lib/themes";
import ForumView from "./pages/ForumView";
import "./index.css";

const author = Principal.anonymous();

const ns = (iso: string) => BigInt(new Date(iso).getTime()) * 1_000_000n;

const posts: ForumPostSummary[] = [
  {
    id: "demo-1",
    title: "Welcome to Hyvmind",
    upvotes: 12n,
    userVote: 1n,
    createdAt: ns("2026-09-22T09:15:00Z"),
    tags: ["announcement", "start-here"],
    authorName: "Alice",
    author,
    replyCount: 2n,
    downvotes: 0n,
  },
  {
    id: "demo-2",
    title: "Citing sources: best practices",
    upvotes: 7n,
    createdAt: ns("2026-09-23T14:40:00Z"),
    tags: ["discussion", "sources"],
    authorName: "Bob",
    author,
    replyCount: 1n,
    downvotes: 1n,
  },
  {
    id: "demo-3",
    title: "Bug: terrain export drops the last chunk",
    upvotes: 3n,
    userVote: -1n,
    createdAt: ns("2026-09-24T18:05:00Z"),
    tags: ["bug", "terrain"],
    authorName: "Carol",
    author,
    replyCount: 0n,
    downvotes: 2n,
  },
];

const details: Record<string, ForumPostDetail> = {
  "demo-1": {
    id: "demo-1",
    title: "Welcome to Hyvmind",
    upvotes: 12n,
    userVote: 1n,
    content:
      "This is a local dummy-data preview of the Forum page.\n\nUse it to check the Members button and the online indicators without needing a backend or a login.",
    createdAt: ns("2026-09-22T09:15:00Z"),
    tags: ["announcement", "start-here"],
    authorName: "Alice",
    author,
    downvotes: 0n,
    replies: [
      {
        id: "demo-1-r1",
        upvotes: 4n,
        createdAt: ns("2026-09-22T10:02:00Z"),
        text: "Great to be here!",
        authorName: "Carol",
        author,
        downvotes: 0n,
      },
      {
        id: "demo-1-r2",
        upvotes: 1n,
        userVote: 1n,
        createdAt: ns("2026-09-22T11:30:00Z"),
        text: "Does this preview hit a real canister?",
        authorName: "Frank",
        author,
        downvotes: 0n,
      },
    ],
  },
  "demo-2": {
    id: "demo-2",
    title: "Citing sources: best practices",
    upvotes: 7n,
    content:
      "What conventions do you use for linking primary vs secondary sources when building a graph?",
    createdAt: ns("2026-09-23T14:40:00Z"),
    tags: ["discussion", "sources"],
    authorName: "Bob",
    author,
    downvotes: 1n,
    replies: [
      {
        id: "demo-2-r1",
        upvotes: 2n,
        createdAt: ns("2026-09-23T15:10:00Z"),
        text: "I always attach the source at the node that first cites it.",
        authorName: "Alice",
        author,
        downvotes: 0n,
      },
    ],
  },
  "demo-3": {
    id: "demo-3",
    title: "Bug: terrain export drops the last chunk",
    upvotes: 3n,
    userVote: -1n,
    content:
      "Exporting a large seed sometimes omits the final 16x16 chunk at the map edge.",
    createdAt: ns("2026-09-24T18:05:00Z"),
    tags: ["bug", "terrain"],
    authorName: "Carol",
    author,
    downvotes: 2n,
    replies: [],
  },
};

const members = [
  { name: "Alice", online: true },
  { name: "Bob", online: false },
  { name: "Carol", online: true },
  { name: "Dmitra", online: false },
  { name: "Eve", online: false },
  { name: "Frank", online: true },
];

const mockPosts = [...posts];
const mockDetails: Record<string, ForumPostDetail> = { ...details };

const mockActor = {
  getForumPosts: async () => mockPosts,
  getForumPost: async (id: string) => mockDetails[id] ?? null,
  getMembers: async () => members,
  isCallerAdmin: async () => true,
  reportPresence: async () => undefined,
  deleteForumPost: async (id: string) => {
    const index = mockPosts.findIndex((post) => post.id === id);
    if (index === -1)
      return { __kind__: "err" as const, err: "Post not found" };
    mockPosts.splice(index, 1);
    delete mockDetails[id];
    return { __kind__: "ok" as const, ok: null };
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: Number.POSITIVE_INFINITY,
    },
  },
});

queryClient.setQueryData(["actor", undefined], mockActor);
queryClient.setQueryData(["forumPosts"], posts);
for (const [id, detail] of Object.entries(details)) {
  queryClient.setQueryData(["forumPost", id], detail);
}
queryClient.setQueryData(["members", "anonymous"], members);
queryClient.setQueryData(["isCallerAdmin"], true);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <InternetIdentityProvider>
      <ThemeProvider
        attribute="class"
        themes={ALL_THEMES}
        defaultTheme={DEFAULT_THEME}
        enableSystem={false}
        storageKey="hyvmind-theme"
      >
        <div style={{ height: "100vh" }}>
          <ForumView />
        </div>
      </ThemeProvider>
    </InternetIdentityProvider>
  </QueryClientProvider>,
);
