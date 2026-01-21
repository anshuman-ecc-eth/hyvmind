import { useGetSwarmsByCreator } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2 } from 'lucide-react';
import SwarmMembershipApproval from './SwarmMembershipApproval';

export default function SwarmMembershipManager() {
  const { data: mySwarms, isLoading } = useGetSwarmsByCreator();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!mySwarms || mySwarms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Swarms
          </CardTitle>
          <CardDescription>
            Manage membership requests for your swarms
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">
            You haven't created any swarms yet. Create a swarm to manage membership requests.
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
          Swarms - Membership Management
        </CardTitle>
        <CardDescription>
          Review and approve membership requests for your swarms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-20rem)]">
          <Accordion type="single" collapsible className="w-full">
            {mySwarms.map((swarm) => (
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
                  <SwarmMembershipApproval swarmId={swarm.id} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
