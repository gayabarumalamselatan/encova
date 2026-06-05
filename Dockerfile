# =============================================================================
# Stage 1: System Dependencies Installer
# =============================================================================
# We use a dedicated stage to install heavy system tools (LibreOffice, Ghostscript,
# FFmpeg, MediaMTX). This layer is cached separately from the app code, so
# system deps are only re-installed when this stage changes.
FROM node:22-bookworm-slim AS system-deps

# Avoid interactive prompts during apt install
ENV DEBIAN_FRONTEND=noninteractive

# Install system-level dependencies with idempotent checks via apt-get
# (apt-get is idempotent by default; re-running is always safe)
RUN apt-get update && apt-get install -y --no-install-recommends \
    # LibreOffice (for DOCX/XLSX compression)
    libreoffice \
    # Ghostscript (for PDF processing)
    ghostscript \
    # FFmpeg (for CCTV encoding/streaming)
    ffmpeg \
    # Required utilities
    curl \
    ca-certificates \
    wget \
    unzip \
    # LibreOffice runtime deps
    fonts-liberation \
    fontconfig \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# --- Install MediaMTX ---
# MediaMTX is not in apt repos; download the latest release binary.
# The script checks if it's already installed before downloading (idempotent).
ARG MEDIAMTX_VERSION=v1.9.1
ARG MEDIAMTX_ARCH=linux_amd64

RUN if ! command -v mediamtx > /dev/null 2>&1; then \
        echo "Installing MediaMTX ${MEDIAMTX_VERSION}..." && \
        wget -qO /tmp/mediamtx.tar.gz \
            "https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/mediamtx_${MEDIAMTX_VERSION}_${MEDIAMTX_ARCH}.tar.gz" && \
        tar -xzf /tmp/mediamtx.tar.gz -C /usr/local/bin mediamtx && \
        chmod +x /usr/local/bin/mediamtx && \
        rm /tmp/mediamtx.tar.gz && \
        echo "MediaMTX installed successfully."; \
    else \
        echo "MediaMTX already installed, skipping."; \
    fi

# =============================================================================
# Stage 2: Node.js Dependency Installer (deps)
# =============================================================================
# A clean node image for installing npm packages. Separating this from the
# builder avoids re-running npm install when only source code changes.
FROM node:22-bookworm-slim AS deps

WORKDIR /app

# Copy only manifest files first to leverage Docker layer cache.
# npm install will only re-run when package.json or package-lock.json changes.
COPY package.json package-lock.json* ./

# Install all dependencies (including devDeps needed for the build).
# --legacy-peer-deps is required by this project.
RUN npm install --legacy-peer-deps

# =============================================================================
# Stage 3: Next.js Builder
# =============================================================================
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copy node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the full source tree
COPY . .

# Set NODE_ENV to production for an optimized build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js app
RUN npm run build

# =============================================================================
# Stage 4: Production Runner
# =============================================================================
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# ── 1. Create a non-root user FIRST ──────────────────────────────────────────
# This must happen before any COPY --chown commands.
# We use --create-home because LibreOffice needs a writable home directory
# for its user profile and cache (.cache/dconf).
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --create-home nextjs

# Ensure the home directory and its critical subdirectories are writable.
# This fixes 'dconf' and other system library permission errors.
RUN mkdir -p /home/nextjs/.config /home/nextjs/.cache \
    && chown -R nextjs:nodejs /home/nextjs

ENV HOME=/home/nextjs



# ── 2. Install Runtime Dependencies ──────────────────────────────────────────
# We install these directly in the runner stage to ensure all shared libraries,
# symlinks (like libblas.so.3), and configurations are correctly set up.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libreoffice \
    ghostscript \
    fonts-liberation \
    fontconfig \
    ca-certificates \
    cifs-utils \
    nfs-common \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy MediaMTX (it's a standalone binary, safe to copy)
COPY --from=system-deps /usr/local/bin/mediamtx /usr/local/bin/mediamtx


# ── 3. Copy Next.js build output ──────────────────────────────────────────────
# In Next.js standalone mode, server.js is the entrypoint. 
# It expects 'public' and '.next/static' to be in the same directory.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# ── 4. Copy application settings and scripts ──────────────────────────────────
# Create directories for persistent data and set correct permissions
RUN mkdir -p /app/public/downloads /app/settings \
    && chown -R nextjs:nodejs /app \
    && chmod -R 775 /app/public/downloads /app/settings

COPY --chown=nextjs:nodejs settings.json     ./settings/settings.json
COPY --chown=nextjs:nodejs rtmp-server.js    ./rtmp-server.js
COPY --chown=nextjs:nodejs mediamtx.yml     ./mediamtx.yml

USER nextjs

# Expose Next.js port
EXPOSE 3000

# Expose MediaMTX / RTMP / HLS ports
# 8554 = RTSP, 1935 = RTMP, 8888 = HLS (MediaMTX defaults)
EXPOSE 8554 1935 8888 8000

# ── Entrypoint ────────────────────────────────────────────────────────────────
# Use a startup script (created below via COPY) so we can start both
# the Next.js server and MediaMTX as background processes.
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh

CMD ["sh", "./docker-entrypoint.sh"]
