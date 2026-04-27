import { exec } from "child_process";
import { existsSync, readdirSync, copyFileSync, unlinkSync } from "fs";
import { mkdir } from "fs/promises";
import path from "path";

// ── Locate soffice ────────────────────────────────────────────────────────────
function resolveSoffice(): string {
  // 1. Try PATH first
  // (won't work on most Windows installs, but good for Linux/Mac)
  try {
    const { execSync } = require("child_process");
    execSync("soffice --version", { stdio: "pipe" });
    return "soffice";
  } catch { /* not on PATH */ }

  // 2. Well-known Windows install locations
  const candidates = [
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ];
  for (const p of candidates) {
    if (existsSync(p)) return `"${p}"`;
  }

  throw new Error(
    "LibreOffice (soffice) not found. " +
    "Please install LibreOffice and ensure it is accessible."
  );
}

let _soffice: string | null = null;
function getSoffice(): string {
  if (!_soffice) _soffice = resolveSoffice();
  return _soffice;
}

// ── Sanitize filename ─────────────────────────────────────────────────────────
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._\-]/g, "_") // replace unsafe chars
    .replace(/_{2,}/g, "_")              // collapse consecutive underscores
    .slice(0, 200);                      // max length
}

// ── Core compression ──────────────────────────────────────────────────────────

/**
 * Compresses a DOCX or XLSX by round-tripping through LibreOffice.
 * LibreOffice rewrites the file, stripping unused internal objects and
 * re-optimising the ZIP container, which typically reduces size 10–40%.
 *
 * @param inputPath   Absolute path to the uploaded file
 * @param outputDir   Directory where LibreOffice writes the converted file
 * @param outputPath  Final destination path (we rename after conversion)
 */
export async function compressOffice(
  inputPath: string,
  outputDir: string,
  outputPath: string
): Promise<void> {
  const soffice = getSoffice();
  const ext = path.extname(inputPath).replace(".", "").toLowerCase();

  // Map extension → LibreOffice --convert-to format
  const formatMap: Record<string, string> = {
    docx: "docx",
    xlsx: "xlsx",
  };
  const format = formatMap[ext];
  if (!format) throw new Error(`Unsupported office format: .${ext}`);

  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const cmd = `${soffice} --headless --convert-to ${format} "${inputPath}" --outdir "${outputDir}"`;

  await new Promise<void>((resolve, reject) => {
    exec(cmd, { timeout: 120_000 }, (error, _stdout, stderr) => {
      if (error) {
        reject(
          new Error(
            stderr?.trim()
              ? `LibreOffice error: ${stderr.trim()}`
              : error.message
          )
        );
        return;
      }
      resolve();
    });
  });

  // LibreOffice names the output after the input basename
  const convertedName = path.basename(inputPath, path.extname(inputPath)) + `.${format}`;
  const convertedPath = path.join(outputDir, convertedName);

  if (!existsSync(convertedPath)) {
    throw new Error(
      `LibreOffice conversion succeeded but output file not found: ${convertedPath}`
    );
  }

  // Copy to final destination then remove the temp file.
  // renameSync() would fail with EXDEV when temp dir and output dir are on
  // different drives (e.g. C:\Temp → D:\project), so we copy+delete instead.
  copyFileSync(convertedPath, outputPath);
  unlinkSync(convertedPath);
}
