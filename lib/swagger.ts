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
  },

  tags: [
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
