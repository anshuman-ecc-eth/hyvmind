import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useActor } from '../hooks/useActor';
import { useJoinSwarm } from '../hooks/useQueries';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FloatingActionButtons from '../components/FloatingActionButtons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Swarm } from '../backend';

export default function ExploreView() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { actor, isFetching } = useActor();
  const isReady = !!actor && !isFetching;
  const joinSwarmMutation = useJoinSwarm();

  const isAuthenticated = !!identity;

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/' });
    }
  }, [isAuthenticated, navigate]);

  const { data: swarms = [], isLoading, error } = useQuery<Swarm[]>({
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

  const isMemberOfSwarm = (swarm: Swarm): boolean => {
    if (!identity) return false;
    return swarm.members.some(
      (member) => member.toString() === identity.getPrincipal().toString()
    );
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-background text-foreground">
        <div className="container py-8 max-w-7xl">
          <section className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-light tracking-wide mb-2 text-foreground">
              Explore
            </h1>
            <p className="text-muted-foreground">
              Discover public swarms and research
            </p>
          </section>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load swarms. Please try again.
              </AlertDescription>
            </Alert>
          )}

          {isLoading || !isReady ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="text-center">
                <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-foreground/20 border-t-foreground mx-auto" />
                <p className="text-muted-foreground">
                  {!isReady ? 'Connecting...' : 'Loading swarms...'}
                </p>
              </div>
            </div>
          ) : swarms.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-30 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">No public swarms yet</p>
              <p className="text-sm text-muted-foreground mt-2">Be the first to create one!</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {swarms.map((swarm) => {
                const isMember = isMemberOfSwarm(swarm);
                return (
                  <Card key={swarm.id.toString()} className="bg-white dark:bg-gray-950 border-2 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-lg">{swarm.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {swarm.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {swarm.jurisdiction}
                        </Badge>
                        {swarm.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{swarm.members.length}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate({ to: `/swarm/${swarm.id}` })}
                          className="flex-1"
                        >
                          View
                        </Button>
                        {isMember ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            disabled
                          >
                            Joined
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="flex-1"
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
            </div>
          )}
        </div>
      </main>
      <FloatingActionButtons />
      <Footer />
    </>
  );
}
