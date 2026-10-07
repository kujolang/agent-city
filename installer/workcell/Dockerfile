# Original Agent City local execution image. No agent task enters this build.
FROM node:24-trixie-slim@sha256:173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66
LABEL org.opencontainers.image.title="Agent City Kujo execution"
LABEL org.opencontainers.image.description="Local Workcell image with pinned Kujo 1.7.0"
WORKDIR /opt/kujo-install
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund \
    && node -e 'require("node:fs").copyFileSync(require("@kujolang/kujo-runtime").resolveKujoBinary(), "/usr/local/bin/kujo")' \
    && chmod 755 /usr/local/bin/kujo \
    && kujo --version \
    && rm -rf /opt/kujo-install /root/.npm \
    && mkdir -p /workspace && chown 65532:65532 /workspace
WORKDIR /workspace
USER 65532:65532
CMD ["kujo", "--version"]
