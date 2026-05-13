import type { SourceGraph } from "../types/sourceGraph";
import { CORE_ONTOLOGY_PREFIXES } from "./coreOntology";
import { sanitizeToLocalName } from "./ontologySanitize";

function escapeTurtleLiteral(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

export function generateFullSourceGraphTurtle(graph: SourceGraph): string {
  const lines: string[] = [];

  lines.push(CORE_ONTOLOGY_PREFIXES);
  lines.push("");
  lines.push(`# Full ontology for graph: ${graph.name}`);
  lines.push(`# Nodes: ${graph.nodes.length}`);
  lines.push("");

  for (const node of graph.nodes) {
    const localName = sanitizeToLocalName(node.name);
    const nodeType =
      node.nodeType === "lawEntity"
        ? "LawToken"
        : node.nodeType === "interpEntity"
          ? "InterpretationToken"
          : node.nodeType.charAt(0).toUpperCase() + node.nodeType.slice(1);

    lines.push(`# ${nodeType}: ${node.name}`);
    lines.push("");

    const props: string[] = [];
    props.push(`hm:label "${escapeTurtleLiteral(node.name)}"`);
    if (node.id) {
      props.push(`hm:hasNodeId "${escapeTurtleLiteral(node.id)}"`);
    }
    if (node.content) {
      props.push(`hm:hasContent "${escapeTurtleLiteral(node.content)}"`);
    }
    if (node.attributes) {
      for (const [key, value] of Object.entries(node.attributes)) {
        const valStr =
          typeof value === "string" ? value : JSON.stringify(value);
        if (valStr) {
          props.push(
            `hm:hasCustomAttribute "${escapeTurtleLiteral(key)}:${escapeTurtleLiteral(valStr)}"`,
          );
        }
      }
    }

    lines.push(`hm:${localName}`);
    for (let i = 0; i < props.length; i++) {
      lines.push(`    ${props[i]}${i < props.length - 1 ? " ;" : " ."}`);
    }
    if (props.length === 0) {
      lines.push(`    rdf:type hm:${nodeType} .`);
    }
    lines.push("");

    if (props.length > 0) {
      lines.push(`hm:${localName} rdf:type hm:${nodeType} .`);
      lines.push("");
    }

    if (node.parentName) {
      const parentLocalName = sanitizeToLocalName(node.parentName);
      lines.push(`hm:${localName} hm:hasParent hm:${parentLocalName} .`);
      lines.push("");
    }
  }

  for (const node of graph.nodes) {
    if (node.parentName) {
      const localName = sanitizeToLocalName(node.name);
      const parentLocalName = sanitizeToLocalName(node.parentName);
      lines.push(`hm:${parentLocalName} hm:hasChild hm:${localName} .`);
    }
  }
  if (graph.nodes.some((n) => n.parentName)) {
    lines.push("");
  }

  return lines.join("\n");
}
