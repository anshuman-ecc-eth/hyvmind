import JSZip from "jszip";
import type { Edge, SourceGraph, SourceNode } from "../types/sourceGraph";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Extract the first [[wikilink]] target from a string */
function extractWikilink(text: string): string | undefined {
  const m = text.match(/\[\[([^\]]+)\]\]/);
  return m ? m[1].trim() : undefined;
}

/** Extract all [[wikilink]] targets from text */
function extractWikilinks(text: string): string[] {
  return [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1].trim());
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

/**
 * Reserved frontmatter keys — excluded from node.attributes.
 * Everything else is treated as a custom attribute.
 */
const RESERVED_KEYS = new Set([
  "type",
  "id",
  "name",
  "title",
  "from",
  "to",
  "label",
  "jurisdiction",
  "tags",
  "source",
  "content",
  "tokenLabel",
]);

/** Extract non-reserved frontmatter keys as custom attributes */
function extractCustomAttributes(
  fm: Record<string, string>,
): Record<string, string> | undefined {
  const attrs: Record<string, string> = {};
  for (const [k, v] of Object.entries(fm)) {
    if (!RESERVED_KEYS.has(k)) attrs[k] = v;
  }
  return Object.keys(attrs).length > 0 ? attrs : undefined;
}

// ---------------------------------------------------------------------------
// Pending relation descriptor (lr / ir files deferred to second pass)
// ---------------------------------------------------------------------------

interface PendingRelation {
  type: "lr" | "ir";
  fromRaw: string | undefined; // raw wikilink text or undefined
  toRaw: string | undefined;
  label: string | undefined;
  body: string; // markdown body (fallback wikilink source)
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export async function parseSourceGraphZip(file: File): Promise<SourceGraph> {
  const zip = await JSZip.loadAsync(file);

  const nodes: SourceNode[] = [];
  // Relations are collected here only after all nodes exist (two-pass)
  const pendingRelations: PendingRelation[] = [];

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
      name: swarmName,
      nodeType: "swarm",
      tags,
      parentName: curationFolderName,
    };
    nodes.push(swarmNode);

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
        name: locationName,
        nodeType: "location",
        source: locationAttrs.source,
        parentName: swarmName,
      };
      nodes.push(locationNode);

      // Find markdown files inside the location folder
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

        if (tokenType === "le") {
          // Law Entity → becomes a node; filename is the identifier
          const leNode: SourceNode = {
            name: filename,
            nodeType: "lawEntity",
            content: body || undefined,
            parentName: locationName,
            attributes: extractCustomAttributes(fm),
          };
          nodes.push(leNode);
        } else if (tokenType === "ie") {
          // Interpretation Entity → becomes a node; filename is the identifier
          const ieNode: SourceNode = {
            name: filename,
            nodeType: "interpEntity",
            content: body || undefined,
            parentName: locationName,
            attributes: extractCustomAttributes(fm),
          };
          nodes.push(ieNode);
        } else if (tokenType === "lr" || tokenType === "ir") {
          // Relation types → defer edge creation until all nodes are collected
          pendingRelations.push({
            type: tokenType,
            fromRaw: fm.from,
            toRaw: fm.to,
            label: fm.label || undefined,
            body,
          });
        }
        // Any other type is silently skipped
      }
    }
  }

  // ---------------------------------------------------------------------------
  // PASS 2: Build hierarchy edges + resolve lr/ir relation edges
  // ---------------------------------------------------------------------------

  // Hierarchy edges derived from parentName (filename-based)
  const edges: Edge[] = [];
  for (const node of nodes) {
    if (node.parentName) {
      edges.push({ source: node.parentName, target: node.name });
    }
  }

  // Resolve pending lr/ir relations using filenames directly
  for (const rel of pendingRelations) {
    // Resolve "from" — prefer frontmatter, fall back to first wikilink in body
    const fromName =
      rel.fromRaw !== undefined
        ? extractWikilink(rel.fromRaw)
        : extractWikilinks(rel.body)[0];

    // Resolve "to" — prefer frontmatter, fall back to second wikilink in body
    const toName =
      rel.toRaw !== undefined
        ? extractWikilink(rel.toRaw)
        : extractWikilinks(rel.body)[1];

    if (!fromName || !toName) continue; // skip: cannot determine endpoints

    // Use filenames directly — no node.id lookup needed
    edges.push({
      source: fromName,
      target: toName,
      label: rel.label,
    });
  }

  return {
    id: crypto.randomUUID(),
    name: curationFolderName,
    nodes,
    edges,
    createdAt: Date.now(),
  };
}
