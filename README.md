# Catfishing Stats

A local-first React application for reviewing Catfishing answers. Shared game
statistics are static public data; personal scores and guesses remain in the
browser.

## Local development

```bash
npm install
npm run dev
```

The Vite development server runs at `http://localhost:8080`.

## Personal data

Use **Import export** to select a Catfishing `.gz` export. The browser:

1. decompresses and validates the file locally;
2. converts completed games into normalized score records;
3. merges newer records with previously imported days; and
4. saves the result in `localStorage`.

The gzip file, personal scores, and guesses are not uploaded. Only days present
in the imported score history are available to the analysis view. Clearing site
data or using **Clear local data** removes the saved history.

## Shared game data

The application reads public article, category, correct-rate, and aggregate
score data from Azure Blob Storage. It does not contain a player's score
history.

For local development, copy `.env.example` to `.env.local` and set
`VITE_GAME_DATA_URL` to the deployed blob URL. Production builds fail when this
setting is missing so they cannot silently deploy stale packaged data.

## Deployment

GitHub Actions tests, builds, and deploys the static application to Pages. The
timer-triggered Azure Function under
`azure/game-data-sync/` updates the compressed public data blob independently,
so data refreshes do not create repository commits or Pages deployments.

Deploy the Azure resources and Function with:

```bash
cd azure/game-data-sync
./deploy.sh
```

See `azure/game-data-sync/README.md` for configuration and prerequisites.

In the repository settings, set **Pages > Build and deployment > Source** to
**GitHub Actions**. The refresh workflow also requires Actions to have read and
write repository permissions so it can commit the updated snapshot.

## Validation

```bash
npm test
npm run build
```
