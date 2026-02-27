import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile, useGetArchivedNodeIds } from './hooks/useQueries';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import Header from './components/Header';
import Footer from './components/Footer';
import ProfileSetupModal from './components/ProfileSetupModal';
import GraphView from './pages/GraphView';
import TreeView from './pages/TreeView';
import SwarmMembershipManager from './components/SwarmMembershipManager';
import BuzzLeaderboard from './pages/BuzzLeaderboard';
import TerminalPage from './pages/TerminalPage';
import LandingGraphDiagram from './components/LandingGraphDiagram';
import CollectiblesView from './pages/CollectiblesView';
import { useState, useEffect, useRef } from 'react';
import { setHiddenCollectibleIds } from './utils/archivedCollectiblesStore';
import { useGetGraphData } from './hooks/useQueries';

type ViewType = 'graph' | 'tree' | 'terminal' | 'swarms' | 'buzz' | 'collectibles';

export default function App() {
  const { identity, isInitializing, isLoginSuccess } = useInternetIdentity();
  const [currentView, setCurrentView] = useState<ViewType>('graph');
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
        if (archivedSet.has(it.id) || archivedSet.has(it.fromTokenId) || archivedSet.has(it.toNodeId)) {
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
    <ThemeProvider 
      attribute="class" 
      defaultTheme="dark" 
      enableSystem
    >
      <div className="flex min-h-screen flex-col bg-background">
        <Header 
          currentView={currentView} 
          onViewChange={setCurrentView} 
          isAuthenticated={isAuthenticated}
          isLandingPage={isLandingPage}
        />
        
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {!isAuthenticated ? (
            <div className="h-full">
              <LandingGraphDiagram />
            </div>
          ) : (
            <>
              {currentView === 'graph' && <GraphView readOnly={false} usePublicData={false} />}
              {currentView === 'tree' && <TreeView />}
              {currentView === 'terminal' && <TerminalPage />}
              {currentView === 'swarms' && (
                <div className="container mx-auto p-6 overflow-auto">
                  <SwarmMembershipManager />
                </div>
              )}
              {currentView === 'buzz' && <BuzzLeaderboard />}
              {currentView === 'collectibles' && <CollectiblesView />}
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
