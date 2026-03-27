#!/usr/bin/env bash
# upload_to_github.sh
# Sube todos los archivos del sistema de auth a BOSDDaniel/jueguitos
# Uso: bash upload_to_github.sh

set -e

GITHUB_TOKEN="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"
REPO="BOSDDaniel/jueguitos"
BRANCH="main"
BASE_DIR="$(dirname "$0")"   # carpeta donde está este script

# ─── Colores ────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'

# ─── Función: subir un archivo ───────────────────────────────────────────────
upload_file() {
  local local_path="$1"
  local github_path="$2"

  if [ ! -f "$local_path" ]; then
    echo -e "${RED}⚠️  No encontrado: $local_path${NC}"
    return
  fi

  local content
  content=$(base64 -w 0 "$local_path")

  # ¿Ya existe? → obtener SHA para actualizarlo
  local sha
  sha=$(curl -sf \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/$REPO/contents/$github_path" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('sha',''))" 2>/dev/null || true)

  # Construir body JSON
  local body
  if [ -n "$sha" ]; then
    body=$(python3 -c "
import json, sys
print(json.dumps({
  'message': 'feat: auth-system - $github_path',
  'content': sys.argv[1],
  'branch':  '$BRANCH',
  'sha':     '$sha'
}))" "$content")
  else
    body=$(python3 -c "
import json, sys
print(json.dumps({
  'message': 'feat: auth-system - $github_path',
  'content': sys.argv[1],
  'branch':  '$BRANCH'
}))" "$content")
  fi

  local result
  result=$(curl -sf -X PUT \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/$REPO/contents/$github_path" \
    -d "$body")

  if echo "$result" | python3 -c "import sys,json; json.load(sys.stdin)['content']" &>/dev/null; then
    echo -e "${GREEN}✅ $github_path${NC}"
  else
    local msg
    msg=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message','?'))" 2>/dev/null)
    echo -e "${RED}❌ $github_path — $msg${NC}"
  fi
}

# ─── Verificar acceso ────────────────────────────────────────────────────────
echo "🔍 Verificando acceso a $REPO ..."
CHECK=$(curl -sf \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$REPO")

REPO_NAME=$(echo "$CHECK" | python3 -c "import sys,json; print(json.load(sys.stdin)['full_name'])" 2>/dev/null || true)
if [ -z "$REPO_NAME" ]; then
  echo -e "${RED}❌ No se pudo acceder al repositorio. Revisa el token.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Repositorio: $REPO_NAME${NC}"
echo ""
echo "📤 Subiendo archivos..."

# ─── Subir cada archivo ──────────────────────────────────────────────────────
upload_file "$BASE_DIR/database/schema.sql"              "auth-system/database/schema.sql"
upload_file "$BASE_DIR/src/config/db.js"                 "auth-system/src/config/db.js"
upload_file "$BASE_DIR/src/services/authService.js"      "auth-system/src/services/authService.js"
upload_file "$BASE_DIR/src/middlewares/auth.js"          "auth-system/src/middlewares/auth.js"
upload_file "$BASE_DIR/src/routes/authRoutes.js"         "auth-system/src/routes/authRoutes.js"
upload_file "$BASE_DIR/src/index.js"                     "auth-system/src/index.js"
upload_file "$BASE_DIR/package.json"                     "auth-system/package.json"
upload_file "$BASE_DIR/.env.example"                     "auth-system/.env.example"
upload_file "$BASE_DIR/README.md"                        "auth-system/README.md"

echo ""
echo "🎉 ¡Listo! Revisa: https://github.com/$REPO/tree/$BRANCH/auth-system"
