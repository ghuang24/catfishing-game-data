function Checkbox({ checked, onChange, children }) {
  return (
    <label className="menu-checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}

function DateFilterPanel({
  dayFilter,
  setDayFilter,
  dateRange,
  setDateRange,
  showUnplayed,
  setShowUnplayed,
  gotHardestQuestion,
  setGotHardestQuestion,
  missedEasiestQuestion,
  setMissedEasiestQuestion
}) {
  function updateDayFilter(value) {
    setDayFilter(value);
    setDateRange(null);
  }

  return (
    <>
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
        id="day-filter"
        type="text"
        value={dayFilter}
        onChange={(event) => updateDayFilter(event.target.value)}
        placeholder="e.g., 32-35, -50, 750-, 37"
        className="menu-search-input"
        autoComplete="off"
      />
      <div className="menu-divider" />
      <Checkbox checked={gotHardestQuestion} onChange={setGotHardestQuestion}>
        Got hardest question
      </Checkbox>
      <Checkbox checked={missedEasiestQuestion} onChange={setMissedEasiestQuestion}>
        Missed easiest question
      </Checkbox>
      <div className="menu-divider" />
      <Checkbox checked={showUnplayed} onChange={setShowUnplayed}>
        Show unplayed days
      </Checkbox>
    </>
  );
}

export default DateFilterPanel;
