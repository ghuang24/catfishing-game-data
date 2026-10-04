import { useMemo, useState } from 'react';
import { matchesSearchText, normalizeSearchText } from '../search.js';

const RESULT_LIMIT = 50;

function AllAnswersSearch({ gameData }) {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const normalizedQuery = normalizeSearchText(submittedQuery);

  const matches = useMemo(() => {
    if (!normalizedQuery) return [];

    return gameData.flatMap(dayData =>
      dayData.data
        .filter(article => matchesSearchText(article.title, normalizedQuery))
        .map(article => ({ ...article, day: dayData.day }))
    );
  }, [gameData, normalizedQuery]);

  const visibleMatches = matches.slice(0, RESULT_LIMIT);

  function handleSubmit(event) {
    event.preventDefault();
    setSubmittedQuery(query.trim());
  }

  return (
    <section className="all-answers-search" aria-labelledby="all-answers-title">
      <div className="all-answers-heading">
        <div>
          <h2 id="all-answers-title">Search all answers</h2>
          <p className="spoiler-warning">
            Warning: This searches all past answers and may spoil days you have not played.
          </p>
        </div>
        <form className="all-answers-form" onSubmit={handleSubmit}>
          <input
            type="search"
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setSubmittedQuery('');
            }}
            placeholder="Search every answer..."
            className="all-answers-input"
            autoComplete="off"
            aria-label="Search all past answers"
          />
          <button type="submit" className="all-answers-button" disabled={!query.trim()}>
            Search
          </button>
        </form>
      </div>

      {normalizedQuery && (
        <>
          <p className="all-answers-count" aria-live="polite">
            {matches.length} {matches.length === 1 ? 'answer' : 'answers'} found
            {matches.length > RESULT_LIMIT && ` · Showing first ${RESULT_LIMIT}`}
          </p>
          {visibleMatches.length > 0 ? (
            <div className="all-answers-results">
              {visibleMatches.map((article, index) => (
                <a
                  key={`${article.day}-${article.title}-${index}`}
                  href={`https://catfishing.net/game/${article.day}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="all-answers-result"
                >
                  <span>{article.title}</span>
                  <span className="all-answers-meta">
                    Day {article.day}
                    {typeof article.correctRate === 'number' &&
                      ` · ${article.correctRate.toFixed(2)}% correct`}
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="all-answers-empty">No published answers match this search.</p>
          )}
        </>
      )}
    </section>
  );
}

export default AllAnswersSearch;
