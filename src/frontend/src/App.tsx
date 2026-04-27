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
import { SettingsView } from "./components/SettingsView";
import { Sidebar } from "./components/Sidebar";
import TextGameModal from "./components/TextGameModal";
import {
  useGetArchivedNodeIds,
  useGetCallerUserProfile,
  useGetOwnedData,
} from "./hooks/useQueries";
import { useSettings } from "./hooks/useSettings";
import {
  applyFontPairing,
  applyFontSize,
  getSavedFontPairing,
  getSavedFontSize,
} from "./lib/fontSettings";
import { ALL_THEMES, DEFAULT_THEME, migrateTheme } from "./lib/themes";
import HyvmindSkillsPage from "./pages/HyvmindSkillsPage";
import McpSetupPage from "./pages/McpSetupPage";
import PublicGraphView from "./pages/PublicGraphView";
import SourcesView from "./pages/SourcesView";
import SwarmsView from "./pages/SwarmsView";
import TerminalPage from "./pages/TerminalPage";
import { setHiddenCollectibleIds } from "./utils/archivedCollectiblesStore";

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

// SKILLS documentation page — public, no auth
function HyvmindSkillsRoute() {
  return (
    <ThemeProvider
      attribute="class"
      themes={ALL_THEMES}
      defaultTheme={DEFAULT_THEME}
      enableSystem={false}
      storageKey="hyvmind-theme"
    >
      <HyvmindSkillsPage />
    </ThemeProvider>
  );
}

// Full authenticated app shell with all hooks
function AppShell() {
  const { identity, isInitializing } = useInternetIdentity();
  const [gameComplete, setGameComplete] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const isAuthenticated = !!identity;

  const { activeTab, setActiveTab, sidebarCollapsed, setSidebarCollapsed } =
    useSettings();

  // Initialize font settings on mount
  useEffect(() => {
    const savedPairing = getSavedFontPairing();
    const savedSize = getSavedFontSize();
    applyFontPairing(savedPairing);
    applyFontSize(savedSize);
  }, []);

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

  if (!isAuthenticated) {
    return (
      <div className="flex h-[100dvh] flex-col bg-background">
        <Header onNavigateToSettings={() => {}} />
        <main className="flex-1 min-h-0 overflow-hidden">
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
        </main>
        <Footer />
        <Toaster />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header onNavigateToSettings={() => setActiveTab("settings")} />
        <main className="flex-1 overflow-hidden relative">
          <div
            style={{
              display: activeTab === "sources" ? "block" : "none",
              height: "100%",
            }}
          >
            <SourcesView />
          </div>
          <div
            style={{
              display: activeTab === "chat" ? "block" : "none",
              height: "100%",
            }}
          >
            <SwarmsView />
          </div>
          <div
            style={{
              display: activeTab === "public" ? "block" : "none",
              height: "100%",
            }}
          >
            <PublicGraphView />
          </div>
          <div
            style={{
              display: activeTab === "settings" ? "block" : "none",
              height: "100%",
            }}
          >
            <SettingsView />
          </div>
          <div
            style={{
              display: activeTab === "terminal" ? "block" : "none",
              height: "100%",
            }}
          >
            <TerminalPage />
          </div>
        </main>
        <Footer />
      </div>

      {showProfileSetup && <ProfileSetupModal />}
      <Toaster />

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onViewChange={(view) => {
          // Map legacy view names to new tab IDs
          const tabMap: Record<string, string> = {
            sources: "sources",
            chat: "chat",
            "public-graphs": "public",
            terminal: "terminal",
          };
          setActiveTab(tabMap[view] ?? view);
        }}
      />
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

  // /skills is the SKILLS documentation page — public, no auth
  if (window.location.pathname === "/skills") {
    return <HyvmindSkillsRoute />;
  }

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
