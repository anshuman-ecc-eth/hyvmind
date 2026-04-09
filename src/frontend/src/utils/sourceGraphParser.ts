import JSZip from "jszip";
import type { Edge, SourceGraph, SourceNode } from "../types/sourceGraph";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function genId(): string {
  return crypto.randomUUID();
}

/** Parse minimal YAML-ish frontmatter (key: value lines only) */
function parseFrontmatter(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return result;
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

/** Strip frontmatter block from markdown text */
function stripFrontmatter(text: string): string {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
}

/** Extract [[wikilink]] targets from text */
function extractWikilinks(text: string): string[] {
  const matches = [...text.matchAll(/\[\[([^\]]+)\]\]/g)];
  return matches.map((m) => m[1].trim());
}

/** Read a text file from the zip, returning empty string if not found */
async function readText(zip: JSZip, path: string): Promise<string> {
  const file = zip.file(path);
  if (!file) return "";
  return file.async("string");
}

/** Parse _attribute.yaml for a given folder prefix */
async function readAttributes(
  zip: JSZip,
  folderPrefix: string,
): Promise<Record<string, string>> {
  const raw = await readText(zip, `${folderPrefix}_attribute.yaml`);
  if (!raw) return {};
  const result: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export async function parseSourceGraphZip(file: File): Promise<SourceGraph> {
  const zip = await JSZip.loadAsync(file);

  const nodes: SourceNode[] = [];
  const edges: Edge[] = [];

  // Collect all paths once
  const allPaths = Object.keys(zip.files);

  // Determine the top-level folder(s) — each entry directly under the zip root
  const topLevelFolders = new Set<string>();
  for (const p of allPaths) {
    const parts = p.split("/");
    if (parts.length >= 2 && parts[0]) {
      topLevelFolders.add(parts[0]);
    }
  }

  if (topLevelFolders.size === 0) {
    throw new Error(
      "Invalid ZIP structure: no top-level folder found. Expected a folder hierarchy: curation/swarm/location/tokens.",
    );
  }

  // Use the first top-level folder as the curation name
  const curationFolderName = [...topLevelFolders][0];
  const curationPrefix = `${curationFolderName}/`;

  // ---------- Curation node ----------
  const curationAttrs = await readAttributes(zip, curationPrefix);
  const curationNode: SourceNode = {
    id: genId(),
    name: curationFolderName,
    nodeType: "curation",
    jurisdiction: curationAttrs.jurisdiction,
  };
  nodes.push(curationNode);

  // Find second-level folders (swarms)
  const swarmFolders = new Set<string>();
  for (const p of allPaths) {
    if (!p.startsWith(curationPrefix)) continue;
    const remainder = p.slice(curationPrefix.length);
    const parts = remainder.split("/");
    if (parts.length >= 2 && parts[0] && !remainder.startsWith("_")) {
      swarmFolders.add(parts[0]);
    }
  }

  for (const swarmName of swarmFolders) {
    const swarmPrefix = `${curationPrefix}${swarmName}/`;
    const swarmAttrs = await readAttributes(zip, swarmPrefix);

    const tagsRaw = swarmAttrs.tags ?? "";
    const tags = tagsRaw
      ? tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;

    const swarmNode: SourceNode = {
      id: genId(),
      name: swarmName,
      nodeType: "swarm",
      tags,
      parentId: curationNode.id,
    };
    nodes.push(swarmNode);
    edges.push({ source: curationNode.id, target: swarmNode.id });

    // Find third-level folders (locations)
    const locationFolders = new Set<string>();
    for (const p of allPaths) {
      if (!p.startsWith(swarmPrefix)) continue;
      const remainder = p.slice(swarmPrefix.length);
      const parts = remainder.split("/");
      if (parts.length >= 2 && parts[0] && !remainder.startsWith("_")) {
        locationFolders.add(parts[0]);
      }
    }

    for (const locationName of locationFolders) {
      const locationPrefix = `${swarmPrefix}${locationName}/`;
      const locationAttrs = await readAttributes(zip, locationPrefix);

      const locationNode: SourceNode = {
        id: genId(),
        name: locationName,
        nodeType: "location",
        source: locationAttrs.source,
        parentId: swarmNode.id,
      };
      nodes.push(locationNode);
      edges.push({ source: swarmNode.id, target: locationNode.id });

      // Find markdown files inside the location folder (tokens)
      const tokenFiles = allPaths.filter((p) => {
        if (!p.startsWith(locationPrefix)) return false;
        const remainder = p.slice(locationPrefix.length);
        // Only direct files (no sub-folders), must be .md
        return remainder.endsWith(".md") && !remainder.includes("/");
      });

      for (const tokenPath of tokenFiles) {
        const tokenFile = zip.file(tokenPath);
        if (!tokenFile) continue;
        const raw = await tokenFile.async("string");
        const fm = parseFrontmatter(raw);
        const body = stripFrontmatter(raw);
        const tokenType = fm.type ?? "";
        const filename = tokenPath
          .slice(locationPrefix.length)
          .replace(/\.md$/, "");

        if (tokenType === "lt") {
          // Law Token
          const ltNode: SourceNode = {
            id: genId(),
            name: fm.tokenLabel ?? filename,
            nodeType: "lawToken",
            content: body,
            parentId: locationNode.id,
          };
          nodes.push(ltNode);
          edges.push({ source: locationNode.id, target: ltNode.id });
        } else if (tokenType === "it") {
          // Interpretation Token
          const wikilinks = extractWikilinks(
            body + (fm.from ?? "") + (fm.to ?? ""),
          );
          const fromLink = fm.from
            ? extractWikilinks(fm.from)[0]
            : wikilinks[0];
          const toLink = fm.to ? extractWikilinks(fm.to)[0] : wikilinks[1];

          const itNode: SourceNode = {
            id: genId(),
            name: fm.title ?? filename,
            nodeType: "interpretationToken",
            content: body,
            from: fromLink,
            to: toLink,
            parentId: locationNode.id,
          };
          nodes.push(itNode);
          edges.push({ source: locationNode.id, target: itNode.id });

          // Add from/to edges by name resolution (best-effort)
          if (fromLink) {
            const fromNode = nodes.find(
              (n) => n.name === fromLink && n.nodeType === "lawToken",
            );
            if (fromNode) {
              edges.push({ source: itNode.id, target: fromNode.id });
            }
          }
          if (toLink) {
            const toNode = nodes.find(
              (n) => n.name === toLink && n.nodeType === "lawToken",
            );
            if (toNode) {
              edges.push({ source: itNode.id, target: toNode.id });
            }
          }
        }
      }
    }
  }

  return {
    id: genId(),
    name: curationFolderName,
    nodes,
    edges,
    createdAt: Date.now(),
  };
}
