import { useState, useMemo } from 'react';
import { useGetGraphData } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import type { Swarm } from '../backend';

// Core Ontology in Turtle syntax
const CORE_ONTOLOGY = `@prefix : <http://hyvmind.org/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix swrl: <http://www.w3.org/2003/11/swrl#> .
@prefix swrlb: <http://www.w3.org/2003/11/swrlb#> .

# Ontology Declaration
:HyvmindOntology rdf:type owl:Ontology ;
    rdfs:label "Hyvmind Core Ontology" ;
    rdfs:comment "Formal ontology for hierarchical knowledge graph structure" .

# Classes
:Node rdf:type owl:Class ;
    rdfs:label "Node" ;
    rdfs:comment "Abstract base class for all node types" .

:Curation rdf:type owl:Class ;
    rdfs:subClassOf :Node ;
    rdfs:label "Curation" ;
    rdfs:comment "Top-level area of law (e.g., Indian Arbitration Law)" .

:Swarm rdf:type owl:Class ;
    rdfs:subClassOf :Node ;
    rdfs:label "Swarm" ;
    rdfs:comment "Research topic and collaborative space" .

:Location rdf:type owl:Class ;
    rdfs:subClassOf :Node ;
    rdfs:label "Location" ;
    rdfs:comment "Specific chunk of positive law" .

:LawToken rdf:type owl:Class ;
    rdfs:subClassOf :Node ;
    rdfs:label "Law Token" ;
    rdfs:comment "Extracted token from location content" .

:InterpretationToken rdf:type owl:Class ;
    rdfs:subClassOf :Node ;
    rdfs:label "Interpretation Token" ;
    rdfs:comment "Interpretation linking law tokens to other nodes" .

# Object Properties
:belongsTo rdf:type owl:ObjectProperty ;
    rdfs:label "belongs to" ;
    rdfs:comment "Hierarchical parent-child relationship" ;
    rdfs:domain :Node ;
    rdfs:range :Node .

:createsRelation rdf:type owl:ObjectProperty ;
    rdfs:label "creates relation" ;
    rdfs:comment "Relationship from interpretation token to law token" ;
    rdfs:domain :InterpretationToken ;
    rdfs:range :LawToken .

:connectsTo rdf:type owl:ObjectProperty ;
    rdfs:label "connects to" ;
    rdfs:comment "Relationship from interpretation token to target node" ;
    rdfs:domain :InterpretationToken ;
    rdfs:range :Node .

# Data Properties
:hasCustomAttribute rdf:type owl:DatatypeProperty ;
    rdfs:label "has custom attribute" ;
    rdfs:comment "Custom key-value attribute" ;
    rdfs:domain :Node ;
    rdfs:range rdfs:Literal .

:hasTag rdf:type owl:DatatypeProperty ;
    rdfs:label "has tag" ;
    rdfs:comment "Tag for discovery" ;
    rdfs:domain :Swarm ;
    rdfs:range rdfs:Literal .

:hasJurisdiction rdf:type owl:DatatypeProperty ;
    rdfs:label "has jurisdiction" ;
    rdfs:comment "ISO 3166-1 alpha-3 country code" ;
    rdfs:domain :Curation ;
    rdfs:range rdfs:Literal .

# SWRL Rules
# Custom Attribute Inheritance Rule
:AttributeInheritanceRule rdf:type swrl:Imp ;
    rdfs:label "Custom Attribute Inheritance Rule" ;
    rdfs:comment "Child nodes inherit custom attributes from parent nodes" ;
    swrl:body [
        rdf:type swrl:AtomList ;
        rdf:first [
            rdf:type swrl:ClassAtom ;
            swrl:classPredicate :Node ;
            swrl:argument1 ?child
        ] ;
        rdf:rest [
            rdf:type swrl:AtomList ;
            rdf:first [
                rdf:type swrl:IndividualPropertyAtom ;
                swrl:propertyPredicate :belongsTo ;
                swrl:argument1 ?child ;
                swrl:argument2 ?parent
            ] ;
            rdf:rest [
                rdf:type swrl:AtomList ;
                rdf:first [
                    rdf:type swrl:DatavaluedPropertyAtom ;
                    swrl:propertyPredicate :hasCustomAttribute ;
                    swrl:argument1 ?parent ;
                    swrl:argument2 ?attr
                ] ;
                rdf:rest rdf:nil
            ]
        ]
    ] ;
    swrl:head [
        rdf:type swrl:AtomList ;
        rdf:first [
            rdf:type swrl:DatavaluedPropertyAtom ;
            swrl:propertyPredicate :hasCustomAttribute ;
            swrl:argument1 ?child ;
            swrl:argument2 ?attr
        ] ;
        rdf:rest rdf:nil
    ] .`;

