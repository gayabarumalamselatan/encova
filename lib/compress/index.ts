import { compressPdf } from "./pdf";
import { compressKml } from "./kml";
import { compressKmz } from "./kmz";
import type { CompressionHandler } from "./types";

// ─── Handler registry ─────────────────────────────────────────────────────────
// To add a new format: import its handler and add an entry in all three maps.
export const compressionHandlers: Record<string, CompressionHandler> = {
  pdf: compressPdf,
  kml: compressKml,
  kmz: compressKmz,
  // docx: compressDocx,
  // xlsx: compressXlsx,
  // csv:  compressCsv,
};

// MIME type → handler key
export const mimeTypeMap: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.google-earth.kml+xml": "kml",
  "application/vnd.google-earth.kmz": "kmz",
  // Browsers sometimes send these as generic octet-stream — ext map handles it
  // "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

// Extension → handler key (fallback when MIME type is generic / missing)
export const extensionMap: Record<string, string> = {
  ".pdf": "pdf",
  ".kml": "kml",
  ".kmz": "kmz",
  // ".docx": "docx",
  // ".xlsx": "xlsx",
  // ".csv":  "csv",
};
