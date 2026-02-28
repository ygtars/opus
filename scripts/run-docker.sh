#!/usr/bin/env bash
set -euo pipefail

docker compose up --build -d

echo "Uygulama hazır: http://localhost:3000"
echo "Loglar: docker compose logs -f"
