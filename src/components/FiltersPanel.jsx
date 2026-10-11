import { useEffect, useRef, useState } from 'react';
import dateIcon from '../Assets/date.svg';
import filterIcon from '../Assets/filter.svg';
import resetIcon from '../Assets/reset.svg';
import searchIcon from '../Assets/search.svg';
import { parseCorrectRateRange } from '../utils';

const ANSWER_OPTIONS = [
  { value: 'correct', label: 'Correct' },
  { value: 'close', label: 'Close enough' },
  { value: 'incorrect-or-skipped', label: 'Incorrect or skipped' }
];

const MENU_ICONS = {
  search: searchIcon,
  date: dateIcon,
  filters: filterIcon
};

function MenuIcon({ source }) {
  return <img className="menu-icon" src={source} alt="" aria-hidden="true" />;
}

function FiltersPanel({
  searchInput,
  setSearchInput,
  dayFilter,
  setDayFilter,
  dateRange,
  setDateRange,
  showUnplayed,
  setShowUnplayed,
  showHidden,
  setShowHidden,
  answerFilters,
  setAnswerFilters,
  correctRateFilter,
  setCorrectRateFilter,
  onClearAll,
  filteredDays,
  totalDays,
  filteredArticles,
  totalArticles
}) {
  const [openMenu, setOpenMenu] = useState(null);
  const controlsRef = useRef(null);
  const searchRef = useRef(null);
  const dayFilterRef = useRef(null);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!controlsRef.current?.contains(event.target)) {
        setOpenMenu(null);
      }
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (openMenu === 'search') {
      searchRef.current?.focus();
    } else if (openMenu === 'date') {
      dayFilterRef.current?.focus();
    }
  }, [openMenu]);

  function toggleMenu(menu) {
    setOpenMenu(current => current === menu ? null : menu);
  }

  function toggleAnswerFilter(value) {
    setAnswerFilters(current => (
      current.includes(value)
        ? current.filter(option => option !== value)
        : [...current, value]
    ));
  }

  function updateDayFilter(value) {
    setDayFilter(value);
    setDateRange(null);
  }

  const hasCorrectRateInput = correctRateFilter.trim().length > 0;
  const correctRateRange = parseCorrectRateRange(correctRateFilter);
  const activeFilterCount = answerFilters.length + (showHidden ? 1 : 0) + (correctRateRange ? 1 : 0);
  const hasAnythingToClear = Boolean(
    searchInput.trim() ||
    dayFilter.trim() ||
    dateRange ||
    !showUnplayed ||
    showHidden ||
    answerFilters.length ||
    correctRateFilter.trim()
  );

  return (
    <div className="header-controls" ref={controlsRef}>
      <div className="header-menu-buttons" role="group" aria-label="Data filters">
        {[
          { id: 'search', label: 'Search', isActive: Boolean(searchInput.trim()) },
          {
            id: 'date',
            label: 'Date',
            isActive: Boolean(dayFilter.trim() || dateRange || !showUnplayed)
          },
          { id: 'filters', label: 'Filters' }
        ].map(menu => (
          <button
            key={menu.id}
            type="button"
            className={`header-menu-button ${openMenu === menu.id ? 'is-open' : ''}`}
            onClick={() => toggleMenu(menu.id)}
            aria-expanded={openMenu === menu.id}
            aria-controls={`${menu.id}-menu`}
          >
            <MenuIcon source={MENU_ICONS[menu.id]} />
            <span>{menu.label}</span>
            {menu.id !== 'filters' && menu.isActive && (
              <span className="filter-count filter-indicator" aria-label={`${menu.label} active`}></span>
            )}
            {menu.id === 'filters' && activeFilterCount > 0 && (
              <span
                className="filter-count filter-indicator"
                aria-label={`${activeFilterCount} active filters`}
              ></span>
            )}
          </button>
        ))}
        <button
          type="button"
          className="header-menu-button clear-all-button"
          onClick={() => {
            onClearAll();
            setOpenMenu(null);
          }}
          disabled={!hasAnythingToClear}
          aria-label="Clear all search, dates, and filters"
          title="Clear search, dates, and filters"
        >
          <MenuIcon source={resetIcon} />
        </button>
      </div>

      {openMenu && (
        <div className="header-menu-panel" id={`${openMenu}-menu`}>
          {openMenu === 'search' && (
            <>
              <label className="menu-title" htmlFor="search-filter">Search</label>
              <input
                ref={searchRef}
                id="search-filter"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search answers..."
                className="menu-search-input"
                autoComplete="off"
              />
              <span className="menu-result-count">
                {filteredDays} of {totalDays} days · {filteredArticles} of {totalArticles} answers
              </span>
            </>
          )}

          {openMenu === 'date' && (
            <>
              <span className="menu-title">Date</span>
              <div className="date-shortcuts" aria-label="Date shortcuts">
                {[30, 60, 90].map(days => (
                  <button
                    key={days}
                    type="button"
                    className={`date-shortcut ${dateRange === days ? 'is-active' : ''}`}
                    onClick={() => {
                      setDateRange(current => current === days ? null : days);
                      setDayFilter('');
                    }}
                  >
                    Last {days} days
                  </button>
                ))}
              </div>
              <label className="input-label" htmlFor="day-filter">Specific days</label>
              <input
                ref={dayFilterRef}
                id="day-filter"
                type="text"
                value={dayFilter}
                onChange={(event) => updateDayFilter(event.target.value)}
                placeholder="e.g., 32-35, 37, 40"
                className="menu-search-input"
                autoComplete="off"
              />
              <div className="menu-divider"></div>
              <label className="menu-checkbox">
                <input
                  type="checkbox"
                  checked={showUnplayed}
                  onChange={(event) => setShowUnplayed(event.target.checked)}
                />
                <span>Show unplayed days</span>
              </label>
            </>
          )}

          {openMenu === 'filters' && (
            <>
              <span className="menu-title">Answer filters</span>
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
              <div className="menu-divider"></div>
              <label className="input-label" htmlFor="correct-rate-filter">
                Correct rate
              </label>
              <div className="rate-shortcuts" aria-label="Correct rate quintiles">
                {['0-20', '20-40', '40-60', '60-80', '80-100'].map(range => (
                  <button
                    key={range}
                    type="button"
                    className={`rate-shortcut ${correctRateFilter === range ? 'is-active' : ''}`}
                    onClick={() => {
                      setCorrectRateFilter(current => current === range ? '' : range);
                    }}
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
                aria-invalid={hasCorrectRateInput && !correctRateRange}
                aria-describedby="correct-rate-help"
              />
              <span
                id="correct-rate-help"
                className={hasCorrectRateInput && !correctRateRange ? 'menu-error' : 'menu-help'}
              >
                {hasCorrectRateInput && !correctRateRange
                  ? 'Enter a range such as 10-20.'
                  : 'Inclusive percentage range. Values are limited to 0-100.'}
              </span>
              <div className="menu-divider"></div>
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
          )}

        </div>
      )}
    </div>
  );
}

export default FiltersPanel;
