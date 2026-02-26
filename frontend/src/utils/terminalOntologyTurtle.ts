import type { GraphData, Curation, Swarm, Location, LawToken, InterpretationToken } from '../backend';
import { CORE_ONTOLOGY_PREFIXES } from './coreOntology';
import { sanitizeToLocalName } from './ontologySanitize';

// Escape string literals for Turtle
function escapeTurtleLiteral(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

interface NodeInfo {
  id: string;
  name: string;
  type: 'Curation' | 'Swarm' | 'Location' | 'LawToken' | 'InterpretationToken';
  data: Curation | Swarm | Location | LawToken | InterpretationToken;
}

export function generateOntologyTurtle(nodeId: string, graphData: GraphData): string {
  // Find the node
  const nodeInfo = findNode(nodeId, graphData);
  if (!nodeInfo) {
    return 'Error: Node not found';
  }

  const lines: string[] = [];
  
  // Add prefixes
  lines.push(CORE_ONTOLOGY_PREFIXES);
  lines.push('');
  
  // Generate three sections: Properties, Classes, Relations
  const localName = sanitizeToLocalName(nodeInfo.name);
  
  // Section 1: Properties (where this node is the subject)
  lines.push('# Properties');
  lines.push('');
  const outgoingTriples = generateOutgoingTriples(nodeInfo, graphData, localName);
  if (outgoingTriples.length > 0) {
    lines.push(`hm:${localName}`);
    for (let i = 0; i < outgoingTriples.length; i++) {
      const isLast = i === outgoingTriples.length - 1;
      lines.push(`    ${outgoingTriples[i]}${isLast ? ' .' : ' ;'}`);
    }
  } else {
    lines.push(`hm:${localName} .`);
  }
  lines.push('');
  
  // Section 2: Classes (rdf:type for selected node and referenced parent/child nodes)
  lines.push('# Classes');
  lines.push('');
  const classTriples = generateClassTriples(nodeInfo, graphData, localName);
  for (const triple of classTriples) {
    lines.push(triple);
  }
  lines.push('');
  
  // Section 3: Relations (where this node is the object, plus outgoing hasChild relations)
  lines.push('# Relations');
  lines.push('');
  const incomingTriples = generateIncomingTriples(nodeInfo, graphData, localName);
  const outgoingRelationTriples = generateOutgoingRelationTriples(nodeInfo, graphData, localName);
  const allRelationTriples = [...incomingTriples, ...outgoingRelationTriples];
  
  if (allRelationTriples.length > 0) {
    for (const triple of allRelationTriples) {
      lines.push(triple);
    }
  } else {
    lines.push('# No relationships');
  }
  
  return lines.join('\n');
}

function findNode(nodeId: string, graphData: GraphData): NodeInfo | null {
  // Check curations
  for (const curation of graphData.curations) {
    if (curation.id === nodeId) {
      return { id: nodeId, name: curation.name, type: 'Curation', data: curation };
    }
  }
  
  // Check swarms
  for (const swarm of graphData.swarms) {
    if (swarm.id === nodeId) {
      return { id: nodeId, name: swarm.name, type: 'Swarm', data: swarm };
    }
  }
  
  // Check locations
  for (const location of graphData.locations) {
    if (location.id === nodeId) {
      return { id: nodeId, name: location.title, type: 'Location', data: location };
    }
  }
  
  // Check law tokens
  for (const lawToken of graphData.lawTokens) {
    if (lawToken.id === nodeId) {
      return { id: nodeId, name: lawToken.tokenLabel, type: 'LawToken', data: lawToken };
    }
  }
  
  // Check interpretation tokens
  for (const interpretationToken of graphData.interpretationTokens) {
    if (interpretationToken.id === nodeId) {
      return { id: nodeId, name: interpretationToken.title, type: 'InterpretationToken', data: interpretationToken };
    }
  }
  
  return null;
}

// Parse typed tag annotation: value[type] or value (defaults to string)
function parseTagAnnotation(tag: string): { value: string; type: string } {
  const match = tag.match(/^(.+?)\[(\w+)\]$/);
  if (match) {
    return { value: match[1], type: match[2] };
  }
  return { value: tag, type: 'string' };
}

// Map tag type to XSD datatype
function getXsdDatatype(type: string): string {
  switch (type.toLowerCase()) {
    case 'string':
      return 'xsd:string';
    case 'number':
      return 'xsd:decimal';
    case 'boolean':
      return 'xsd:boolean';
    case 'date':
      return 'xsd:date';
    default:
      return 'xsd:string'; // fallback
  }
}

// Generate outgoing triples (where this node is the subject) - ONLY literal/attribute properties
function generateOutgoingTriples(nodeInfo: NodeInfo, graphData: GraphData, localName: string): string[] {
  const triples: string[] = [];
  
  // Add label (only hm:label, no rdfs:label)
  triples.push(`hm:label "${escapeTurtleLiteral(nodeInfo.name)}"`);
  
  // Add node ID
  triples.push(`hm:hasNodeId "${escapeTurtleLiteral(nodeInfo.id)}"`);
  
  // Add createdBy (creator principal)
  const creator = (nodeInfo.data as any).creator;
  if (creator) {
    triples.push(`hm:createdBy "${creator.toString()}"`);
  }
  
  // Add createdAt (timestamp)
  const timestamps = (nodeInfo.data as any).timestamps;
  if (timestamps && timestamps.createdAt) {
    const date = new Date(Number(timestamps.createdAt) / 1_000_000);
    triples.push(`hm:createdAt "${date.toISOString()}"^^xsd:dateTime`);
  }
  
  // Add type-specific outgoing properties (ONLY literals, NO node references)
  switch (nodeInfo.type) {
    case 'Curation':
      const curation = nodeInfo.data as Curation;
      triples.push(`hm:hasJurisdiction "${curation.jurisdiction}"`);
      // hasChild relationships moved to Relations section
      break;
      
    case 'Swarm':
      const swarm = nodeInfo.data as Swarm;
      
      // Add tags with typed XSD literals
      for (const tag of swarm.tags) {
        const { value, type } = parseTagAnnotation(tag);
        const xsdType = getXsdDatatype(type);
        triples.push(`hm:hasTag "${escapeTurtleLiteral(value)}"^^${xsdType}`);
      }
      // hasChild relationships moved to Relations section
      break;
      
    case 'Location':
      const location = nodeInfo.data as Location;
      
      // Add custom attributes
      for (const attr of location.customAttributes) {
        triples.push(`hm:hasCustomAttribute "${escapeTurtleLiteral(attr.key)}:${escapeTurtleLiteral(attr.value)}"`);
      }
      // hasChild relationships moved to Relations section
      break;
      
    case 'LawToken':
      const lawToken = nodeInfo.data as LawToken;
      
      // Add meaning
      triples.push(`hm:hasMeaning "${escapeTurtleLiteral(lawToken.meaning)}"`);
      break;
      
    case 'InterpretationToken':
      const interpretation = nodeInfo.data as InterpretationToken;
      
      // Add context
      if (interpretation.context) {
        triples.push(`hm:hasContext "${escapeTurtleLiteral(interpretation.context)}"`);
      }
      
      // Add FromRelation (from relationship)
      const fromNode = findNode(interpretation.fromTokenId, graphData);
      if (fromNode) {
        const fromLocalName = sanitizeToLocalName(fromNode.name);
        triples.push(`hm:FromRelation hm:${fromLocalName}`);
        triples.push(`hm:hasFromRelationshipType "${escapeTurtleLiteral(interpretation.fromRelationshipType)}"`);
        triples.push(`hm:hasFromDirectionality "${interpretation.fromDirectionality}"`);
      }
      
      // Add ToRelation (to relationship)
      const toNode = findNode(interpretation.toNodeId, graphData);
      if (toNode) {
        const toLocalName = sanitizeToLocalName(toNode.name);
        triples.push(`hm:ToRelation hm:${toLocalName}`);
        triples.push(`hm:hasToRelationshipType "${escapeTurtleLiteral(interpretation.toRelationshipType)}"`);
        triples.push(`hm:hasToDirectionality "${interpretation.toDirectionality}"`);
      }
      
      // Add custom attributes
      for (const attr of interpretation.customAttributes) {
        triples.push(`hm:hasCustomAttribute "${escapeTurtleLiteral(attr.key)}:${escapeTurtleLiteral(attr.value)}"`);
      }
      break;
  }
  
  return triples;
}

// Generate outgoing relation triples (hasChild relationships as standalone triples)
function generateOutgoingRelationTriples(nodeInfo: NodeInfo, graphData: GraphData, localName: string): string[] {
  const triples: string[] = [];
  
  switch (nodeInfo.type) {
    case 'Curation':
      // Add hasChild relationships to swarms
      const childSwarms = graphData.swarms.filter(s => s.parentCurationId === nodeInfo.id);
      for (const swarm of childSwarms) {
        const swarmLocalName = sanitizeToLocalName(swarm.name);
        triples.push(`hm:${localName} hm:hasChild hm:${swarmLocalName} .`);
      }
      break;
      
    case 'Swarm':
      // Add hasChild relationships to locations
      const childLocations = graphData.locations.filter(l => l.parentSwarmId === nodeInfo.id);
      for (const location of childLocations) {
        const locationLocalName = sanitizeToLocalName(location.title);
        triples.push(`hm:${localName} hm:hasChild hm:${locationLocalName} .`);
      }
      break;
      
    case 'Location':
      // Add hasChild relationships to law tokens
      const childLawTokens = graphData.lawTokens.filter(lt => lt.parentLocationId === nodeInfo.id);
      for (const lawToken of childLawTokens) {
        const lawTokenLocalName = sanitizeToLocalName(lawToken.tokenLabel);
        triples.push(`hm:${localName} hm:hasChild hm:${lawTokenLocalName} .`);
      }
      break;
  }
  
  return triples;
}

// Generate class relation triples (rdf:type for selected node and all referenced parent/child nodes)
function generateClassTriples(nodeInfo: NodeInfo, graphData: GraphData, localName: string): string[] {
  const triples: string[] = [];
  
  // Add rdf:type for the selected node
  triples.push(`hm:${localName} rdf:type hm:${nodeInfo.type} .`);
  
  // Collect all referenced parent and child nodes
  const referencedNodes = new Set<string>();
  
  // Add parent node if exists
  switch (nodeInfo.type) {
    case 'Swarm':
      const swarm = nodeInfo.data as Swarm;
      referencedNodes.add(swarm.parentCurationId);
      break;
      
    case 'Location':
      const location = nodeInfo.data as Location;
      referencedNodes.add(location.parentSwarmId);
      break;
      
    case 'LawToken':
      const lawToken = nodeInfo.data as LawToken;
      referencedNodes.add(lawToken.parentLocationId);
      break;
      
    case 'InterpretationToken':
      const interpretation = nodeInfo.data as InterpretationToken;
      referencedNodes.add(interpretation.fromTokenId);
      referencedNodes.add(interpretation.toNodeId);
      break;
  }
  
  // Add child nodes
  switch (nodeInfo.type) {
    case 'Curation':
      const childSwarms = graphData.swarms.filter(s => s.parentCurationId === nodeInfo.id);
      for (const swarm of childSwarms) {
        referencedNodes.add(swarm.id);
      }
      break;
      
    case 'Swarm':
      const childLocations = graphData.locations.filter(l => l.parentSwarmId === nodeInfo.id);
      for (const location of childLocations) {
        referencedNodes.add(location.id);
      }
      break;
      
    case 'Location':
      const childLawTokens = graphData.lawTokens.filter(lt => lt.parentLocationId === nodeInfo.id);
      for (const lawToken of childLawTokens) {
        referencedNodes.add(lawToken.id);
      }
      break;
  }
  
  // Generate rdf:type triples for all referenced nodes
  for (const refNodeId of referencedNodes) {
    const refNode = findNode(refNodeId, graphData);
    if (refNode) {
      const refLocalName = sanitizeToLocalName(refNode.name);
      triples.push(`hm:${refLocalName} rdf:type hm:${refNode.type} .`);
    }
  }
  
  return triples;
}

// Generate incoming relationship triples (where this node is the object)
function generateIncomingTriples(nodeInfo: NodeInfo, graphData: GraphData, localName: string): string[] {
  const triples: string[] = [];
  
  // Find all nodes that reference this node
  switch (nodeInfo.type) {
    case 'Curation':
      // No incoming relationships for Curation (it's the root)
      break;
      
    case 'Swarm':
      const swarm = nodeInfo.data as Swarm;
      
      // Find parent curation (hasParent relationship)
      const parentCuration = graphData.curations.find(c => c.id === swarm.parentCurationId);
      if (parentCuration) {
        const parentLocalName = sanitizeToLocalName(parentCuration.name);
        triples.push(`hm:${localName} hm:hasParent hm:${parentLocalName} .`);
        triples.push(`hm:${parentLocalName} hm:hasChild hm:${localName} .`);
      }
      break;
      
    case 'Location':
      const location = nodeInfo.data as Location;
      
      // Find parent swarm (hasParent relationship)
      const parentSwarm = graphData.swarms.find(s => s.id === location.parentSwarmId);
      if (parentSwarm) {
        const parentLocalName = sanitizeToLocalName(parentSwarm.name);
        triples.push(`hm:${localName} hm:hasParent hm:${parentLocalName} .`);
        triples.push(`hm:${parentLocalName} hm:hasChild hm:${localName} .`);
      }
      
      // Find interpretation tokens that target this location (ToRelation)
      const incomingInterpretations = graphData.interpretationTokens.filter(
        it => it.toNodeId === nodeInfo.id
      );
      for (const interpretation of incomingInterpretations) {
        const interpretationLocalName = sanitizeToLocalName(interpretation.title);
        triples.push(`hm:${interpretationLocalName} hm:ToRelation hm:${localName} .`);
      }
      break;
      
    case 'LawToken':
      const lawToken = nodeInfo.data as LawToken;
      
      // Find parent location (hasParent relationship)
      const parentLocation = graphData.locations.find(l => l.id === lawToken.parentLocationId);
      if (parentLocation) {
        const parentLocalName = sanitizeToLocalName(parentLocation.title);
        triples.push(`hm:${localName} hm:hasParent hm:${parentLocalName} .`);
        triples.push(`hm:${parentLocalName} hm:hasChild hm:${localName} .`);
      }
      
      // Find interpretation tokens that target this law token (ToRelation)
      const lawTokenIncomingInterpretations = graphData.interpretationTokens.filter(
        it => it.toNodeId === nodeInfo.id
      );
      for (const interpretation of lawTokenIncomingInterpretations) {
        const interpretationLocalName = sanitizeToLocalName(interpretation.title);
        triples.push(`hm:${interpretationLocalName} hm:ToRelation hm:${localName} .`);
      }
      break;
      
    case 'InterpretationToken':
      const interpretation = nodeInfo.data as InterpretationToken;
      
      // Find the "from" node that has this interpretation (FromRelation)
      const fromNode = findNode(interpretation.fromTokenId, graphData);
      if (fromNode) {
        const fromLocalName = sanitizeToLocalName(fromNode.name);
        triples.push(`hm:${localName} hm:FromRelation hm:${fromLocalName} .`);
      }
      
      // Find interpretation tokens that target this interpretation token (ToRelation)
      const interpretationIncoming = graphData.interpretationTokens.filter(
        it => it.toNodeId === nodeInfo.id
      );
      for (const incomingInterpretation of interpretationIncoming) {
        const incomingLocalName = sanitizeToLocalName(incomingInterpretation.title);
        triples.push(`hm:${incomingLocalName} hm:ToRelation hm:${localName} .`);
      }
      break;
  }
  
  return triples;
}
