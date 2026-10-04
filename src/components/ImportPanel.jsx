import { useRef, useState } from 'react';

function ImportPanel({ scores, onImport, onClear }) {
  const inputRef = useRef(null);
  const dragDepthRef = useRef(0);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState(null);

  const latestDay = scores.reduce((latest, score) => Math.max(latest, score.day), 0);

  async function importFile(file) {
    setIsImporting(true);
    setMessage(null);
    try {
      if (!file.name.toLowerCase().endsWith('.gz')) {
        throw new Error('Select a Catfishing .gz export.');
      }
      const result = await onImport(file);
      if (result.cancelled) {
        setMessage({ type: 'warning', text: 'Import canceled. Saved data was not changed.' });
        return;
      }
      const skippedText = result.skippedCount > 0
        ? ` Ignored ${result.skippedCount} unfinished game${result.skippedCount === 1 ? '' : 's'}.`
        : '';
      const action = result.replaced ? 'Replaced saved data with' : 'Imported';
      setMessage({
        type: 'success',
        text: `${action} ${result.importedCount} completed ` +
          `day${result.importedCount === 1 ? '' : 's'} from ${file.name}.${skippedText}`
      });
    } catch (error) {
      console.error('Failed to import Catfishing export:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsImporting(false);
    }
  }

  async function handleFile(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    await importFile(file);
    input.value = '';
  }

  function handleDragEnter(event) {
    event.preventDefault();
    dragDepthRef.current += 1;
    if (event.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = isImporting ? 'none' : 'copy';
  }

  function handleDragLeave(event) {
    event.preventDefault();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  }

  async function handleDrop(event) {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (isImporting) return;

    const file = event.dataTransfer.files?.[0];
    if (file) {
      await importFile(file);
    }
  }

  function handleClear() {
    if (!window.confirm('Remove all Catfishing score data saved in this browser?')) return;
    onClear();
    setMessage({ type: 'success', text: 'Saved score data was removed.' });
  }

  return (
    <section
      className={`import-panel ${isDragging ? 'is-dragging' : ''}`}
      aria-labelledby="import-title"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div>
        <h2 id="import-title">Your game history</h2>
        <p>
          Import a Catfishing gzip export to unlock completed days. The file is processed
          locally and your scores stay in this browser. Re-upload a newer export at any time
          to update your saved data.
        </p>
        <span className="drop-hint">Choose a file or drag and drop a .gz export here.</span>
        {scores.length > 0 && (
          <span className="import-summary">
            {scores.length} completed days saved · Latest: Day {latestDay}
          </span>
        )}
        {message && (
          <p className={`import-message ${message.type}`} role="status">
            {message.text}
          </p>
        )}
      </div>
      <div className="import-actions">
        <input
          ref={inputRef}
          type="file"
          accept=".gz,application/gzip"
          onChange={handleFile}
          className="visually-hidden"
        />
        <button
          type="button"
          className="import-button"
          onClick={() => inputRef.current?.click()}
          disabled={isImporting}
        >
          {isImporting ? 'Importing…' : 'Import Catfishing stats'}
        </button>
        {scores.length > 0 && (
          <button type="button" className="clear-data-button" onClick={handleClear}>
            Clear local data
          </button>
        )}
      </div>
    </section>
  );
}

export default ImportPanel;
