"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
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
} from "lucide-react"

export default function EncoderApp() {
  const [encoderStatus, setEncoderStatus] = useState<"stopped" | "running" | "error">("stopped")
  const [outputs, setOutputs] = useState([{ id: 1, type: "rtmp", url: "", enabled: true }])
  const [logs, setLogs] = useState([
    "[2024-01-15 10:30:15] Encoder initialized",
    "[2024-01-15 10:30:16] Input source connected: RTSP",
    "[2024-01-15 10:30:17] Video codec: H.264, Audio codec: AAC",
    "[2024-01-15 10:30:18] Ready to start encoding...",
  ])

  const addOutput = () => {
    const newId = Math.max(...outputs.map((o) => o.id)) + 1
    setOutputs([...outputs, { id: newId, type: "rtmp", url: "", enabled: true }])
  }

  const removeOutput = (id: number) => {
    setOutputs(outputs.filter((o) => o.id !== id))
  }

  const updateOutput = (id: number, field: string, value: string | boolean) => {
    setOutputs(outputs.map((o) => (o.id === id ? { ...o, [field]: value } : o)))
  }

  const handleStart = () => {
    setEncoderStatus("running")
    setLogs((prev) => [...prev, `[${new Date().toLocaleString()}] Encoding started`])
  }

  const handleStop = () => {
    setEncoderStatus("stopped")
    setLogs((prev) => [...prev, `[${new Date().toLocaleString()}] Encoding stopped`])
  }

  const handleRestart = () => {
    setEncoderStatus("stopped")
    setTimeout(() => {
      setEncoderStatus("running")
      setLogs((prev) => [...prev, `[${new Date().toLocaleString()}] Encoder restarted`])
    }, 1000)
  }

  const getStatusIcon = () => {
    switch (encoderStatus) {
      case "running":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (encoderStatus) {
      case "running":
        return "bg-green-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-row gap-3">
            <img
              src="images/logo.png"
              alt="Logo"
              className="w-20"
            />
            <div className="flex flex-col justify-center">
              <h1 className="text-3xl font-bold text-gray-900">ASISGO ENCOVA</h1>
              <p className="text-gray-600 mt-1">Configure your video encoding parameters</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <Badge variant={encoderStatus === "running" ? "default" : "secondary"} className="capitalize">
              {encoderStatus}
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="input" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="input" className="flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  Input
                </TabsTrigger>
                <TabsTrigger value="video" className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Video
                </TabsTrigger>
                <TabsTrigger value="audio" className="flex items-center gap-2">
                  <AudioWaveform className="w-4 h-4" />
                  Audio
                </TabsTrigger>
                <TabsTrigger value="output" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Output
                </TabsTrigger>
              </TabsList>

              {/* Input Settings */}
              <TabsContent value="input">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Monitor className="w-5 h-5" />
                      Input Configuration
                    </CardTitle>
                    <CardDescription>Configure your video input source and parameters</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="source-type">Camera Source</Label>
                        <Select defaultValue="rtsp">
                          <SelectTrigger>
                            <SelectValue placeholder="Select source type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rtsp">RTSP Stream</SelectItem>
                            <SelectItem value="usb">USB Camera</SelectItem>
                            <SelectItem value="webcam">Webcam</SelectItem>
                            <SelectItem value="onvif">ONVIF Camera</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="input-url">Input URL/Device</Label>
                        <Input
                          id="input-url"
                          placeholder="rtsp://192.168.1.100:554/stream1"
                          defaultValue="rtsp://192.168.1.100:554/stream1"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="resolution">Input Resolution</Label>
                        <Select defaultValue="auto">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto Detect</SelectItem>
                            <SelectItem value="1920x1080">1920x1080 (1080p)</SelectItem>
                            <SelectItem value="1280x720">1280x720 (720p)</SelectItem>
                            <SelectItem value="640x480">640x480 (480p)</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fps">Frame Rate (FPS)</Label>
                        <Select defaultValue="30">
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
                      <div className="space-y-2">
                        <Label htmlFor="buffer">Buffer Size</Label>
                        <Input id="buffer" placeholder="1024" defaultValue="1024" />
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
                    <CardDescription>Configure video codec and quality settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="video-codec">Video Codec</Label>
                        <Select defaultValue="h264">
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
                        <Select defaultValue="fast">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ultrafast">Ultra Fast</SelectItem>
                            <SelectItem value="fast">Fast</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="slow">Slow</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bitrate">Video Bitrate</Label>
                        <Select defaultValue="2000k">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="500k">500 Kbps</SelectItem>
                            <SelectItem value="1000k">1000 Kbps</SelectItem>
                            <SelectItem value="2000k">2000 Kbps</SelectItem>
                            <SelectItem value="4000k">4000 Kbps</SelectItem>
                            <SelectItem value="8000k">8000 Kbps</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="output-resolution">Output Resolution</Label>
                        <Select defaultValue="1280x720">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="same">Same as Input</SelectItem>
                            <SelectItem value="1920x1080">1920x1080 (1080p)</SelectItem>
                            <SelectItem value="1280x720">1280x720 (720p)</SelectItem>
                            <SelectItem value="854x480">854x480 (480p)</SelectItem>
                            <SelectItem value="640x360">640x360 (360p)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="keyframe">Keyframe Interval</Label>
                        <Input id="keyframe" placeholder="2" defaultValue="2" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch id="hardware-accel" />
                        <Label htmlFor="hardware-accel">Enable Hardware Acceleration</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="two-pass" />
                        <Label htmlFor="two-pass">Two-Pass Encoding</Label>
                      </div>
                    </div>
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
                    <CardDescription>Configure audio codec and quality settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="audio-codec">Audio Codec</Label>
                        <Select defaultValue="aac">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aac">AAC</SelectItem>
                            <SelectItem value="mp3">MP3</SelectItem>
                            <SelectItem value="copy">Copy (No Re-encode)</SelectItem>
                            <SelectItem value="disable">Disable Audio</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="audio-bitrate">Audio Bitrate</Label>
                        <Select defaultValue="128k">
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
                        <Select defaultValue="44100">
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
                        <Select defaultValue="2">
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
                        <Switch id="audio-filter" />
                        <Label htmlFor="audio-filter">Enable Audio Filters</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="noise-reduction" />
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
                    <CardDescription>Configure streaming and recording outputs</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Output Destinations</h3>
                      <Button onClick={addOutput} size="sm" className="flex items-center gap-2">
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
                                  onCheckedChange={(checked) => updateOutput(output.id, "enabled", checked)}
                                />
                                <Label className="font-medium">Output {index + 1}</Label>
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

                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Output Type</Label>
                                <Select
                                  value={output.type}
                                  onValueChange={(value) => updateOutput(output.id, "type", value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="rtmp">RTMP Stream</SelectItem>
                                    <SelectItem value="file">File Recording</SelectItem>
                                    <SelectItem value="hls">HLS Stream</SelectItem>
                                    <SelectItem value="dash">DASH Stream</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>{output.type === "file" ? "File Path" : "Stream URL"}</Label>
                                <Input
                                  value={output.url}
                                  onChange={(e) => updateOutput(output.id, "url", e.target.value)}
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
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Additional Options</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch id="auto-restart" />
                          <Label htmlFor="auto-restart">Auto-restart on failure</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="segment-files" />
                          <Label htmlFor="segment-files">Segment recordings</Label>
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
                  <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
                  <span className="font-medium capitalize">{encoderStatus}</span>
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
                  className="w-full flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start Encoding
                </Button>
                <Button
                  onClick={handleStop}
                  disabled={encoderStatus === "stopped"}
                  variant="outline"
                  className="w-full flex items-center gap-2 bg-transparent"
                >
                  <Square className="w-4 h-4" />
                  Stop Encoding
                </Button>
                <Button
                  onClick={handleRestart}
                  variant="outline"
                  className="w-full flex items-center gap-2 bg-transparent"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restart Encoder
                </Button>
              </CardContent>
            </Card>

            {/* Logs */}
            <Card>
              <CardHeader>
                <CardTitle>FFmpeg Logs</CardTitle>
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
  )
}
