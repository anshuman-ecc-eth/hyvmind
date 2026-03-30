import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, GitFork, MapPin, Minus, Plus, Scale } from "lucide-react";
import { useState } from "react";
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // All QoL swarms (both originals and forks)
  const allQolSwarms = (graphData?.swarms ?? []).filter((s) =>
    s.tags.includes(QUESTION_OF_LAW_TAG),
  );

  // Root swarms: forkSource is [] (Opt None in Candid)
  const rootQolSwarms = allQolSwarms.filter(
    (s) => !Array.isArray(s.forkSource) || s.forkSource.length === 0,
  );

  // Get direct forks of a given swarm ID
  const getForks = (parentId: string) =>
    allQolSwarms.filter(
      (s) => Array.isArray(s.forkSource) && s.forkSource[0] === parentId,
    );

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground font-mono">
            Swarms
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            Questions of Law
          </p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border border-dashed border-border">
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

  if (rootQolSwarms.length === 0) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground font-mono">
            Swarms
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            Questions of Law
          </p>
        </div>
        <div
          className="flex flex-col items-center justify-center py-20 text-center"
          data-ocid="swarms.empty_state"
        >
          <Scale className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
          <p className="text-muted-foreground text-sm font-mono">
            No questions of law yet.
          </p>
          <p className="text-muted-foreground text-xs mt-1 font-mono">
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
        <h1 className="text-2xl font-semibold text-foreground font-mono">
          Swarms
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">
          Questions of Law
        </p>
      </div>

      <div className="space-y-3">
        {rootQolSwarms.map((swarm, idx) => {
          const parentCuration = graphData?.curations.find(
            (c) => c.id === swarm.parentCurationId,
          );
          const forks = getForks(swarm.id);
          const isExpanded = expandedIds.has(swarm.id);

          return (
            <div key={swarm.id} data-ocid={`swarms.item.${idx + 1}`}>
              {/* Parent swarm card */}
              <Card
                className="border border-dashed border-border hover:border-foreground/40 cursor-pointer transition-colors group"
                onClick={() => onSelectSwarm(swarm.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-foreground group-hover:text-foreground/80 transition-colors font-mono">
                    {swarm.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    {parentCuration && (
                      <>
                        <span className="flex items-center gap-1 font-mono">
                          <Scale className="h-3 w-3" />
                          {parentCuration.name}
                        </span>
                        {parentCuration.jurisdiction && (
                          <span className="flex items-center gap-1 font-mono">
                            <MapPin className="h-3 w-3" />
                            {parentCuration.jurisdiction}
                          </span>
                        )}
                      </>
                    )}
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="h-3 w-3" />
                      {formatDate(swarm.timestamps.createdAt)}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs px-1.5 py-0 font-mono border-dashed"
                    >
                      {QUESTION_OF_LAW_TAG}
                    </Badge>

                    {/* Fork toggle */}
                    {forks.length > 0 && (
                      <button
                        type="button"
                        className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground border border-dashed border-border px-1.5 py-0.5 ml-auto transition-colors"
                        onClick={(e) => toggleExpand(swarm.id, e)}
                        data-ocid={`swarms.item.${idx + 1}.toggle`}
                      >
                        {isExpanded ? (
                          <Minus className="h-3 w-3" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                        {forks.length} fork{forks.length !== 1 ? "s" : ""}
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Forks (indented, shown when expanded) */}
              {isExpanded && forks.length > 0 && (
                <div className="ml-6 mt-2 space-y-2 border-l border-dashed border-border pl-4">
                  {forks.map((fork, forkIdx) => {
                    const forkCuration = graphData?.curations.find(
                      (c) => c.id === fork.parentCurationId,
                    );
                    return (
                      <Card
                        key={fork.id}
                        className="border border-dashed border-border/60 hover:border-foreground/30 cursor-pointer transition-colors group"
                        onClick={() => onSelectSwarm(fork.id)}
                        data-ocid={`swarms.item.${idx + 1}.row.${forkIdx + 1}`}
                      >
                        <CardHeader className="pb-1 pt-3">
                          <CardTitle className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors font-mono flex items-center gap-2">
                            <GitFork className="h-3 w-3 text-muted-foreground shrink-0" />
                            {fork.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-3">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="font-mono">
                              fork of:{" "}
                              <span className="text-foreground">
                                {swarm.name}
                              </span>
                            </span>
                            {forkCuration && (
                              <span className="flex items-center gap-1 font-mono">
                                <Scale className="h-3 w-3" />
                                {forkCuration.name}
                              </span>
                            )}
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar className="h-3 w-3" />
                              {formatDate(fork.timestamps.createdAt)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
