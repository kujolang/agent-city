# Original Agent City local execution image. No agent task enters this build.
FROM node:24-trixie-slim@sha256:173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66

# Upgrade the runtime independently of the immutable base image.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl xz-utils \
    && arch="$(dpkg --print-architecture)" \
    && case "$arch" in \
      amd64) node_arch=x64; node_sha=6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6 ;; \
      arm64) node_arch=arm64; node_sha=dbabf7a1cbf947e6059ffad2c27b80041db97dea1e553b62afdee7f13fca336e ;; \
      *) echo "Unsupported Node architecture: $arch" >&2; exit 1 ;; \
    esac \
    && curl --proto "=https" --tlsv1.2 -fsSL "https://nodejs.org/dist/v24.22.1/node-v24.22.1-linux-$node_arch.tar.xz" -o /tmp/node.tar.xz \
    && echo "$node_sha  /tmp/node.tar.xz" | sha256sum -c - \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/include/node \
    && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 --no-same-owner \
    && test "$(node --version)" = "v24.22.1" \
    && rm -f /tmp/node.tar.xz \
    && rm -rf /var/lib/apt/lists/*
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
