#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${1:-chiino}"
OUT_DIR="${2:-./backup/fly-data-$(date +%Y%m%d-%H%M%S)}"
FILES=("products.json" "realisations.json" "schedule.json" "orders.json" "webhook-events.json")

echo "[info] App Fly: ${APP_NAME}"
echo "[info] Dossier backup: ${OUT_DIR}"
mkdir -p "${OUT_DIR}"

for file in "${FILES[@]}"; do
  remote_path="/app/data/${file}"
  out_path="${OUT_DIR}/${file}"

  echo "[info] Export ${remote_path} -> ${out_path}"

  if fly ssh console -a "${APP_NAME}" -C "test -f '${remote_path}'" >/dev/null 2>&1; then
    fly ssh console -a "${APP_NAME}" -C "cat '${remote_path}'" > "${out_path}"
  else
    echo "{}" > "${out_path}"
    echo "[warn] ${remote_path} introuvable, fichier vide initialise."
  fi
done

echo "[ok] Backup termine: ${OUT_DIR}"
