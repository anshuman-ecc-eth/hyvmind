import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
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
import { useState } from 'react';

type ViewType = 'graph' | 'tree' | 'terminal' | 'swarms' | 'buzz' | 'collectibles';

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
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
