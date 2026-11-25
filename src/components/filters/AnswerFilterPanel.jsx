import { parseCorrectRateRange } from '../../utils';

const ANSWER_OPTIONS = [
  { value: 'correct', label: 'Correct' },
  { value: 'close', label: 'Close enough' },
  { value: 'incorrect-or-skipped', label: 'Incorrect or skipped' }
];

function AnswerFilterPanel({
  answerFilters,
  setAnswerFilters,
  correctRateFilter,
  setCorrectRateFilter,
  showHidden,
  setShowHidden
}) {
  const hasInput = correctRateFilter.trim().length > 0;
  const correctRateRange = parseCorrectRateRange(correctRateFilter);

  function toggleAnswerFilter(value) {
    setAnswerFilters(current => (
      current.includes(value)
        ? current.filter(option => option !== value)
        : [...current, value]
    ));
  }

  return (
    <>
      <div className="answer-checkboxes">
        {ANSWER_OPTIONS.map(option => (
          <label className="menu-checkbox" key={option.value}>
            <input
              type="checkbox"
              checked={answerFilters.includes(option.value)}
              onChange={() => toggleAnswerFilter(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      <div className="menu-divider" />
      <label className="input-label" htmlFor="correct-rate-filter">
        Correct rate
      </label>
      <div className="rate-shortcuts" aria-label="Correct rate quintiles">
        {['0-20', '20-40', '40-60', '60-80', '80-100'].map(range => (
          <button
            key={range}
            type="button"
            className={`rate-shortcut ${correctRateFilter === range ? 'is-active' : ''}`}
            onClick={() => setCorrectRateFilter(current =>
              current === range ? '' : range
            )}
          >
            {range.replace('-', '–')}%
          </button>
        ))}
      </div>
      <input
        id="correct-rate-filter"
        type="text"
        inputMode="decimal"
        value={correctRateFilter}
        onChange={(event) => setCorrectRateFilter(event.target.value)}
        placeholder="e.g., 10-20"
        className="menu-search-input"
        autoComplete="off"
        aria-invalid={hasInput && !correctRateRange}
        aria-describedby="correct-rate-help"
      />
      <span
        id="correct-rate-help"
        className={hasInput && !correctRateRange ? 'menu-error' : 'menu-help'}
      >
        {hasInput && !correctRateRange
          ? 'Enter a range such as 10-20.'
          : 'Inclusive percentage range. Values are limited to 0-100.'}
      </span>
      <div className="menu-divider" />
      <label className="menu-checkbox">
        <input
          type="checkbox"
          checked={showHidden}
          onChange={(event) => setShowHidden(event.target.checked)}
        />
        <span>Show hidden answers</span>
      </label>
      <span className="menu-help">No answer types selected shows all answers.</span>
    </>
  );
}

export default AnswerFilterPanel;
