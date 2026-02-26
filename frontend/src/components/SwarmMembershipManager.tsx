import { useGetSwarmsByCreator, useGetGraphData } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2 } from 'lucide-react';
import SwarmMembershipApproval from './SwarmMembershipApproval';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import type { Swarm } from '../backend';

export default function SwarmMembershipManager() {
  const { data: createdSwarms, isLoading: isLoadingCreated } = useGetSwarmsByCreator();
  const { data: graphData, isLoading: isLoadingGraph } = useGetGraphData();
  const { identity } = useInternetIdentity();

  const isLoading = isLoadingCreated || isLoadingGraph;

  // Merge created swarms and joined swarms (where user is an approved member)
  const allSwarms: Swarm[] = (() => {
    if (!graphData || !identity) return createdSwarms || [];

    const currentUserPrincipal = identity.getPrincipal().toString();
    const createdSwarmIds = new Set((createdSwarms || []).map(s => s.id));

    // Find swarms where user is an approved member (but not creator)
    const joinedSwarms = graphData.swarms.filter(swarm => {
      // Skip if user is the creator (already in createdSwarms)
      if (swarm.creator.toString() === currentUserPrincipal) return false;
      if (createdSwarmIds.has(swarm.id)) return false;

      // Check if user is an approved member
      // Note: We'll need to check membership status from the backend
      // For now, we'll include all swarms and let the backend filter access
      return true;
    });

    return [...(createdSwarms || []), ...joinedSwarms];
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!allSwarms || allSwarms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Swarms
          </CardTitle>
          <CardDescription>
            Co‑govern your research community.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">
            You haven't joined or created any swarms yet. Join or create one to start collaborating.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Your Swarms
        </CardTitle>
        <CardDescription>
          Co‑govern your research community.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-20rem)]">
          <Accordion type="single" collapsible className="w-full">
            {allSwarms.map((swarm) => (
              <AccordionItem key={swarm.id} value={swarm.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-chart-2/20 text-chart-2 border-chart-2/50">
                      Swarm
                    </Badge>
                    <span className="font-medium">{swarm.name}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-3">Contributors</h4>
                    <SwarmMembershipApproval swarmId={swarm.id} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
