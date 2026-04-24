"use client";

import { useCallback, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  ArrowLeftIcon,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  FileText,
  Trash2,
  Download,
  Loader2,
  Zap,
  RotateCcw,
  TrendingDown,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Level = "low" | "medium" | "high";
type Status = "pending" | "uploading" | "processing" | "completed" | "failed";

interface CompressResult {
  filename: string;
  originalSize: number;
  compressedSize: number;
  downloadUrl: string;
}

interface FileItem {
  id: string;
  file: File;
  status: Status;
  progress: number;
  error?: string;
  result?: CompressResult;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtBytes(b: number) {
  if (b === 0) return "0 B";
  const k = 1024,
    s = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(2)} ${s[i]}`;
}

function savedPct(orig: number, comp: number) {
  return Math.round(((orig - comp) / orig) * 100);
}

const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.google-earth.kml+xml",
  "application/vnd.google-earth.kmz",
];
const ALLOWED_EXT = [".pdf", ".kml", ".kmz"];

function isValidFile(file: File) {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return ALLOWED_MIME.includes(file.type) || ALLOWED_EXT.includes(ext);
}

// ── Status helpers ────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: Status }) {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "uploading":
    case "processing":
      return (
        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      );
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
}

function statusVariant(
  status: Status
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "failed":
      return "destructive";
    case "uploading":
    case "processing":
      return "secondary";
    default:
      return "outline";
  }
}

function statusLabel(status: Status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// ── File row ──────────────────────────────────────────────────────────────────
function FileRow({
  item,
  onRemove,
  processing,
}: {
  item: FileItem;
  onRemove: () => void;
  processing: boolean;
}) {
  const canRemove = !processing && item.status !== "completed";
  const showProgress =
    item.status === "uploading" || item.status === "processing";

  return (
    <Card className="border">
      <CardContent className="pt-4 pb-3">
        {/* Top row */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="w-5 h-5 text-primary" />
          </div>

          {/* Name + sizes */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate text-sm">
              {item.file.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-500">
                {fmtBytes(item.file.size)}
              </span>
              {item.result && (
                <>
                  <span className="text-xs text-gray-300">→</span>
                  <span className="text-xs font-semibold text-green-600">
                    {fmtBytes(item.result.compressedSize)}
                  </span>
                  <Badge variant="outline" className="text-green-600 border-green-300 text-[10px] px-1.5 py-0">
                    -{savedPct(item.result.originalSize, item.result.compressedSize)}%
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0">
            <StatusIcon status={item.status} />
            <Badge variant={statusVariant(item.status)} className="capitalize text-xs">
              {statusLabel(item.status)}
            </Badge>

            {item.status === "completed" && item.result && (
              <Button size="sm" asChild className="h-7 px-3 text-xs">
                <a href={item.result.downloadUrl} download={item.result.filename}>
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </a>
              </Button>
            )}

            {canRemove && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRemove}
                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:border-red-300"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {showProgress && (
          <div className="mt-3">
            <Progress value={item.progress} className="h-1.5" />
            <p className="text-xs text-gray-400 mt-1">
              {item.status === "uploading" ? "Uploading…" : "Compressing with Ghostscript…"}
            </p>
          </div>
        )}

        {/* Completed bar */}
        {item.status === "completed" && (
          <div className="mt-3">
            <Progress value={100} className="h-1.5" />
          </div>
        )}

        {/* Error */}
        {item.error && (
          <p className="mt-2 text-xs text-red-500">⚠ {item.error}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Compress() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [level, setLevel] = useState<Level>("medium");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Add files
  const addFiles = useCallback((list: FileList | File[]) => {
    const items: FileItem[] = Array.from(list).map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: isValidFile(file) ? "pending" : "failed",
      progress: 0,
      error: isValidFile(file) ? undefined : "Unsupported file format",
    }));
    setFiles((p) => [...p, ...items]);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  // Compress one file
  const compressOne = async (item: FileItem) => {
    const patch = (p: Partial<FileItem>) =>
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, ...p } : f))
      );

    patch({ status: "uploading", progress: 15 });

    let prog = 15;
    const ticker = setInterval(() => {
      prog = Math.min(prog + Math.random() * 10, 85);
      patch({ progress: prog });
    }, 700);

    try {
      patch({ status: "processing" });
      const fd = new FormData();
      fd.append("file", item.file);
      fd.append("level", level);

      const res = await fetch("/api/compress", { method: "POST", body: fd });
      clearInterval(ticker);
      const data = await res.json();

      if (!res.ok) {
        patch({
          status: "failed",
          progress: 0,
          error: data.error ?? "Compression failed",
        });
        return;
      }
      patch({ status: "completed", progress: 100, result: data });
    } catch (e: any) {
      clearInterval(ticker);
      patch({
        status: "failed",
        progress: 0,
        error: e.message ?? "Network error",
      });
    }
  };

  const handleCompressAll = async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (!pending.length) return;
    setProcessing(true);
    await Promise.all(pending.map(compressOne));
    setProcessing(false);
  };

  // Derived
  const pendingCount = files.filter((f) => f.status === "pending").length;
  const completed = files.filter((f) => f.status === "completed");
  const totalOrig = completed.reduce(
    (s, f) => s + (f.result?.originalSize ?? 0),
    0
  );
  const totalComp = completed.reduce(
    (s, f) => s + (f.result?.compressedSize ?? 0),
    0
  );

  const levelConfig: Record<Level, { label: string; hint: string }> = {
    low:    { label: "Low",    hint: "Screen quality · Smallest size" },
    medium: { label: "Medium", hint: "eBook quality · Balanced" },
    high:   { label: "High",   hint: "Printer quality · Best clarity" },
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Back button */}
        <Button
          variant="outline"
          className="hover:cursor-pointer"
          onClick={() => window.history.back()}
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Home
        </Button>

        {/* Header */}
        <div className="flex items-center gap-4">
          <img src="images/logo.png" alt="Logo" className="w-16" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              ASISGO File Compress
            </h1>
            <p className="text-gray-600 mt-0.5">
              Compress PDF, KML and KMZ files — processed locally, no data sent to third parties
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Left / main column ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Compression level */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="w-4 h-4" />
                  Compression Level
                </CardTitle>
                <CardDescription>
                  Choose the trade-off between file size and quality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {(["low", "medium", "high"] as Level[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      className={`rounded-lg border-2 p-3 text-left transition-all hover:cursor-pointer ${
                        level === l
                          ? "border-primary bg-primary/5"
                          : "border-border bg-white hover:border-primary/40"
                      }`}
                    >
                      <p
                        className={`font-semibold text-sm ${
                          level === l ? "text-primary" : "text-gray-700"
                        }`}
                      >
                        {levelConfig[l].label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {levelConfig[l].hint}
                      </p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Drop zone */}
            <Card
              className={`border-2 border-dashed transition-all cursor-pointer ${
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-white hover:border-primary/50 hover:bg-primary/[0.02]"
              }`}
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => inputRef.current?.click()}
            >
              <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".pdf,.kml,.kmz,application/pdf,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz"
                  className="hidden"
                  onChange={(e) => e.target.files && addFiles(e.target.files)}
                />
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Upload className="w-7 h-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-700">
                    {dragging ? "Release to add files" : "Drop files here or click to browse"}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Supported:&nbsp;
                    <span className="text-primary font-medium">PDF</span>
                    {" · "}
                    <span className="text-primary font-medium">KML</span>
                    {" · "}
                    <span className="text-primary font-medium">KMZ</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* File list */}
            {files.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Files
                      <Badge variant="secondary" className="ml-1">
                        {files.length}
                      </Badge>
                    </CardTitle>
                    <div className="flex gap-2">
                      {!processing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFiles([])}
                          className="hover:cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          Clear all
                        </Button>
                      )}
                      {pendingCount > 0 && (
                        <Button
                          size="sm"
                          onClick={handleCompressAll}
                          disabled={processing}
                          className="hover:cursor-pointer"
                        >
                          {processing ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                              Processing…
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5 mr-1" />
                              Compress {pendingCount} file{pendingCount > 1 ? "s" : ""}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {files.map((item) => (
                    <FileRow
                      key={item.id}
                      item={item}
                      onRemove={() =>
                        setFiles((p) => p.filter((f) => f.id !== item.id))
                      }
                      processing={processing}
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-4">

            {/* Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingDown className="w-4 h-4" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {completed.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No files compressed yet.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="text-sm font-medium text-gray-700">
                        {completed.length} file{completed.length > 1 ? "s" : ""} done
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-400 uppercase tracking-wide">
                          Original Size
                        </Label>
                        <p className="font-semibold text-gray-900 mt-0.5">
                          {fmtBytes(totalOrig)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400 uppercase tracking-wide">
                          Compressed Size
                        </Label>
                        <p className="font-semibold text-green-600 mt-0.5">
                          {fmtBytes(totalComp)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400 uppercase tracking-wide">
                          Space Saved
                        </Label>
                        <p className="font-semibold text-primary mt-0.5">
                          {fmtBytes(totalOrig - totalComp)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400 uppercase tracking-wide">
                          Reduction
                        </Label>
                        <p className="font-semibold text-primary mt-0.5">
                          {totalOrig > 0
                            ? `${savedPct(totalOrig, totalComp)}%`
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* How it works */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">How it works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>1. Drop <strong>PDF</strong>, <strong>KML</strong>, or <strong>KMZ</strong> files above.</p>
                <p>2. Choose a <strong>compression level</strong>.</p>
                <p>3. Click <strong>Compress</strong>.</p>
                <p className="text-gray-400">PDF → Ghostscript · KML/KMZ → XML minification</p>
                <p>4. Download your compressed file.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
