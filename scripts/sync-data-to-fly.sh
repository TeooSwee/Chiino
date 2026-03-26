#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${1:-chiino}"
LOCAL_DIR="${2:-./data}"
FILES=("products.json" "realisations.json" "schedule.json" "orders.json" "webhook-events.json")

echo "[info] App Fly: ${APP_NAME}"
echo "[info] Source locale: ${LOCAL_DIR}"

if [[ ! -d "${LOCAL_DIR}" ]]; then
  echo "[error] Dossier local introuvable: ${LOCAL_DIR}" >&2
  exit 1
fi

echo "[info] Verification acces Fly..."
fly status -a "${APP_NAME}" >/dev/null

echo "[info] Creation du dossier /app/data si besoin"
fly ssh console -a "${APP_NAME}" -C "mkdir -p /app/data" >/dev/null

for file in "${FILES[@]}"; do
  local_path="${LOCAL_DIR}/${file}"
  remote_path="/app/data/${file}"

  if [[ ! -f "${local_path}" ]]; then
    echo "[warn] Ignore, absent en local: ${local_path}"
    continue
  fi

  echo "[info] Import ${local_path} -> ${remote_path}"
  cat "${local_path}" | fly ssh console -a "${APP_NAME}" -C "sh -lc \"cat > '${remote_path}'\""
done

echo "[ok] Synchronisation terminee vers ${APP_NAME}."
