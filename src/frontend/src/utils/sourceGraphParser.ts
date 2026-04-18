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
 * Extract all law entity references from content.
 * Finds all {EntityName} patterns in the text.
 * Example: "See {ContractA} and {ContractB}" → ["ContractA", "ContractB"]
 */
function extractLawEntityReferences(content: string): string[] {
  const matches = content.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1, -1).trim());
}

/**
 * Extract all interp entity references from content.
 * Finds all {{filename}} patterns (double curly brackets) in the text.
 * Example: "See {{interp1}} and {{ interp2 }}" → ["interp1", "interp2"]
 * Empty strings after trim are filtered out.
 */
function extractInterpEntityReferences(content: string): string[] {
  const matches = content.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(2, -2).trim()).filter((s) => s.length > 0);
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
      edges.push({
        source: curationName,
        target: `${curationName}@${swarmName}`,
      });

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

      // -----------------------------------------------------------------------
      // Swarm-wide pre-pass: collect all lawEntity folder names across every
      // location in this swarm so cross-references can match any lawEntity
      // regardless of which location it belongs to.
      // Also collect all interpEntity filenames (without .md extension) across
      // the entire swarm for double curly bracket {{filename}} linking.
      // -----------------------------------------------------------------------
      const swarmWideLawEntityNames = new Set<string>();
      const allInterpFilenames = new Map<string, string>(); // maps bare filename → full @-path
      for (const locName of locationFolders) {
        const locPrefix = `${swarmPath}/${locName}/`;
        for (const p of allPaths) {
          if (!p.startsWith(locPrefix)) continue;
          const remainder = p.slice(locPrefix.length);
          const parts = remainder.split("/");
          // Level 4 subfolders only (not .md files at this level)
          if (parts.length >= 2 && parts[0] && !parts[0].startsWith("_")) {
            swarmWideLawEntityNames.add(parts[0]);
            // Level 5: .md files directly inside each lawEntity folder
            if (
              parts.length === 2 &&
              parts[1].endsWith(".md") &&
              !parts[1].startsWith("_")
            ) {
              const bareName = parts[1].replace(/\.md$/, "");
              const fullPath = `${curationName}@${swarmName}@${locName}@${parts[0]}@${bareName}`;
              allInterpFilenames.set(bareName, fullPath);
            }
          }
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
        edges.push({
          source: `${curationName}@${swarmName}`,
          target: `${curationName}@${swarmName}@${locationName}`,
        });

        // -------------------------------------------------------------------
        // Level 4: lawEntity folders — direct SUBFOLDER children of each location
        // Raw folder names are used as-is (no stripping of parenthesized prefixes).
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

        // Collect lawEntity entries: name = raw folder name, folderPath for traversal
        const lawEntityList: Array<{ name: string; folderPath: string }> = [];
        for (const lawEntityName of lawEntityFolders) {
          lawEntityList.push({
            name: lawEntityName,
            folderPath: `${locationPrefix}${lawEntityName}/`,
          });
        }

        // Create lawEntity nodes + Level 5 interpEntity files
        for (const entry of lawEntityList) {
          const lawEntityFolder = entry.folderPath;
          const lawEntityAttrs = await getInheritedAttributes(
            zip,
            lawEntityFolder,
          );

          nodes.push({
            name: entry.name,
            nodeType: "lawEntity",
            parentName: locationName,
            jurisdiction: lawEntityAttrs.jurisdiction,
            attributes: extractCustomAttributes(lawEntityAttrs),
          });
          edges.push({
            source: `${curationName}@${swarmName}@${locationName}`,
            target: `${curationName}@${swarmName}@${locationName}@${entry.name}`,
          });

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
              parentName: entry.name,
              attributes:
                mergedAttrs && Object.keys(mergedAttrs).length > 0
                  ? mergedAttrs
                  : undefined,
            };
            nodes.push(interpNode);

            // -----------------------------------------------------------------
            // Cross-reference logic: applies to ALL .md files (not just context.md)
            // Matches against swarm-wide lawEntity names.
            // -----------------------------------------------------------------
            const references = extractLawEntityReferences(body);
            const uniqueRefs = [...new Set(references)];

            // Determine bidirectionality upfront before creating the edge
            const hasSelfReference = uniqueRefs.some(
              (ref) => swarmWideLawEntityNames.has(ref) && ref === entry.name,
            );
            const fullInterpPath = interpPath
              .replace(/\//g, "@")
              .replace(/\.md$/, "");
            edges.push({
              source: fullInterpPath,
              target: filename,
              bidirectional: hasSelfReference,
            });

            for (const ref of uniqueRefs) {
              if (!swarmWideLawEntityNames.has(ref)) continue;
              if (ref === entry.name) continue;
              // Cross-reference to another lawEntity — avoid duplicates
              const alreadyExists = edges.some(
                (e) => e.source === fullInterpPath && e.target === ref,
              );
              if (!alreadyExists) {
                edges.push({ source: fullInterpPath, target: ref });
              }
            }

            // -----------------------------------------------------------------
            // Double curly bracket cross-references: {{filename}} links this
            // interpEntity to other interpEntities anywhere in the swarm.
            // Self-references and invalid references are silently ignored.
            // -----------------------------------------------------------------
            const interpRefs = extractInterpEntityReferences(body);
            const uniqueInterpRefs = [...new Set(interpRefs)];

            for (const ref of uniqueInterpRefs) {
              // Skip self-references
              if (ref === filename) continue;
              // Skip references to filenames not found anywhere in the swarm
              if (!allInterpFilenames.has(ref)) continue;
              // Avoid duplicate edges
              const refFullPath = allInterpFilenames.get(ref) ?? ref;
              const alreadyExists = edges.some(
                (e) => e.source === fullInterpPath && e.target === refFullPath,
              );
              if (!alreadyExists) {
                edges.push({ source: fullInterpPath, target: refFullPath });
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
