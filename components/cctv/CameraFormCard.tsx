"use client";

import React, { useState, useEffect } from "react";
import { parseRtspUrl, buildRtspUrl, ParsedRtspUrl } from "@/lib/security/encryption";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  Trash2,
  Video,
  ShieldCheck,
  Server,
  Activity,
  Zap,
} from "lucide-react";

export interface CameraConfig {
  id: number;
  name: string;
  sourceType: string;
  url: string;
  resolution: string;
  fps: string;
  enabled: boolean;

  // Advanced RTSP & Stream parameters
  rtspTransport?: string;
  threadQueueSize?: string;
  timeout?: string;
  reconnect?: string;
  probeSize?: string;
  analyzeDuration?: string;
  bufferSize?: string;
}

interface CameraFormCardProps {
  camera: CameraConfig;
  canRemove: boolean;
  onUpdate: (id: number, updatedFields: Partial<CameraConfig>) => void;
  onRemove: (id: number) => void;
}

interface TestResult {
  connected: boolean;
  codec?: string;
  resolution?: string;
  fps?: string;
  bitrate?: string;
  audio?: string;
  error?: string;
}

export default function CameraFormCard({
  camera,
  canRemove,
  onUpdate,
  onRemove,
}: CameraFormCardProps) {
  // Parse existing RTSP URL into form state
  const initialParsed = parseRtspUrl(camera.url);
  const [protocol, setProtocol] = useState(initialParsed.protocol || "rtsp");
  const [host, setHost] = useState(initialParsed.host || "");
  const [port, setPort] = useState(initialParsed.port || "554");
  const [path, setPath] = useState(initialParsed.path || "/");
  const [username, setUsername] = useState(initialParsed.username || "");
  const [password, setPassword] = useState(initialParsed.password || "");

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Advanced settings state
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [rtspTransport, setRtspTransport] = useState(camera.rtspTransport || "tcp");
  const [threadQueueSize, setThreadQueueSize] = useState(camera.threadQueueSize || "1024");
  const [timeout, setTimeoutVal] = useState(camera.timeout || "10");
  const [reconnect, setReconnect] = useState(camera.reconnect || "5");
  const [probeSize, setProbeSize] = useState(camera.probeSize || "32768");
  const [analyzeDuration, setAnalyzeDuration] = useState(camera.analyzeDuration || "1000000");
  const [bufferSize, setBufferSize] = useState(camera.bufferSize || "1024");

  // Connection Test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Sync internal structured form changes to parent camera.url
  useEffect(() => {
    if (camera.sourceType === "rtsp" || camera.sourceType === "rtmp" || camera.sourceType === "http") {
      const newUrl = buildRtspUrl({
        protocol,
        username,
        password,
        host,
        port,
        path,
      });
      if (newUrl !== camera.url) {
        onUpdate(camera.id, { url: newUrl });
      }
    }
  }, [protocol, host, port, path, username, password, camera.sourceType]);

  // Handle URL reconstruction on direct URL prop change
  useEffect(() => {
    const parsed = parseRtspUrl(camera.url);
    if (parsed.host && parsed.host !== host) setHost(parsed.host);
    if (parsed.port && parsed.port !== port) setPort(parsed.port);
    if (parsed.path && parsed.path !== path) setPath(parsed.path);
    if (parsed.username !== username) setUsername(parsed.username);
    if (parsed.password !== password) setPassword(parsed.password);
  }, [camera.url]);

  // Compute live URL Preview
  const maskedPreview = buildRtspUrl({
    protocol,
    username,
    password: password ? "********" : "",
    host,
    port,
    path,
  });

  const unmaskedPreview = buildRtspUrl({
    protocol,
    username,
    password,
    host,
    port,
    path,
  });

  const currentPreview = showPassword ? unmaskedPreview : maskedPreview;

  // Handle Test Connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/camera/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: unmaskedPreview,
          rtspTransport,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        connected: false,
        error: "Failed to communicate with connection test server.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="bg-card/90 border-border/80 shadow-md backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                {camera.name || `Camera ${camera.id}`}
                {camera.enabled ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
                    Disabled
                  </Badge>
                )}
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <Switch
                id={`camera-enable-${camera.id}`}
                checked={camera.enabled}
                onCheckedChange={(checked) => onUpdate(camera.id, { enabled: checked })}
              />
              <Label htmlFor={`camera-enable-${camera.id}`} className="text-xs text-muted-foreground cursor-pointer">
                {camera.enabled ? "Active" : "Inactive"}
              </Label>
            </div>
            {canRemove && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(camera.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                title="Remove Camera"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-5">
        {/* Section 1: Camera Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`cam-name-${camera.id}`} className="text-xs font-medium text-muted-foreground">
              Camera Name
            </Label>
            <Input
              id={`cam-name-${camera.id}`}
              value={camera.name}
              onChange={(e) => onUpdate(camera.id, { name: e.target.value })}
              placeholder="e.g. Lobby Entrance North"
              className="bg-background/50 border-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`cam-source-${camera.id}`} className="text-xs font-medium text-muted-foreground">
              Source Type
            </Label>
            <Select
              value={camera.sourceType}
              onValueChange={(val) => onUpdate(camera.id, { sourceType: val })}
            >
              <SelectTrigger id={`cam-source-${camera.id}`} className="bg-background/50">
                <SelectValue placeholder="Select Source Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rtsp">RTSP Stream (Network Camera / NVR)</SelectItem>
                {/* <SelectItem value="rtmp">RTMP Live Feed</SelectItem>
                <SelectItem value="http">HTTP / HTTPS Stream (MJPEG / HLS)</SelectItem>
                <SelectItem value="onvif">ONVIF Camera</SelectItem>
                <SelectItem value="usb">USB Camera / DirectShow</SelectItem>
                <SelectItem value="file">Local Video File</SelectItem> */}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Section 2: Connection Configuration */}
        {camera.sourceType === "rtsp" || camera.sourceType === "rtmp" || camera.sourceType === "http" ? (
          <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Server className="w-4 h-4 text-primary" />
              <span>Connection Parameters</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3 space-y-1.5">
                <Label htmlFor={`protocol-${camera.id}`} className="text-xs text-muted-foreground">
                  Protocol
                </Label>
                <Select value={protocol} onValueChange={(v) => setProtocol(v)}>
                  <SelectTrigger id={`protocol-${camera.id}`} className="bg-background/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rtsp">RTSP</SelectItem>
                    <SelectItem value="rtmp">RTMP</SelectItem>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="https">HTTPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-5 space-y-1.5">
                <Label htmlFor={`host-${camera.id}`} className="text-xs text-muted-foreground">
                  Host / IP Address
                </Label>
                <Input
                  id={`host-${camera.id}`}
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="192.168.0.128"
                  className="bg-background/70 font-mono text-sm"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor={`port-${camera.id}`} className="text-xs text-muted-foreground">
                  Port
                </Label>
                <Input
                  id={`port-${camera.id}`}
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="554"
                  className="bg-background/70 font-mono text-sm"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor={`path-${camera.id}`} className="text-xs text-muted-foreground">
                  Stream Path
                </Label>
                <Input
                  id={`path-${camera.id}`}
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/ch1/0"
                  className="bg-background/70 font-mono text-sm"
                />
              </div>
            </div>

            {/* Section 3: Authentication */}
            <div className="pt-2 border-t border-border/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Authentication Credentials</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`username-${camera.id}`} className="text-xs text-muted-foreground">
                    Username
                  </Label>
                  <Input
                    id={`username-${camera.id}`}
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="bg-background/70"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`password-${camera.id}`} className="text-xs text-muted-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id={`password-${camera.id}`}
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-background/70 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Dynamic Generated URL Preview */}
            <div className="pt-2 border-t border-border/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Generated URL Preview
                </span>
                <span className="text-[11px] text-muted-foreground/80">
                  {showPassword ? "Showing Plaintext Password" : "Password Masked"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-background/80 border border-border/80 font-mono text-xs text-emerald-400 break-all select-all flex items-center justify-between">
                <span>{currentPreview}</span>
              </div>
            </div>

            {/* Section 5: Test Connection Action */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={isTesting || !host}
                  className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 gap-2 font-medium"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Testing Connection...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-primary" />
                      <span>Test Connection</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Test Results Display Card */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    testResult.connected
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {testResult.connected ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1.5 text-xs w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">
                          {testResult.connected ? "Connection Successful" : "Connection Failed"}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            testResult.connected
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : "bg-destructive/20 text-destructive-foreground border-destructive/40"
                          }
                        >
                          {testResult.connected ? "ONLINE" : "OFFLINE"}
                        </Badge>
                      </div>

                      {testResult.connected ? (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-[11px] text-foreground/90 bg-background/50 p-2 rounded-lg border border-border/40">
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Codec</span>
                            <span className="font-semibold text-emerald-400">{testResult.codec}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Resolution</span>
                            <span className="font-semibold">{testResult.resolution}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">FPS</span>
                            <span className="font-semibold">{testResult.fps}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Bitrate</span>
                            <span className="font-semibold">{testResult.bitrate}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Audio</span>
                            <span className="font-semibold">{testResult.audio}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-destructive-foreground text-xs leading-relaxed">
                          {testResult.error || "Unable to reach camera stream."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Fallback for non-network sources (USB / File) */
          <div className="space-y-2">
            <Label htmlFor={`custom-url-${camera.id}`} className="text-xs font-medium text-muted-foreground">
              Device Path / File URL
            </Label>
            <Input
              id={`custom-url-${camera.id}`}
              value={camera.url}
              onChange={(e) => onUpdate(camera.id, { url: e.target.value })}
              placeholder={camera.sourceType === "usb" ? "/dev/video0" : "/storage/video.mp4"}
              className="bg-background/50 font-mono text-sm"
            />
          </div>
        )}

        {/* Section 6: Standard Resolution & Frame Rate Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-border/40">
          <div className="space-y-2">
            <Label htmlFor={`res-${camera.id}`} className="text-xs font-medium text-muted-foreground">
              Resolution
            </Label>
            <Select
              value={camera.resolution}
              onValueChange={(val) => onUpdate(camera.id, { resolution: val })}
            >
              <SelectTrigger id={`res-${camera.id}`} className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto Detect</SelectItem>
                <SelectItem value="3840x2160">3840x2160 (4K UHD)</SelectItem>
                <SelectItem value="2560x1440">2560x1440 (2K QHD)</SelectItem>
                <SelectItem value="1920x1080">1920x1080 (1080p FHD)</SelectItem>
                <SelectItem value="1280x720">1280x720 (720p HD)</SelectItem>
                <SelectItem value="640x480">640x480 (480p SD)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`fps-${camera.id}`} className="text-xs font-medium text-muted-foreground">
              Frame Rate (FPS)
            </Label>
            <Select
              value={camera.fps}
              onValueChange={(val) => onUpdate(camera.id, { fps: val })}
            >
              <SelectTrigger id={`fps-${camera.id}`} className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 FPS</SelectItem>
                <SelectItem value="24">24 FPS</SelectItem>
                <SelectItem value="25">25 FPS</SelectItem>
                <SelectItem value="30">30 FPS</SelectItem>
                <SelectItem value="60">60 FPS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Section 7: Advanced Collapsible Settings */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen} className="pt-2">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground py-2 h-auto"
            >
              <span className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-primary" />
                Advanced Settings
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isAdvancedOpen ? "rotate-180" : ""
                }`}
              />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-4 pt-3 border-t border-border/40 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`transport-${camera.id}`} className="text-xs text-muted-foreground">
                  RTSP Transport
                </Label>
                <Select
                  value={rtspTransport}
                  onValueChange={(val) => {
                    setRtspTransport(val);
                    onUpdate(camera.id, { rtspTransport: val });
                  }}
                >
                  <SelectTrigger id={`transport-${camera.id}`} className="bg-background/70 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tcp">TCP (Reliable, Recommended)</SelectItem>
                    <SelectItem value="udp">UDP (Low Latency)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`threadqueue-${camera.id}`} className="text-xs text-muted-foreground">
                  Thread Queue Size
                </Label>
                <Input
                  id={`threadqueue-${camera.id}`}
                  value={threadQueueSize}
                  onChange={(e) => {
                    setThreadQueueSize(e.target.value);
                    onUpdate(camera.id, { threadQueueSize: e.target.value });
                  }}
                  placeholder="1024"
                  className="bg-background/70 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`timeout-${camera.id}`} className="text-xs text-muted-foreground">
                  Timeout (sec)
                </Label>
                <Input
                  id={`timeout-${camera.id}`}
                  value={timeout}
                  onChange={(e) => {
                    setTimeoutVal(e.target.value);
                    onUpdate(camera.id, { timeout: e.target.value });
                  }}
                  placeholder="10"
                  className="bg-background/70 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`reconnect-${camera.id}`} className="text-xs text-muted-foreground">
                  Reconnect (sec)
                </Label>
                <Input
                  id={`reconnect-${camera.id}`}
                  value={reconnect}
                  onChange={(e) => {
                    setReconnect(e.target.value);
                    onUpdate(camera.id, { reconnect: e.target.value });
                  }}
                  placeholder="5"
                  className="bg-background/70 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`probesize-${camera.id}`} className="text-xs text-muted-foreground">
                  Probe Size (bytes)
                </Label>
                <Input
                  id={`probesize-${camera.id}`}
                  value={probeSize}
                  onChange={(e) => {
                    setProbeSize(e.target.value);
                    onUpdate(camera.id, { probeSize: e.target.value });
                  }}
                  placeholder="32768"
                  className="bg-background/70 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`analyzeduration-${camera.id}`} className="text-xs text-muted-foreground">
                  Analyze Duration (µs)
                </Label>
                <Input
                  id={`analyzeduration-${camera.id}`}
                  value={analyzeDuration}
                  onChange={(e) => {
                    setAnalyzeDuration(e.target.value);
                    onUpdate(camera.id, { analyzeDuration: e.target.value });
                  }}
                  placeholder="1000000"
                  className="bg-background/70 font-mono text-xs"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
