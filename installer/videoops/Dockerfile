# Explicit setup only. No task, credential or user project enters this build.
FROM node:24-trixie-slim@sha256:173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66
RUN apt-get update && apt-get install -y --no-install-recommends chromium ffmpeg fonts-dejavu-core ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/agent-city-videoops
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund && rm -rf /root/.npm
COPY render.mjs ./render.mjs
ENV HYPERFRAMES_BROWSER_PATH=/usr/bin/chromium
ENV PRODUCER_HEADLESS_SHELL_PATH=/usr/bin/chromium
ENV PRODUCER_BROWSER_GPU_MODE=software
ENV HF_TELEMETRY_DISABLED=1
ENV HOME=/tmp/city-videoops
WORKDIR /workspace
USER 65532:65532
CMD ["node", "/opt/agent-city-videoops/render.mjs"]
