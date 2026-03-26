import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Scale } from "lucide-react";
import { useGetAllData } from "../hooks/useQueries";

const QUESTION_OF_LAW_TAG = "question-of-law";

interface SwarmsViewProps {
  onSelectSwarm: (swarmId: string) => void;
}

function formatDate(timestamp: bigint): string {
  const ms = Number(timestamp) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function SwarmsView({ onSelectSwarm }: SwarmsViewProps) {
  const { data: graphData, isLoading } = useGetAllData();

  const questionOfLawSwarms = (graphData?.swarms ?? []).filter((swarm) =>
    swarm.tags.includes(QUESTION_OF_LAW_TAG),
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Swarms</h1>
          <p className="text-sm text-muted-foreground mt-1">Questions of Law</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border border-border">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-2/3" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (questionOfLawSwarms.length === 0) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Swarms</h1>
          <p className="text-sm text-muted-foreground mt-1">Questions of Law</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Scale className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
          <p className="text-muted-foreground text-sm">
            No questions of law yet.
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            Create a swarm with the tag{" "}
            <span className="font-mono text-foreground">question-of-law</span>{" "}
            to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl overflow-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Swarms</h1>
        <p className="text-sm text-muted-foreground mt-1">Questions of Law</p>
      </div>

      <div className="space-y-4">
        {questionOfLawSwarms.map((swarm) => {
          const parentCuration = graphData?.curations.find(
            (c) => c.id === swarm.parentCurationId,
          );

          return (
            <Card
              key={swarm.id}
              className="border border-border hover:border-foreground/30 cursor-pointer transition-colors group"
              onClick={() => onSelectSwarm(swarm.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-foreground group-hover:text-foreground/80 transition-colors">
                  {swarm.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  {parentCuration && (
                    <>
                      <span className="flex items-center gap-1">
                        <Scale className="h-3 w-3" />
                        {parentCuration.name}
                      </span>
                      {parentCuration.jurisdiction && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {parentCuration.jurisdiction}
                        </span>
                      )}
                    </>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(swarm.timestamps.createdAt)}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs px-1.5 py-0 font-mono"
                  >
                    {QUESTION_OF_LAW_TAG}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
