#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
resource_group="${RESOURCE_GROUP:-rg-catfishing-game-data}"
location="${AZURE_LOCATION:-westus2}"
base_name="${BASE_NAME:-catfishing}"
allowed_origin="${ALLOWED_ORIGIN:-*}"
deployment_name="game-data-sync"
seed_file="${SEED_FILE:-}"

for command in az curl func gzip npm; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command not found: $command" >&2
    exit 1
  fi
done

if [[ ! "$base_name" =~ ^[a-z0-9-]{3,20}$ ]]; then
  echo "BASE_NAME must contain 3-20 lowercase letters, numbers, or hyphens." >&2
  exit 1
fi

az account show >/dev/null
if [[ -n "${AZURE_SUBSCRIPTION_ID:-}" ]]; then
  az account set --subscription "$AZURE_SUBSCRIPTION_ID"
fi

echo "Provisioning Azure resources in $resource_group ($location)..."
az group create \
  --name "$resource_group" \
  --location "$location" \
  --output none

az deployment group create \
  --name "$deployment_name" \
  --resource-group "$resource_group" \
  --template-file "$script_dir/infra/main.bicep" \
  --parameters \
    baseName="$base_name" \
    location="$location" \
    allowedOrigin="$allowed_origin" \
  --output none

function_app_name="$(az deployment group show \
  --name "$deployment_name" \
  --resource-group "$resource_group" \
  --query properties.outputs.functionAppName.value \
  --output tsv)"
storage_account_name="$(az deployment group show \
  --name "$deployment_name" \
  --resource-group "$resource_group" \
  --query properties.outputs.dataStorageAccountName.value \
  --output tsv)"
container_name="$(az deployment group show \
  --name "$deployment_name" \
  --resource-group "$resource_group" \
  --query properties.outputs.dataContainerName.value \
  --output tsv)"
blob_name="$(az deployment group show \
  --name "$deployment_name" \
  --resource-group "$resource_group" \
  --query properties.outputs.dataBlobName.value \
  --output tsv)"
blob_url="$(az deployment group show \
  --name "$deployment_name" \
  --resource-group "$resource_group" \
  --query properties.outputs.dataBlobUrl.value \
  --output tsv)"

if ! curl --fail --silent --head "$blob_url" >/dev/null; then
  if [[ -z "$seed_file" ]]; then
    echo "The game-data blob does not exist. Set SEED_FILE to an existing JSONL snapshot." >&2
    exit 1
  fi
  if [[ ! -f "$seed_file" ]]; then
    echo "Seed data file not found: $seed_file" >&2
    exit 1
  fi

  echo "Uploading the initial compressed game-data snapshot..."
  temporary_file="$(mktemp)"
  trap 'rm -f "$temporary_file"' EXIT
  gzip -9 -c "$seed_file" > "$temporary_file"
  storage_key="$(az storage account keys list \
    --account-name "$storage_account_name" \
    --resource-group "$resource_group" \
    --query '[0].value' \
    --output tsv)"
  az storage blob upload \
    --account-name "$storage_account_name" \
    --account-key "$storage_key" \
    --container-name "$container_name" \
    --name "$blob_name" \
    --file "$temporary_file" \
    --content-type "application/x-ndjson" \
    --content-encoding "gzip" \
    --content-cache-control "public, max-age=300, must-revalidate" \
    --overwrite false \
    --output none
fi

echo "Building, testing, and deploying the Function App..."
(
  cd "$script_dir"
  npm ci
  npm test
  for attempt in 1 2 3; do
    if func azure functionapp publish "$function_app_name" --typescript; then
      break
    fi
    if [[ "$attempt" -eq 3 ]]; then
      echo "Function deployment failed after $attempt attempts." >&2
      exit 1
    fi
    echo "Function deployment attempt $attempt failed; retrying in 20 seconds..." >&2
    sleep 20
  done
)

if [[ "${CONFIGURE_GITHUB:-false}" == "true" ]]; then
  if ! command -v gh >/dev/null 2>&1; then
    echo "CONFIGURE_GITHUB=true requires the GitHub CLI (gh)." >&2
    exit 1
  fi
  gh variable set GAME_DATA_URL --body "$blob_url"
  echo "Configured the GitHub Actions GAME_DATA_URL variable."
fi

cat <<EOF

Deployment complete.

Function App: $function_app_name
Game data:    $blob_url

Set the GitHub Actions repository variable GAME_DATA_URL to the URL above,
or rerun with CONFIGURE_GITHUB=true to set it with the GitHub CLI.
EOF
