import type { QueryClient } from "@tanstack/react-query";
import type {
  CustomAttribute,
  NodeId,
  Tag,
  backendInterface,
} from "../backend";
import { Directionality } from "../backend";

export interface CommandResult {
  success: boolean;
  message: string;
}

// ISO 3166-1 alpha-3 country codes (subset for validation)
const VALID_JURISDICTION_CODES = [
  "AFG",
  "ALB",
  "DZA",
  "AND",
  "AGO",
  "ATG",
  "ARG",
  "ARM",
  "AUS",
  "AUT",
  "AZE",
  "BHS",
  "BHR",
  "BGD",
  "BRB",
  "BLR",
  "BEL",
  "BLZ",
  "BEN",
  "BTN",
  "BOL",
  "BIH",
  "BWA",
  "BRA",
  "BRN",
  "BGR",
  "BFA",
  "BDI",
  "CPV",
  "KHM",
  "CMR",
  "CAN",
  "CAF",
  "TCD",
  "CHL",
  "CHN",
  "COL",
  "COM",
  "COG",
  "COD",
  "CRI",
  "CIV",
  "HRV",
  "CUB",
  "CYP",
  "CZE",
  "DNK",
  "DJI",
  "DMA",
  "DOM",
  "ECU",
  "EGY",
  "SLV",
  "GNQ",
  "ERI",
  "EST",
  "SWZ",
  "ETH",
  "FJI",
  "FIN",
  "FRA",
  "GAB",
  "GMB",
  "GEO",
  "DEU",
  "GHA",
  "GRC",
  "GRD",
  "GTM",
  "GIN",
  "GNB",
  "GUY",
  "HTI",
  "HND",
  "HUN",
  "ISL",
  "IND",
  "IDN",
  "IRN",
  "IRQ",
  "IRL",
  "ISR",
  "ITA",
  "JAM",
  "JPN",
  "JOR",
  "KAZ",
  "KEN",
  "KIR",
  "PRK",
  "KOR",
  "KWT",
  "KGZ",
  "LAO",
  "LVA",
  "LBN",
  "LSO",
  "LBR",
  "LBY",
  "LIE",
  "LTU",
  "LUX",
  "MDG",
  "MWI",
  "MYS",
  "MDV",
  "MLI",
  "MLT",
  "MHL",
  "MRT",
  "MUS",
  "MEX",
  "FSM",
  "MDA",
  "MCO",
  "MNG",
  "MNE",
  "MAR",
  "MOZ",
  "MMR",
  "NAM",
  "NRU",
  "NPL",
  "NLD",
  "NZL",
  "NIC",
  "NER",
  "NGA",
  "MKD",
  "NOR",
  "OMN",
  "PAK",
  "PLW",
  "PAN",
  "PNG",
  "PRY",
  "PER",
  "PHL",
  "POL",
  "PRT",
  "QAT",
  "ROU",
  "RUS",
  "RWA",
  "KNA",
  "LCA",
  "VCT",
  "WSM",
  "SMR",
  "STP",
  "SAU",
  "SEN",
  "SRB",
  "SYC",
  "SLE",
  "SGP",
  "SVK",
  "SVN",
  "SLB",
  "SOM",
  "ZAF",
  "SSD",
  "ESP",
  "LKA",
  "SDN",
  "SUR",
  "SWE",
  "CHE",
  "SYR",
  "TJK",
  "TZA",
  "THA",
  "TLS",
  "TGO",
  "TON",
  "TTO",
  "TUN",
  "TUR",
  "TKM",
  "TUV",
  "UGA",
  "UKR",
  "ARE",
  "GBR",
  "USA",
  "URY",
  "UZB",
  "VUT",
  "VEN",
  "VNM",
  "YEM",
  "ZMB",
  "ZWE",
];

// Supported tag types
const SUPPORTED_TAG_TYPES = ["string", "number", "boolean", "date"];

// localStorage key for archived node IDs
const ARCHIVED_NODES_KEY = "hyvmind_archived_nodes";

