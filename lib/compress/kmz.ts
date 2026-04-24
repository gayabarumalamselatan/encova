import AdmZip from "adm-zip";
import type { CompressionOptions } from "./types";
import { compressKmlContent } from "./kml";

/**
 * KMZ compressor.
 *
 * KMZ is a ZIP archive containing one or more .kml files plus assets
 * (images, icons, etc.).  We:
 *   1. Open the ZIP with adm-zip.
 *   2. Recompress every .kml entry using compressKmlContent().
 *   3. Leave all other assets (PNG, JPG, DAE, …) untouched.
 *   4. Write the result as a new .kmz file.
 */
export async function compressKmz(
  inputPath: string,
  outputPath: string,
  options: CompressionOptions
): Promise<void> {
  const zip = new AdmZip(inputPath);

  for (const entry of zip.getEntries()) {
    if (entry.entryName.toLowerCase().endsWith(".kml")) {
      const original = entry.getData().toString("utf8");
      const optimized = compressKmlContent(original, options);
      zip.updateFile(entry.entryName, Buffer.from(optimized, "utf8"));
    }
    // Non-KML assets are preserved as-is
  }

  zip.writeZip(outputPath);
}
