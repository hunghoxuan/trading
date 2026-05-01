#!/usr/bin/env bash
set -euo pipefail

# Install a token-efficient CLI toolchain for AI + human workflows.
# Safe to rerun; package managers skip already-installed packages.

if command -v brew >/dev/null 2>&1; then
  echo "[toolchain] Using Homebrew"
  brew update
  brew install \
    rtk \
    ripgrep \
    fd \
    jq \
    yq \
    fzf \
    bat \
    eza \
    zoxide \
    git-delta \
    sd \
    hyperfine \
    dust \
    tldr
elif command -v apt-get >/dev/null 2>&1; then
  echo "[toolchain] Using apt-get"
  sudo apt-get update
  sudo apt-get install -y \
    ripgrep \
    fd-find \
    jq \
    fzf \
    bat \
    zoxide \
    delta \
    hyperfine
  echo "[toolchain] Optional tools may need manual install on Debian/Ubuntu:"
  echo "  - yq, eza, sd, dust, tldr, rtk"
else
  echo "[toolchain] Unsupported package manager. Install manually."
  exit 1
fi

echo
echo "[toolchain] Install complete. Quick verification:"
echo "  rtk --version"
echo "  rtk gain"
echo "  rg --version"
echo "  fd --version || fdfind --version"
echo "  jq --version"
