import JSZip from "jszip";
import type { Edge, SourceGraph, SourceNode } from "../types/sourceGraph";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse minimal YAML-ish frontmatter (key: value lines only) */
export function parseFrontmatter(text: string): Record<string, string> {
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
export function stripFrontmatter(text: string): string {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
}

/** Read a text file from the zip, returning empty string if not found */
export async function readText(zip: JSZip, path: string): Promise<string> {
  const file = zip.file(path);
  if (!file) return "";
  return file.async("string");
}

/**
 * Reserved frontmatter keys — excluded from node.attributes.
 * Everything else is treated as a custom attribute.
 */
export const RESERVED_KEYS = new Set([
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
export function extractCustomAttributes(
  fm: Record<string, string>,
): Record<string, string> | undefined {
  const attrs: Record<string, string> = {};
  for (const [k, v] of Object.entries(fm)) {
    if (!RESERVED_KEYS.has(k)) attrs[k] = v;
  }
  return Object.keys(attrs).length > 0 ? attrs : undefined;
}

/**
 * Extract sublocation prefix from a name wrapped in circular parentheses.
 * Example: "(US-Federal)ContractA" → { sublocation: "US-Federal", cleanName: "ContractA" }
 * Example: "PlainName" → { sublocation: null, cleanName: "PlainName" }
 * Edge cases:
 *   - "()" prefix: treated as no sublocation (empty group requires 1+ chars)
 *   - "(A(B))Name": not matched (regex excludes both `(` and `)` from inner group)
 */
function extractSublocation(name: string): {
  sublocation: string | null;
  cleanName: string;
} {
  const match = name.match(/^\(([^()]+)\)(.+)$/);
  if (match) {
    return { sublocation: match[1], cleanName: match[2] };
  }
  return { sublocation: null, cleanName: name };
}

/**
 * Extract all law entity references from content.
 * Finds all {EntityName} patterns in the text.
 * Example: "See {ContractA} and {ContractB}" → ["ContractA", "ContractB"]
 */
function extractLawEntityReferences(content: string): string[] {
  const matches = content.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1, -1));
}

// ---------------------------------------------------------------------------
// Cumulative attribute inheritance
// ---------------------------------------------------------------------------

/**
 * Build cumulative inherited attributes for a given folder path by reading
 * _attributes.md at every ancestor level from root down to the given path.
 * Closer ancestors override more distant ones.
 *
 * @param zip       - The loaded JSZip instance
 * @param folderPath - Path relative to zip root, e.g. "curation/swarm/location/lawToken"
 *                    (no trailing slash)
 */
async function getInheritedAttributes(
  zip: JSZip,
  folderPath: string,
): Promise<Record<string, string>> {
  const segments = folderPath.split("/").filter(Boolean);
  let merged: Record<string, string> = {};

  for (let i = 1; i <= segments.length; i++) {
    const prefix = `${segments.slice(0, i).join("/")}/`;
    const attrPath = `${prefix}_attributes.md`;
    const raw = await readText(zip, attrPath);
    if (raw) {
      const fm = parseFrontmatter(raw);
      merged = { ...merged, ...fm };
    }
  }

  return merged;
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

  // -------------------------------------------------------------------------
  // Level 1: curation folders — direct children of zip root that are folders
  // -------------------------------------------------------------------------
  const curationFolders = new Set<string>();
  for (const p of allPaths) {
    const parts = p.split("/");
    // A direct child folder has exactly 2 parts: ["folderName", ""]
    if (parts.length >= 2 && parts[0] && !parts[0].startsWith("_")) {
      curationFolders.add(parts[0]);
    }
  }

  if (curationFolders.size === 0) {
    throw new Error("Invalid ZIP structure: no top-level folders found");
  }

  // Use the name of the first curation folder as the graph name
  const graphName = [...curationFolders][0];

  for (const curationName of curationFolders) {
    const curationPath = curationName; // e.g. "myCuration"
    const curationAttrs = await getInheritedAttributes(zip, curationPath);

    const curationNode: SourceNode = {
      name: curationName,
      nodeType: "curation",
      jurisdiction: curationAttrs.jurisdiction,
      attributes: extractCustomAttributes(curationAttrs),
    };
    nodes.push(curationNode);

    // -----------------------------------------------------------------------
    // Level 2: swarm folders — direct children of each curation folder
    // -----------------------------------------------------------------------
    const curationPrefix = `${curationName}/`;
    const swarmFolders = new Set<string>();

    for (const p of allPaths) {
      if (!p.startsWith(curationPrefix)) continue;
      const remainder = p.slice(curationPrefix.length);
      const parts = remainder.split("/");
      // Direct child folder: at least 2 parts, first part not starting with _
      if (parts.length >= 2 && parts[0] && !parts[0].startsWith("_")) {
        swarmFolders.add(parts[0]);
      }
    }

    for (const swarmName of swarmFolders) {
      const swarmPath = `${curationName}/${swarmName}`;
      const swarmAttrs = await getInheritedAttributes(zip, swarmPath);

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
        parentName: curationName,
        attributes: extractCustomAttributes(swarmAttrs),
      };
      nodes.push(swarmNode);
      edges.push({ source: curationName, target: swarmName });

      // ---------------------------------------------------------------------
      // Level 3: location folders — direct children of each swarm folder
      // ---------------------------------------------------------------------
      const swarmPrefix = `${swarmPath}/`;
      const locationFolders = new Set<string>();

      for (const p of allPaths) {
        if (!p.startsWith(swarmPrefix)) continue;
        const remainder = p.slice(swarmPrefix.length);
        const parts = remainder.split("/");
        if (parts.length >= 2 && parts[0] && !parts[0].startsWith("_")) {
          locationFolders.add(parts[0]);
        }
      }

      for (const locationName of locationFolders) {
        const locationPath = `${swarmPath}/${locationName}`;
        const locationAttrs = await getInheritedAttributes(zip, locationPath);

        const locationNode: SourceNode = {
          name: locationName,
          nodeType: "location",
          source: locationAttrs.source,
          parentName: swarmName,
          attributes: extractCustomAttributes(locationAttrs),
        };
        nodes.push(locationNode);
        edges.push({ source: swarmName, target: locationName });

        // -------------------------------------------------------------------
        // Level 4: lawEntity folders — direct SUBFOLDER children of each location
        // With sublocation extraction: folders named "(prefix)Name" create a
        // shared sublocation node for each unique prefix.
        // -------------------------------------------------------------------
        const locationPrefix = `${locationPath}/`;
        const lawEntityFolders = new Set<string>();

        for (const p of allPaths) {
          if (!p.startsWith(locationPrefix)) continue;
          const remainder = p.slice(locationPrefix.length);
          const parts = remainder.split("/");
          // Only subfolders (not .md files directly at this level), not starting with _
          if (parts.length >= 2 && parts[0] && !parts[0].startsWith("_")) {
            lawEntityFolders.add(parts[0]);
          }
        }

        // Step 1: Collect and parse all lawEntity names
        const uniqueSublocations = new Set<string>();
        const lawEntityParsed: Array<{
          originalName: string;
          sublocation: string | null;
          cleanName: string;
          folderPath: string;
        }> = [];

        for (const lawEntityName of lawEntityFolders) {
          const lawEntityFolder = `${locationPrefix}${lawEntityName}/`;
          const { sublocation, cleanName } = extractSublocation(lawEntityName);
          if (sublocation) {
            uniqueSublocations.add(sublocation);
          }
          lawEntityParsed.push({
            originalName: lawEntityName,
            sublocation,
            cleanName,
            folderPath: lawEntityFolder,
          });
        }

        // Build set of all clean lawEntity names in this location (for cross-reference matching)
        const lawEntityNamesInLocation = new Set<string>(
          lawEntityParsed.map((e) => e.cleanName),
        );

        // Step 2: Create sublocation nodes (one per unique sublocation prefix)
        for (const sublocation of uniqueSublocations) {
          nodes.push({
            name: sublocation,
            nodeType: "sublocation",
            parentName: locationName,
            jurisdiction: locationAttrs.jurisdiction,
            attributes: extractCustomAttributes(locationAttrs),
          });
          edges.push({ source: locationName, target: sublocation });
        }

        // Step 3: Create lawEntity nodes with stripped names + Level 5 interpEntity
        for (const entry of lawEntityParsed) {
          const lawEntityFolder = entry.folderPath;
          const parentOfLawEntity = entry.sublocation ?? locationName;
          const lawEntityAttrs = await getInheritedAttributes(
            zip,
            lawEntityFolder,
          );

          nodes.push({
            name: entry.cleanName,
            nodeType: "lawEntity",
            parentName: parentOfLawEntity,
            jurisdiction: lawEntityAttrs.jurisdiction,
            attributes: extractCustomAttributes(lawEntityAttrs),
          });
          edges.push({ source: parentOfLawEntity, target: entry.cleanName });

          // -----------------------------------------------------------------
          // Level 5: interpEntity .md files — direct .md files inside lawEntity
          // -----------------------------------------------------------------
          const interpFiles = allPaths.filter((p) => {
            if (!p.startsWith(lawEntityFolder)) return false;
            const remainder = p.slice(lawEntityFolder.length);
            // Direct .md file only (no sub-folders), not starting with _
            return (
              remainder.endsWith(".md") &&
              !remainder.includes("/") &&
              !remainder.startsWith("_")
            );
          });

          for (const interpPath of interpFiles) {
            const interpFile = zip.file(interpPath);
            if (!interpFile) continue;

            const raw = await interpFile.async("string");
            const fm = parseFrontmatter(raw);
            const body = stripFrontmatter(raw);
            const filename = interpPath
              .slice(lawEntityFolder.length)
              .replace(/\.md$/, "");

            // Inherited attributes merged with file-level frontmatter custom attrs
            const inheritedAttrs = await getInheritedAttributes(
              zip,
              lawEntityFolder,
            );
            const fileCustomAttrs = extractCustomAttributes(fm);
            const mergedAttrs =
              fileCustomAttrs || Object.keys(inheritedAttrs).length > 0
                ? {
                    ...extractCustomAttributes(inheritedAttrs),
                    ...fileCustomAttrs,
                  }
                : undefined;

            const interpNode: SourceNode = {
              name: filename,
              nodeType: "interpEntity",
              content: body || undefined,
              parentName: entry.cleanName,
              attributes:
                mergedAttrs && Object.keys(mergedAttrs).length > 0
                  ? mergedAttrs
                  : undefined,
            };
            nodes.push(interpNode);
            edges.push({ source: entry.cleanName, target: filename });

            // Cross-reference logic: only for context.md files
            const isContextFile = filename.toLowerCase() === "context";
            const references = isContextFile
              ? extractLawEntityReferences(body)
              : [];
            const uniqueRefs = [...new Set(references)];

            for (const ref of uniqueRefs) {
              if (!lawEntityNamesInLocation.has(ref)) continue; // no match, skip

              if (ref === entry.cleanName) {
                // Self-reference: mark the existing parent edge as bidirectional
                const existingEdgeIndex = edges.findIndex(
                  (e) => e.source === entry.cleanName && e.target === filename,
                );
                if (existingEdgeIndex !== -1) {
                  edges[existingEdgeIndex].bidirectional = true;
                }
              } else {
                // Cross-reference to another lawEntity in this location
                edges.push({ source: filename, target: ref });
              }
            }
          }
        }
      }
    }
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: graphName,
    nodes,
    edges,
    createdAt: new Date(Date.now()).getTime(),
  };
}
