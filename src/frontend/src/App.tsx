import { Toaster } from "@/components/ui/sonner";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { ThemeProvider } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { createActor } from "./backend";
import type { backendInterface } from "./backend";
import Footer from "./components/Footer";
import Header from "./components/Header";
import LandingGraphDiagram from "./components/LandingGraphDiagram";
import ProfileSetupModal from "./components/ProfileSetupModal";
import { SettingsView } from "./components/SettingsView";
import { Sidebar } from "./components/Sidebar";
import TextGameModal from "./components/TextGameModal";
import { useDebugTools } from "./hooks/useDebugHooks";
import { useGetCallerUserProfile, useIsCallerAdmin } from "./hooks/useQueries";
import { useSettings } from "./hooks/useSettings";
import {
  applyFontPairing,
  applyFontSize,
  getSavedFontPairing,
  getSavedFontSize,
} from "./lib/fontSettings";
import { ALL_THEMES, DEFAULT_THEME, migrateTheme } from "./lib/themes";
import ChatView from "./pages/ChatView";
import EditorView from "./pages/EditorView";
import HyvmindSkillsPage from "./pages/HyvmindSkillsPage";
import McpSetupPage from "./pages/McpSetupPage";
import ObsidianTokenPage from "./pages/ObsidianTokenPage";
import PublicGraphView from "./pages/PublicGraphView";
import SourcesView from "./pages/SourcesView";
import TerminalPage from "./pages/TerminalPage";

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

// Obsidian Token page — public, no auth
function ObsidianTokenRoute() {
  return (
    <ThemeProvider
      attribute="class"
      themes={ALL_THEMES}
      defaultTheme={DEFAULT_THEME}
      enableSystem={false}
      storageKey="hyvmind-theme"
    >
      <ObsidianTokenPage />
    </ThemeProvider>
  );
}

// Full authenticated app shell with all hooks
function AppShell() {
  const { identity, isInitializing } = useInternetIdentity();
  const [gameComplete, setGameComplete] = useState(false);
  const isAuthenticated = !!identity;

  const { activeTab, setActiveTab, sidebarCollapsed, setSidebarCollapsed } =
    useSettings();
  useDebugTools();

  // Initialize font settings on mount
  useEffect(() => {
    const savedPairing = getSavedFontPairing();
    const savedSize = getSavedFontSize();
    applyFontPairing(savedPairing);
    applyFontSize(savedSize);
  }, []);

  // Keyboard shortcut removed with CommandPalette deletion

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

  const { data: isAdmin } = useIsCallerAdmin();

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center justify-center gap-4">
          <span
            className="text-white/70"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: "0.6rem",
              letterSpacing: "0.2em",
            }}
          >
            Loading..
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
        <Header />
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
        isAdmin={!!isAdmin}
      />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-hidden relative">
          <div
            style={{
              display: activeTab === "notes" ? "block" : "none",
              height: "100%",
            }}
          >
            <EditorView />
          </div>
          <div
            style={{
              display: activeTab === "graphs" ? "block" : "none",
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
            <ChatView />
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
          {isAdmin && (
            <div
              style={{
                display: activeTab === "terminal" ? "block" : "none",
                height: "100%",
              }}
            >
              <TerminalPage />
            </div>
          )}
        </main>
        <Footer />
      </div>

      {showProfileSetup && <ProfileSetupModal />}
      <Toaster />

      {/* CommandPalette removed */}
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

  // /obsidian-token is a public standalone page — render it directly without auth or layout
  if (window.location.pathname === "/obsidian-token") {
    return <ObsidianTokenRoute />;
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
