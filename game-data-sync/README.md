# Game data sync Function

This folder contains the timer-triggered Azure Function and infrastructure used
to keep the public Catfishing game-data blob current.

## Schedule

- `10:15 UTC`: refresh the latest stored day, append the next day, and refresh
  an age-prioritized archive batch.
- `22:15 UTC`: refresh the latest stored day and an age-prioritized archive
  batch.

The next `10:15 UTC` run performs that day's final refresh while adding the
newly published game. Archive records from the last 14 days become eligible
daily, records from the last 90 days weekly, and older records every 30 days.
Each run processes at most 25 requests, prioritizing recent tiers and then the
most overdue records within each tier.

API requests run sequentially with two seconds between request starts. Transient
network and server failures use capped exponential backoff, while `429`
responses honor `Retry-After`. Successful records are still published when
another record fails. The sync stops accepting work after eight minutes so it
can compress and upload the snapshot before the Function's ten-minute timeout.

The deployed defaults can be changed with these Function App settings:

| Setting | Default | Purpose |
| --- | ---: | --- |
| `SYNC_MAX_REQUESTS` | `25` | Maximum selected days per run |
| `SYNC_REQUEST_INTERVAL_MS` | `2000` | Minimum delay between request starts |
| `SYNC_REQUEST_TIMEOUT_MS` | `20000` | Timeout for one API request |
| `SYNC_MAX_RETRIES` | `4` | Retries for network, `429`, and `5xx` failures |
| `SYNC_EXECUTION_BUDGET_MS` | `480000` | Work deadline before final upload |

## Deploy

Prerequisites:

- Azure CLI authenticated with `az login`;
- Azure Functions Core Tools v4;
- Node.js 22 and npm; and
- permission to create resources and role assignments in the target resource
  group.

From this folder:

```bash
./deploy.sh
```

Configuration is provided through environment variables:

```bash
AZURE_SUBSCRIPTION_ID=<subscription-id> \
RESOURCE_GROUP=rg-catfishing-game-data \
AZURE_LOCATION=westus2 \
BASE_NAME=catfishing \
ALLOWED_ORIGIN=https://<username>.github.io \
CONFIGURE_GITHUB=true \
./deploy.sh
```

`ALLOWED_ORIGIN` defaults to `*` because the blob is public. Set it to the
GitHub Pages origin or custom-domain origin to make the CORS policy narrower.
`CONFIGURE_GITHUB=true` uses the GitHub CLI to set the repository Actions
variable consumed by the Pages build.

The script safely reruns for infrastructure or code changes. Existing blobs are
never reseeded. For a new environment without a blob, provide an existing JSONL
snapshot explicitly:

```bash
SEED_FILE=/path/to/game-data.jsonl ./deploy.sh
```

After the initial upload, later deployments do not require `SEED_FILE`.

To delete all provisioned resources:

```bash
az group delete --name "${RESOURCE_GROUP:-rg-catfishing-game-data}"
```

## Local development

Copy `local.settings.json.example` to `local.settings.json`, replace the storage
account URL, and authenticate with `az login`. Then run:

```bash
npm install
npm test
npm start
```

The deployed Function uses a user-assigned managed identity. No storage keys are
stored in application settings.
