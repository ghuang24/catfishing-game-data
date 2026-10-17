import { useEffect, useMemo, useState } from 'react';
import AllAnswersSearch from './components/AllAnswersSearch.jsx';
import ImportPanel from './components/ImportPanel.jsx';
import PageHeader from './components/PageHeader.jsx';
import RawDataDisplay from './RawDataDisplay.jsx';
import { mergeScores, normalizeScores, readGzipExport } from './exportData.js';
import { selectVisibleReportData } from './reportVisibility.js';
import {
  clearScores,
  loadImportDevice,
  loadScores,
  saveImportDevice,
  saveScores
} from './scoreStorage.js';

function parseGameData(content) {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Shared game data has invalid JSON on line ${index + 1}.`, {
          cause: error
        });
      }
    })
    .sort((left, right) => right.day - left.day);
}

function App() {
  const [gameData, setGameData] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(import.meta.env.VITE_GAME_DATA_URL);
        if (!response.ok) {
          throw new Error(`Shared game data could not be loaded (${response.status}).`);
        }

        const [gameDataText, storedScores] = await Promise.all([
          response.text(),
          Promise.resolve(loadScores())
        ]);
        setGameData(parseGameData(gameDataText));
        setScores(storedScores);
      } catch (loadError) {
        console.error('Failed to initialize application:', loadError);
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const { visibleGameData, visibleScores } = useMemo(
    () => selectVisibleReportData(gameData, scores),
    [gameData, scores]
  );

  async function importExport(file) {
    const exportData = await readGzipExport(file);
    const importedScores = normalizeScores(exportData);
    if (importedScores.length === 0) {
      throw new Error('This export does not contain any game history.');
    }

    const importDevice = exportData.meta.device;
    const savedDevice = loadImportDevice();
    const replacesExistingData = scores.length > 0 && savedDevice !== importDevice;
    if (replacesExistingData) {
      const sourceWarning = savedDevice
        ? 'This export was created on a different device and may belong to another account.'
        : 'The source of the currently saved data cannot be verified.';
      const confirmed = window.confirm(
        `${sourceWarning}\n\nContinuing will replace ${scores.length} saved ` +
        `day${scores.length === 1 ? '' : 's'} with ${importedScores.length} from this export.`
      );
      if (!confirmed) {
        return { cancelled: true };
      }
    }

    const nextScores = replacesExistingData
      ? importedScores
      : mergeScores(scores, importedScores);
    saveScores(nextScores);
    saveImportDevice(importDevice);
    setScores(nextScores);
    return {
      cancelled: false,
      importedCount: importedScores.length,
      skippedCount: 0,
      replaced: replacesExistingData
    };
  }

  function removeLocalData() {
    clearScores();
    setScores([]);
  }

  if (loading) {
    return (
      <main className="page">
        <PageHeader />
        <p>Loading shared game data…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page">
        <PageHeader />
        <div className="load-error" role="alert">
          <p>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <PageHeader />
      <ImportPanel scores={scores} onImport={importExport} onClear={removeLocalData} />
      {scores.length === 0 ? (
        <section className="empty-state">
          <p>
            Import your Catfishing data to explore the answers you submitted. Unplayed days remain hidden.
          </p>
        </section>
      ) : (
        <RawDataDisplay data={visibleGameData} scoresData={visibleScores} />
      )}
      <hr className="section-divider" />
      <AllAnswersSearch gameData={gameData} />
    </main>
  );
}

export default App;
