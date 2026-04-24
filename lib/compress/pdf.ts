import { execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import path from "path";
import type { CompressionOptions } from "./types";

const QUALITY_MAP: Record<string, string> = {
  low: "/screen",
  medium: "/ebook",
  high: "/printer",
};

/**
 * Resolves the Ghostscript executable path.
 * Tries PATH names first, then well-known Windows install directories.
 */
function resolveGsBinary(): string {
  // 1. Try binaries already on PATH
  const pathCandidates =
    process.platform === "win32" ? ["gswin64c", "gswin32c", "gs"] : ["gs"];

  for (const name of pathCandidates) {
    try {
      execSync(`${name} --version`, { stdio: "pipe" });
      return name; // it works from PATH
    } catch {
      // not on PATH — continue
    }
  }

  // 2. Windows: scan "C:\Program Files\gs\" for versioned subdirs
  if (process.platform === "win32") {
    const roots = ["C:\\Program Files\\gs", "C:\\Program Files (x86)\\gs"];
    for (const root of roots) {
      if (!existsSync(root)) continue;
      const versions = readdirSync(root).sort().reverse(); // newest first
      for (const ver of versions) {
        const bin64 = path.join(root, ver, "bin", "gswin64c.exe");
        const bin32 = path.join(root, ver, "bin", "gswin32c.exe");
        if (existsSync(bin64)) return bin64;
        if (existsSync(bin32)) return bin32;
      }
    }
  }

  throw new Error(
    "Ghostscript executable not found. " +
      "Please install Ghostscript and ensure it is accessible.",
  );
}

// Cache the resolved binary so we don't search on every request
let _gsBinary: string | null = null;
function getGsBinary(): string {
  if (!_gsBinary) _gsBinary = resolveGsBinary();
  return _gsBinary;
}

export async function compressPdf(
  inputPath: string,
  outputPath: string,
  options: CompressionOptions,
): Promise<void> {
  const gs = getGsBinary();
  const quality = QUALITY_MAP[options.level] ?? "/ebook";

  // Wrap paths in quotes to handle spaces (e.g. "C:\Program Files\gs\...")
  const cmd = [
    `"${gs}"`,
    `-sDEVICE=pdfwrite`,
    `-dPDFSETTINGS=${quality}`,
    `-dNOPAUSE`,
    `-dBATCH`,
    `-dQUIET`,
    `-sOutputFile="${outputPath}"`,
    `"${inputPath}"`,
  ].join(" ");

  try {
    execSync(cmd, { stdio: "pipe" });
  } catch (err: any) {
    // Surface the stderr from Ghostscript for easier debugging
    const stderr = err.stderr?.toString() ?? "";
    throw new Error(
      stderr
        ? `Ghostscript error: ${stderr.trim()}`
        : (err.message ?? "Ghostscript compression failed"),
    );
  }
}
