import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { useMemo, useState } from "react";
import type { Swarm } from "../backend";
import { useGetOwnedData } from "../hooks/useQueries";
import { CORE_ONTOLOGY_PREFIXES } from "../utils/coreOntology";

// Core Ontology in Turtle syntax
const CORE_ONTOLOGY = `${CORE_ONTOLOGY_PREFIXES}
@prefix swrl: <http://www.w3.org/2003/11/swrl#> .
@prefix swrlb: <http://www.w3.org/2003/11/swrlb#> .

# Ontology Declaration
hm:HyvmindOntology rdf:type owl:Ontology ;
    rdfs:label "Hyvmind Core Ontology" ;
    rdfs:comment "Formal ontology for hierarchical knowledge graph structure" .

# Classes
hm:Node rdf:type owl:Class ;
    rdfs:label "Node" ;
    rdfs:comment "Abstract base class for all node types" .

hm:Curation rdf:type owl:Class ;
    rdfs:subClassOf hm:Node ;
    rdfs:label "Curation" ;
    rdfs:comment "Top-level area of law (e.g., Indian Arbitration Law)" .

hm:Swarm rdf:type owl:Class ;
    rdfs:subClassOf hm:Node ;
    rdfs:label "Swarm" ;
    rdfs:comment "Research topic and collaborative space" .

hm:Location rdf:type owl:Class ;
    rdfs:subClassOf hm:Node ;
    rdfs:label "Location" ;
    rdfs:comment "Specific chunk of positive law" .

hm:LawToken rdf:type owl:Class ;
    rdfs:subClassOf hm:Node ;
    rdfs:label "Law Token" ;
    rdfs:comment "Extracted token from location content" .

hm:InterpretationToken rdf:type owl:Class ;
    rdfs:subClassOf hm:Node ;
    rdfs:label "Interpretation Token" ;
    rdfs:comment "Interpretation linking law tokens to other nodes" .

# Object Properties
hm:belongsTo rdf:type owl:ObjectProperty ;
    rdfs:label "belongs to" ;
    rdfs:comment "Hierarchical parent-child relationship" ;
    rdfs:domain hm:Node ;
    rdfs:range hm:Node .

hm:createsRelation rdf:type owl:ObjectProperty ;
    rdfs:label "creates relation" ;
    rdfs:comment "Relationship from interpretation token to law token" ;
    rdfs:domain hm:InterpretationToken ;
    rdfs:range hm:LawToken .

hm:connectsTo rdf:type owl:ObjectProperty ;
    rdfs:label "connects to" ;
    rdfs:comment "Relationship from interpretation token to target node" ;
    rdfs:domain hm:InterpretationToken ;
    rdfs:range hm:Node .

# Data Properties
hm:hasNodeId rdf:type owl:DatatypeProperty ;
    rdfs:label "has node ID" ;
    rdfs:comment "Internal node identifier" ;
    rdfs:domain hm:Node ;
    rdfs:range xsd:string .

hm:hasCustomAttribute rdf:type owl:DatatypeProperty ;
    rdfs:label "has custom attribute" ;
    rdfs:comment "Custom key-value attribute" ;
    rdfs:domain hm:Node ;
    rdfs:range rdfs:Literal .

hm:hasTag rdf:type owl:DatatypeProperty ;
    rdfs:label "has tag" ;
    rdfs:comment "Tag for discovery" ;
    rdfs:domain hm:Swarm ;
    rdfs:range rdfs:Literal .

hm:hasJurisdiction rdf:type owl:DatatypeProperty ;
    rdfs:label "has jurisdiction" ;
    rdfs:comment "ISO 3166-1 alpha-2 country code" ;
    rdfs:domain hm:Curation ;
    rdfs:range rdfs:Literal .

hm:hasContext rdf:type owl:DatatypeProperty ;
    rdfs:label "has context" ;
    rdfs:comment "Contextual information" ;
    rdfs:domain hm:InterpretationToken ;
    rdfs:range rdfs:Literal .

hm:hasRelationshipType rdf:type owl:DatatypeProperty ;
    rdfs:label "has relationship type" ;
    rdfs:comment "Type of relationship" ;
    rdfs:domain hm:InterpretationToken ;
    rdfs:range rdfs:Literal .`;

