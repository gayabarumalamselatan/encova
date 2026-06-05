"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  Square,
  RotateCcw,
  Settings,
  Video,
  AudioWaveform,
  Monitor,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Trash2,
  ArrowLeftIcon,
} from "lucide-react";

interface Camera {
  id: number;
  name: string;
  sourceType: string;
  url: string;
  resolution: string;
  fps: string;
  enabled: boolean;
}

interface Output {
  id: number;
  type: string;
  url: string;
  enabled: boolean;
  cameraMappings: number[]; // array of camera IDs
}

export default function Encode() {
  const [autostart, setAutostart] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [encoderStatus, setEncoderStatus] = useState<
    "stopped" | "running" | "error"
  >("stopped");
  const [deviceIp, setDeviceIp] = useState<string>("127.0.0.1");
  const [networkAdapters, setNetworkAdapters] = useState<
    { name: string; ip: string }[]
  >([]);

  const [cameras, setCameras] = useState<Camera[]>([
    {
      id: 1,
      name: "Camera 1",
      sourceType: "rtsp",
      url: "rtsp://username:password@192.168.x.x:554/ch1/0",
      resolution: "1920x1080",
      fps: "30",
      enabled: true,
    },
  ]);
  const [outputs, setOutputs] = useState<Output[]>([
    {
      id: 1,
      type: "rtmp",
      url: "rtmp://127.0.0.1/live/stream",
      enabled: true,
      cameraMappings: [1],
    },
  ]);
  const [streamSettings, setStreamSettings] = useState({
    buffer: "1024",
    timeout: "10",
    reconnect: "5",
    videoCodec: "h264",
    preset: "fast",
    bitrate: "512k",
    outputResolution: "1280x720",
    keyframe: "2",
    hardwareAccel: false,
    twoPass: false,
    audioCodec: "aac",
    audioBitrate: "128k",
    sampleRate: "44100",
    channels: "2",
    audioFilter: false,
    noiseReduction: false,
  });

  const [nasConfig, setNasConfig] = useState<{
    storageMode: "stream" | "record";
    type: "smb" | "nfs";
    address: string;
    sharePath: string;
    username?: string;
    password?: string;
    retentionDays: number;
    segmentDuration: number;
    folderPattern: string;
  }>({
    storageMode: "stream",
    type: "smb",
    address: "",
    sharePath: "",
    username: "",
    password: "",
    retentionDays: 30,
    segmentDuration: 5,
    folderPattern: "{cameraId}/{YYYY}/{MM}/{DD}",
  });

  const [nasStatus, setNasStatus] = useState<any>(null);

  const [logs, setLogs] = useState([
    "[2024-01-15 10:30:15] Encoder initialized",
    "[2024-01-15 10:30:16] Input source connected: RTSP",
    "[2024-01-15 10:30:17] Video codec: H.264, Audio codec: AAC",
    "[2024-01-15 10:30:18] Ready to start encoding...",
  ]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (data.cameras && data.cameras.length > 0) setCameras(data.cameras);
        if (data.outputs && data.outputs.length > 0) setOutputs(data.outputs);

        if (data.streamSettings) setStreamSettings(data.streamSettings);
        if (data.nasConfig) setNasConfig(data.nasConfig);
        if (data.autostart) {
          setAutostart(data.autostart || false);
        }
        setInitialized(true);
      } catch (err) {}
    };
    loadSettings();

    // Load NAS Status
    const fetchNasStatus = async () => {
      try {
        const res = await fetch("/api/nas/status");
        if (res.ok) {
          const data = await res.json();
          setNasStatus(data);
        }
      } catch (err) {}
    };
    fetchNasStatus();
    const interval = setInterval(fetchNasStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const saveSettings = async () => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cameras,
          outputs,
          streamSettings,
          autostart,
          nasConfig,
        }),
      });
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleString()}] Configuration saved to file.`,
      ]);
    } catch (err) {}
  };

  const addCamera = () => {
    if (cameras.length >= 10) return;
    const newId = Math.max(...cameras.map((c) => c.id), 0) + 1;
    setCameras([
      ...cameras,
      {
        id: newId,
        name: `Camera ${newId}`,
        sourceType: "rtsp",
        url: "",
        resolution: "1920x1080",
        fps: "30",
        enabled: true,
      },
    ]);

    const newOutId = Math.max(...outputs.map((o) => o.id), 0) + 1;
    setOutputs([
      ...outputs,
      {
        id: newOutId,
        type: "rtmp",
        // url: `rtmp://${deviceIp}/live/stream${newOutId}`,
        url: `rtmp://127.0.0.1/live/stream${newOutId}`,
        enabled: true,
        cameraMappings: [newId],
      },
    ]);
  };

  const removeCamera = (id: number) => {
    setCameras(cameras.filter((c) => c.id !== id));
    // Remove camera from all output mappings
    setOutputs(
      outputs.map((o) => ({
        ...o,
        cameraMappings: o.cameraMappings.filter((cId) => cId !== id),
      })),
    );
  };

  const updateCamera = (id: number, field: string, value: string | boolean) => {
    setCameras(
      cameras.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  };

  const addOutput = () => {
    const newId = Math.max(...outputs.map((o) => o.id), 0) + 1;
    setOutputs([
      ...outputs,
      // { id: newId, type: "rtmp", url: `rtmp://${deviceIp}/live/stream${newId}`, enabled: true, cameraMappings: [] },
      {
        id: newId,
        type: "rtmp",
        url: `rtmp://127.0.0.1/live/stream${newId}`,
        enabled: true,
        cameraMappings: [],
      },
    ]);
  };

  const removeOutput = (id: number) => {
    setOutputs(outputs.filter((o) => o.id !== id));
  };

  const updateOutput = (
    id: number,
    field: string,
    value: string | boolean | number[],
  ) => {
    setOutputs(
      outputs.map((o) => (o.id === id ? { ...o, [field]: value } : o)),
    );
  };

  const toggleCameraMapping = (outputId: number, cameraId: number) => {
    setOutputs(
      outputs.map((o) => {
        if (o.id === outputId) {
          const newMappings = o.cameraMappings.includes(cameraId)
            ? o.cameraMappings.filter((id) => id !== cameraId)
            : [...o.cameraMappings, cameraId];
          return { ...o, cameraMappings: newMappings };
        }
        return o;
      }),
    );
  };

  const handleStart = async () => {
    const enabledCameras = cameras.filter((c) => c.enabled);
    const enabledOutputs = outputs.filter(
      (o) => o.enabled && o.cameraMappings.length > 0,
    );

    if (enabledCameras.length === 0) {
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleString()}] Error: No cameras enabled`,
      ]);
      return;
    }

    if (enabledOutputs.length === 0) {
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleString()}] Error: No outputs configured`,
      ]);
      return;
    }

    // Warn if 1080p + 128 kbps is selected
    if (
      streamSettings.outputResolution === "1920x1080" &&
      streamSettings.bitrate === "128k"
    ) {
      // Just a warning, not blocking
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleString()}] Warning: Selected bitrate (128 kbps) may produce poor image quality at 1080p resolution.`,
      ]);
    }

    const summary = `Encoder Summary:
