import { useGetGraphData, useIsCallerAdmin } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldAlert } from 'lucide-react';
import DataResetDialog from '../components/DataResetDialog';

export default function DebugPanel() {
  const { data: graphData, isLoading } = useGetGraphData();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();

  if (isLoading || isAdminLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!graphData) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  // Build a map of law token ID to all locations that reference it
  const lawTokenToLocations = new Map<string, string[]>();
  graphData.edges.forEach(edge => {
    const location = graphData.locations.find(a => a.id === edge.source);
    const lawToken = graphData.lawTokens.find(t => t.id === edge.target);
    
    if (location && lawToken) {
      if (!lawTokenToLocations.has(lawToken.id)) {
        lawTokenToLocations.set(lawToken.id, []);
      }
      lawTokenToLocations.get(lawToken.id)!.push(location.id);
    }
  });

  return (
    <div className="container mx-auto p-6 h-[calc(100vh-8rem)]">
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Debug Panel</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Total Edges: {graphData.edges.length} (including shared law token relationships and interpretation token connections)
              </p>
            </div>
            {isAdmin && (
              <DataResetDialog />
            )}
          </div>
          
          {isAdmin && (
            <Alert className="mt-4 bg-muted border-border">
              <ShieldAlert className="h-4 w-4 text-foreground" />
              <AlertDescription className="text-foreground">
                You have admin privileges. Use the reset button with caution.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="curations" className="h-[calc(100vh-18rem)]">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="curations">
                Curations <Badge className="ml-2 bg-muted text-foreground">{graphData.curations.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="swarms">
                Swarms <Badge className="ml-2 bg-muted text-foreground">{graphData.swarms.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="locations">
                Locations <Badge className="ml-2 bg-muted text-foreground">{graphData.locations.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="lawTokens">
                Law Tokens <Badge className="ml-2 bg-muted text-foreground">{graphData.lawTokens.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="interpretationTokens">
                Interpretation Tokens <Badge className="ml-2 bg-muted text-foreground">{graphData.interpretationTokens.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="curations" className="h-[calc(100%-3rem)]">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {graphData.curations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No curations yet</p>
                  ) : (
                    graphData.curations.map((curation) => (
                      <Card key={curation.id}>
                        <CardHeader>
                          <CardTitle className="text-base">{curation.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">ID</p>
                            <p className="text-sm font-mono">{curation.id}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Creator</p>
                            <p className="text-sm font-mono break-all">
                              {curation.creator.toString()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="swarms" className="h-[calc(100%-3rem)]">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {graphData.swarms.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No swarms yet</p>
                  ) : (
                    graphData.swarms.map((swarm) => (
                      <Card key={swarm.id}>
                        <CardHeader>
                          <CardTitle className="text-base">{swarm.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">ID</p>
                            <p className="text-sm font-mono">{swarm.id}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Tags</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {swarm.tags.length > 0 ? (
                                swarm.tags.map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs bg-muted text-foreground border-border">
                                    {tag}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">No tags</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Parent Curation</p>
                            <p className="text-sm font-mono">{swarm.parentCurationId}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Creator</p>
                            <p className="text-sm font-mono break-all">
                              {swarm.creator.toString()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="locations" className="h-[calc(100%-3rem)]">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {graphData.locations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No locations yet</p>
                  ) : (
                    graphData.locations.map((location) => {
                      // Find all law tokens linked to this location
                      const linkedLawTokens = graphData.edges
                        .filter(edge => edge.source === location.id)
                        .map(edge => graphData.lawTokens.find(t => t.id === edge.target))
                        .filter(Boolean);

                      return (
                        <Card key={location.id}>
                          <CardHeader>
                            <CardTitle className="text-base">{location.title}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground">ID</p>
                              <p className="text-sm font-mono">{location.id}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Content</p>
                              <p className="text-sm">{location.content || 'No content'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Original Law Token Sequence</p>
                              <p className="text-sm font-mono">{location.originalTokenSequence || 'None'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Custom Attributes</p>
                              <div className="space-y-1 mt-1">
                                {location.customAttributes.length > 0 ? (
                                  location.customAttributes.map((attr, index) => (
                                    <div key={index} className="text-xs bg-muted p-2 rounded border border-border">
                                      <span className="font-semibold">{attr.key}:</span> {attr.value}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">No custom attributes</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Parent Swarm</p>
                              <p className="text-sm font-mono">{location.parentSwarmId}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Linked Law Tokens</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {linkedLawTokens.length > 0 ? (
                                  linkedLawTokens.map((lawToken) => (
                                    <Badge key={lawToken!.id} variant="outline" className="text-xs bg-muted text-foreground border-border">
                                      {lawToken!.tokenLabel}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">None</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Creator</p>
                              <p className="text-sm font-mono break-all">
                                {location.creator.toString()}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="lawTokens" className="h-[calc(100%-3rem)]">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {graphData.lawTokens.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No law tokens yet</p>
                  ) : (
                    graphData.lawTokens.map((lawToken) => {
                      const linkedLocations = lawTokenToLocations.get(lawToken.id) || [];
                      const isShared = linkedLocations.length > 1;

                      return (
                        <Card key={lawToken.id} className={isShared ? 'border-foreground' : ''}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{lawToken.tokenLabel}</CardTitle>
                              {isShared && (
                                <Badge variant="default" className="text-xs bg-foreground text-background">
                                  Shared ({linkedLocations.length})
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground">ID</p>
                              <p className="text-sm font-mono">{lawToken.id}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Meaning</p>
                              <p className="text-sm">{lawToken.meaning || 'No meaning'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Parent Location (Primary)</p>
                              <p className="text-sm font-mono">{lawToken.parentLocationId}</p>
                            </div>
                            {isShared && (
                              <div>
                                <p className="text-xs text-muted-foreground">All Linked Locations</p>
                                <div className="space-y-1 mt-1">
                                  {linkedLocations.map((locationId) => {
                                    const location = graphData.locations.find(a => a.id === locationId);
                                    return (
                                      <div key={locationId} className="text-xs font-mono bg-muted p-1 rounded border border-border">
                                        {location?.title || locationId}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-muted-foreground">Creator</p>
                              <p className="text-sm font-mono break-all">
                                {lawToken.creator.toString()}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="interpretationTokens" className="h-[calc(100%-3rem)]">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {graphData.interpretationTokens.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No interpretation tokens yet</p>
                  ) : (
                    graphData.interpretationTokens.map((interpretationToken) => {
                      // Count incoming and outgoing connections
                      const incomingCount = graphData.edges.filter(e => e.target === interpretationToken.id).length;
                      const outgoingCount = graphData.edges.filter(e => e.source === interpretationToken.id).length;

                      return (
                        <Card key={interpretationToken.id}>
                          <CardHeader>
                            <CardTitle className="text-base">{interpretationToken.title}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground">ID</p>
                              <p className="text-sm font-mono">{interpretationToken.id}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Context</p>
                              <p className="text-sm">{interpretationToken.context || 'No context'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">From Law Token</p>
                              <p className="text-sm font-mono">{interpretationToken.fromLawTokenId}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">From Relationship Type</p>
                              <Badge variant="outline" className="text-xs bg-muted text-foreground border-border">
                                {interpretationToken.fromRelationshipType}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">To Node</p>
                              <p className="text-sm font-mono">{interpretationToken.toNodeId}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">To Relationship Type</p>
                              <Badge variant="outline" className="text-xs bg-muted text-foreground border-border">
                                {interpretationToken.toRelationshipType}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Connections</p>
                              <div className="flex gap-2 text-sm">
                                <span>In: {incomingCount}</span>
                                <span>Out: {outgoingCount}</span>
                                <span className="font-semibold">Total: {incomingCount + outgoingCount}</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Custom Attributes</p>
                              <div className="space-y-1 mt-1">
                                {interpretationToken.customAttributes.length > 0 ? (
                                  interpretationToken.customAttributes.map((attr, index) => (
                                    <div key={index} className="text-xs bg-muted p-2 rounded border border-border">
                                      <span className="font-semibold">{attr.key}:</span> {attr.value}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">No custom attributes</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Creator</p>
                              <p className="text-sm font-mono break-all">
                                {interpretationToken.creator.toString()}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
