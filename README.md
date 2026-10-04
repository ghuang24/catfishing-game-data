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

The local shared-data snapshot is:

```text
public/data/game-data.jsonl
```

It contains public article, category, correct-rate, and aggregate score data. It
does not contain a player's score history. Refreshing and deploying this file
will be automated separately; this repository currently contains no deployment
infrastructure.

## Validation

```bash
npm test
npm run build
```