export default function OntologiesView() {
  const { data: graphData, isLoading } = useGetOwnedData();
  const [coreOntologyOpen, setCoreOntologyOpen] = useState(true);
  const [swarmOntologiesOpen, setSwarmOntologiesOpen] = useState<
    Record<string, boolean>
  >({});

  const swarmOntologies = useMemo(() => {
    if (!graphData) return [];

    return graphData.swarms.map((swarm) => {
      const parentCuration = graphData.curations.find(
        (c) => c.id === swarm.parentCurationId,
      );
      const ontology = generateSwarmOntology(swarm, parentCuration?.name);
      return { swarm, ontology };
    });
  }, [graphData]);

  const downloadOntology = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/turtle" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading ontologies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 overflow-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Ontologies</h1>
        <p className="text-muted-foreground">
          Formal ontology definitions for the knowledge graph structure
        </p>
      </div>

      {/* Core Ontology */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Collapsible
              open={coreOntologyOpen}
              onOpenChange={setCoreOntologyOpen}
              className="flex-1"
            >
              <CollapsibleTrigger className="flex items-center gap-2 hover:text-accent-foreground transition-colors">
                {coreOntologyOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
                <CardTitle>Core Ontology</CardTitle>
              </CollapsibleTrigger>
            </Collapsible>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                downloadOntology(CORE_ONTOLOGY, "hyvmind-core-ontology.ttl")
              }
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <Collapsible open={coreOntologyOpen}>
          <CollapsibleContent>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono">
                {CORE_ONTOLOGY}
              </pre>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Swarm-Specific Extended Ontologies */}
      {swarmOntologies.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">
            Swarm-Specific Extended Ontologies
          </h2>
          {swarmOntologies.map(({ swarm, ontology }) => (
            <Card key={swarm.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Collapsible
                    open={swarmOntologiesOpen[swarm.id] || false}
                    onOpenChange={(open) =>
                      setSwarmOntologiesOpen((prev) => ({
                        ...prev,
                        [swarm.id]: open,
                      }))
                    }
                    className="flex-1"
                  >
                    <CollapsibleTrigger className="flex items-center gap-2 hover:text-accent-foreground transition-colors">
                      {swarmOntologiesOpen[swarm.id] ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      <CardTitle>{swarm.name}</CardTitle>
                    </CollapsibleTrigger>
                  </Collapsible>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      downloadOntology(
                        ontology,
                        `hyvmind-swarm-${swarm.name.toLowerCase().replace(/\s+/g, "-")}.ttl`,
                      )
                    }
                    className="hover:bg-accent hover:text-accent-foreground"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                {swarm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {swarm.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <Collapsible open={swarmOntologiesOpen[swarm.id] || false}>
                <CollapsibleContent>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono">
                      {ontology}
                    </pre>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function generateSwarmOntology(swarm: Swarm, curationName?: string): string {
  const swarmLocalName = swarm.name.replace(/[^a-zA-Z0-9_-]/g, "_");

  return `${CORE_ONTOLOGY_PREFIXES}

# Swarm-Specific Ontology Extension
hm:${swarmLocalName} rdf:type owl:Ontology ;
    rdfs:label "Extended Ontology for ${swarm.name}" ;
    rdfs:comment "Swarm-specific ontology extension" ;
    owl:imports hm:HyvmindOntology .

# Swarm Instance
hm:${swarmLocalName}_instance rdf:type hm:Swarm ;
    rdfs:label "${swarm.name}" ;
    hm:hasNodeId "${swarm.id}" ${curationName ? `;\n    hm:belongsTo hm:${curationName.replace(/[^a-zA-Z0-9_-]/g, "_")}` : ""} ${swarm.tags.length > 0 ? `;\n    ${swarm.tags.map((tag) => `hm:hasTag "${tag}"`).join(" ;\n    ")}` : ""} .`;
}
