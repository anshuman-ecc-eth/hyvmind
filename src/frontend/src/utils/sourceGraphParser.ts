import JSZip from "jszip";
import { parse as yamlParse } from "yaml";
import type { SourceRef } from "../types/sourceGraph";
import type { Edge, SourceGraph, SourceNode } from "../types/sourceGraph";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse minimal YAML-ish frontmatter (key: value lines only) */
export function parseFrontmatter(text: string): Record<string, unknown> {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  try {
    const parsed = yamlParse(match[1]);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
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

/** Extract all frontmatter keys as attributes (no reserved key filtering) */
export function extractAllAttributes(
  fm: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const attrs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fm)) {
    attrs[k] = v;
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
// Direct attribute reading (own folder only)
// ---------------------------------------------------------------------------

/**
 * Read only the direct _attributes.md for a given folder path,
 * without accumulating from ancestors.
 */
async function getDirectAttributes(
  zip: JSZip,
  folderPath: string,
): Promise<Record<string, unknown>> {
  // Normalise: strip any trailing slash before appending filename
  const base = folderPath.replace(/\/+$/, "");
  const attrPath = `${base}/_attributes.md`;
  const raw = await readText(zip, attrPath);
  return raw ? parseFrontmatter(raw) : {};
}
/**
 * Parse a _sources.md text into an array of SourceRef objects.
 * Each non-empty line is either a markdown link [name](url) or plain text.
 */
export function parseMarkdownLinks(text: string): SourceRef[] {
  const lines = text.split(/\r?\n/);
  const results: SourceRef[] = [];
  for (const raw of lines) {
    const line = raw.trim().replace(/^[-*+]\s+|\d+\.\s+/, "");
    if (!line) continue;
    const match = line.match(/^\[(.+?)\]\((.+)\)$/);
    if (match) {
      results.push({ name: match[1], url: match[2] });
    } else {
      results.push({ name: line, url: "" });
    }
  }
  return results;
}

/**
 * Read the direct _sources.md for a given folder path,
 * returning an empty array if the file is absent.
 */
async function getDirectSources(
  zip: JSZip,
  folderPath: string,
): Promise<SourceRef[]> {
  const base = folderPath.replace(/\/+$/, "");
  const srcPath = `${base}/_sources.md`;
  const raw = await readText(zip, srcPath);
  return raw ? parseMarkdownLinks(raw) : [];
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

    const curationNode: SourceNode = {
      id: curationName,
      name: curationName,
      nodeType: "curation",
      attributes: extractAllAttributes(
        await getDirectAttributes(zip, curationPath),
      ),
      sources: await getDirectSources(zip, curationPath),
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
      const swarmNode: SourceNode = {
        id: `${curationName}@${swarmName}`,
        name: swarmName,
        nodeType: "swarm",
        parentName: curationName,
        attributes: extractAllAttributes(
          await getDirectAttributes(zip, swarmPath),
        ),
        sources: await getDirectSources(zip, swarmPath),
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
      const swarmWideLawEntityNames = new Map<string, string>();
      const allInterpFilenames = new Map<string, string>(); // maps bare filename → full @-path
      for (const locName of locationFolders) {
        const locPrefix = `${swarmPath}/${locName}/`;
        for (const p of allPaths) {
          if (!p.startsWith(locPrefix)) continue;
          const remainder = p.slice(locPrefix.length);
          const parts = remainder.split("/");
          // Level 4 subfolders only (not .md files at this level)
          if (parts.length >= 2 && parts[0] && !parts[0].startsWith("_")) {
            const fullLawPath = `${curationName}@${swarmName}@${locName}@${parts[0]}`;
            swarmWideLawEntityNames.set(parts[0], fullLawPath);
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
      console.log(
        "🟡 [PARSER] swarmWideLawEntityNames Map:",
        JSON.stringify([...swarmWideLawEntityNames.entries()]),
      );
      console.log(
        "🟡 [PARSER] allInterpFilenames Map:",
        JSON.stringify([...allInterpFilenames.entries()]),
      );

      for (const locationName of locationFolders) {
        const locationPath = `${swarmPath}/${locationName}`;
        const locationNode: SourceNode = {
          id: `${curationName}@${swarmName}@${locationName}`,
          name: locationName,
          nodeType: "location",
          parentName: swarmName,
          attributes: extractAllAttributes(
            await getDirectAttributes(zip, locationPath),
          ),
          sources: await getDirectSources(zip, locationPath),
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
          nodes.push({
            id: `${curationName}@${swarmName}@${locationName}@${entry.name}`,
            name: entry.name,
            nodeType: "lawEntity",
            parentName: locationName,
            attributes: extractAllAttributes(
              await getDirectAttributes(zip, lawEntityFolder),
            ),
            sources: await getDirectSources(zip, lawEntityFolder),
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

            // Direct attributes for lawEntity folder merged with file-level frontmatter attrs
            const directAttrs = await getDirectAttributes(zip, lawEntityFolder);
            const fileCustomAttrs = extractAllAttributes(fm);
            const baseAttrs = extractAllAttributes(directAttrs);
            const mergedAttrs =
              fileCustomAttrs || baseAttrs
                ? {
                    ...baseAttrs,
                    ...fileCustomAttrs,
                  }
                : undefined;

            // Compute full @-separated path early — used for node id and edge creation
            const fullInterpPath = interpPath
              .replace(/\//g, "@")
              .replace(/\.md$/, "");

            const interpNode: SourceNode = {
              id: fullInterpPath,
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
            edges.push({
              source: `${curationName}@${swarmName}@${locationName}@${entry.name}`,
              target: fullInterpPath,
              bidirectional: hasSelfReference,
            });

            console.log("🟡 [PARSER] Processing lawEntity refs:", uniqueRefs);
            for (const ref of uniqueRefs) {
              const refFullPath = swarmWideLawEntityNames.get(ref);
              console.log(
                `🟡 [PARSER]   ref="${ref}" -> fullPath=${refFullPath ?? "UNDEFINED"}`,
              );
              if (!refFullPath) {
                console.warn(
                  `🟡 [PARSER] WARNING: Could not resolve lawEntity ref "${ref}" to full path, skipping edge`,
                );
                continue;
              }
              if (ref === entry.name) continue;
              // Cross-reference to another lawEntity — avoid duplicates
              const alreadyExists = edges.some(
                (e) => e.source === fullInterpPath && e.target === refFullPath,
              );
              if (!alreadyExists) {
                edges.push({ source: fullInterpPath, target: refFullPath });
              }
            }

            // -----------------------------------------------------------------
            // Double curly bracket cross-references: {{filename}} links this
            // interpEntity to other interpEntities anywhere in the swarm.
            // Self-references and invalid references are silently ignored.
            // -----------------------------------------------------------------
            const interpRefs = extractInterpEntityReferences(body);
            const uniqueInterpRefs = [...new Set(interpRefs)];

            console.log(
              "🟡 [PARSER] Processing interp refs:",
              uniqueInterpRefs,
            );
            for (const ref of uniqueInterpRefs) {
              // Skip self-references
              if (ref === filename) continue;
              const refFullPath = allInterpFilenames.get(ref);
              console.log(
                `🟡 [PARSER]   ref="{{${ref}}}" -> fullPath=${refFullPath ?? "UNDEFINED"}`,
              );
              if (!refFullPath) {
                console.warn(
                  `🟡 [PARSER] WARNING: Could not resolve interp ref "${ref}" to full path, skipping edge`,
                );
                continue;
              }
              // Avoid duplicate edges
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

  console.log("🟢 [PARSER] Total nodes:", nodes.length);
  console.log("🟢 [PARSER] Total edges:", edges.length);
  console.log("🟢 [PARSER] All edges:", JSON.stringify(edges, null, 2));
  // Group edges by source to see if duplicates are present
  const edgesBySource = edges.reduce(
    (acc, e) => {
      acc[e.source] = acc[e.source] || [];
      acc[e.source].push(e.target);
      return acc;
    },
    {} as Record<string, string[]>,
  );
  console.log(
    "🟢 [PARSER] Edges by source:",
    JSON.stringify(edgesBySource, null, 2),
  );

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: graphName,
    nodes,
    edges,
    createdAt: new Date(Date.now()).getTime(),
  };
}
