import fs from "fs/promises";
import path from "path";

export async function ScanDirectory(dir: string): Promise<{
  totalSize: number;
  latestFile: string | null;
  latestMtime: number;
  fileCount: number;
}> {
  let totalSize = 0;
  let latestFile: string | null = null;
  let latestMtime = 0;
  let fileCount = 0;

  let items;
  try {
    items = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    // Handle missing directories gracefully
    return { totalSize, latestFile, latestMtime };
  }

  for (const item of items) {
    // Ignore hidden files and directories
    if (item.name.startsWith(".")) continue;

    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      const result = await ScanDirectory(fullPath);

      totalSize += result.totalSize;
      fileCount += result.fileCount;

      if (result.latestMtime > latestMtime) {
        latestMtime = result.latestMtime;
        latestFile = result.latestFile;
      }
    } else {
      // Only consider recording files (.mp4) and ignore temp files
      if (!item.name.endsWith(".mp4") || item.name.includes(".tmp") || item.name.includes(".temp")) {
        continue;
      }

      try {
        const stat = await fs.stat(fullPath);
        totalSize += stat.size;
        fileCount += 1;

        if (stat.mtimeMs > latestMtime) {
          latestMtime = stat.mtimeMs;
          latestFile = fullPath;
        }
      } catch (err) {
        // Ignore files that were deleted during scan
      }
    }
  }

  return {
    totalSize,
    latestFile,
    latestMtime,
    fileCount,
  };
}
