/**
 * Central OpenAPI 3.0 specification for the Encova Compression API.
 * Imported by the /api/docs route and rendered by swagger-ui-react.
 */
const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Encova Compression API",
    version: "1.0.0",
    description:
      "API for compressing PDF, KML, KMZ, DOCX and XLSX files. " +
      "All processing is performed locally — no data is sent to third-party servers.",
    contact: {
      name: "Asisgo Encova",
    },
  },
  servers: [
    {
      url: "/",
      description: "Local development server",
    },
  ],

  // ── Reusable schemas ────────────────────────────────────────────────────────
  components: {
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "string",
            example: "Unsupported file format",
          },
        },
      },

      CompressResult: {
        type: "object",
        properties: {
          filename: { type: "string", example: "document.pdf" },
          originalSize: { type: "integer", example: 2048000 },
          compressedSize: { type: "integer", example: 1024000 },
          downloadUrl: { type: "string", example: "/downloads/abc123_document.pdf" },
        },
      },

      OfficeFileResult: {
        type: "object",
        properties: {
          filename: { type: "string", example: "report.docx" },
          originalSize: { type: "integer", example: 2048000 },
          compressedSize: { type: "integer", example: 1400000 },
          reduction: { type: "string", example: "32%" },
          downloadUrl: { type: "string", example: "/downloads/abc123_report.docx" },
          status: {
            type: "string",
            enum: ["completed", "failed"],
            example: "completed",
          },
          error: {
            type: "string",
            description: "Present only when status is 'failed'",
            example: "LibreOffice error: ...",
          },
        },
      },

      OfficeCompressResponse: {
        type: "object",
        properties: {
          results: {
            type: "array",
            items: { $ref: "#/components/schemas/OfficeFileResult" },
          },
        },
      },
    },
  },

  // ── Paths ───────────────────────────────────────────────────────────────────
  paths: {
    "/api/compress": {
      post: {
        tags: ["General Compression"],
        summary: "Compress a single file (PDF, KML, KMZ)",
        description:
          "Accepts one file via multipart/form-data and compresses it.\n\n" +
          "- **PDF** → Ghostscript\n" +
          "- **KML** → fast-xml-parser (XML minification)\n" +
          "- **KMZ** → XML minification inside ZIP container",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description: "The file to compress (.pdf, .kml, or .kmz)",
                  },
                  level: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                    default: "medium",
                    description:
                      "Compression level. " +
                      "PDF: screen / ebook / printer. " +
                      "KML/KMZ: minify / strip metadata / simplify geometry.",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Compression succeeded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CompressResult" },
                example: {
                  filename: "map.kml",
                  originalSize: 1200000,
                  compressedSize: 400000,
                  downloadUrl: "/downloads/abc123_map.kml",
                },
              },
            },
          },
          400: {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          500: {
            description: "Compression engine error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    "/api/compress/office": {
      post: {
        tags: ["Office Compression"],
        summary: "Compress DOCX and/or XLSX files using LibreOffice",
        description:
          "Accepts **multiple** DOCX or XLSX files via `multipart/form-data`.\n\n" +
          "Each file is rewritten by LibreOffice in `--headless` mode, which " +
          "strips unused internal objects and re-optimises the ZIP container " +
          "(typically 10–40% reduction).\n\n" +
          "**Constraints:**\n" +
          "- Max file size: **50 MB** per file\n" +
          "- Output format identical to input (`.docx → .docx`, `.xlsx → .xlsx`)\n" +
          "- Files are processed on the local server — never sent externally",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["files"],
                properties: {
                  files: {
                    type: "array",
                    items: { type: "string", format: "binary" },
                    description: "One or more .docx or .xlsx files",
                  },
                  compressionLevel: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                    default: "medium",
                    description: "Reserved for future LibreOffice tuning options",
                  },
                },
              },
              encoding: {
                files: { contentType: "application/octet-stream" },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Results array (one entry per uploaded file)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/OfficeCompressResponse" },
                example: {
                  results: [
                    {
                      filename: "report.docx",
                      originalSize: 2048000,
                      compressedSize: 1400000,
                      reduction: "32%",
                      downloadUrl: "/downloads/abc123_report.docx",
                      status: "completed",
                    },
                    {
                      filename: "data.xlsx",
                      originalSize: 5000000,
                      compressedSize: 3100000,
                      reduction: "38%",
                      downloadUrl: "/downloads/def456_data.xlsx",
                      status: "completed",
                    },
                  ],
                },
              },
            },
          },
          400: {
            description: "No files provided",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          500: {
            description: "Internal server or LibreOffice error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    "/api/dashboard/all": {
      get: {
        tags: ["Monitoring Dashboard"],
        summary: "Get full aggregated telemetry payload",
        description: "Returns latest system, GPU, encoding, MediaMTX, storage, network, camera status, capacity, and historical metrics.",
        parameters: [
          { name: "from", in: "query", schema: { type: "string" }, description: "ISO start timestamp" },
          { name: "to", in: "query", schema: { type: "string" }, description: "ISO end timestamp" },
        ],
        responses: {
          200: { description: "Aggregated telemetry payload" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Admin required" },
        },
      },
    },

    "/api/dashboard/system": {
      get: {
        tags: ["Monitoring Dashboard"],
        summary: "Get real-time system metrics (CPU, RAM, Disk, Uptime)",
        responses: { 200: { description: "System metrics" } },
      },
    },

    "/api/dashboard/cameras": {
      get: {
        tags: ["Monitoring Dashboard"],
        summary: "Get camera status summary and camera table",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" }, description: "online | offline | warning | disabled" },
          { name: "codec", in: "query", schema: { type: "string" }, description: "h264 | h265" },
        ],
        responses: { 200: { description: "Camera telemetry" } },
      },
    },

    "/api/dashboard/encoding": {
      get: {
        tags: ["Monitoring Dashboard"],
        summary: "Get encoding performance metrics and FPS/speed time-series",
        responses: { 200: { description: "Encoding performance metrics" } },
      },
    },

    "/api/dashboard/hardware": {
      get: {
        tags: ["Monitoring Dashboard"],
        summary: "Get hardware utilization (CPU cores, GPU NVENC/NVDEC/VRAM)",
        responses: { 200: { description: "Hardware telemetry" } },
      },
    },

    "/api/dashboard/mediamtx": {
      get: {
        tags: ["Monitoring Dashboard"],
        summary: "Get MediaMTX stream publishers, readers, and bandwidth",
        responses: { 200: { description: "MediaMTX metrics" } },
      },
    },

    "/api/dashboard/network": {
      get: {
        tags: ["Monitoring Dashboard"],
        summary: "Get network interface throughput and traffic statistics",
        responses: { 200: { description: "Network metrics" } },
      },
    },

    "/api/dashboard/storage": {
      get: {
        tags: ["Monitoring Dashboard"],
        summary: "Get storage utilization and NAS connection health",
        responses: { 200: { description: "Storage metrics" } },
      },
    },

    "/api/dashboard/processes": {
      get: {
        tags: ["Monitoring Dashboard"],
        summary: "Get active FFmpeg process table with runtime logs",
        responses: { 200: { description: "FFmpeg process table" } },
      },
    },

    "/api/dashboard/alerts": {
      get: {
        tags: ["Monitoring Dashboard"],
        summary: "Get active platform alerts feed",
        responses: { 200: { description: "Platform alerts" } },
      },
    },

    "/api/dashboard/capacity": {
      get: {
        tags: ["Monitoring Dashboard"],
        summary: "Get capacity estimation and stream headroom",
        responses: { 200: { description: "Capacity metrics" } },
      },
    },
  },

  tags: [
    {
      name: "Monitoring Dashboard",
      description: "Real-time enterprise NOC monitoring telemetry APIs",
    },
    {
      name: "General Compression",
      description: "Single-file endpoint for PDF, KML, KMZ",
    },
    {
      name: "Office Compression",
      description: "Multi-file endpoint for DOCX and XLSX via LibreOffice",
    },
  ],
};

export default swaggerSpec;
