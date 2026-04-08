import { Toaster } from "@/components/ui/sonner";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { ThemeProvider } from "next-themes";
import React from "react";
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
import GraphView from "./pages/GraphView";
import SourcesView from "./pages/SourcesView";
import SwarmDetailView from "./pages/SwarmDetailView";
import SwarmsView from "./pages/SwarmsView";
import TerminalPage from "./pages/TerminalPage";
import TreeView from "./pages/TreeView";
import { setHiddenCollectibleIds } from "./utils/archivedCollectiblesStore";

const MemoizedGraphView = React.memo(GraphView);

type ViewType =
  | "graph"
  | "tree"
  | "terminal"
  | "swarms"
  | "swarm-detail"
  | "sources";

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const [currentView, setCurrentView] = useState<ViewType>("graph");
  const [selectedSwarmId, setSelectedSwarmId] = useState<string | null>(null);
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

  // Determine if we're showing the landing page (unauthenticated view)
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
        if (
          archivedSet.has(it.id) ||
          archivedSet.has(it.fromTokenId) ||
          archivedSet.has(it.toNodeId)
        ) {
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

  const handleSelectSwarm = (swarmId: string) => {
    setSelectedSwarmId(swarmId);
    setCurrentView("swarm-detail");
  };

  const handleBackToSwarms = () => {
    setSelectedSwarmId(null);
    setCurrentView("swarms");
  };

  // When navigating away from swarms entirely, clear selected swarm
  const handleViewChange = (view: ViewType) => {
    if (view !== "swarm-detail") {
      setSelectedSwarmId(null);
    }
    setCurrentView(view);
  };

  if (isInitializing) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        storageKey="hyvmind-theme"
      >
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <p className="text-foreground font-mono text-sm tracking-widest">
              loading
            </p>
            <div className="font-mono text-foreground text-sm flex items-center gap-1">
              <span className="text-muted-foreground">[</span>
              <span
                style={{
                  display: "inline-block",
                  width: "12ch",
                  overflow: "hidden",
                  animation: "terminal-load 2s steps(12, end) forwards",
                }}
              >
                {"============"}
              </span>
              <span className="text-muted-foreground">]</span>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes terminal-load {
            from { width: 0ch; }
            to   { width: 12ch; }
          }
        `}</style>
        <Toaster />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="hyvmind-theme"
    >
      <div className="flex h-[100dvh] flex-col bg-background">
        <Header
          currentView={currentView === "swarm-detail" ? "swarms" : currentView}
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
              {currentView === "graph" && (
                <MemoizedGraphView readOnly={false} usePublicData={false} />
              )}
              {currentView === "tree" && <TreeView />}
              {currentView === "terminal" && <TerminalPage />}
              {currentView === "swarms" && (
                <div className="flex-1 overflow-auto">
                  <SwarmsView onSelectSwarm={handleSelectSwarm} />
                </div>
              )}
              {currentView === "swarm-detail" && selectedSwarmId && (
                <SwarmDetailView
                  swarmId={selectedSwarmId}
                  onBack={handleBackToSwarms}
                  onSelectSwarm={handleSelectSwarm}
                />
              )}
              {currentView === "sources" && (
                <div className="flex-1 min-h-0">
                  <SourcesView />
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
    </ThemeProvider>
  );
}
