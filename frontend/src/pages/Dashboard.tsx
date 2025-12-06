import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useGetCallerSwarms, useJoinSwarm, useGetCallerAnnotations } from '../hooks/useQueries';
import { useQuery } from '@tanstack/react-query';
import { useActor } from '../hooks/useActor';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FloatingActionButtons from '../components/FloatingActionButtons';
import ControlPanel from '../components/ControlPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users, Network, MapPin, BookOpen, Palette, ChevronLeft, ChevronRight, Globe, Plus } from 'lucide-react';
import type { Swarm, Annotation } from '../backend';

// Notebook color palette with display colors
const notebookColors = [
  { 
    id: 'amber',
    class: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700',
    display: 'bg-amber-300 dark:bg-amber-700'
  },
  { 
    id: 'blue',
    class: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
    display: 'bg-blue-300 dark:bg-blue-700'
  },
  { 
    id: 'green',
    class: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
    display: 'bg-green-300 dark:bg-green-700'
  },
  { 
    id: 'purple',
    class: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
    display: 'bg-purple-300 dark:bg-purple-700'
  },
  { 
    id: 'pink',
    class: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700',
    display: 'bg-pink-300 dark:bg-pink-700'
  },
  { 
    id: 'orange',
    class: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
    display: 'bg-orange-300 dark:bg-orange-700'
  },
  { 
    id: 'teal',
    class: 'bg-teal-100 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700',
    display: 'bg-teal-300 dark:bg-teal-700'
  },
  { 
    id: 'indigo',
    class: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700',
    display: 'bg-indigo-300 dark:bg-indigo-700'
  },
  { 
    id: 'rose',
    class: 'bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700',
    display: 'bg-rose-300 dark:bg-rose-700'
  },
  { 
    id: 'cyan',
    class: 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700',
    display: 'bg-cyan-300 dark:bg-cyan-700'
  },
  { 
    id: 'lime',
    class: 'bg-lime-100 dark:bg-lime-900/30 border-lime-300 dark:border-lime-700',
    display: 'bg-lime-300 dark:bg-lime-700'
  },
  { 
    id: 'fuchsia',
    class: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 border-fuchsia-300 dark:border-fuchsia-700',
    display: 'bg-fuchsia-300 dark:bg-fuchsia-700'
  },
];

