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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeftIcon,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Video as VideoIcon,
  Trash2,
  Download,
  Loader2,
  Zap,
  RotateCcw,
  TrendingDown,
  Play,
  Sliders,
  Volume2,
  Tv,
} from "lucide-react";
import { generateId } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
type Profile = "low" | "medium" | "high" | "advanced";
type Status = "pending" | "uploading" | "processing" | "completed" | "failed";

interface VideoResult {
  filename: string;
  originalSize: number;
  compressedSize: number;
  downloadUrl: string;
  originalUrl: string;
}

interface VideoFileItem {
  id: string;
  file: File;
  status: Status;
  progress: number;
  error?: string;
  result?: VideoResult;
  // Specific config applied to this file during compression
  config: {
    videoCodec: string;
    preset: string;
    crf: number;
    bitrate: string;
    resolution: string;
    fps: string;
    audioCodec: string;
    audioBitrate: string;
  };
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
  "video/mp4",
  "video/x-matroska", // mkv
  "video/quicktime", // mov
  "video/x-msvideo", // avi
  "video/webm",
  "video/ogg",
];

const ALLOWED_EXT = [".mp4", ".mkv", ".mov", ".avi", ".webm", ".ogg"];

function isValidVideo(file: File) {
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
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
}

function statusVariant(
  status: Status,
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
  onPreview,
  isActivePreview,
}: {
  item: VideoFileItem;
  onRemove: () => void;
  processing: boolean;
  onPreview: () => void;
  isActivePreview: boolean;
}) {
  const canRemove = !processing && item.status !== "completed";
  const showProgress =
    item.status === "uploading" || item.status === "processing";

  return (
    <Card
      className={`border transition-all ${isActivePreview ? "border-primary ring-1 ring-primary/20" : ""}`}
    >
      <CardContent className="pt-4 pb-3">
        {/* Top row */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <VideoIcon className="w-5 h-5 text-primary" />
          </div>

          {/* Name + sizes */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate text-sm">
              {item.file.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-500 font-mono">
                {fmtBytes(item.file.size)}
              </span>
              {item.result && (
                <>
                  <span className="text-xs text-gray-300">→</span>
                  <span className="text-xs font-semibold text-green-600 font-mono">
                    {fmtBytes(item.result.compressedSize)}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-green-600 border-green-300 text-[10px] px-1.5 py-0 font-semibold"
                  >
                    -{savedPct(item.file.size, item.result.compressedSize)}%
                  </Badge>
                </>
              )}
            </div>
            <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
              <span>Codec: {item.config.videoCodec}</span>
              <span>•</span>
              <span>Resolution: {item.config.resolution}</span>
              <span>•</span>
              <span>FPS: {item.config.fps}</span>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0">
            <StatusIcon status={item.status} />
            <Badge
              variant={statusVariant(item.status)}
              className="capitalize text-xs font-medium"
            >
              {statusLabel(item.status)}
            </Badge>

            {item.status === "completed" && item.result && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onPreview}
                  className={`h-7 px-2.5 text-xs ${isActivePreview ? "bg-primary/5 text-primary border-primary/30" : ""}`}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="h-7 px-2.5 text-xs hover:cursor-pointer"
                >
                  <a
                    href={item.result.downloadUrl}
                    download={item.result.filename}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </a>
                </Button>
              </div>
            )}

            {canRemove && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRemove}
                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:border-red-300 hover:bg-red-50"
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
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5 font-mono">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              {item.status === "uploading"
                ? `Uploading video file (${Math.round(item.progress)}%)`
                : `Compressing video (${Math.round(item.progress)}%)`}
            </p>
          </div>
        )}

        {/* Completed bar */}
        {item.status === "completed" && (
          <div className="mt-3">
            <Progress
              value={100}
              className="h-1 bg-green-100 [&>div]:bg-green-500"
            />
          </div>
        )}

        {/* Error */}
        {item.error && (
          <p className="mt-2 text-xs text-red-500 font-medium bg-red-50 p-2 rounded border border-red-100">
            ⚠ {item.error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function VideoCompress() {
  const [files, setFiles] = useState<VideoFileItem[]>([]);
  const [profile, setProfile] = useState<Profile>("medium");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // FFmpeg settings (used when profile === 'advanced' or for preconfiguring defaults)
  const [videoCodec, setVideoCodec] = useState<string>("libx264");
  const [preset, setPreset] = useState<string>("medium");
  const [crf, setCrf] = useState<number>(23);
  const [bitrate, setBitrate] = useState<string>("");
  const [resolution, setResolution] = useState<string>("original");
  const [fps, setFps] = useState<string>("original");
  const [audioCodec, setAudioCodec] = useState<string>("aac");
  const [audioBitrate, setAudioBitrate] = useState<string>("128k");

  // Selected completed video for preview in player
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");

  // Construct current config depending on profile selection
  const getActiveConfig = (prof: Profile) => {
    switch (prof) {
      case "low":
        return {
          videoCodec: "libx264",
          preset: "veryfast",
          crf: 28,
          bitrate: "",
          resolution: "854x480",
          fps: "24",
          audioCodec: "aac",
          audioBitrate: "96k",
        };
      case "high":
        return {
          videoCodec: "libx264",
          preset: "slow",
          crf: 18,
          bitrate: "",
          resolution: "original",
          fps: "original",
          audioCodec: "aac",
          audioBitrate: "192k",
        };
      case "medium":
      default:
        if (prof === "advanced") {
          return {
            videoCodec,
            preset,
            crf,
            bitrate,
            resolution,
            fps,
            audioCodec,
            audioBitrate,
          };
        }
        return {
          videoCodec: "libx264",
          preset: "medium",
          crf: 23,
          bitrate: "",
          resolution: "original",
          fps: "original",
          audioCodec: "aac",
          audioBitrate: "128k",
        };
    }
  };

  // Add files
  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const items: VideoFileItem[] = Array.from(list).map((file) => {
        const isValid = isValidVideo(file);
        return {
          id: generateId(),
          file,
          status: isValid ? "pending" : "failed",
          progress: 0,
          error: isValid
            ? undefined
            : "Unsupported video format. Please upload MP4, MKV, MOV, AVI, WEBM, or OGG.",
          config: getActiveConfig(profile),
        };
      });
      setFiles((p) => [...p, ...items]);
    },
    [
      profile,
      videoCodec,
      preset,
      crf,
      bitrate,
      resolution,
      fps,
      audioCodec,
      audioBitrate,
    ],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  // Compress one video
  const compressOne = async (item: VideoFileItem) => {
    const patch = (p: Partial<VideoFileItem>) =>
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, ...p } : f)),
      );

    patch({ status: "uploading", progress: 15 });

    let prog = 15;
    const ticker = setInterval(() => {
      prog = Math.min(prog + Math.random() * 5, 90);
      patch({ progress: prog });
    }, 900);

    try {
      patch({ status: "processing" });

      const fd = new FormData();
      fd.append("file", item.file);
      fd.append("videoCodec", item.config.videoCodec);
      fd.append("preset", item.config.preset);
      fd.append("crf", String(item.config.crf));
      fd.append("bitrate", item.config.bitrate);
      fd.append("resolution", item.config.resolution);
      fd.append("fps", item.config.fps);
      fd.append("audioCodec", item.config.audioCodec);
      fd.append("audioBitrate", item.config.audioBitrate);

      const res = await fetch("/api/video-compress", {
        method: "POST",
        body: fd,
      });

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

      const result: VideoResult = data;
      patch({ status: "completed", progress: 100, result });

      // Auto-set the first completed video as the preview source
      setPreviewUrl(result.downloadUrl);
      setPreviewName(result.filename);
    } catch (e: any) {
      clearInterval(ticker);
      patch({
        status: "failed",
        progress: 0,
        error: e.message ?? "Network connection error",
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

  const totalOrig = completed.reduce((s, f) => s + f.file.size, 0);

  const totalComp = completed.reduce(
    (s, f) => s + (f.result?.compressedSize ?? 0),
    0,
  );

  const profileConfig: Record<
    Exclude<Profile, "advanced">,
    { label: string; hint: string }
  > = {
    low: {
      label: "Low Quality",
      hint: "Smallest size · 480p · Speed Optimized",
    },
    medium: {
      label: "Balanced",
      hint: "Standard compression · Keep Res · 23 CRF",
    },
    high: {
      label: "High Quality",
      hint: "Excellent clarity · Keep Res · 18 CRF",
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back button */}
        <Button
          variant="outline"
          className="hover:cursor-pointer shadow-sm bg-white"
          onClick={() => window.history.back()}
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1.5" />
          Back to Home
        </Button>

        {/* Header */}
        <div className="flex items-center gap-4 bg-white p-6 rounded-xl border shadow-sm">
          <img src="images/logo.png" alt="Logo" className="w-16" />
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              ASISGO Video Compress
            </h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base font-medium">
              High-performance video transcoder and compressor. Processed
              locally ensuring full data privacy.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Left / main column ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Compression Settings Panel */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Sliders className="w-5 h-5 text-primary" />
                  Compression Profiles & Options
                </CardTitle>
                <CardDescription>
                  Select a preconfigured easy profile or switch to advanced mode
                  to tweak exact compressing inputs.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Tabs
                  value={profile}
                  onValueChange={(val) => setProfile(val as Profile)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="low" className="text-xs sm:text-sm">
                      Low Quality
                    </TabsTrigger>
                    <TabsTrigger value="medium" className="text-xs sm:text-sm">
                      Balanced
                    </TabsTrigger>
                    <TabsTrigger value="high" className="text-xs sm:text-sm">
                      High Quality
                    </TabsTrigger>
                    <TabsTrigger
                      value="advanced"
                      className="flex items-center gap-1.5 text-xs sm:text-sm text-primary font-semibold"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Advanced
                    </TabsTrigger>
                  </TabsList>

                  {/* Profile Descriptions (Simple modes) */}
                  {profile !== "advanced" && (
                    <div className="bg-primary/[0.03] border border-primary/10 rounded-lg p-4 mb-2 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">
                          {profileConfig[profile].label} Mode Activated
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {profileConfig[profile].hint}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-primary/30 text-primary"
                      >
                        Auto Optimized
                      </Badge>
                    </div>
                  )}

                  {/* Advanced settings */}
                  <TabsContent value="advanced" className="mt-0 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Video Codec */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">
                          Video Codec (-c:v)
                        </Label>
                        <Select
                          value={videoCodec}
                          onValueChange={setVideoCodec}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="libx264">
                              libx264 (H.264 - Best Compatibility)
                            </SelectItem>
                            <SelectItem value="libx265">
                              libx265 (HEVC - High Efficiency)
                            </SelectItem>
                            <SelectItem value="libvpx-vp9">
                              libvpx-vp9 (VP9 Webm Codec)
                            </SelectItem>
                            <SelectItem value="libaom-av1">
                              libaom-av1 (AV1 - Next-Gen)
                            </SelectItem>
                            <SelectItem value="copy">
                              copy (Direct Stream Copy / Remux)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Encoding Preset */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">
                          Encoding Preset (-preset)
                        </Label>
                        <Select
                          value={preset}
                          onValueChange={setPreset}
                          disabled={videoCodec === "copy"}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ultrafast">
                              ultrafast (Fastest speed · Largest size)
                            </SelectItem>
                            <SelectItem value="superfast">superfast</SelectItem>
                            <SelectItem value="veryfast">veryfast</SelectItem>
                            <SelectItem value="faster">faster</SelectItem>
                            <SelectItem value="fast">fast</SelectItem>
                            <SelectItem value="medium">
                              medium (Standard balance)
                            </SelectItem>
                            <SelectItem value="slow">
                              slow (Best compression ratio)
                            </SelectItem>
                            <SelectItem value="slower">
                              slower (Extreme compression)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* CRF Quality Slider */}
                      <div className="space-y-2 p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-gray-700">
                            Constant Rate Factor (-crf)
                          </Label>
                          <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {crf}
                          </span>
                        </div>
                        <div className="pt-2">
                          <Slider
                            value={[crf]}
                            min={0}
                            max={51}
                            step={1}
                            disabled={videoCodec === "copy" || bitrate !== ""}
                            onValueChange={(val) => setCrf(val[0])}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 pt-1">
                          <span>0 (Lossless)</span>
                          <span>18-23 (High Quality)</span>
                          <span>28 (Default HEVC)</span>
                          <span>51 (Worst)</span>
                        </div>
                      </div>

                      {/* Custom Target Bitrate */}
                      <div className="space-y-2 p-4 bg-gray-50 rounded-lg border">
                        <Label className="text-xs font-bold text-gray-700">
                          Target Video Bitrate (-b:v)
                        </Label>
                        <Input
                          placeholder="e.g. 1000k, 2.5M (Overrides CRF)"
                          value={bitrate}
                          disabled={videoCodec === "copy"}
                          onChange={(e) => setBitrate(e.target.value)}
                          className="bg-white"
                        />
                        <p className="text-[10px] text-gray-400">
                          Leave blank or set to &quot;auto&quot; to rely on CRF
                          quality-based compression instead.
                        </p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 border-t pt-4">
                      {/* Resolution scale */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">
                          Scale Resolution (-vf scale)
                        </Label>
                        <Select
                          value={resolution}
                          onValueChange={setResolution}
                          disabled={videoCodec === "copy"}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="original">
                              Keep Original Size
                            </SelectItem>
                            <SelectItem value="1920x1080">
                              1920x1080 (1080p Full HD)
                            </SelectItem>
                            <SelectItem value="1280x720">
                              1280x720 (720p HD)
                            </SelectItem>
                            <SelectItem value="854x480">
                              854x480 (480p SD)
                            </SelectItem>
                            <SelectItem value="640x360">
                              640x360 (360p Web)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Frame Rate */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">
                          Frame Rate / FPS (-r)
                        </Label>
                        <Select
                          value={fps}
                          onValueChange={setFps}
                          disabled={videoCodec === "copy"}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="original">
                              Keep Original Frame Rate
                            </SelectItem>
                            <SelectItem value="60">
                              60 FPS (Ultra Smooth)
                            </SelectItem>
                            <SelectItem value="30">
                              30 FPS (Standard Video)
                            </SelectItem>
                            <SelectItem value="24">
                              24 FPS (Cinematic)
                            </SelectItem>
                            <SelectItem value="15">
                              15 FPS (CCTV / Security)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 border-t pt-4">
                      {/* Audio Codec */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                          <Volume2 className="w-3.5 h-3.5" />
                          Audio Codec (-c:a)
                        </Label>
                        <Select
                          value={audioCodec}
                          onValueChange={setAudioCodec}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aac">
                              aac (Highly Compatible / standard)
                            </SelectItem>
                            <SelectItem value="libmp3lame">
                              libmp3lame (MP3)
                            </SelectItem>
                            <SelectItem value="copy">
                              copy (Pass-through keeps source track)
                            </SelectItem>
                            <SelectItem value="none">
                              none (Strip/Mute Audio stream)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Audio Bitrate */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">
                          Audio Bitrate (-b:a)
                        </Label>
                        <Select
                          value={audioBitrate}
                          onValueChange={setAudioBitrate}
                          disabled={
                            audioCodec === "copy" || audioCodec === "none"
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="original">
                              Keep Original Quality
                            </SelectItem>
                            <SelectItem value="64k">
                              64 Kbps (Voice / Low bandwidth)
                            </SelectItem>
                            <SelectItem value="128k">
                              128 Kbps (Standard quality)
                            </SelectItem>
                            <SelectItem value="192k">
                              192 Kbps (High fidelity)
                            </SelectItem>
                            <SelectItem value="256k">
                              256 Kbps (Premium audio)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Drop zone */}
            <Card
              className={`border-2 border-dashed transition-all cursor-pointer shadow-sm ${
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-white hover:border-primary/50 hover:bg-primary/[0.02]"
              }`}
              onDrop={onDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onClick={() => inputRef.current?.click()}
            >
              <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept="video/*,.mp4,.mkv,.mov,.avi,.webm,.ogg"
                  className="hidden"
                  onChange={(e) => e.target.files && addFiles(e.target.files)}
                />
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Upload className="w-7 h-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-700">
                    {dragging
                      ? "Release to drop videos"
                      : "Drop video files here or click to browse"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5 flex flex-wrap justify-center gap-1.5">
                    MPEG-4 (.mp4) · Matroska (.mkv) · QuickTime (.mov) · WebM
                    (.webm) · AVI (.avi)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* File List / Queue */}
            {files.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base flex items-center gap-2 font-bold">
                    <VideoIcon className="w-4 h-4 text-primary" />
                    Video Compression Queue
                    <Badge variant="secondary" className="ml-1 px-2 py-0">
                      {files.length}
                    </Badge>
                  </CardTitle>
                  <div className="flex gap-2">
                    {!processing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFiles([]);
                          setPreviewUrl(null);
                        }}
                        className="hover:cursor-pointer h-8 text-xs font-semibold"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Clear Queue
                      </Button>
                    )}
                    {pendingCount > 0 && (
                      <Button
                        size="sm"
                        onClick={handleCompressAll}
                        disabled={processing}
                        className="hover:cursor-pointer h-8 text-xs font-bold bg-primary shadow-sm"
                      >
                        {processing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Transcoding…
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 mr-1.5" />
                            Compress {pendingCount} Video
                            {pendingCount > 1 ? "s" : ""}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {files.map((item) => (
                    <FileRow
                      key={item.id}
                      item={item}
                      onRemove={() =>
                        setFiles((p) => p.filter((f) => f.id !== item.id))
                      }
                      processing={processing}
                      isActivePreview={previewUrl === item.result?.downloadUrl}
                      onPreview={() => {
                        if (item.result) {
                          setPreviewUrl(item.result.downloadUrl);
                          setPreviewName(item.result.filename);
                        }
                      }}
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-6">
            {/* 1. Dynamic Video Player */}
            {previewUrl && (
              <Card className="shadow-sm border-2 border-primary/20 overflow-hidden">
                <CardHeader className="pb-3 border-b bg-gray-50 flex flex-row items-center gap-2">
                  <Tv className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-bold text-gray-800 truncate flex-1">
                    Quality Preview Player
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="aspect-video bg-black flex items-center justify-center relative group">
                    <video
                      key={previewUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    >
                      <source src={previewUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <div className="p-3 bg-gray-50 border-t flex flex-col gap-1">
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      File: {previewName}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Instantly inspect and verify transcoding audio/video sync,
                      frame consistency, and visual fidelity.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 2. Cumulative Compression Stats Summary */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <TrendingDown className="w-4 h-4 text-primary" />
                  Space Saving Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {completed.length === 0 ? (
                  <div className="text-center py-6">
                    <VideoIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-xs text-gray-400">
                      No videos compressed yet. Processed results will show
                      real-time statistics here.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="text-xs font-semibold text-gray-700">
                        {completed.length} video
                        {completed.length > 1 ? "s" : ""} compressed
                        successfully!
                      </span>
                    </div>
                    <div className="space-y-3.5 border-t pt-3">
                      <div className="flex justify-between">
                        <Label className="text-xs text-gray-500 font-semibold">
                          Original Total Size
                        </Label>
                        <span className="text-xs font-bold text-gray-800 font-mono">
                          {fmtBytes(totalOrig)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <Label className="text-xs text-gray-500 font-semibold">
                          Compressed Total Size
                        </Label>
                        <span className="text-xs font-bold text-green-600 font-mono">
                          {fmtBytes(totalComp)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <Label className="text-xs text-gray-500 font-semibold">
                          Disk Space Saved
                        </Label>
                        <span className="text-xs font-bold text-primary font-mono">
                          {fmtBytes(totalOrig - totalComp)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <Label className="text-xs text-gray-500 font-semibold">
                          Fidelity Compression Ratio
                        </Label>
                        <Badge className="bg-primary border-none text-white hover:bg-primary font-mono font-bold">
                          {totalOrig > 0
                            ? `${savedPct(totalOrig, totalComp)}% Saved`
                            : "—"}
                        </Badge>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 3. Guide / How it works */}
            <Card className="shadow-sm bg-gradient-to-br from-white to-gray-50">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold">
                  Transcoder Quick Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 text-xs text-gray-600 leading-relaxed">
                <p>
                  1. <strong>Select Video</strong>: Add any video file via
                  dropping or clicking.
                </p>
                <p>
                  2. <strong>Set compressing parameters</strong>: Custom quality
                  CRF values, target bitrates, and video filters can be
                  specified under Advanced options.
                </p>
                <p>
                  3. <strong>Run compressing</strong>: Click Compress. The
                  server invokes built-in compressing tool and handles
                  formatting and container optimizations asynchronously.
                </p>
                <p>
                  4. <strong>Download or Preview</strong>: Stream directly
                  inside the Quality Preview Player or download immediately to
                  your local device.
                </p>
                <div className="bg-primary/5 p-2.5 rounded border border-primary/10 text-[10px] text-primary mt-2">
                  ℹ <strong>Optimizations:</strong> Codecs like H.265 (HEVC) or
                  VP9 provide excellent visuals under 50% smaller sizes, but
                  take slightly longer to transcode than classic H.264.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