Codec      : ${streamSettings.videoCodec === "h265" ? "H.265" : "H.264"}
Resolution : ${streamSettings.outputResolution}
Bitrate    : ${streamSettings.bitrate.replace("k", " kbps")}
Preset     : ${streamSettings.preset}
Recording  : ${nasConfig.storageMode === "record" ? "Enabled" : "Disabled"}

Do you want to start encoding?`;

    if (!window.confirm(summary)) return;

    await fetch("/api/encoder/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cameras: enabledCameras.map((c) => ({
          id: c.id,
          name: c.name,
          sourceType: c.sourceType,
          url: c.url,
          resolution: c.resolution,
          fps: c.fps,
        })),
        outputs: enabledOutputs.map((o) => ({
          id: o.id,
          type: o.type,
          url: o.url,
          cameraMappings: o.cameraMappings,
        })),
        nasConfig,
        streamSettings,
      }),
    });
    setEncoderStatus("running");
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleString()}] Encoding started with ${enabledCameras.length} camera(s) and ${enabledOutputs.length} output(s)`,
    ]);
  };

  const handleStop = async () => {
    await fetch("/api/encoder/stop", { method: "POST" });
    setEncoderStatus("stopped");
  };

  const handleRestart = () => {
    setEncoderStatus("stopped");
    setTimeout(() => {
      setEncoderStatus("running");
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleString()}] Encoder restarted`,
      ]);
    }, 1000);
  };

  const getStatusIcon = () => {
    switch (encoderStatus) {
      case "running":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (encoderStatus) {
      case "running":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  useEffect(() => {
    const fetchIp = async () => {
      try {
        const res = await fetch("/api/network/ip");
        const data = await res.json();
        if (data.adapters) {
          setNetworkAdapters(data.adapters);
        }
        if (data.ip) {
          setDeviceIp(data.ip);
          setOutputs((prev) =>
            prev.map((o) =>
              o.url === "rtmp://127.0.0.1/live/stream1"
                ? { ...o, url: `rtmp://${data.ip}/live/stream1` }
                : o,
            ),
          );
        }
      } catch (err) {}
    };
    fetchIp();
  }, []);

  // useEffect(() => {
  //   const interval = setInterval(async () => {
  //     const res = await fetch("/api/encoder/logs");
  //     const data = await res.json();
  //     setLogs(data.logs);
  //   }, 2000);

  //   return () => clearInterval(interval);
  // }, []);

  useEffect(() => {
    if (encoderStatus === "running") {
      const interval = setInterval(async () => {
        const res = await fetch("/api/encoder/logs");
        const data = await res.json();
        setLogs(data.logs);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [encoderStatus]);

  useEffect(() => {
    if (!initialized) return;

    if (autostart && encoderStatus !== "running") {
      console.log("autostart encoder triggered");
      handleStart();
    }
  }, [initialized, autostart]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Button
          variant="outline"
          className="hover:cursor-pointer"
          onClick={() => window.history.back()}
        >
          <ArrowLeftIcon />
          Back to Home
        </Button>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-row gap-3">
            <img src="images/logo.png" alt="Logo" className="w-20" />
            <div className="flex flex-col justify-center">
              <h1 className="text-3xl font-bold text-gray-900">
                ASISGO Video Encoding
              </h1>
              <p className="text-gray-600 mt-1">
                Configure your video encoding parameters
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={saveSettings}
              className="hover:cursor-pointer"
            >
              Save Configuration
            </Button>
            {getStatusIcon()}
            <Badge
              variant={encoderStatus === "running" ? "default" : "secondary"}
              className="capitalize"
            >
              {encoderStatus}
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="cameras" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger
                  value="cameras"
                  className="flex items-center gap-2 hover:cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  Cameras
                </TabsTrigger>
                <TabsTrigger
                  value="input"
                  className="flex items-center gap-2 hover:cursor-pointer"
                >
                  <Monitor className="w-4 h-4" />
                  Input
                </TabsTrigger>
                <TabsTrigger
                  value="video"
                  className="flex items-center gap-2 hover:cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  Video
                </TabsTrigger>
                <TabsTrigger
                  value="audio"
                  className="flex items-center gap-2 hover:cursor-pointer"
                >
                  <AudioWaveform className="w-4 h-4" />
                  Audio
                </TabsTrigger>
                <TabsTrigger
                  value="output"
                  className="flex items-center gap-2 hover:cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                  Output
                </TabsTrigger>
              </TabsList>

              {/* Cameras Management */}
              <TabsContent value="cameras">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="w-5 h-5" />
                      Camera Management
                    </CardTitle>
                    <CardDescription>
                      Add and configure your video camera sources
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        Connected Cameras ({cameras.length}/10)
                      </h3>
                      {cameras.length < 10 && (
                        <Button
                          onClick={addCamera}
                          size="sm"
                          className="flex items-center gap-2 hover:cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          Add Camera
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {cameras.map((camera, index) => (
                        <Card key={camera.id} className="border-2">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={camera.enabled}
                                  onCheckedChange={(checked) =>
                                    updateCamera(camera.id, "enabled", checked)
                                  }
                                />
                                <Label className="font-medium">
                                  {camera.name}
                                </Label>
                              </div>
                              {cameras.length > 1 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeCamera(camera.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-2">
                                <Label htmlFor={`camera-name-${camera.id}`}>
                                  Camera Name
                                </Label>
                                <Input
                                  id={`camera-name-${camera.id}`}
                                  value={camera.name}
                                  onChange={(e) =>
                                    updateCamera(
                                      camera.id,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Camera 1"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`source-type-${camera.id}`}>
                                  Source Type
                                </Label>
                                <Select
                                  value={camera.sourceType}
                                  onValueChange={(value) =>
                                    updateCamera(camera.id, "sourceType", value)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="rtsp">
                                      RTSP Stream
                                    </SelectItem>
                                    <SelectItem value="usb">
                                      USB Camera
                                    </SelectItem>
                                    <SelectItem value="webcam">
                                      Webcam
                                    </SelectItem>
                                    <SelectItem value="onvif">
                                      ONVIF Camera
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-2">
                                <Label htmlFor={`camera-url-${camera.id}`}>
                                  URL/Device Path
                                </Label>
                                <Input
                                  id={`camera-url-${camera.id}`}
                                  value={camera.url}
                                  onChange={(e) =>
                                    updateCamera(
                                      camera.id,
                                      "url",
                                      e.target.value,
                                    )
                                  }
                                  placeholder={
                                    camera.sourceType === "rtsp"
                                      ? "rtsp://username:password@192.168.x.x:554/ch1/0"
                                      : "/dev/video0"
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`camera-res-${camera.id}`}>
                                  Resolution
                                </Label>
                                <Select
                                  value={camera.resolution}
                                  onValueChange={(value) =>
                                    updateCamera(camera.id, "resolution", value)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="auto">
                                      Auto Detect
                                    </SelectItem>
                                    <SelectItem value="1920x1080">
                                      1920x1080 (1080p)
                                    </SelectItem>
                                    <SelectItem value="1280x720">
                                      1280x720 (720p)
                                    </SelectItem>
                                    <SelectItem value="640x480">
                                      640x480 (480p)
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`camera-fps-${camera.id}`}>
                                Frame Rate (FPS)
                              </Label>
                              <Select
                                value={camera.fps}
                                onValueChange={(value) =>
                                  updateCamera(camera.id, "fps", value)
                                }
                              >
                                <SelectTrigger>
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
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Input Settings */}
              <TabsContent value="input">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Monitor className="w-5 h-5" />
                      Global Input Settings
                    </CardTitle>
                    <CardDescription>
                      Configure global encoding parameters that apply to all
                      cameras
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="buffer">Buffer Size</Label>
                        <Input
                          id="buffer"
                          placeholder="1024"
                          value={streamSettings.buffer}
                          onChange={(e) =>
                            setStreamSettings({
                              ...streamSettings,
                              buffer: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timeout">Connection Timeout (s)</Label>
                        <Input
                          id="timeout"
                          placeholder="10"
                          value={streamSettings.timeout}
                          onChange={(e) =>
                            setStreamSettings({
                              ...streamSettings,
                              timeout: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reconnect">Reconnect Delay (s)</Label>
                        <Input
                          id="reconnect"
                          placeholder="5"
                          value={streamSettings.reconnect}
                          onChange={(e) =>
                            setStreamSettings({
                              ...streamSettings,
                              reconnect: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Video Encode Settings */}
              <TabsContent value="video">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="w-5 h-5" />
                      Video Encoding
                    </CardTitle>
                    <CardDescription>
                      Configure video codec and quality settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="video-codec">Video Codec</Label>
                        <Select
                          value={streamSettings.videoCodec}
                          onValueChange={(val) =>
                            setStreamSettings({
                              ...streamSettings,
                              videoCodec: val,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="h264">H.264 (AVC)</SelectItem>
                            <SelectItem value="h265">H.265 (HEVC)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preset">Encoding Preset</Label>
                        <Select
                          value={streamSettings.preset}
                          onValueChange={(val) =>
                            setStreamSettings({
                              ...streamSettings,
                              preset: val,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ultrafast">ultrafast</SelectItem>
                            <SelectItem value="superfast">superfast</SelectItem>
                            <SelectItem value="veryfast">veryfast</SelectItem>
                            <SelectItem value="faster">faster</SelectItem>
                            <SelectItem value="fast">fast</SelectItem>
                            <SelectItem value="medium">medium</SelectItem>
                            <SelectItem value="slow">slow</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bitrate">Video Bitrate</Label>
                        <Select
                          value={streamSettings.bitrate}
                          onValueChange={(val) =>
                            setStreamSettings({
                              ...streamSettings,
                              bitrate: val,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="128k">128 kbps</SelectItem>
                            <SelectItem value="256k">256 kbps</SelectItem>
                            <SelectItem value="512k">512 kbps</SelectItem>
                            <SelectItem value="768k">768 kbps</SelectItem>
                            <SelectItem value="1000k">1 Mbps</SelectItem>
                            <SelectItem value="2000k">2 Mbps</SelectItem>
                            <SelectItem value="4000k">4 Mbps</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="output-resolution">
                          Output Resolution
                        </Label>
                        <Select
                          value={streamSettings.outputResolution}
                          onValueChange={(val) =>
                            setStreamSettings({
                              ...streamSettings,
                              outputResolution: val,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="same">Same as Input</SelectItem>
                            <SelectItem value="1920x1080">
                              1920x1080 (1080p)
                            </SelectItem>
                            <SelectItem value="1280x720">
                              1280x720 (720p)
                            </SelectItem>
                            <SelectItem value="854x480">
                              854x480 (480p)
                            </SelectItem>
                            <SelectItem value="640x360">
                              640x360 (360p)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {streamSettings.outputResolution === "1920x1080" &&
                          streamSettings.bitrate === "128k" && (
                            <p className="text-xs text-amber-600 mt-1 font-medium">
                              Selected bitrate may produce poor image quality at
                              this resolution.
                            </p>
                          )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="keyframe">Keyframe Interval</Label>
                        <Input
                          id="keyframe"
                          placeholder="2"
                          value={streamSettings.keyframe}
                          onChange={(e) =>
                            setStreamSettings({
                              ...streamSettings,
                              keyframe: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="hardware-accel"
                          checked={streamSettings.hardwareAccel}
                          onCheckedChange={(val) =>
                            setStreamSettings({
                              ...streamSettings,
                              hardwareAccel: val,
                            })
                          }
                        />
                        <Label htmlFor="hardware-accel">
                          Enable Hardware Acceleration
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="two-pass"
                          checked={streamSettings.twoPass}
                          onCheckedChange={(val) =>
                            setStreamSettings({
                              ...streamSettings,
                              twoPass: val,
                            })
                          }
                        />
                        <Label htmlFor="two-pass">Two-Pass Encoding</Label>
                      </div>
                    </div> */}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Audio Encode Settings */}
              <TabsContent value="audio">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AudioWaveform className="w-5 h-5" />
                      Audio Encoding
                    </CardTitle>
                    <CardDescription>
                      Configure audio codec and quality settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="audio-codec">Audio Codec</Label>
                        <Select
                          value={streamSettings.audioCodec}
                          onValueChange={(val) =>
                            setStreamSettings({
                              ...streamSettings,
                              audioCodec: val,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aac">AAC</SelectItem>
                            <SelectItem value="mp3">MP3</SelectItem>
                            <SelectItem value="copy">
                              Copy (No Re-encode)
                            </SelectItem>
                            <SelectItem value="disable">
                              Disable Audio
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="audio-bitrate">Audio Bitrate</Label>
                        <Select
                          value={streamSettings.audioBitrate}
                          onValueChange={(val) =>
                            setStreamSettings({
                              ...streamSettings,
                              audioBitrate: val,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="64k">64 Kbps</SelectItem>
                            <SelectItem value="128k">128 Kbps</SelectItem>
                            <SelectItem value="192k">192 Kbps</SelectItem>
                            <SelectItem value="256k">256 Kbps</SelectItem>
                            <SelectItem value="320k">320 Kbps</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sample-rate">Sample Rate</Label>
                        <Select
                          value={streamSettings.sampleRate}
                          onValueChange={(val) =>
                            setStreamSettings({
                              ...streamSettings,
                              sampleRate: val,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="22050">22.05 kHz</SelectItem>
                            <SelectItem value="44100">44.1 kHz</SelectItem>
                            <SelectItem value="48000">48 kHz</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="channels">Audio Channels</Label>
                        <Select
                          value={streamSettings.channels}
                          onValueChange={(val) =>
                            setStreamSettings({
                              ...streamSettings,
                              channels: val,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Mono</SelectItem>
                            <SelectItem value="2">Stereo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="audio-filter"
                          checked={streamSettings.audioFilter}
                          onCheckedChange={(val) =>
                            setStreamSettings({
                              ...streamSettings,
                              audioFilter: val,
                            })
                          }
                        />
                        <Label htmlFor="audio-filter">
                          Enable Audio Filters
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="noise-reduction"
                          checked={streamSettings.noiseReduction}
                          onCheckedChange={(val) =>
                            setStreamSettings({
                              ...streamSettings,
                              noiseReduction: val,
                            })
                          }
                        />
                        <Label htmlFor="noise-reduction">Noise Reduction</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Output Settings */}
              <TabsContent value="output">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Output Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure streaming and recording outputs
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {networkAdapters.length > 0 && (
                      <div className="space-y-2 mb-6 p-4 border rounded-md bg-white">
                        <Label
                          htmlFor="network-adapter"
                          className="text-base font-semibold"
                        >
                          Broadcasting Network Adapter
                        </Label>
                        <p className="text-sm text-gray-500 mb-2">
                          Select the network adapter to use for generating real
                          streaming IPs.
                        </p>
                        <Select
                          value={deviceIp}
                          onValueChange={(val) => {
                            const oldIp = deviceIp;
                            setDeviceIp(val);
                            // Set all outputs that currently have the old IP to new IP
                            // setOutputs((prev) =>
                            //   prev.map((o) => {
                            //     if (o.url.includes(oldIp)) {
                            //       return { ...o, url: o.url.replace(oldIp, val) };
                            //     }
                            //     return o;
                            //   })
                            // );
                          }}
                        >
                          <SelectTrigger id="network-adapter">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {networkAdapters.map((adapter, idx) => (
                              <SelectItem key={idx} value={adapter.ip}>
                                {adapter.name} ({adapter.ip})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Storage Mode */}
                    <div className="space-y-4 mb-6 p-4 border rounded-md bg-white">
                      <Label className="text-base font-semibold">
                        Storage Mode
                      </Label>
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="mode-stream"
                            name="storageMode"
                            value="stream"
                            checked={nasConfig.storageMode === "stream"}
                            onChange={() =>
                              setNasConfig({
                                ...nasConfig,
                                storageMode: "stream",
                              })
                            }
                            className="w-4 h-4 text-blue-600"
                          />
                          <Label
                            htmlFor="mode-stream"
                            className="cursor-pointer"
                          >
                            NVR
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="mode-record"
                            name="storageMode"
                            value="record"
                            checked={nasConfig.storageMode === "record"}
                            onChange={() =>
                              setNasConfig({
                                ...nasConfig,
                                storageMode: "record",
                              })
                            }
                            className="w-4 h-4 text-blue-600"
                          />
                          <Label
                            htmlFor="mode-record"
                            className="cursor-pointer"
                          >
                            NAS / Storage
                          </Label>
                        </div>
                      </div>

                      {nasConfig.storageMode === "record" && (
                        <div className="mt-4 pt-4 border-t space-y-4">
                          <h4 className="font-semibold text-gray-800">
                            NAS Configuration
                          </h4>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Storage Type</Label>
                              <Select
                                value={nasConfig.type}
                                onValueChange={(val: any) =>
                                  setNasConfig({ ...nasConfig, type: val })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="smb">
                                    SMB / CIFS
                                  </SelectItem>
                                  <SelectItem value="nfs">NFS</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>NAS Address</Label>
                              <Input
                                value={nasConfig.address}
                                onChange={(e) =>
                                  setNasConfig({
                                    ...nasConfig,
                                    address: e.target.value,
                                  })
                                }
                                placeholder="192.168.1.10"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Share Path</Label>
                              <Input
                                value={nasConfig.sharePath}
                                onChange={(e) =>
                                  setNasConfig({
                                    ...nasConfig,
                                    sharePath: e.target.value,
                                  })
                                }
                                placeholder="/CCTV"
                              />
                            </div>
                            {nasConfig.type === "smb" && (
                              <>
                                <div className="space-y-2">
                                  <Label>Username</Label>
                                  <Input
                                    value={nasConfig.username || ""}
                                    onChange={(e) =>
                                      setNasConfig({
                                        ...nasConfig,
                                        username: e.target.value,
                                      })
                                    }
                                    placeholder="admin"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Password</Label>
                                  <Input
                                    type="password"
                                    value={nasConfig.password || ""}
                                    onChange={(e) =>
                                      setNasConfig({
                                        ...nasConfig,
                                        password: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </>
                            )}
                            <div className="space-y-2">
                              <Label>Retention Period (Days)</Label>
                              <Input
                                type="number"
                                value={nasConfig.retentionDays}
                                onChange={(e) =>
                                  setNasConfig({
                                    ...nasConfig,
                                    retentionDays:
                                      parseInt(e.target.value) || 30,
                                  })
                                }
                                placeholder="30"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Segment Duration (Minutes)</Label>
                              <Input
                                type="number"
                                value={nasConfig.segmentDuration}
                                onChange={(e) =>
                                  setNasConfig({
                                    ...nasConfig,
                                    segmentDuration:
                                      parseInt(e.target.value) || 5,
                                  })
                                }
                                placeholder="5"
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Storage Folder Pattern</Label>
                              <Input
                                value={nasConfig.folderPattern}
                                onChange={(e) =>
                                  setNasConfig({
                                    ...nasConfig,
                                    folderPattern: e.target.value,
                                  })
                                }
                                placeholder="{cameraId}/{YYYY}/{MM}/{DD}"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Example:{" "}
                                {nasConfig.folderPattern
                                  .replace("{cameraId}", "cam01")
                                  .replace(
                                    "{YYYY}",
                                    new Date().getFullYear().toString(),
                                  )
                                  .replace(
                                    "{MM}",
                                    (new Date().getMonth() + 1)
                                      .toString()
                                      .padStart(2, "0"),
                                  )
                                  .replace(
                                    "{DD}",
                                    new Date()
                                      .getDate()
                                      .toString()
                                      .padStart(2, "0"),
                                  )}
                              </p>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            className="mt-2 hover:cursor-pointer"
                            onClick={async () => {
                              try {
                                const res = await fetch("/api/nas/test", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify(nasConfig),
                                });
                                const data = await res.json();
                                alert(
                                  data.message ||
                                    (data.success
                                      ? "Connection Successful"
                                      : "Connection Failed"),
                                );
                              } catch (e) {
                                alert("Connection Failed");
                              }
                            }}
                          >
                            Test NAS Connection
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        Output Destinations
                      </h3>
                      <Button
                        onClick={addOutput}
                        size="sm"
                        className="flex items-center gap-2 hover:cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Add Output
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {outputs.map((output, index) => (
                        <Card key={output.id} className="border-2">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={output.enabled}
                                  onCheckedChange={(checked) =>
                                    updateOutput(output.id, "enabled", checked)
                                  }
                                />
                                <Label className="font-medium">
                                  Output {index + 1}
                                </Label>
                              </div>
                              {outputs.length > 1 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeOutput(output.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-2">
                                <Label>Output Type</Label>
                                <Select
                                  value={output.type}
                                  onValueChange={(value) =>
                                    updateOutput(output.id, "type", value)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="rtmp">
                                      RTMP Stream
                                    </SelectItem>
                                    <SelectItem value="file">
                                      File Recording
                                    </SelectItem>
                                    <SelectItem value="hls">
                                      HLS Stream
                                    </SelectItem>
                                    <SelectItem value="dash">
                                      DASH Stream
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>
                                  {output.type === "file"
                                    ? "File Path"
                                    : "Stream URL"}
                                </Label>
                                <Input
                                  value={output.url}
                                  disabled
                                  // onChange={(e) =>
                                  //   updateOutput(
                                  //     output.id,
                                  //     "url",
                                  //     e.target.value,
                                  //   )
                                  // }
                                  placeholder={
                                    output.type === "rtmp"
                                      ? "rtmp://server/live/stream1"
                                      : output.type === "file"
                                        ? "/videos/cam1.mp4"
                                        : output.type === "hls"
                                          ? "/hls/stream.m3u8"
                                          : "/dash/stream.mpd"
                                  }
                                />
                              </div>
                            </div>

                            <div className="space-y-3">
                              <Label className="font-semibold">
                                Assign Cameras to this Output
                              </Label>
                              <div className="grid grid-cols-2 gap-2">
                                {cameras.map((camera) => (
                                  <div
                                    key={camera.id}
                                    className="flex items-center gap-2"
                                  >
                                    <input
                                      type="checkbox"
                                      id={`camera-${output.id}-${camera.id}`}
                                      checked={output.cameraMappings.includes(
                                        camera.id,
                                      )}
                                      onChange={() =>
                                        toggleCameraMapping(
                                          output.id,
                                          camera.id,
                                        )
                                      }
                                      className="rounded"
                                    />
                                    <Label
                                      htmlFor={`camera-${output.id}-${camera.id}`}
                                      className="cursor-pointer text-sm"
                                    >
                                      {camera.name}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                              {output.cameraMappings.length === 0 && (
                                <p className="text-xs text-gray-500 italic">
                                  No cameras assigned to this output
                                </p>
                              )}
                              {output.cameraMappings.length > 0 && (
                                <p className="text-xs text-green-600">
                                  {output.cameraMappings.length} camera(s)
                                  assigned
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">
                        Additional Options
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={autostart}
                            onCheckedChange={(checked) => {
                              setAutostart(checked);
                            }}
                            id="auto-restart"
                          />
                          <Label htmlFor="auto-restart">
                            Auto-start on failure
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="segment-files" />
                          <Label htmlFor="segment-files">
                            Segment recordings
                          </Label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Control Panel */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Encoder Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${getStatusColor()}`}
                  ></div>
                  <span className="font-medium capitalize">
                    {encoderStatus}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uptime:</span>
                    <span>00:15:32</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Frames:</span>
                    <span>28,456</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Dropped:</span>
                    <span>12 (0.04%)</span>
                  </div>
                </div>

                {nasConfig.storageMode === "record" && nasStatus && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-2">
                      Storage Status
                    </h4>
                    <div className="flex items-center gap-2 text-sm mb-3">
                      <div
                        className={`w-2 h-2 rounded-full ${nasStatus.status === "Connected" ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      <span className="font-medium">{nasStatus.status}</span>
                    </div>
                    {nasStatus.status === "Connected" && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Usage:</span>
                          <span className="font-medium">
                            {nasStatus.usedSpace} / {nasStatus.totalSpace}
                          </span>
                        </div>
                        {nasStatus.lastRecordingFile && (
                          <div className="mt-2 text-xs border rounded p-2 bg-gray-50">
                            <p className="font-semibold text-gray-700 mb-1">
                              Last File
                            </p>
                            <p
                              className="truncate text-blue-600"
                              title={nasStatus.lastRecordingFile.filename}
                            >
                              {nasStatus.lastRecordingFile.filename}
                            </p>
                            <p className="text-gray-500 mt-1">
                              {nasStatus.lastRecordingFile.timestamp} •{" "}
                              {nasStatus.lastRecordingFile.size}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Control Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleStart}
                  disabled={encoderStatus === "running"}
                  className="w-full flex items-center gap-2 hover:cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  Start Encoding
                </Button>
                <Button
                  onClick={handleStop}
                  disabled={encoderStatus === "stopped"}
                  variant="outline"
                  className="w-full flex items-center gap-2 bg-transparent hover:cursor-pointer"
                >
                  <Square className="w-4 h-4" />
                  Stop Encoding
                </Button>
                <Button
                  onClick={handleRestart}
                  variant="outline"
                  className="w-full flex items-center gap-2 bg-transparent hover:cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restart Encoder
                </Button>
              </CardContent>
            </Card>

            {/* Logs */}
            <Card>
              <CardHeader>
                <CardTitle>Encova Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black text-green-400 p-3 rounded-md text-xs font-mono h-64 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
