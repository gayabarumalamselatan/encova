export interface MediaMTXMetrics {
  connected: boolean;
  publishers: number;
  readers: number;
  rtspSessions: number;
  rtmpSessions: number;
  hlsStreams: number;
  webRtcSessions: number;
  bandwidthInMbps: number;
  bandwidthOutMbps: number;
  activeStreamCount: number;
  version?: string;
}

export class MediaMTXMonitoringService {
  private apiBaseUrls = [
    "http://127.0.0.1:9997/v3",
    "http://127.0.0.1:8554/v3",
    "http://localhost:9997/v3",
  ];

  async getMetrics(): Promise<MediaMTXMetrics> {
    for (let baseUrl of this.apiBaseUrls) {
      try {
        const res = await fetch(`${baseUrl}/paths/list`, {
          signal: AbortSignal.timeout(1500),
        });
        if (res.ok) {
          const data = await res.json();
          const items = data.items || [];

          let publishers = 0;
          let readers = 0;
          let activeStreams = items.length;

          items.forEach((item: any) => {
            if (item.tracks && item.tracks.length > 0) publishers++;
            if (item.readers && Array.isArray(item.readers)) {
              readers += item.readers.length;
            }
          });

          return {
            connected: true,
            publishers,
            readers,
            rtspSessions: Math.max(publishers, readers),
            rtmpSessions: 0,
            hlsStreams: activeStreams,
            webRtcSessions: 0,
            bandwidthInMbps: parseFloat((publishers * 2.5).toFixed(2)),
            bandwidthOutMbps: parseFloat((readers * 2.5).toFixed(2)),
            activeStreamCount: activeStreams,
          };
        }
      } catch {
        /* try next URL */
      }
    }

    // Fallback if MediaMTX API is unreachable
    return {
      connected: false,
      publishers: 0,
      readers: 0,
      rtspSessions: 0,
      rtmpSessions: 0,
      hlsStreams: 0,
      webRtcSessions: 0,
      bandwidthInMbps: 0,
      bandwidthOutMbps: 0,
      activeStreamCount: 0,
    };
  }
}

export const mediaMTXMonitoringService = new MediaMTXMonitoringService();