// Archive utilities
export function getArchivedNodeIds(): Set<string> {
  try {
    const stored = localStorage.getItem(ARCHIVED_NODES_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return new Set<string>(parsed);
    return new Set();
  } catch {
    return new Set();
  }
}

export function archiveNodeById(nodeId: string): void {
  const archived = getArchivedNodeIds();
  archived.add(nodeId);
  localStorage.setItem(
    ARCHIVED_NODES_KEY,
    JSON.stringify(Array.from(archived)),
  );
}

export function unarchiveNodeById(nodeId: string): void {
  const archived = getArchivedNodeIds();
  archived.delete(nodeId);
  localStorage.setItem(
    ARCHIVED_NODES_KEY,
    JSON.stringify(Array.from(archived)),
  );
}

export function isNodeArchived(nodeId: string): boolean {
  return getArchivedNodeIds().has(nodeId);
}

// Parse typed tag annotation: value[type] or value (defaults to string)
function parseTagAnnotation(tag: string): { value: string; type: string } {
  const match = tag.match(/^(.+?)\[(\w+)\]$/);
  if (match) {
    return { value: match[1], type: match[2].toLowerCase() };
  }
  return { value: tag, type: "string" };
}

// Validate tag type
function validateTagType(type: string): boolean {
  return SUPPORTED_TAG_TYPES.includes(type.toLowerCase());
}

function formatMissingFieldsError(
  nodeType: string,
  missing: string[],
  example: string,
): string {
  return `Error: ${nodeType} creation requires: ${missing.join(", ")}.\nExample: ${example}`;
}

function formatSuccessMessage(
  nodeType: string,
  name: string,
  id: NodeId,
): string {
  return `${nodeType} "${name}" created successfully. ID: ${id}`;
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return "Error: An unknown error occurred";
}

function formatInvalidJurisdictionError(jurisdiction: string): string {
  return `Error: Invalid jurisdiction code "${jurisdiction}". Must be a valid ISO 3166-1 alpha-3 code (e.g., IND, USA, GBR).`;
}

function formatMalformedTokensError(validationError: string): string {
  return `Error: Malformed tokens syntax. ${validationError}`;
}

function formatInvalidTagTypeError(
  type: string,
  supportedTypes: string[],
): string {
  return `Error: Invalid tag type "${type}". Supported types: ${supportedTypes.join(", ")}`;
}

export async function executeCommand(
  command: string,
  fields: Record<string, string | string[]>,
  createCuration: any,
  createSwarm: any,
  createLocation: any,
  createInterpretationToken: any,
): Promise<CommandResult> {
  switch (command) {
    case "c":
      return await executeCurationCommand(fields, createCuration);
    case "s":
      return await executeSwarmCommand(fields, createSwarm);
    case "l":
      return await executeLocationCommand(fields, createLocation);
    case "i":
      return await executeInterpretationTokenCommand(
        fields,
        createInterpretationToken,
      );
    case "t":
      return {
        success: false,
        message:
          "Error: Law tokens are auto-extracted from Location creation content and cannot be directly created via Terminal.",
      };
    default:
      return {
        success: false,
        message: `Error: Unknown command /${command}. Type /help for available commands.`,
      };
  }
}

/**
 * Archive a node by calling the backend archiveNode() method.
 * On success, also updates localStorage for UI badge state and invalidates React Query cache.
 */
export async function executeArchiveCommand(
  nodeId: NodeId,
  displayName: string,
  displayType: string,
  actor: backendInterface,
  queryClient: QueryClient,
): Promise<CommandResult> {
  try {
    await actor.archiveNode(nodeId);

    // Keep localStorage in sync for UI badge state (secondary, non-authoritative)
    archiveNodeById(nodeId);

    // Invalidate graph data queries so GraphView and TreeView refresh immediately
    queryClient.invalidateQueries({ queryKey: ["graphData"] });

    return {
      success: true,
      message: `${displayType} "${displayName}" archived successfully. It will no longer appear in the graph or list views.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Error: Failed to archive ${displayType} "${displayName}": ${message}`,
    };
  }
}

async function executeCurationCommand(
  fields: Record<string, string | string[]>,
  createCuration: any,
): Promise<CommandResult> {
  const name = getFieldValue(fields, "name");

  // Accept both 'jurisdiction' and 'juris' (shorthand)
  let jurisdiction = getFieldValue(fields, "jurisdiction");
  if (!jurisdiction) {
    jurisdiction = getFieldValue(fields, "juris");
  }

  // Check for missing required fields
  const missing: string[] = [];
  if (!name || name.trim() === "") missing.push("name");
  if (!jurisdiction || jurisdiction.trim() === "") missing.push("juris");

  if (missing.length > 0) {
    return {
      success: false,
      message: formatMissingFieldsError(
        "Curation",
        missing,
        "/c name=X juris=IND",
      ),
    };
  }

  // Validate jurisdiction as ISO 3166-1 alpha-3 code (case-insensitive)
  const jurisdictionUpper = jurisdiction.trim().toUpperCase();
  if (
    jurisdictionUpper.length !== 3 ||
    !VALID_JURISDICTION_CODES.includes(jurisdictionUpper)
  ) {
    return {
      success: false,
      message: formatInvalidJurisdictionError(jurisdiction),
    };
  }

  // Check for unsupported tags field
  if (fields.tags) {
    return {
      success: false,
      message:
        "Error: Curations do not support tags. Remove the tags field and try again.",
    };
  }

  try {
    const result = await createCuration.mutateAsync({
      name: name.trim(),
      jurisdiction: jurisdictionUpper,
    });

    return {
      success: true,
      message: formatSuccessMessage("Curation", name.trim(), result),
    };
  } catch (error) {
    return {
      success: false,
      message: formatErrorMessage(error),
    };
  }
}

async function executeSwarmCommand(
  fields: Record<string, string | string[]>,
  createSwarm: any,
): Promise<CommandResult> {
  const name = getFieldValue(fields, "name");
  const parent = getFieldValue(fields, "parent");
  const tagsValue = getFieldValue(fields, "tags");

  // Check for missing required fields
  const missing: string[] = [];
  if (!name || name.trim() === "") missing.push("name");
  if (!parent || parent.trim() === "") missing.push("parent");

  if (missing.length > 0) {
    return {
      success: false,
      message: formatMissingFieldsError(
        "Swarm",
        missing,
        "/s name=X parent=C123 tags=civil[string],2026[date]",
      ),
    };
  }

  // Parse tags with type validation
  const tags: Tag[] = [];
  if (tagsValue) {
    const tagEntries = tagsValue
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    for (const tagEntry of tagEntries) {
      const { value, type } = parseTagAnnotation(tagEntry);

      // Validate tag type
      if (!validateTagType(type)) {
        return {
          success: false,
          message: formatInvalidTagTypeError(type, SUPPORTED_TAG_TYPES),
        };
      }

      // Store tag with type annotation if not default string
      if (type === "string") {
        tags.push(value);
      } else {
        tags.push(`${value}[${type}]`);
      }
    }
  }

  try {
    const result = await createSwarm.mutateAsync({
      name: name.trim(),
      tags,
      parentCurationId: parent.trim(),
    });

    return {
      success: true,
      message: formatSuccessMessage("Swarm", name.trim(), result),
    };
  } catch (error) {
    return {
      success: false,
      message: formatErrorMessage(error),
    };
  }
}

async function executeLocationCommand(
  fields: Record<string, string | string[]>,
  createLocation: any,
): Promise<CommandResult> {
  const name = getFieldValue(fields, "name");
  const parent = getFieldValue(fields, "parent");
  const content = getFieldValue(fields, "content");
  const tokensValue = getFieldValue(fields, "tokens");

  // Check for missing required fields
  const missing: string[] = [];
  if (!name || name.trim() === "") missing.push("name");
  if (!parent || parent.trim() === "") missing.push("parent");

  // Either content or tokens must be provided
  if (
    (!content || content.trim() === "") &&
    (!tokensValue || tokensValue.trim() === "")
  ) {
    missing.push("content or tokens");
  }

  if (missing.length > 0) {
    return {
      success: false,
      message: formatMissingFieldsError(
        "Location",
        missing,
        '/l name=X parent=S123 content="..." or tokens={a}{b}{c}',
      ),
    };
  }

  // Parse custom attributes
  const customAttributes: CustomAttribute[] = [];
  const attributeValues = fields.attributes;
  if (attributeValues) {
    const attrArray = Array.isArray(attributeValues)
      ? attributeValues
      : [attributeValues];
    for (const attr of attrArray) {
      const [key, ...valueParts] = attr.split(":");
      if (key && valueParts.length > 0) {
        customAttributes.push({
          key: key.trim(),
          value: valueParts.join(":").trim(),
        });
      }
    }
  }

  // Determine content and originalTokenSequence
  let finalContent = "";
  let originalTokenSequence = "";

  if (tokensValue && tokensValue.trim() !== "") {
    // Validate tokens syntax
    const validationError = validateTokensSyntax(tokensValue);
    if (validationError) {
      return {
        success: false,
        message: formatMalformedTokensError(validationError),
      };
    }

    // Extract tokens from {a}{b}{c} format
    const tokens = extractTokensFromBraces(tokensValue);
    finalContent = tokens.map((t) => `{${t}}`).join(" ");
    originalTokenSequence = tokensValue.trim();
  } else {
    finalContent = content.trim();
    originalTokenSequence = content.trim();
  }

  try {
    const result = await createLocation.mutateAsync({
      title: name.trim(),
      content: finalContent,
      originalTokenSequence,
      customAttributes,
      parentSwarmId: parent.trim(),
    });

    return {
      success: true,
      message: formatSuccessMessage("Location", name.trim(), result),
    };
  } catch (error) {
    return {
      success: false,
      message: formatErrorMessage(error),
    };
  }
}

async function executeInterpretationTokenCommand(
  fields: Record<string, string | string[]>,
  createInterpretationToken: any,
): Promise<CommandResult> {
  const name = getFieldValue(fields, "name");
  const context = getFieldValue(fields, "context");
  const from = getFieldValue(fields, "from");
  const to = getFieldValue(fields, "to");
  const fromRelType = getFieldValue(fields, "fromRelType") || "relates to";
  const toRelType = getFieldValue(fields, "toRelType") || "relates to";
  const fromDir = getFieldValue(fields, "fromDir") || "none";
  const toDir = getFieldValue(fields, "toDir") || "none";

  // Check for missing required fields
  const missing: string[] = [];
  if (!name || name.trim() === "") missing.push("name");
  if (!from || from.trim() === "") missing.push("from");
  if (!to || to.trim() === "") missing.push("to");

  if (missing.length > 0) {
    return {
      success: false,
      message: formatMissingFieldsError(
        "Interpretation Token",
        missing,
        "/i name=X from=L123 to=T456",
      ),
    };
  }

  // Parse directionality
  const fromDirectionality = parseDirectionality(fromDir);
  const toDirectionality = parseDirectionality(toDir);

  // Parse custom attributes
  const customAttributes: CustomAttribute[] = [];
  const attributeValues = fields.attributes;
  if (attributeValues) {
    const attrArray = Array.isArray(attributeValues)
      ? attributeValues
      : [attributeValues];
    for (const attr of attrArray) {
      const [key, ...valueParts] = attr.split(":");
      if (key && valueParts.length > 0) {
        customAttributes.push({
          key: key.trim(),
          value: valueParts.join(":").trim(),
        });
      }
    }
  }

  try {
    const result = await createInterpretationToken.mutateAsync({
      title: name.trim(),
      context: context?.trim() || "",
      fromTokenId: from.trim(),
      fromRelationshipType: fromRelType.trim(),
      fromDirectionality,
      toNodeId: to.trim(),
      toRelationshipType: toRelType.trim(),
      toDirectionality,
      customAttributes,
    });

    return {
      success: true,
      message: formatSuccessMessage(
        "Interpretation Token",
        name.trim(),
        result,
      ),
    };
  } catch (error) {
    return {
      success: false,
      message: formatErrorMessage(error),
    };
  }
}

function getFieldValue(
  fields: Record<string, string | string[]>,
  key: string,
): string {
  const value = fields[key];
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
}

function parseDirectionality(dir: string): Directionality {
  const normalized = dir.toLowerCase().trim();
  switch (normalized) {
    case "unidirectional":
    case "uni":
      return Directionality.unidirectional;
    case "bidirectional":
    case "bi":
      return Directionality.bidirectional;
    default:
      return Directionality.none;
  }
}

function validateTokensSyntax(tokensValue: string): string | null {
  let braceCount = 0;
  let hasContent = false;
  let currentToken = "";

  for (const char of tokensValue) {
    if (char === "{") {
      if (braceCount > 0) {
        return "Nested braces are not allowed";
      }
      braceCount++;
      currentToken = "";
    } else if (char === "}") {
      if (braceCount === 0) {
        return "Unmatched closing brace";
      }
      if (currentToken.trim() === "") {
        return "Empty token block found";
      }
      braceCount--;
      hasContent = true;
      currentToken = "";
    } else if (braceCount > 0) {
      currentToken += char;
    }
  }

  if (braceCount !== 0) {
    return "Unmatched opening brace";
  }

  if (!hasContent) {
    return "No valid token blocks found";
  }

  return null;
}

function extractTokensFromBraces(tokensValue: string): string[] {
  const tokens: string[] = [];
  let inBrace = false;
  let currentToken = "";

  for (const char of tokensValue) {
    if (char === "{") {
      inBrace = true;
      currentToken = "";
    } else if (char === "}") {
      if (inBrace && currentToken.trim() !== "") {
        tokens.push(currentToken.trim());
      }
      inBrace = false;
      currentToken = "";
    } else if (inBrace) {
      currentToken += char;
    }
  }

  return tokens;
}
