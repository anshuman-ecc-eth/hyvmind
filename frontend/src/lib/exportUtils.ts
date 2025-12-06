import type { Swarm, Annotation } from '../backend';
import type { GraphData } from '../hooks/useQueries';

export type ExportFormat = 'json' | 'jsonld' | 'csv';

/**
 * Convert GraphData to JSON format
 */
export function convertToJSON(data: GraphData): string {
  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      format: 'hyvmind-graph-json',
      version: '1.0',
    },
    swarms: data.swarms.map(swarm => ({
      id: swarm.id.toString(),
      title: swarm.title,
      description: swarm.description,
      jurisdiction: swarm.jurisdiction,
      isPublic: swarm.isPublic,
      tags: swarm.tags,
      treasuryCredits: swarm.treasuryCredits,
      createdAt: swarm.createdAt.toString(),
    })),
    annotations: data.annotations.map(annotation => ({
      id: annotation.id.toString(),
      content: annotation.content,
      annotationType: annotation.annotationType,
      swarmId: annotation.swarmId.toString(),
      approvalScore: annotation.approvalScore.toString(),
      isPublic: annotation.isPublic,
      createdAt: annotation.createdAt.toString(),
      properties: Object.fromEntries(annotation.properties),
      extractedTokens: annotation.extractedTokens,
    })),
    nodes: data.nodes.map(node => ({
      id: node.id.toString(),
      label: node.nodeLabel,
      type: node.type_,
      swarmId: node.swarmId.toString(),
      approvalScore: node.approvalScore.toString(),
      properties: Object.fromEntries(node.properties),
    })),
    edges: data.edges.map(edge => ({
      id: edge.id.toString(),
      source: edge.source.toString(),
      target: edge.target.toString(),
      label: edge.edgeLabel,
      type: edge.type_,
      approvalScore: edge.approvalScore.toString(),
      properties: Object.fromEntries(edge.properties),
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Convert GraphData to JSON-LD format with semantic web context
 */
export function convertToJSONLD(data: GraphData): string {
  const context = {
    '@vocab': 'http://schema.org/',
    hyvmind: 'https://hyvmind.io/ontology/',
    swarm: 'hyvmind:Swarm',
    annotation: 'hyvmind:Annotation',
    token: 'hyvmind:Token',
    approvalScore: 'hyvmind:approvalScore',
    jurisdiction: 'hyvmind:jurisdiction',
    treasuryCredits: 'hyvmind:treasuryCredits',
    properties: 'hyvmind:properties',
  };

  const graph = [
    ...data.swarms.map(swarm => ({
      '@type': 'swarm',
      '@id': `hyvmind:swarm/${swarm.id.toString()}`,
      'name': swarm.title,
      'description': swarm.description,
      'jurisdiction': swarm.jurisdiction,
      'isPublic': swarm.isPublic,
      'tags': swarm.tags,
      'treasuryCredits': swarm.treasuryCredits,
      'dateCreated': new Date(Number(swarm.createdAt) / 1000000).toISOString(),
    })),
    ...data.annotations.map(annotation => ({
      '@type': 'annotation',
      '@id': `hyvmind:annotation/${annotation.id.toString()}`,
      'content': annotation.content,
      'annotationType': annotation.annotationType,
      'extractedTokens': annotation.extractedTokens,
      'isPartOf': {
        '@id': `hyvmind:swarm/${annotation.swarmId.toString()}`,
      },
      'approvalScore': Number(annotation.approvalScore),
      'isPublic': annotation.isPublic,
      'dateCreated': new Date(Number(annotation.createdAt) / 1000000).toISOString(),
      'properties': Object.fromEntries(annotation.properties),
    })),
  ];

  const jsonld = {
    '@context': context,
    '@graph': graph,
    'metadata': {
      'exportDate': new Date().toISOString(),
      'format': 'hyvmind-graph-jsonld',
      'version': '1.0',
    },
  };

  return JSON.stringify(jsonld, null, 2);
}

/**
 * Convert GraphData to CSV format with flattened rows
 */
export function convertToCSV(data: GraphData): string {
  const headers = ['content', 'annotationType', 'swarm', 'swarmTitle', 'jurisdiction', 'approvalScore', 'propertyKey', 'propertyValue'];
  const rows: string[][] = [headers];

  const swarmMap = new Map<string, Swarm>();
  data.swarms.forEach(swarm => {
    swarmMap.set(swarm.id.toString(), swarm);
  });

  data.annotations.forEach(annotation => {
    const swarm = swarmMap.get(annotation.swarmId.toString());
    const swarmTitle = swarm?.title || '';
    const jurisdiction = swarm?.jurisdiction || '';

    if (annotation.properties.length === 0) {
      rows.push([
        escapeCsvValue(annotation.content),
        annotation.annotationType,
        annotation.swarmId.toString(),
        escapeCsvValue(swarmTitle),
        escapeCsvValue(jurisdiction),
        annotation.approvalScore.toString(),
        '',
        '',
      ]);
    } else {
      annotation.properties.forEach(([key, value]) => {
        rows.push([
          escapeCsvValue(annotation.content),
          annotation.annotationType,
          annotation.swarmId.toString(),
          escapeCsvValue(swarmTitle),
          escapeCsvValue(jurisdiction),
          annotation.approvalScore.toString(),
          escapeCsvValue(key),
          escapeCsvValue(value),
        ]);
      });
    }
  });

  return rows.map(row => row.join(',')).join('\n');
}

/**
 * Escape CSV values that contain commas, quotes, or newlines
 */
function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download data as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename based on scope and format
 */
export function generateFilename(scope: 'full' | 'current', format: ExportFormat): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const scopeLabel = scope === 'full' ? 'full' : 'filtered';
  const extension = format === 'jsonld' ? 'jsonld' : format;
  return `hyvmind-graph-${scopeLabel}-${timestamp}.${extension}`;
}

/**
 * Get MIME type for export format
 */
export function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'json':
      return 'application/json';
    case 'jsonld':
      return 'application/ld+json';
    case 'csv':
      return 'text/csv';
    default:
      return 'application/octet-stream';
  }
}
