function SortIndicator({ direction }) {
  return (
    <span
      className={`sort-indicator sort-indicator-${direction}`}
      aria-hidden="true"
    ></span>
  );
}

function getDirection(sortValue, column) {
  if (sortValue === `${column}-asc`) return 'ascending';
  if (sortValue === `${column}-desc`) return 'descending';
  return 'none';
}

function ResultsSortHeader({
  articleSortBy,
  daySortBy,
  onCycleArticleSort,
  onCycleDaySort
}) {
  const articleDirection = articleSortBy === 'asc'
    ? 'ascending'
    : articleSortBy === 'desc'
      ? 'descending'
      : 'none';

  return (
    <div className="results-table-header" role="row" aria-label="Sort results">
      {[
        { column: 'day', label: 'Day' },
        { column: 'user', label: 'My score' },
        { column: 'average', label: 'Avg score' }
      ].map(({ column, label }) => {
        const direction = getDirection(daySortBy, column);
        return (
          <button
            key={column}
            type="button"
            role="columnheader"
            aria-sort={direction}
            className={`results-sort-button ${direction !== 'none' ? 'is-active' : ''}`}
            onClick={() => onCycleDaySort(column)}
          >
            {label}
            <SortIndicator direction={direction} />
          </button>
        );
      })}
      <span className="results-answer-header" role="columnheader"></span>
      <button
        type="button"
        role="columnheader"
        aria-sort={articleDirection}
        className={`results-sort-button correct-rate-sort ${
          articleSortBy !== 'none' ? 'is-active' : ''
        }`}
        onClick={onCycleArticleSort}
      >
        % correct
        <SortIndicator direction={articleDirection} />
      </button>
    </div>
  );
}

export default ResultsSortHeader;