export default function Dashboard() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const joinSwarmMutation = useJoinSwarm();

  const isAuthenticated = !!identity;
  
  // Sidebar collapse states
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  
  // Store notebook colors in session state (persists per session)
  const [notebookColorMap, setNotebookColorMap] = useState<Record<string, string>>(() => {
    const stored = sessionStorage.getItem('notebookColors');
    return stored ? JSON.parse(stored) : {};
  });

  // Persist color selections to session storage
  useEffect(() => {
    sessionStorage.setItem('notebookColors', JSON.stringify(notebookColorMap));
  }, [notebookColorMap]);

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/' });
    }
  }, [isAuthenticated, navigate]);

  const { data: swarms = [], isLoading: swarmsLoading } = useGetCallerSwarms();
  const { data: allAnnotations = [] } = useGetCallerAnnotations();

  // Fetch public swarms for sidebar
  const { data: publicSwarms = [], isLoading: publicSwarmsLoading } = useQuery<Swarm[]>({
    queryKey: ['publicSwarms'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPublicSwarms();
    },
    enabled: isReady,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  if (!isAuthenticated) {
    return null;
  }

  const handleColorSelect = (swarmId: string, colorId: string) => {
    setNotebookColorMap(prev => ({
      ...prev,
      [swarmId]: colorId
    }));
  };

  const getSwarmColor = (swarmId: string, defaultIndex: number) => {
    const selectedColorId = notebookColorMap[swarmId];
    if (selectedColorId) {
      const color = notebookColors.find(c => c.id === selectedColorId);
      return color?.class || notebookColors[defaultIndex % notebookColors.length].class;
    }
    return notebookColors[defaultIndex % notebookColors.length].class;
  };

  const isMemberOfSwarm = (swarm: Swarm): boolean => {
    if (!identity) return false;
    return swarm.members.some(
      (member) => member.toString() === identity.getPrincipal().toString()
    );
  };

  const handleCardClick = (swarmId: bigint) => {
    navigate({ to: `/swarm/${swarmId}` });
  };

  // Get annotations for a specific swarm
  const getSwarmAnnotations = (swarmId: bigint): Annotation[] => {
    return allAnnotations.filter(annotation => annotation.swarmId === swarmId);
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-background text-foreground relative">
        <div className="flex">
          {/* Left Sidebar - Control Panel */}
          <ControlPanel 
            isCollapsed={isLeftSidebarCollapsed}
            onToggleCollapse={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
          />

          {/* Main Content Area */}
          <div className={`flex-1 transition-all duration-300 ${isLeftSidebarCollapsed ? 'ml-0' : 'ml-80'} ${isRightSidebarCollapsed ? 'mr-0' : 'mr-80'}`}>
            <div className="container py-8 max-w-7xl">
              <section className="mb-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <BookOpen className="h-8 w-8 text-primary" />
                  <h1 className="text-3xl md:text-4xl font-light tracking-wide text-foreground">
                    Dashboard
                  </h1>
                </div>
              </section>

              {swarmsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-foreground/20 border-t-foreground" />
                </div>
              ) : swarms.length === 0 ? (
                <div className="text-center py-16">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-30 text-muted-foreground" />
                  <h2 className="text-xl font-medium mb-2 text-foreground">No notebooks yet</h2>
                  <p className="text-muted-foreground mb-6">
                    Create your first notebook to start organizing your research
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Plus className="h-4 w-4" />
                    <span>Use the floating button in the bottom-right corner to create a notebook</span>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {swarms.map((swarm, index) => {
                    const colorClass = getSwarmColor(swarm.id.toString(), index);
                    const swarmAnnotations = getSwarmAnnotations(swarm.id);
                    
                    return (
                      <NotebookCard
                        key={swarm.id.toString()}
                        swarm={swarm}
                        swarmAnnotations={swarmAnnotations}
                        colorClass={colorClass}
                        onColorSelect={handleColorSelect}
                        onClick={() => handleCardClick(swarm.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <aside
            className={`fixed right-0 top-20 h-[calc(100vh-5rem)] bg-background border-l border-border/40 transition-all duration-300 z-10 ${
              isRightSidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'
            }`}
          >
            <div className="h-full overflow-y-auto p-6">
              {/* Explore Public Swarms Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Explore Public Swarms</h2>
                </div>
                
                {publicSwarmsLoading || !isReady ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-foreground/20 border-t-foreground" />
                  </div>
                ) : publicSwarms.length === 0 ? (
                  <div className="text-center py-8">
                    <Globe className="h-12 w-12 mx-auto mb-3 opacity-20 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No public swarms available yet</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Create a public notebook to share with others
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {publicSwarms.slice(0, 5).map((swarm) => {
                      const isMember = isMemberOfSwarm(swarm);
                      return (
                        <Card key={swarm.id.toString()} className="bg-card border shadow-sm">
                          <CardHeader className="p-3 pb-2">
                            <CardTitle className="text-sm font-medium line-clamp-1">
                              {swarm.title}
                            </CardTitle>
                            <CardDescription className="text-xs line-clamp-2">
                              {swarm.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-3 pt-0 space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{swarm.jurisdiction}</span>
                              <span>•</span>
                              <Users className="h-3 w-3" />
                              <span>{swarm.members.length}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate({ to: `/swarm/${swarm.id}` })}
                                className="flex-1 h-7 text-xs"
                              >
                                View
                              </Button>
                              {isMember ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="flex-1 h-7 text-xs"
                                  disabled
                                >
                                  Joined
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  className="flex-1 h-7 text-xs"
                                  onClick={() => joinSwarmMutation.mutate(swarm.id)}
                                  disabled={joinSwarmMutation.isPending || !isReady}
                                >
                                  {joinSwarmMutation.isPending ? 'Joining...' : 'Join'}
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {publicSwarms.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        +{publicSwarms.length - 5} more swarms
                      </p>
                    )}
                  </div>
                )}
              </section>
            </div>
          </aside>

          {/* Right Sidebar Toggle Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
            className={`fixed top-24 transition-all duration-300 z-20 h-10 w-10 ${
              isRightSidebarCollapsed ? 'right-4' : 'right-[21rem]'
            }`}
            title={isRightSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            {isRightSidebarCollapsed ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </Button>
        </div>
      </main>
      <FloatingActionButtons />
      <Footer />
    </>
  );
}

// Separate NotebookCard component for better organization
function NotebookCard({
  swarm,
  swarmAnnotations,
  colorClass,
  onColorSelect,
  onClick,
}: {
  swarm: Swarm;
  swarmAnnotations: Annotation[];
  colorClass: string;
  onColorSelect: (swarmId: string, colorId: string) => void;
  onClick: () => void;
}) {
  return (
    <Card
      className={`${colorClass} border-2 shadow-lg hover:shadow-xl transition-all duration-200 group overflow-hidden relative cursor-pointer`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2 mb-1">
              <BookOpen className="h-5 w-5 shrink-0" />
              <span className="truncate">{swarm.title}</span>
            </CardTitle>
            <CardDescription className="text-xs line-clamp-2 text-foreground/70">
              {swarm.description || 'No description'}
            </CardDescription>
          </div>
          
          {/* Color Palette Button */}
          <Popover>
            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 hover:bg-foreground/10"
                title="Change notebook color"
              >
                <Palette className="h-4 w-4 text-foreground/60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-64 p-4 bg-background border-border" 
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Choose Color</h4>
                <div className="grid grid-cols-4 gap-2">
                  {notebookColors.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => onColorSelect(swarm.id.toString(), color.id)}
                      className={`h-10 w-10 rounded-full border-2 transition-all hover:scale-110 ${color.display} ${
                        colorClass.includes(color.id)
                          ? 'border-foreground ring-2 ring-foreground/20'
                          : 'border-foreground/20 hover:border-foreground/40'
                      }`}
                      title={color.id}
                    />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Notebook metadata */}
        <div className="flex items-center gap-3 text-xs text-foreground/70 pb-2 border-b border-foreground/10">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {swarm.jurisdiction}
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {swarm.members.length}
          </div>
          {swarm.isPublic && (
            <>
              <span>•</span>
              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                Public
              </Badge>
            </>
          )}
        </div>

        {/* Annotations */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground/80">
            <Network className="h-3.5 w-3.5" />
            <span>Annotations ({swarmAnnotations.length})</span>
          </div>
          
          {swarmAnnotations.length === 0 ? (
            <div className="text-xs text-foreground/50 italic pl-5">
              No annotations yet
            </div>
          ) : (
            <div className="space-y-1.5 max-h-32 overflow-y-auto pl-5">
              {swarmAnnotations.slice(0, 5).map((annotation) => (
                <div
                  key={annotation.id.toString()}
                  className="text-xs text-foreground/70 hover:text-foreground transition-colors flex items-start gap-2 group/page"
                >
                  <span className="text-foreground/40 shrink-0">•</span>
                  <span className="truncate flex-1">
                    {annotation.content}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 shrink-0">
                    {Number(annotation.approvalScore)}
                  </Badge>
                </div>
              ))}
              {swarmAnnotations.length > 5 && (
                <div className="text-xs text-foreground/50 italic">
                  +{swarmAnnotations.length - 5} more annotations
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tags */}
        {swarm.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t border-foreground/10">
            {swarm.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] px-1.5 py-0.5 h-5 bg-foreground/10 text-foreground/70"
              >
                {tag}
              </Badge>
            ))}
            {swarm.tags.length > 3 && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0.5 h-5 bg-foreground/10 text-foreground/70"
              >
                +{swarm.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
