#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================"
echo " Agent Profile Test Runner"
echo "========================================"
echo ""

bash "$SCRIPT_DIR/check-agent-profile.sh"