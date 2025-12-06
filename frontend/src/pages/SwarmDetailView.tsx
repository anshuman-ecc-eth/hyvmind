import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useActor } from '../hooks/useActor';
import { useApproveAnnotation, useJoinSwarm } from '../hooks/useQueries';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FloatingActionButtons from '../components/FloatingActionButtons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, Users, Network, MapPin, ArrowLeft, Link, Coins, ThumbsUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { SwarmDetail, Annotation } from '../backend';

// Helper function to render annotation content with backward compatibility
function renderAnnotationContent(annotation: Annotation): string {
  // If content contains brackets, it's the new token format
  if (annotation.content.includes('{') && annotation.content.includes('}')) {
    return annotation.content;
  }
  
  // Legacy fallback: display content as-is
  return annotation.content;
}

export default function SwarmDetailView() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { swarmId } = useParams({ strict: false });
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const joinSwarmMutation = useJoinSwarm();
  const approveMutation = useApproveAnnotation();
  const queryClient = useQueryClient();

  const isAuthenticated = !!identity;

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/' });
    }
  }, [isAuthenticated, navigate]);

  const { data: swarmDetail, isLoading, error } = useQuery<SwarmDetail | null>({
    queryKey: ['swarmDetail', swarmId],
    queryFn: async () => {
      if (!actor || !swarmId) return null;
      return actor.getSwarmDetail(BigInt(swarmId));
    },
    enabled: isReady && !!swarmId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Get user profile to check approved annotations
  const { data: userProfile } = useQuery({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: isReady,
  });

  if (!isAuthenticated) {
    return null;
  }

  const isMember = swarmDetail?.swarm.members.some(
    (member) => member.toString() === identity?.getPrincipal().toString()
  );

  const AnnotationItem = ({ annotation }: { annotation: Annotation }) => {
    const isOwnAnnotation = annotation.creator.toString() === identity?.getPrincipal().toString();
    
    // Check if user has approved this annotation
    const hasApproved = userProfile?.approvedAnnotationIds.some(id => id === annotation.id) || false;
    
    // Track local approval state for immediate UI feedback
    const [localApprovalState, setLocalApprovalState] = useState<'approve' | 'disapprove' | null>(null);

    const handleApprove = async (isApproval: boolean) => {
      if (localApprovalState || approveMutation.isPending || !isReady || hasApproved) return;
      
      // Set local state immediately for instant feedback
      setLocalApprovalState(isApproval ? 'approve' : 'disapprove');
      
      try {
        await approveMutation.mutateAsync({ annotationId: annotation.id, isApproval });
      } catch (error) {
        // Revert on error
        setLocalApprovalState(null);
      }
    };

    // Determine if buttons should be disabled
    const hasApprovedAnnotation = hasApproved || localApprovalState !== null;
    const isApproveActive = hasApproved || localApprovalState === 'approve';
    const isDisapproveActive = localApprovalState === 'disapprove';

    return (
      <div className="p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-medium text-foreground font-mono text-sm break-words">
                {renderAnnotationContent(annotation)}
              </h3>
              {!isOwnAnnotation && (
                <div className="flex items-center gap-2 shrink-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={isApproveActive ? "secondary" : "outline"}
                          onClick={() => handleApprove(true)}
                          disabled={hasApprovedAnnotation || !isReady}
                          className={`flex items-center gap-1 transition-all ${
                            isApproveActive
                              ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground pointer-events-none' 
                              : ''
                          }`}
                        >
                          <span className="text-base">👍</span>
                        </Button>
                      </TooltipTrigger>
                      {!isApproveActive && (
                        <TooltipContent>
                          <p className="text-xs max-w-xs">
                            Support this annotation and gain right to reference it.
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={isDisapproveActive ? "secondary" : "outline"}
                          onClick={() => handleApprove(false)}
                          disabled={hasApprovedAnnotation || !isReady}
                          className={`flex items-center gap-1 transition-all ${
                            isDisapproveActive
                              ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground pointer-events-none' 
                              : ''
                          }`}
                        >
                          <span className="text-base">👎</span>
                        </Button>
                      </TooltipTrigger>
                      {!isDisapproveActive && (
                        <TooltipContent>
                          <p className="text-xs max-w-xs">
                            Disagree with this annotation.
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                {Number(annotation.approvalScore)} approvals
              </span>
              {annotation.referenceIds.length > 0 && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Link className="h-3 w-3" />
                    <span>{annotation.referenceIds.length} referenced</span>
                  </div>
                </>
              )}
              <span>•</span>
              <span>
                {new Date(Number(annotation.createdAt) / 1000000).toLocaleDateString()}
              </span>
            </div>
            {annotation.properties.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex flex-wrap gap-1.5">
                  {annotation.properties.map(([key, value], idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs px-2 py-0.5">
                      {key}: {value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-background text-foreground">
        <div className="container py-8 max-w-7xl">
          <Button
            variant="ghost"
            onClick={() => navigate({ to: '/dashboard' })}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load swarm details. Please try again.
              </AlertDescription>
            </Alert>
          )}

          {isLoading || !isReady ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="text-center">
                <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-foreground/20 border-t-foreground mx-auto" />
                <p className="text-muted-foreground">
                  {!isReady ? 'Connecting...' : 'Loading swarm details...'}
                </p>
              </div>
            </div>
          ) : !swarmDetail ? (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-30 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">Swarm not found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Swarm Information Card */}
              <Card className="bg-white dark:bg-gray-950 border-2 shadow-xl">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">{swarmDetail.swarm.title}</CardTitle>
                      <CardDescription className="text-base">
                        {swarmDetail.swarm.description}
                      </CardDescription>
                    </div>
                    {!isMember && (
                      <Button
                        onClick={() => joinSwarmMutation.mutate(BigInt(swarmId!))}
                        disabled={joinSwarmMutation.isPending || !isReady}
                      >
                        {joinSwarmMutation.isPending ? 'Joining...' : 'Join Swarm'}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {swarmDetail.swarm.jurisdiction}
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {Number(swarmDetail.memberCount)} member{Number(swarmDetail.memberCount) !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Network className="h-3 w-3" />
                      {swarmDetail.annotations.length} annotation{swarmDetail.annotations.length !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      {swarmDetail.swarm.treasuryCredits.toFixed(1)} treasury credits
                    </Badge>
                    {swarmDetail.swarm.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Created {new Date(Number(swarmDetail.swarm.createdAt) / 1000000).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>

              {/* Annotations List */}
              <Card className="bg-white dark:bg-gray-950 border-2 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Annotations
                  </CardTitle>
                  <CardDescription>
                    All semantic annotations within this swarm
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {swarmDetail.annotations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Network className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No annotations yet</p>
                      <p className="text-sm mt-1">Be the first to create one!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {swarmDetail.annotations.map((annotation) => (
                        <AnnotationItem key={annotation.id.toString()} annotation={annotation} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <FloatingActionButtons />
      <Footer />
    </>
  );
}