export default function OntologiesView() {
  const { data: graphData, isLoading, error } = useGetGraphData();
  const [openSwarms, setOpenSwarms] = useState<Set<string>>(new Set());
  const [coreOntologyOpen, setCoreOntologyOpen] = useState(true);

  // Build curation name map
  const curationNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (graphData?.curations) {
      graphData.curations.forEach(curation => {
        map.set(curation.id, curation.name);
      });
    }
    return map;
  }, [graphData]);

  const toggleSwarm = (swarmId: string) => {
    setOpenSwarms((prev) => {
      const next = new Set(prev);
      if (next.has(swarmId)) {
        next.delete(swarmId);
      } else {
        next.add(swarmId);
      }
      return next;
    });
  };

  const generateSwarmOntology = (swarm: Swarm): string => {
    if (!graphData) return '';

    const swarmLocations = graphData.locations.filter(
      (loc) => loc.parentSwarmId === swarm.id
    );
    const swarmLawTokens = graphData.lawTokens.filter((lt) =>
      swarmLocations.some((loc) => loc.id === lt.parentLocationId)
    );
    const swarmInterpretationTokens = graphData.interpretationTokens.filter((it) =>
      swarmLawTokens.some((lt) => lt.id === it.fromLawTokenId)
    );

    let ontology = CORE_ONTOLOGY + '\n\n';
    ontology += `# Extended Ontology for Swarm: ${swarm.name}\n\n`;

    // Add Swarm instance
    ontology += `# Swarm Instance\n`;
    ontology += `:${sanitizeId(swarm.id)} rdf:type :Swarm ;\n`;
    ontology += `    rdfs:label "${escapeString(swarm.name)}" ;\n`;
    if (swarm.tags && swarm.tags.length > 0) {
      swarm.tags.forEach((tag) => {
        ontology += `    :hasTag "${escapeString(tag)}" ;\n`;
      });
    }
    ontology += `    :belongsTo :${sanitizeId(swarm.parentCurationId)} .\n\n`;

    // Add Location instances
    if (swarmLocations.length > 0) {
      ontology += `# Location Instances\n`;
      swarmLocations.forEach((location) => {
        ontology += `:${sanitizeId(location.id)} rdf:type :Location ;\n`;
        ontology += `    rdfs:label "${escapeString(location.title)}" ;\n`;
        ontology += `    :belongsTo :${sanitizeId(swarm.id)} ;\n`;
        if (location.customAttributes && location.customAttributes.length > 0) {
          location.customAttributes.forEach((attr) => {
            ontology += `    :hasCustomAttribute "${escapeString(attr.key)}=${escapeString(attr.value)}" ;\n`;
          });
        }
        ontology += `    rdfs:comment "${escapeString(location.content.substring(0, 100))}..." .\n\n`;
      });
    }

    // Add LawToken instances
    if (swarmLawTokens.length > 0) {
      ontology += `# Law Token Instances\n`;
      swarmLawTokens.forEach((lawToken) => {
        ontology += `:${sanitizeId(lawToken.id)} rdf:type :LawToken ;\n`;
        ontology += `    rdfs:label "${escapeString(lawToken.tokenLabel)}" ;\n`;
        ontology += `    :belongsTo :${sanitizeId(lawToken.parentLocationId)} .\n\n`;
      });
    }

    // Add InterpretationToken instances
    if (swarmInterpretationTokens.length > 0) {
      ontology += `# Interpretation Token Instances\n`;
      swarmInterpretationTokens.forEach((interpretationToken) => {
        ontology += `:${sanitizeId(interpretationToken.id)} rdf:type :InterpretationToken ;\n`;
        ontology += `    rdfs:label "${escapeString(interpretationToken.title)}" ;\n`;
        ontology += `    :createsRelation :${sanitizeId(interpretationToken.fromLawTokenId)} ;\n`;
        ontology += `    :connectsTo :${sanitizeId(interpretationToken.toNodeId)} ;\n`;
        if (interpretationToken.customAttributes && interpretationToken.customAttributes.length > 0) {
          interpretationToken.customAttributes.forEach((attr) => {
            ontology += `    :hasCustomAttribute "${escapeString(attr.key)}=${escapeString(attr.value)}" ;\n`;
          });
        }
        ontology += `    rdfs:comment "${escapeString(interpretationToken.context.substring(0, 100))}..." .\n\n`;
      });
    }

    return ontology;
  };

  const downloadOntology = (swarm: Swarm) => {
    const ontology = generateSwarmOntology(swarm);
    const blob = new Blob([ontology], { type: 'text/turtle' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFilename(swarm.name)}_ontology.ttl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sanitizeId = (id: string): string => {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
  };

  const escapeString = (str: string): string => {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  };

  const sanitizeFilename = (name: string): string => {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_');
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-foreground">Loading ontologies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">Error loading ontologies</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] overflow-y-auto bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Core Ontology Section - Now Collapsible */}
        <Card className="border-border bg-card">
          <Collapsible open={coreOntologyOpen} onOpenChange={setCoreOntologyOpen}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex w-full items-center justify-start gap-2 p-0 hover:bg-transparent"
                >
                  {coreOntologyOpen ? (
                    <ChevronDown className="h-4 w-4 text-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-foreground" />
                  )}
                  <CardTitle className="text-foreground">Core Ontology</CardTitle>
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="rounded-md border border-border bg-muted p-4">
                  <pre className="overflow-x-auto text-xs font-mono text-foreground whitespace-pre-wrap">
                    {CORE_ONTOLOGY}
                  </pre>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Swarm-Specific Extended Ontologies */}
        {graphData?.swarms && graphData.swarms.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              Extended Ontologies by Swarm
            </h2>
            {graphData.swarms.map((swarm) => {
              const parentCurationName = curationNameMap.get(swarm.parentCurationId);
              
              return (
                <Card key={swarm.id} className="border-border bg-card">
                  <Collapsible
                    open={openSwarms.has(swarm.id)}
                    onOpenChange={() => toggleSwarm(swarm.id)}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="flex w-full items-center justify-start gap-2 p-0 hover:bg-transparent"
                        >
                          {openSwarms.has(swarm.id) ? (
                            <ChevronDown className="h-4 w-4 text-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-foreground" />
                          )}
                          <CardTitle className="text-foreground flex items-center gap-2">
                            <span>Extended Ontology — {swarm.name}</span>
                            {parentCurationName && (
                              <Badge 
                                variant="outline" 
                                className="text-xs bg-muted text-muted-foreground border-border font-normal"
                                title={`Parent Curation: ${parentCurationName}`}
                              >
                                {parentCurationName}
                              </Badge>
                            )}
                          </CardTitle>
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => downloadOntology(swarm)}
                        className="ml-4 border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                        title="Download Ontology"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="rounded-md border border-border bg-muted p-4">
                          <pre className="overflow-x-auto text-xs font-mono text-foreground whitespace-pre-wrap">
                            {generateSwarmOntology(swarm)}
                          </pre>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}

        {(!graphData?.swarms || graphData.swarms.length === 0) && (
          <Card className="border-border bg-card">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No swarms available. Create swarms to generate extended ontologies.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
