#!/usr/bin/env bash
# Saves a checkpoint to the shared project folder: a git bundle (full history) plus a plain
# copy of the source tree (tracked files only). Restore with: git clone forma.bundle forma
set -e
cd "$(dirname "$0")/.."
DEST=/mnt/project-files/forma
git bundle create /tmp/forma.bundle --all >/dev/null 2>&1
cp /tmp/forma.bundle /mnt/project-files/forma.bundle
rm -rf "$DEST" && mkdir -p "$DEST"
git ls-files -co --exclude-standard -z | tar --null -cf - -T - | tar -xf - -C "$DEST"
echo "checkpoint ok: $(git rev-parse --short HEAD)"
