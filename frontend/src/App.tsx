/**
 * Copyright (c) Anshuman Singh, 2026.
 * SPDX-License-Identifier: CC-BY-SA-4.0
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 
 * International License. To view a copy of this license, visit 
 * http://creativecommons.org/licenses/by-sa/4.0/
 */
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
import OntologiesView from './pages/OntologiesView';
import BuzzLeaderboard from './pages/BuzzLeaderboard';
import VoronoiDiagram from './components/VoronoiDiagram';
import { useState } from 'react';

type ViewType = 'graph' | 'tree' | 'membership' | 'ontologies' | 'buzz';

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
      <div className="flex min-h-screen flex-col bg-background">
        <Header currentView={currentView} onViewChange={setCurrentView} />
        
        <main className="flex-1">
          {!isAuthenticated ? (
            <div className="h-[calc(100vh-8rem)]">
              <VoronoiDiagram />
            </div>
          ) : (
            <>
              {currentView === 'graph' && <GraphView readOnly={false} usePublicData={false} />}
              {currentView === 'tree' && <TreeView />}
              {currentView === 'membership' && (
                <div className="container mx-auto p-6">
                  <SwarmMembershipManager />
                </div>
              )}
              {currentView === 'ontologies' && <OntologiesView />}
              {currentView === 'buzz' && <BuzzLeaderboard />}
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
