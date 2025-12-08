import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { useState, useEffect, useMemo } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useActor } from './hooks/useActor';
import { useGetCallerUserProfile } from './hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import ProfileSetupModal from './components/ProfileSetupModal';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import GraphView from './pages/GraphView';
import ExploreView from './pages/ExploreView';
import CreateView from './pages/CreateView';
import SwarmDetailView from './pages/SwarmDetailView';
import OntologyBuilderView from './pages/OntologyBuilderView';
import { Loader2 } from 'lucide-react';

function RootComponent() {
  const { identity, loginStatus } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  const isAuthenticated = useMemo(() => {
    return !!identity && !identity.getPrincipal().isAnonymous();
  }, [identity]);

  const isBackendReady = useMemo(() => {
    return !!actor && !actorFetching && loginStatus !== 'initializing';
  }, [actor, actorFetching, loginStatus]);

  const {
    data: profile,
    isLoading: profileLoading,
    isFetched: profileFetched
  } = useGetCallerUserProfile();

  // Clear cache when logging out
  useEffect(() => {
    if (!isAuthenticated) {
      queryClient.clear();
      localStorage.clear();
      sessionStorage.clear();
    }
  }, [isAuthenticated, queryClient]);

  // Show profile setup modal when needed
  useEffect(() => {
    if (isAuthenticated && isBackendReady && !profileLoading && profileFetched) {
      const needsSetup =
        profile !== null && profile !== undefined && (!profile.name || profile.name.trim() === '');
      setShowProfileSetup(needsSetup);
    } else {
      setShowProfileSetup(false);
    }
  }, [isAuthenticated, isBackendReady, profile, profileLoading, profileFetched]);

  const handleProfileSetupComplete = () => {
    setShowProfileSetup(false);
  };

  const showConnectingBanner = isAuthenticated && !isBackendReady;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {showConnectingBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 dark:bg-blue-700 text-white px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Connecting to backend…</span>
          </div>
        </div>
      )}
      <Outlet />
      <Toaster />
      {isAuthenticated && isBackendReady && (
        <ProfileSetupModal open={showProfileSetup} onComplete={handleProfileSetupComplete} />
      )}
    </div>
  );
}

const rootRoute = createRootRoute({
  component: RootComponent
});

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: Dashboard
});

const graphRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/graph',
  component: GraphView
});

const exploreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/explore',
  component: ExploreView
});

const createViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/create',
  component: CreateView
});

const swarmDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/swarm/$swarmId',
  component: SwarmDetailView
});

const ontologyBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ontology-builder',
  component: OntologyBuilderView
});

const routeTree = rootRoute.addChildren([
  landingRoute,
  dashboardRoute,
  graphRoute,
  exploreRoute,
  createViewRoute,
  swarmDetailRoute,
  ontologyBuilderRoute
]);

const router = createRouter({ routeTree });

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
