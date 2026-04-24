import { readFileSync, writeFileSync } from "fs";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import type { CompressionOptions } from "./types";

// ── Parser / Builder config ───────────────────────────────────────────────────
const PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseTagValue: false,   // keep values as strings (safer for coords)
  trimValues: false,
};

const BUILDER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  suppressEmptyNode: true,
  format: false,          // no indentation → minified output
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Recursively delete named keys from a parsed XML object tree. */
function removeKeys(obj: any, keys: string[]): any {
  if (Array.isArray(obj)) return obj.map((i) => removeKeys(i, keys));
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (keys.includes(k)) continue;
      out[k] = removeKeys(v, keys);
    }
    return out;
  }
  return obj;
}

/**
 * Reduce precision of a KML coordinate string.
 * KML format: "lon,lat[,alt] lon,lat[,alt] …"
 */
function simplifyCoords(coordStr: string, decimals: number): string {
  return coordStr
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((triplet) =>
      triplet
        .split(",")
        .map((n) => {
          const f = parseFloat(n);
          return isNaN(f) ? n : f.toFixed(decimals);
        })
        .join(",")
    )
    .join(" ");
}

/** Walk the parsed tree and simplify every `coordinates` value. */
function simplifyAllCoords(obj: any, decimals: number): any {
  if (Array.isArray(obj)) return obj.map((i) => simplifyAllCoords(i, decimals));
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === "coordinates" && typeof v === "string") {
        out[k] = simplifyCoords(v, decimals);
      } else {
        out[k] = simplifyAllCoords(v, decimals);
      }
    }
    return out;
  }
  return obj;
}

// ── Core logic ────────────────────────────────────────────────────────────────

/**
 * Compress a KML XML string in-memory.
 * Exported so the KMZ handler can call it directly.
 *
 * Level behaviour:
 *   LOW    → minify only (strip whitespace / indentation)
 *   MEDIUM → minify + remove human-readable metadata tags
 *   HIGH   → medium + reduce coordinate precision to 6 decimal places
 *            + remove ExtendedData / atom links
 */
export function compressKmlContent(
  xmlContent: string,
  options: CompressionOptions
): string {
  const parser = new XMLParser(PARSER_OPTIONS);
  let parsed = parser.parse(xmlContent);

  if (options.level === "medium" || options.level === "high") {
    // These tags add bulk but are not required for rendering in GIS tools
    parsed = removeKeys(parsed, [
      "description",
      "Snippet",
      "atom:author",
      "atom:link",
    ]);
  }

  if (options.level === "high") {
    // 6 decimal places ≈ 0.1 m precision — plenty for any GIS use
    parsed = simplifyAllCoords(parsed, 6);
    // ExtendedData is often application-specific metadata
    parsed = removeKeys(parsed, ["ExtendedData", "gx:Tour"]);
  }

  const builder = new XMLBuilder(BUILDER_OPTIONS);
  return builder.build(parsed) as string;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function compressKml(
  inputPath: string,
  outputPath: string,
  options: CompressionOptions
): Promise<void> {
  const xml = readFileSync(inputPath, "utf-8");
  const optimized = compressKmlContent(xml, options);
  writeFileSync(outputPath, optimized, "utf-8");
}
