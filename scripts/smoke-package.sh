#!/usr/bin/env bash
# Smoke test for the packaged app: runs the AppImage and asserts it boots.
#
# Building the app does not catch a missing entry in the electron-builder `files`
# list, and that is what shipped a broken 2.2.5: the asar went out without
# `shared/i18n` and the main process died with ERR_MODULE_NOT_FOUND before
# opening the window. Nothing in the test suite could see it because the tests
# run against the repo, where the directory exists.
#
# The signal is the app's own startup log ("backend listo"), not the wrapper's
# PID: with `--appimage-extract-and-run` the tracked process can exit while the
# app keeps running.
#
# usage: scripts/smoke-package.sh [path-to-AppImage]
# env:   SMOKE_TIMEOUT (seconds, default 60), SMOKE_EXTRACT=1 to skip the FUSE mount
set -uo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="$(node -p "require('${root}/package.json').version")"
app="${1:-${root}/release/MangaCount-${version}.AppImage}"
timeout_s="${SMOKE_TIMEOUT:-60}"
out="$(mktemp)"
work="$(mktemp -d)"
applog_dir="${XDG_CONFIG_HOME:-$HOME/.config}/mangacount/logs"
applog="${applog_dir}/app.txt"

pid=""
started=0
cleanup() {
  [ -n "$pid" ] && kill -9 "$pid" 2>/dev/null
  # With `--appimage-extract-and-run` the wrapper PID exits while the app keeps
  # running from the extraction dir, so kill by path too. Safe because the guard
  # above refused to start if a MangaCount was already running.
  pkill -9 -f 'mount_Manga|appimage_extracted' 2>/dev/null
  rm -rf "$work" "$out"
}
trap cleanup EXIT

if [ ! -f "$app" ]; then
  echo "smoke: no existe el AppImage: $app" >&2
  echo "smoke: construilo con 'npm run build:renderer && npx electron-builder --linux AppImage --publish never'" >&2
  exit 1
fi

# A second instance would quit immediately, so make sure no MangaCount is running.
if pgrep -f 'mount_Manga|appimage_extracted' >/dev/null 2>&1; then
  echo "smoke: hay una instancia de MangaCount corriendo; cerrala antes de correr el smoke" >&2
  exit 1
fi

mkdir -p "$applog_dir"

# Runs the app once and waits for its startup log.
# 0 = backend started, 1 = timeout, 2 = no FUSE available.
attempt() {
  rm -f "$applog"
  : >"$out"
  cd "$work" || return 1
  setsid "$app" "$@" >"$out" 2>&1 </dev/null &
  pid=$!
  local deadline=$((SECONDS + timeout_s))
  while [ "$SECONDS" -lt "$deadline" ]; do
    if grep -q 'backend listo' "$applog" 2>/dev/null; then
      started=1
      return 0
    fi
    if grep -qiE 'libfuse|AppImages require FUSE' "$out" 2>/dev/null; then
      return 2
    fi
    sleep 1
  done
  return 1
}

rc=1
if [ "${SMOKE_EXTRACT:-0}" = "1" ]; then
  attempt --appimage-extract-and-run
  rc=$?
else
  attempt
  rc=$?
  if [ "$rc" = "2" ]; then
    echo "smoke: sin FUSE en el sistema; reintento con --appimage-extract-and-run"
    attempt --appimage-extract-and-run
    rc=$?
  fi
fi

failed=0
if [ "$rc" -ne 0 ] || [ "$started" -ne 1 ]; then
  echo "smoke: la app no llegó a iniciar el backend en ${timeout_s}s" >&2
  failed=1
elif ! grep -q "MangaCount v${version}" "$applog"; then
  echo "smoke: el AppImage no es de la versión ${version} (build viejo?)" >&2
  failed=1
fi
if grep -qiE 'ERR_MODULE_NOT_FOUND|Cannot find module|A JavaScript error occurred' "$out"; then
  echo "smoke: la app reportó un error de arranque" >&2
  failed=1
fi

if [ "$failed" -ne 0 ]; then
  echo "--- log de la app ---" >&2
  cat "$applog" 2>/dev/null >&2 || echo "(sin log)" >&2
  echo "--- salida de la app ---" >&2
  grep -iE -A 12 'ERR_MODULE_NOT_FOUND|Cannot find module|A JavaScript error occurred' "$out" >&2 \
    || tail -n 20 "$out" >&2
  exit 1
fi

echo "smoke: OK — la app empaquetada arrancó (v${version}, backend listo)"
