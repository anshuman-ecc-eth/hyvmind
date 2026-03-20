import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { useEffect, useRef, useState } from "react";
import Footer from "./components/Footer";
import Header from "./components/Header";
import LandingGraphDiagram from "./components/LandingGraphDiagram";
import ProfileSetupModal from "./components/ProfileSetupModal";
import SwarmMembershipManager from "./components/SwarmMembershipManager";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useGetArchivedNodeIds,
  useGetCallerUserProfile,
} from "./hooks/useQueries";
import { useGetGraphData } from "./hooks/useQueries";
import BuzzLeaderboard from "./pages/BuzzLeaderboard";
import CollectiblesView from "./pages/CollectiblesView";
import GraphView from "./pages/GraphView";
import SwarmDetailView from "./pages/SwarmDetailView";
import SwarmsView from "./pages/SwarmsView";
import TerminalPage from "./pages/TerminalPage";
import TreeView from "./pages/TreeView";
import { setHiddenCollectibleIds } from "./utils/archivedCollectiblesStore";

type ViewType =
  | "graph"
  | "tree"
  | "terminal"
  | "swarms"
  | "swarm-detail"
  | "buzz"
  | "collectibles";

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const [currentView, setCurrentView] = useState<ViewType>("graph");
  const [selectedSwarmId, setSelectedSwarmId] = useState<string | null>(null);
  const isAuthenticated = !!identity;

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();

  const showProfileSetup =
    isAuthenticated && !profileLoading && isFetched && userProfile === null;

  // Determine if we're showing the landing page (unauthenticated view)
  const isLandingPage = !isAuthenticated;

  // Silent cleanup: fetch archived node IDs once per login and persist hidden collectibles
  const { data: archivedNodeIds } = useGetArchivedNodeIds();
  const { data: graphData } = useGetGraphData();
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
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Initializing...</p>
          </div>
        </div>
        <Toaster />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="flex h-[100dvh] flex-col bg-background">
        <Header
          currentView={currentView === "swarm-detail" ? "swarms" : currentView}
          onViewChange={handleViewChange}
          isAuthenticated={isAuthenticated}
          isLandingPage={isLandingPage}
        />

        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {!isAuthenticated ? (
            <div className="h-full min-h-0">
              <LandingGraphDiagram />
            </div>
          ) : (
            <>
              {currentView === "graph" && (
                <GraphView readOnly={false} usePublicData={false} />
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
                />
              )}
              {currentView === "buzz" && <BuzzLeaderboard />}
              {currentView === "collectibles" && <CollectiblesView />}
            </>
          )}
        </main>

        <Footer />

        {showProfileSetup && <ProfileSetupModal />}
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
