import { useState, useEffect } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { useActorState } from '../hooks/useActorState';
import { useGetCallerUserRole, useHasDebugAccess } from '../hooks/useQueries';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Network, TreePine, Plus, LogOut, User, AlertCircle, BookOpen, Bug, ChevronDown, MessageSquare } from 'lucide-react';
import TreeView from '../components/TreeView';
import GraphView from '../components/GraphView';
import MySwarms from '../components/MySwarms';
import OntologyBuilderPanel from '../components/OntologyBuilderPanel';
import DebugPanel from '../components/DebugPanel';
import CreateNodeDialog from '../components/CreateNodeDialog';
import { UserProfile } from '../types';
import ThemeToggle from '../components/ThemeToggle';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useTheme } from 'next-themes';

interface MainAppProps {
  userProfile: UserProfile | null;
}

export default function MainApp({ userProfile }: MainAppProps) {
  const { clear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { areAllActorsReady, initializationMessage, error: actorError } = useActorState();
  const { data: callerRole } = useGetCallerUserRole();
  const { data: hasDebugAccess, isLoading: debugAccessLoading } = useHasDebugAccess();
  const { resolvedTheme } = useTheme();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<bigint | null>(null);
  const [activeTab, setActiveTab] = useState('tree');

  const isAuthenticated = !!identity;
  
  // Debug panel access is restricted to three specific users: "anshuman", "not-anshuman", and "not-not-anshuman"
  // Only show debug panel when we have confirmed access (not during loading)
  const canAccessDebugPanel = !debugAccessLoading && hasDebugAccess === true;

  // Redirect away from debug panel if user loses access or tries to access without permission
  useEffect(() => {
    if (!debugAccessLoading && activeTab === 'debug-panel' && !canAccessDebugPanel) {
      setActiveTab('tree');
    }
  }, [canAccessDebugPanel, activeTab, debugAccessLoading]);

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const handleCreateNode = (parentId?: bigint) => {
    if (!areAllActorsReady) {
      return;
    }
    setSelectedParentId(parentId ?? null);
    setCreateDialogOpen(true);
  };

  const handleOpenDebugPanel = () => {
    if (canAccessDebugPanel) {
      setActiveTab('debug-panel');
    }
  };

  // Theme-aware logo selection
  const logoSrc = resolvedTheme === 'dark' 
    ? '/assets/hyvmind_logo white, transparent-1.png'
    : '/assets/hyvmind_logo black, transparent-1.png';

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img 
              src={logoSrc}
              alt="hyvmind Logo" 
              className="h-8 w-8 object-contain"
            />
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCreateNode()}
              className="gap-2"
              disabled={!areAllActorsReady}
              title={!areAllActorsReady ? 'Connecting to network...' : 'Create new curation'}
            >
              <Plus className="h-4 w-4" />
              New Curation
            </Button>

            {/* User Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{userProfile?.name || 'User'}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{userProfile?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {identity?.getPrincipal().toString().slice(0, 20)}...
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {canAccessDebugPanel && (
                  <>
                    <DropdownMenuItem onClick={handleOpenDebugPanel}>
                      <Bug className="mr-2 h-4 w-4" />
                      <span>Debug Panel</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {!areAllActorsReady && (
        <div className="border-b bg-yellow-50 dark:bg-yellow-950/20">
          <div className="container mx-auto px-4 py-2">
            <Alert variant="default" className="border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                {actorError || initializationMessage || 'Connecting to the Internet Computer network... Please wait.'}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b bg-card/30">
            <div className="container mx-auto px-4">
              <TabsList className="h-12">
                <TabsTrigger value="tree" className="gap-2">
                  <TreePine className="h-4 w-4" />
                  Tree View
                </TabsTrigger>
                <TabsTrigger value="graph" className="gap-2">
                  <Network className="h-4 w-4" />
                  Graph View
                </TabsTrigger>
                <TabsTrigger value="my-swarms" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  My Swarms
                </TabsTrigger>
                <TabsTrigger value="ontology-builder" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Ontology Builder
                </TabsTrigger>
                {canAccessDebugPanel && (
                  <TabsTrigger value="debug-panel" className="gap-2">
                    <Bug className="h-4 w-4" />
                    Debug Panel
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
          </div>

          <TabsContent value="tree" className="flex-1 m-0 overflow-hidden">
            <TreeView onCreateNode={handleCreateNode} />
          </TabsContent>

          <TabsContent value="graph" className="flex-1 m-0 overflow-hidden">
            <GraphView />
          </TabsContent>

          <TabsContent value="my-swarms" className="flex-1 m-0 overflow-hidden">
            <MySwarms />
          </TabsContent>

          <TabsContent value="ontology-builder" className="flex-1 m-0 overflow-hidden">
            <OntologyBuilderPanel />
          </TabsContent>

          {canAccessDebugPanel && (
            <TabsContent value="debug-panel" className="flex-1 m-0 overflow-hidden">
              <DebugPanel />
            </TabsContent>
          )}
        </Tabs>
      </main>

      <CreateNodeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        parentId={selectedParentId}
      />
    </div>
  );
}
