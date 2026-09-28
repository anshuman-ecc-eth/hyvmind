import { InternetIdentityProvider } from "@caffeineai/core-infrastructure";
import { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import ReactDOM from "react-dom/client";
import type {
  Curation,
  GraphData,
  GraphEdge,
  InterpretationToken,
  LawToken,
  Location,
  PublishedSourceGraphMeta,
  SourceRef,
  Swarm,
  WeightedAttribute,
} from "./backend";
import { Directionality } from "./backend";
import { ALL_THEMES, DEFAULT_THEME } from "./lib/themes";
import PublicGraphView from "./pages/PublicGraphView";
import "./index.css";

const creator = Principal.anonymous();

const at = (iso: string) => BigInt(new Date(iso).getTime()) * 1_000_000n;
const ts = (iso: string) => ({ createdAt: at(iso) });

const wa = (key: string, ...values: string[]): WeightedAttribute => ({
  key,
  weightedValues: values.map((value) => ({ weight: 1n, value })),
});

const src = (name: string, url: string): SourceRef => ({ name, url });

const link = (
  source: string,
  target: string,
  edgeLabel: string,
  directionality: Directionality = Directionality.unidirectional,
): GraphEdge => ({ source, target, edgeLabel, directionality });

const lawSources = [src("UN", "https://www.un.org")];

const maritimeCuration: Curation = {
  id: "c1",
  name: "Maritime Law",
  creator,
  customAttributes: [wa("jurisdiction", "International")],
  timestamps: ts("2026-09-01T09:00:00Z"),
  sources: lawSources,
};

const maritimeSwarms: Swarm[] = [
  {
    id: "s1",
    name: "Navigation",
    creator,
    customAttributes: [wa("domain", "shipping")],
    tags: ["trade"],
    timestamps: ts("2026-09-01T09:05:00Z"),
    parentCurationId: "c1",
    sources: [],
  },
  {
    id: "s2",
    name: "Collision",
    creator,
    customAttributes: [wa("domain", "safety")],
    tags: ["safety"],
    timestamps: ts("2026-09-01T09:06:00Z"),
    parentCurationId: "c1",
    sources: [],
  },
];

const maritimeLocations: Location[] = [
  {
    id: "l1",
    title: "High Seas",
    creator,
    customAttributes: [wa("region", "north atlantic")],
    timestamps: ts("2026-09-01T09:10:00Z"),
    parentSwarmId: "s1",
    sources: [],
  },
  {
    id: "l2",
    title: "Port Waters",
    creator,
    customAttributes: [wa("region", "coastal")],
    timestamps: ts("2026-09-01T09:11:00Z"),
    parentSwarmId: "s1",
    sources: [],
  },
  {
    id: "l3",
    title: "Collision Zone",
    creator,
    customAttributes: [wa("region", "shipping lane")],
    timestamps: ts("2026-09-01T09:12:00Z"),
    parentSwarmId: "s2",
    sources: [],
  },
];

const maritimeLawTokens: LawToken[] = [
  {
    id: "lt1",
    tokenLabel: "UNCLOS Art. 87",
    creator,
    customAttributes: [wa("year", "1982")],
    timestamps: ts("2026-09-01T09:20:00Z"),
    parentLocationId: "l1",
    sources: lawSources,
  },
  {
    id: "lt2",
    tokenLabel: "COLREGs Rule 5",
    creator,
    customAttributes: [wa("year", "1972")],
    timestamps: ts("2026-09-01T09:21:00Z"),
    parentLocationId: "l3",
    sources: [],
  },
];

const maritimeInterpTokens: InterpretationToken[] = [
  {
    id: "it1",
    title: "Freedom of the High Seas",
    creator,
    customAttributes: [wa("status", "customary")],
    timestamps: ts("2026-09-01T09:30:00Z"),
    parentLawTokenId: "lt1",
    sources: [],
    contentVersions: [
      {
        content:
          "The high seas are open to all states, whether coastal or land-locked.",
        timestamp: at("2026-09-01T09:30:00Z"),
        contributor: creator,
      },
    ],
  },
  {
    id: "it2",
    title: "Lookout Duty",
    creator,
    customAttributes: [],
    timestamps: ts("2026-09-01T09:31:00Z"),
    parentLawTokenId: "lt2",
    sources: [],
    contentVersions: [
      {
        content: "Every vessel shall maintain a proper look-out at all times.",
        timestamp: at("2026-09-01T09:31:00Z"),
        contributor: creator,
      },
    ],
  },
];

const maritime: GraphData = {
  curations: [maritimeCuration],
  rootNodes: [],
  swarms: maritimeSwarms,
  locations: maritimeLocations,
  lawTokens: maritimeLawTokens,
  interpretationTokens: maritimeInterpTokens,
  edges: [
    link("lt1", "lt2", "read with"),
    link("l1", "l2", "adjacent", Directionality.bidirectional),
  ],
  sources: lawSources,
};

const contractCuration: Curation = {
  id: "c2",
  name: "Contract Law",
  creator,
  customAttributes: [wa("jurisdiction", "Common Law")],
  timestamps: ts("2026-09-02T10:00:00Z"),
  sources: [],
};

const contractSwarms: Swarm[] = [
  {
    id: "s3",
    name: "Formation",
    creator,
    customAttributes: [wa("domain", "agreements")],
    tags: ["contracts"],
    timestamps: ts("2026-09-02T10:05:00Z"),
    parentCurationId: "c2",
    sources: [],
  },
];

const contractLocations: Location[] = [
  {
    id: "l4",
    title: "Offer",
    creator,
    customAttributes: [wa("stage", "offer")],
    timestamps: ts("2026-09-02T10:10:00Z"),
    parentSwarmId: "s3",
    sources: [],
  },
  {
    id: "l5",
    title: "Acceptance",
    creator,
    customAttributes: [wa("stage", "acceptance")],
    timestamps: ts("2026-09-02T10:11:00Z"),
    parentSwarmId: "s3",
    sources: [],
  },
];

const contractLawTokens: LawToken[] = [
  {
    id: "lt3",
    tokenLabel: "Restatement §17",
    creator,
    customAttributes: [wa("year", "1981")],
    timestamps: ts("2026-09-02T10:20:00Z"),
    parentLocationId: "l4",
    sources: [],
  },
];

const contractInterpTokens: InterpretationToken[] = [
  {
    id: "it3",
    title: "Mutual Assent",
    creator,
    customAttributes: [],
    timestamps: ts("2026-09-02T10:30:00Z"),
    parentLawTokenId: "lt3",
    sources: [],
    contentVersions: [
      {
        content:
          "A contract requires a manifestation of mutual assent by the parties.",
        timestamp: at("2026-09-02T10:30:00Z"),
        contributor: creator,
      },
    ],
  },
];

const contract: GraphData = {
  curations: [contractCuration],
  rootNodes: [],
  swarms: contractSwarms,
  locations: contractLocations,
  lawTokens: contractLawTokens,
  interpretationTokens: contractInterpTokens,
  edges: [link("l4", "l5", "precedes")],
  sources: [],
};

const metas: PublishedSourceGraphMeta[] = [
  {
    id: "maritime",
    creator,
    creatorName: "Demo Author",
    name: "Maritime Law",
    authors: ["Demo Author"],
    publishedAt: at("2026-09-20T10:00:00Z"),
    nodeCount: 10n,
    edgeCount: 11n,
    hierarchyEdgeCount: 9n,
    attributeCount: 8n,
    sourcesCount: 3n,
    extensionLog: [],
  },
  {
    id: "contract",
    creator,
    creatorName: "Demo Author",
    name: "Contract Law",
    authors: ["Demo Author"],
    publishedAt: at("2026-09-20T11:00:00Z"),
    nodeCount: 6n,
    edgeCount: 6n,
    hierarchyEdgeCount: 5n,
    attributeCount: 3n,
    sourcesCount: 0n,
    extensionLog: [],
  },
];

const dataById: Record<string, GraphData> = {
  maritime,
  contract,
};

const mockActor = {
  getAllPublishedSourceGraphs: async () => metas,
  getPublishedSourceGraph: async (id: string) => dataById[id] ?? null,
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
queryClient.setQueryData(["publishedGraphMetas"], metas);
for (const [id, data] of Object.entries(dataById)) {
  queryClient.setQueryData(["publishedGraphData", id], data);
}

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
          <PublicGraphView isLanding />
        </div>
      </ThemeProvider>
    </InternetIdentityProvider>
  </QueryClientProvider>,
);
