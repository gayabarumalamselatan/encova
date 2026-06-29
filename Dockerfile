# =============================================================================
# Stage 1: System Dependencies Installer
# =============================================================================
# We use a dedicated stage to install heavy system tools and build MediaMTX.
FROM node:22-bookworm-slim AS system-deps

# Avoid interactive prompts during apt install
ENV DEBIAN_FRONTEND=noninteractive

# Install system-level dependencies with idempotent checks via apt-get
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    ghostscript \
    curl \
    ca-certificates \
    wget \
    unzip \
    xz-utils \
    file \
    fonts-liberation \
    fontconfig \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# --- Install MediaMTX ---
# MediaMTX is not in apt repos; download the latest release binary.
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
FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json* ./

# Install all dependencies (including devDeps needed for the build).
RUN npm install --legacy-peer-deps

# =============================================================================
# Stage 3: Next.js Builder
# =============================================================================
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

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

ENV LIBVA_DRIVER_NAME=iHD
ENV LIBVA_DRIVERS_PATH=/usr/lib/x86_64-linux-gnu/dri

# ── 1. Create a non-root user FIRST ──────────────────────────────────────────
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --create-home nextjs

RUN mkdir -p /home/nextjs/.config /home/nextjs/.cache \
    && chown -R nextjs:nodejs /home/nextjs

ENV HOME=/home/nextjs

# ── 2. Install Runtime Dependencies + Official Repos FFmpeg ──────────────────
# Installing 'ffmpeg' through apt-get prevents 'vaMapBuffer2' symbol mismatches.
RUN apt-get update && apt-get install -y --no-install-recommends \
    intel-media-va-driver \
    libva2 \
    libva-drm2 \
    libva-x11-2 \
    libigdgmm12 \
    libmfx1 \
    libvpl2 \
    vainfo \
    ffmpeg \
    libreoffice \
    ghostscript \
    fonts-liberation \
    fontconfig \
    ca-certificates \
    cifs-utils \
    nfs-common \
    curl \
    gosu \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── 3. Verify Hardware and FFmpeg Installation ───────────────────────────────
RUN set -e && \
    echo "=== Verify Installation ===" && \
    which ffmpeg && \
    ffmpeg -version && \
    echo "=== Verify Intel Hardware Support ===" && \
    ffmpeg -hwaccels && \
    echo "=== Encoders ===" && \
    ffmpeg -encoders | grep -Ei "vaapi" || true && \
    echo "=== vainfo ===" && \
    vainfo --display drm || true

# Copy MediaMTX from system-deps stage
COPY --from=system-deps /usr/local/bin/mediamtx /usr/local/bin/mediamtx

# ── 4. Copy Next.js build output ──────────────────────────────────────────────
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# ── 5. Copy application settings and scripts ──────────────────────────────────
ENV VIDEO_STORAGE_PATH=/home/videos
RUN mkdir -p /app/public/downloads /app/settings $VIDEO_STORAGE_PATH \
    && chown -R nextjs:nodejs /app $VIDEO_STORAGE_PATH \
    && chmod -R 775 /app/public/downloads /app/settings $VIDEO_STORAGE_PATH

COPY --chown=nextjs:nodejs settings.json     ./settings/settings.json
COPY --chown=nextjs:nodejs rtmp-server.js    ./rtmp-server.js
COPY --chown=nextjs:nodejs mediamtx.yml     ./mediamtx.yml

# Expose Next.js port
EXPOSE 3000

# Expose MediaMTX / RTMP / HLS ports
EXPOSE 8554 1935 8888 8000

# ── Entrypoint ────────────────────────────────────────────────────────────────
COPY --chown=root:root docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 755 /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]