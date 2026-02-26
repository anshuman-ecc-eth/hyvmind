// Shared core ontology prefix declarations for Turtle output
export const CORE_ONTOLOGY_PREFIXES = `@prefix hm: <http://hyvmind.app/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .`;

export const CORE_ONTOLOGY_CLASSES = `
# Classes
hm:Node rdf:type owl:Class ;
    rdfs:label "Node" ;
    rdfs:comment "Abstract base class for all node types" .

hm:Curation rdf:type owl:Class ;
    rdfs:subClassOf hm:Node ;
    rdfs:label "Curation" ;
    rdfs:comment "Top-level area of law" .

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
    rdfs:comment "Interpretation linking law tokens to other nodes" .`;

export const CORE_ONTOLOGY_PROPERTIES = `
# Object Properties

# Relation super-property
hm:Relation rdf:type owl:ObjectProperty ;
    rdfs:label "Relation" ;
    rdfs:comment "Super-property for all relationships between nodes" ;
    rdfs:domain hm:Node ;
    rdfs:range hm:Node .

# Hierarchical relationships
hm:hasParent rdf:type owl:ObjectProperty ;
    rdfs:subPropertyOf hm:Relation ;
    rdfs:label "has parent" ;
    rdfs:comment "Hierarchical parent relationship" ;
    rdfs:domain hm:Node ;
    rdfs:range hm:Node ;
    owl:inverseOf hm:hasChild .

hm:hasChild rdf:type owl:ObjectProperty ;
    rdfs:subPropertyOf hm:Relation ;
    rdfs:label "has child" ;
    rdfs:comment "Hierarchical child relationship" ;
    rdfs:domain hm:Node ;
    rdfs:range hm:Node ;
    owl:inverseOf hm:hasParent .

# InterpretationToken-specific directional relationships
hm:FromRelation rdf:type owl:ObjectProperty ;
    rdfs:subPropertyOf hm:Relation ;
    rdfs:label "From Relation" ;
    rdfs:comment "Directional relationship from InterpretationToken to source node" ;
    rdfs:domain hm:InterpretationToken ;
    rdfs:range hm:Node .

hm:ToRelation rdf:type owl:ObjectProperty ;
    rdfs:subPropertyOf hm:Relation ;
    rdfs:label "To Relation" ;
    rdfs:comment "Directional relationship from InterpretationToken to target node" ;
    rdfs:domain hm:InterpretationToken ;
    rdfs:range hm:Node .

# Data Properties

# Node-scoped data properties
hm:label rdf:type owl:DatatypeProperty ;
    rdfs:label "label" ;
    rdfs:comment "Human-readable name or title" ;
    rdfs:domain hm:Node ;
    rdfs:range xsd:string .

hm:createdBy rdf:type owl:DatatypeProperty ;
    rdfs:label "created by" ;
    rdfs:comment "Principal ID of the creator" ;
    rdfs:domain hm:Node ;
    rdfs:range xsd:string .

hm:createdAt rdf:type owl:DatatypeProperty ;
    rdfs:label "created at" ;
    rdfs:comment "Timestamp of creation" ;
    rdfs:domain hm:Node ;
    rdfs:range xsd:dateTime .

hm:hasTag rdf:type owl:DatatypeProperty ;
    rdfs:label "has tag" ;
    rdfs:comment "Tag for discovery and categorization" ;
    rdfs:domain hm:Node ;
    rdfs:range rdfs:Literal .

# Other data properties
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

hm:hasJurisdiction rdf:type owl:DatatypeProperty ;
    rdfs:label "has jurisdiction" ;
    rdfs:comment "ISO 3166-1 alpha-3 country code" ;
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
