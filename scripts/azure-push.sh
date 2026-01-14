#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/azure-push.sh -r <registry-name> [-i <image-name>] [-t <tag>]... [-e <envfile>]
                          [-f <Dockerfile>] [-c <context>] [--platform <arch>]
                          [--subscription <id>] [--mode local|acr]
                          [--env-prefix NEXT_PUBLIC_] [--push-latest]

Options:
  -r  ACR registry name (e.g., vocalisfrontend)                (required)
  -i  Image name (default: flows-editor)
  -t  Image tag (repeatable). Default: latest
  -e  Env file to load build-time vars from (default: .env.production)
  -f  Dockerfile path (default: Dockerfile)
  -c  Build context (default: .)
  --platform     Docker build platform (e.g., linux/amd64). Only for local mode.
  --subscription Azure subscription ID to set before pushing. Optional.
  --mode         "local" (docker build + docker push) or "acr" (az acr build). Default: local
  --env-prefix   Only pass vars whose keys start with this prefix as build args. Default: NEXT_PUBLIC_
  --push-latest  Also tag/push :latest in addition to provided tags.

Notes:
- NEXT_PUBLIC_* vars are build-time for Next.js; rebuild required to change.
- Your Dockerfile must declare matching ARGs for any build args you pass.

Examples:
  ./scripts/azure-push.sh -r vocalisfrontend -i flows-editor -t $(git rev-parse --short HEAD) -e .env.production --push-latest
  ./scripts/azure-push.sh -r vocalisfrontend -i flows-editor -t v1 --mode acr -e .env.production
EOF
}

REGISTRY_NAME=""
IMAGE_NAME="vocalis-flows-editor"
TAGS=()
ENV_FILE=".env.production"
DOCKERFILE="Dockerfile"
CONTEXT="."
PLATFORM="linux/amd64"
SUBSCRIPTION_ID=""
MODE="local"
ENV_PREFIX="NEXT_PUBLIC_"
PUSH_LATEST="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -r) REGISTRY_NAME="$2"; shift 2 ;;
    -i) IMAGE_NAME="$2"; shift 2 ;;
    -t) TAGS+=( "$2" ); shift 2 ;;
    -e) ENV_FILE="$2"; shift 2 ;;
    -f) DOCKERFILE="$2"; shift 2 ;;
    -c) CONTEXT="$2"; shift 2 ;;
    --platform) PLATFORM="$2"; shift 2 ;;
    --subscription) SUBSCRIPTION_ID="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --env-prefix) ENV_PREFIX="$2"; shift 2 ;;
    --push-latest) PUSH_LATEST="true"; shift 1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

if [[ -z "$REGISTRY_NAME" ]]; then
  echo "Error: -r <registry-name> is required"
  usage
  exit 1
fi

if [[ "${#TAGS[@]}" -eq 0 ]]; then
  TAGS=( "latest" )
fi

command -v az >/dev/null 2>&1 || { echo "Azure CLI 'az' not found"; exit 1; }
if [[ "$MODE" == "local" ]]; then
  command -v docker >/dev/null 2>&1 || { echo "Docker not found (required for --mode local)"; exit 1; }
fi

if [[ -n "$SUBSCRIPTION_ID" ]]; then
  az account set --subscription "$SUBSCRIPTION_ID"
fi

if ! az account show >/dev/null 2>&1; then
  az login >/dev/null
fi

LOGIN_SERVER="$(az acr show -n "$REGISTRY_NAME" --query loginServer -o tsv 2>/dev/null || true)"
if [[ -z "$LOGIN_SERVER" ]]; then
  echo "Error: ACR '$REGISTRY_NAME' not found in your subscription."
  exit 1
fi

echo "Registry: $REGISTRY_NAME ($LOGIN_SERVER)"
echo "Image:    $IMAGE_NAME"
echo "Mode:     $MODE"
echo "EnvFile:  $ENV_FILE"
echo "Prefix:   $ENV_PREFIX"
echo "Tags:     ${TAGS[*]}"
echo ""

declare -a BUILD_ARGS=()

if [[ -f "$ENV_FILE" ]]; then
  echo "Loading build args from $ENV_FILE (prefix: $ENV_PREFIX)"
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" || "$line" =~ ^# ]] && continue

    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      val="${BASH_REMATCH[2]}"

      if [[ "$val" =~ ^\".*\"$ ]]; then
        val="${val:1:-1}"
      elif [[ "$val" =~ ^\'.*\'$ ]]; then
        val="${val:1:-1}"
      fi

      if [[ "$key" == ${ENV_PREFIX}* ]]; then
        BUILD_ARGS+=( --build-arg "${key}=${val}" )
      fi
    fi
  done < "$ENV_FILE"
else
  echo "Warning: Env file '$ENV_FILE' not found. No build args loaded."
fi

if [[ "$PUSH_LATEST" == "true" ]]; then
  found_latest="false"
  for t in "${TAGS[@]}"; do
    [[ "$t" == "latest" ]] && found_latest="true"
  done
  [[ "$found_latest" == "false" ]] && TAGS+=( "latest" )
fi

if [[ "$MODE" == "acr" ]]; then
  IMG_ARGS=()
  for t in "${TAGS[@]}"; do
    IMG_ARGS+=( --image "${IMAGE_NAME}:${t}" )
  done

  az acr build \
    --registry "$REGISTRY_NAME" \
    --file "$DOCKERFILE" \
    "${BUILD_ARGS[@]}" \
    "${IMG_ARGS[@]}" \
    "$CONTEXT"

  echo ""
  echo "Pushed (via ACR build):"
  for t in "${TAGS[@]}"; do
    echo "  ${LOGIN_SERVER}/${IMAGE_NAME}:${t}"
  done
  exit 0
fi

az acr login --name "$REGISTRY_NAME" >/dev/null

PRIMARY_TAG="${TAGS[0]}"
LOCAL_TAG="${IMAGE_NAME}:${PRIMARY_TAG}"

echo "Building local image: $LOCAL_TAG"
if [[ -n "$PLATFORM" ]]; then
  docker build --platform "$PLATFORM" -f "$DOCKERFILE" "${BUILD_ARGS[@]}" -t "$LOCAL_TAG" "$CONTEXT"
else
  docker build -f "$DOCKERFILE" "${BUILD_ARGS[@]}" -t "$LOCAL_TAG" "$CONTEXT"
fi

for t in "${TAGS[@]}"; do
  REMOTE_TAG="${LOGIN_SERVER}/${IMAGE_NAME}:${t}"
  echo "Tagging -> $REMOTE_TAG"
  docker tag "$LOCAL_TAG" "$REMOTE_TAG"
  echo "Pushing -> $REMOTE_TAG"
  docker push "$REMOTE_TAG"
done

echo ""
echo "Pushed:"
for t in "${TAGS[@]}"; do
  echo "  ${LOGIN_SERVER}/${IMAGE_NAME}:${t}"
done
