import { Toaster } from "@/components/ui/sonner";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { ThemeProvider } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { createActor } from "./backend";
import type { backendInterface } from "./backend";
import CommandPalette from "./components/CommandPalette";
import Footer from "./components/Footer";
import Header from "./components/Header";
import LandingGraphDiagram from "./components/LandingGraphDiagram";
import ProfileSetupModal from "./components/ProfileSetupModal";
import TextGameModal from "./components/TextGameModal";
import {
  useGetArchivedNodeIds,
  useGetCallerUserProfile,
  useGetOwnedData,
} from "./hooks/useQueries";
import { ALL_THEMES, DEFAULT_THEME, migrateTheme } from "./lib/themes";
import McpSetupPage from "./pages/McpSetupPage";
import PublicGraphView from "./pages/PublicGraphView";
import SourcesView from "./pages/SourcesView";
import SwarmsView from "./pages/SwarmsView";
import TerminalPage from "./pages/TerminalPage";
import { setHiddenCollectibleIds } from "./utils/archivedCollectiblesStore";

type ViewType = "public-graphs" | "terminal" | "sources" | "chat";

// Standalone public page — no auth, no layout
function ApiDocsRoute() {
  // Redirect /docs/api → /mcp
  window.location.replace("/mcp");
  return null;
}

// MCP setup page — public, no auth
function McpSetupRoute() {
  return (
    <ThemeProvider
      attribute="class"
      themes={ALL_THEMES}
      defaultTheme={DEFAULT_THEME}
      enableSystem={false}
      storageKey="hyvmind-theme"
    >
      <McpSetupPage />
    </ThemeProvider>
  );
}

// Full authenticated app shell with all hooks
function AppShell() {
  const { identity, isInitializing } = useInternetIdentity();
  const [currentView, setCurrentView] = useState<ViewType>("sources");
  const [gameComplete, setGameComplete] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const isAuthenticated = !!identity;

  // Keyboard shortcut: Ctrl+P / Cmd+P to open command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        if (isAuthenticated) {
          setCommandPaletteOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthenticated]);

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();

  const showProfileSetup =
    isAuthenticated && !profileLoading && isFetched && userProfile === null;

  const isLandingPage = !isAuthenticated;

  const handleCheckCondition = async (condition: string, input: string) => {
    if (condition.toLowerCase().includes("principal")) {
      try {
        const { createActorWithConfig } = await import(
          "@caffeineai/core-infrastructure"
        );
        const actor = (await createActorWithConfig(
          createActor as Parameters<typeof createActorWithConfig>[0],
        )) as backendInterface;
        const { Principal } = await import("@icp-sdk/core/principal");
        const trimmed = input.trim();
        try {
          const principal = Principal.fromText(trimmed);
          const profile = await actor.getUserProfile(principal);
          const name = profile?.name ?? "agent";
          return { pass: true, data: { "profile name": name } };
        } catch {
          return { pass: false };
        }
      } catch {
        return { pass: false };
      }
    }
    return { pass: false };
  };

  // Silent cleanup: fetch archived node IDs once per login and persist hidden collectibles
  const { data: archivedNodeIds } = useGetArchivedNodeIds();
  const { data: graphData } = useGetOwnedData();
  const cleanupRanRef = useRef<string | null>(null);

  useEffect(() => {
    if (!identity || !archivedNodeIds || !graphData) return;

    const principal = identity.getPrincipal().toString();

    // Run cleanup only once per principal per login session
    if (cleanupRanRef.current === principal) return;
    cleanupRanRef.current = principal;

    try {
      const archivedSet = new Set(archivedNodeIds);

      // Collect collectible IDs (law tokens + interpretation tokens) whose node is archived
      const hiddenIds = new Set<string>();

      for (const lt of graphData.lawTokens) {
        if (archivedSet.has(lt.id) || archivedSet.has(lt.parentLocationId)) {
          hiddenIds.add(lt.id);
        }
      }

      for (const it of graphData.interpretationTokens) {
        if (archivedSet.has(it.id) || archivedSet.has(it.parentLawTokenId)) {
          hiddenIds.add(it.id);
        }
      }

      setHiddenCollectibleIds(principal, hiddenIds);
    } catch {
      // silent — no user-facing feedback
    }
  }, [identity, archivedNodeIds, graphData]);

  // Reset cleanup ref on logout so it runs again on next login
  useEffect(() => {
    if (!identity) {
      cleanupRanRef.current = null;
    }
  }, [identity]);

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
  };

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-game-font flex flex-col items-center justify-center gap-4">
          <span
            className="text-foreground/70"
            style={{ fontSize: "0.6rem", letterSpacing: "0.2em" }}
          >
            LOADING
          </span>
          <div className="flex gap-[2px]">
            {Array.from({ length: 16 }).map((_, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: positional loading blocks
                key={i}
                className="text-foreground"
                style={{
                  fontSize: "0.55rem",
                  animation: `terminal-blink 0.8s step-end ${i * 0.05}s infinite`,
                }}
              >
                █
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <Header
        currentView={currentView}
        onViewChange={handleViewChange}
        isAuthenticated={isAuthenticated}
        isLandingPage={isLandingPage}
      />

      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {!isAuthenticated ? (
          <div className="h-full min-h-0 relative">
            {/* Graph loads in background, hidden until game completes */}
            <div
              className="h-full"
              style={{
                visibility: gameComplete ? "visible" : "hidden",
                pointerEvents: gameComplete ? "auto" : "none",
              }}
            >
              <LandingGraphDiagram />
            </div>
            {/* Text game overlay */}
            {!gameComplete && (
              <TextGameModal
                onComplete={() => setGameComplete(true)}
                checkCondition={handleCheckCondition}
              />
            )}
          </div>
        ) : (
          <>
            {currentView === "terminal" && <TerminalPage />}
            {currentView === "sources" && (
              <div className="flex-1 min-h-0">
                <SourcesView />
              </div>
            )}
            {currentView === "public-graphs" && (
              <div className="flex-1 min-h-0">
                <PublicGraphView />
              </div>
            )}
            {currentView === "chat" && (
              <div className="flex-1 min-h-0">
                <SwarmsView />
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      {showProfileSetup && <ProfileSetupModal />}
      <Toaster />

      {isAuthenticated && (
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          onViewChange={(view) => handleViewChange(view as ViewType)}
        />
      )}
    </div>
  );
}

export default function App() {
  // Migrate old "light"/"dark" theme format to new compound format
  useEffect(() => {
    const stored = localStorage.getItem("hyvmind-theme");
    if (stored === "light" || stored === "dark") {
      localStorage.setItem("hyvmind-theme", migrateTheme(stored));
    }
  }, []);

  // /mcp is a public standalone page — render it directly without auth or layout
  if (window.location.pathname === "/mcp") {
    return <McpSetupRoute />;
  }

  // /docs/api redirects to /mcp
  if (window.location.pathname === "/docs/api") {
    return <ApiDocsRoute />;
  }

  return (
    <ThemeProvider
      attribute="class"
      themes={ALL_THEMES}
      defaultTheme={DEFAULT_THEME}
      enableSystem={false}
      storageKey="hyvmind-theme"
    >
      <AppShell />
    </ThemeProvider>
  );
}
