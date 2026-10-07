#!/bin/sh
# No global installs, sudo, shell-profile edits, credentials, or existing checkout mutations.
set -eu
for cmd in curl tar mktemp; do command -v "$cmd" >/dev/null 2>&1 || { echo "Required command missing: $cmd" >&2; exit 1; }; done
scratch=$(mktemp -d "${TMPDIR:-/tmp}/agent-city-install.XXXXXXXX")
trap 'rm -rf "$scratch"' EXIT HUP INT TERM
case "$(uname -s)" in Darwin) target_os=darwin;; Linux) target_os=linux;; *) echo 'This installer currently supports macOS and Linux only.' >&2; exit 1;; esac
case "$(uname -m)" in x86_64|amd64) target_arch=x64;; arm64|aarch64) target_arch=arm64;; *) echo 'Unsupported CPU architecture' >&2; exit 1;; esac
if ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(Number(process.versions.node.split(".")[0])>=24?0:1)' 2>/dev/null; then
  case "$target_os-$target_arch" in
    darwin-arm64) node_hash=bed7eea5325e1108f32ce5228ddd6a5f0f08a499ee42aa7442aea583702f6057;;
    darwin-x64) node_hash=1462cb3b3046b815cf8ea436d3da450ec1a9f11dac7e5a46b0ada5305d7e8097;;
    linux-arm64) node_hash=724282c3b43aec998aa9527380465b45d229e021b58035f5f4f63095eabfe5d5;;
    linux-x64) node_hash=6e1db87ef58b8819e5d5402eff1536491b18edd8eb7bee5ef7897876e88dc5ff;;
  esac
  archive="node-v24.21.0-$target_os-$target_arch.tar.gz"
  echo 'Preparing private Node 24.21.0 runtime…'
  curl --proto '=https' --tlsv1.2 -fsSL --max-time 180 "https://nodejs.org/dist/v24.21.0/$archive" -o "$scratch/node.tar.gz"
  if command -v shasum >/dev/null 2>&1; then actual=$(shasum -a 256 "$scratch/node.tar.gz" | cut -d ' ' -f 1); else actual=$(sha256sum "$scratch/node.tar.gz" | cut -d ' ' -f 1); fi
  [ "$actual" = "$node_hash" ] || { echo 'Node archive checksum mismatch' >&2; exit 1; }
  mkdir "$scratch/node"
  tar -xzf "$scratch/node.tar.gz" --strip-components=1 -C "$scratch/node"
  PATH="$scratch/node/bin:$PATH"; export PATH
  CITY_BOOTSTRAP_NODE_DIR="$scratch/node"; export CITY_BOOTSTRAP_NODE_DIR
fi
# Resolve main once; download all application bytes from that immutable commit.
if [ -z "${CITY_INSTALL_REF:-}" ]; then
  curl --proto '=https' --tlsv1.2 -fsSL --max-time 30 'https://api.github.com/repos/kujolang/agent-city/commits/main' -o "$scratch/commit.json"
  CITY_INSTALL_REF=$(node -e 'const fs=require("node:fs");const v=JSON.parse(fs.readFileSync(process.argv[1])).sha;if(!/^[0-9a-f]{40}$/.test(v))process.exit(1);console.log(v)' "$scratch/commit.json")
fi
case "$CITY_INSTALL_REF" in *[!0-9a-f]*|'') echo 'CITY_INSTALL_REF must be a full commit SHA' >&2; exit 1;; esac
[ "${#CITY_INSTALL_REF}" -eq 40 ] || { echo 'CITY_INSTALL_REF must be a full commit SHA' >&2; exit 1; }
export CITY_INSTALL_REF
curl --proto '=https' --tlsv1.2 -fsSL --max-time 180 "https://codeload.github.com/kujolang/agent-city/tar.gz/$CITY_INSTALL_REF" -o "$scratch/city.tar.gz"
mkdir "$scratch/source"
tar -xzf "$scratch/city.tar.gz" --strip-components=1 -C "$scratch/source"
node "$scratch/source/installer/install.mjs" "$@"
