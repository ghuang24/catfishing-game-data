import { useEffect, useRef, useState } from 'react';
import resetIcon from '../Assets/reset.svg';
import { parseCorrectRateRange } from '../utils';
import AnswerFilterPanel from './filters/AnswerFilterPanel.jsx';
import DateFilterPanel from './filters/DateFilterPanel.jsx';
import FilterMenuButton from './filters/FilterMenuButton.jsx';
import FilterMenuPanel from './filters/FilterMenuPanel.jsx';
import MenuIcon from './filters/MenuIcon.jsx';
import SearchFilterPanel from './filters/SearchFilterPanel.jsx';
import { MENU_OPTIONS } from './filters/filterMenuConfig.js';

function FiltersPanel(props) {
  const [openMenu, setOpenMenu] = useState(null);
  const controlsRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!controlsRef.current?.contains(event.target)) setOpenMenu(null);
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpenMenu(null);
    }
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (openMenu === 'search') searchRef.current?.focus();
  }, [openMenu]);

  const correctRateRange = parseCorrectRateRange(props.correctRateFilter);
  const activeFilterCount =
    props.answerFilters.length +
    (props.showHidden ? 1 : 0) +
    (correctRateRange ? 1 : 0);
  const hasAnythingToClear = Boolean(
    props.searchInput.trim() ||
    props.dayFilter.trim() ||
    props.dateRange ||
    props.showUnplayed ||
    props.showHidden ||
    props.answerFilters.length ||
    props.correctRateFilter.trim() ||
    props.gotHardestQuestion ||
    props.missedEasiestQuestion
  );

  function toggleMenu(menu) {
    setOpenMenu(current => current === menu ? null : menu);
  }

  function closeMenu() {
    controlsRef.current
      ?.querySelector(`[aria-controls="${openMenu}-menu"]`)
      ?.focus();
    setOpenMenu(null);
  }

  function menuIsActive(menuId) {
    if (menuId === 'search') return Boolean(props.searchInput.trim());
    if (menuId === 'date') {
      return Boolean(
        props.dayFilter.trim() ||
        props.dateRange ||
        props.showUnplayed ||
        props.gotHardestQuestion ||
        props.missedEasiestQuestion
      );
    }
    return false;
  }

  function clearAll() {
    props.onClearAll();
    setOpenMenu(null);
  }

  function clearDateSection() {
    props.setDayFilter('');
    props.setDateRange(null);
    props.setShowUnplayed(false);
    props.setGotHardestQuestion(false);
    props.setMissedEasiestQuestion(false);
  }

  function clearAnswerSection() {
    props.setAnswerFilters([]);
    props.setCorrectRateFilter('');
    props.setShowHidden(false);
  }

  const dateSectionActive = menuIsActive('date');
  const answerSectionActive =
    props.answerFilters.length > 0 ||
    props.correctRateFilter.trim().length > 0 ||
    props.showHidden;

  const panelProps = {
    search: (
      <SearchFilterPanel
        searchRef={searchRef}
        searchInput={props.searchInput}
        setSearchInput={props.setSearchInput}
        filteredDays={props.filteredDays}
        totalDays={props.totalDays}
        filteredArticles={props.filteredArticles}
        totalArticles={props.totalArticles}
      />
    ),
    date: (
      <DateFilterPanel
        dayFilter={props.dayFilter}
        setDayFilter={props.setDayFilter}
        dateRange={props.dateRange}
        setDateRange={props.setDateRange}
        showUnplayed={props.showUnplayed}
        setShowUnplayed={props.setShowUnplayed}
        gotHardestQuestion={props.gotHardestQuestion}
        setGotHardestQuestion={props.setGotHardestQuestion}
        missedEasiestQuestion={props.missedEasiestQuestion}
        setMissedEasiestQuestion={props.setMissedEasiestQuestion}
      />
    ),
    filters: (
      <AnswerFilterPanel
        answerFilters={props.answerFilters}
        setAnswerFilters={props.setAnswerFilters}
        correctRateFilter={props.correctRateFilter}
        setCorrectRateFilter={props.setCorrectRateFilter}
        showHidden={props.showHidden}
        setShowHidden={props.setShowHidden}
      />
    )
  };

  return (
    <div className="header-controls" ref={controlsRef}>
      <div className="header-menu-buttons" role="group" aria-label="Data filters">
        {MENU_OPTIONS.map(menu => (
          <FilterMenuButton
            key={menu.id}
            menu={menu}
            openMenu={openMenu}
            isActive={menuIsActive(menu.id)}
            activeFilterCount={activeFilterCount}
            onToggle={toggleMenu}
          />
        ))}
        <button
          type="button"
          className="header-menu-button clear-all-button"
          onClick={clearAll}
          disabled={!hasAnythingToClear}
          aria-label="Clear all search, dates, and filters"
          title="Clear search, dates, and filters"
        >
          <MenuIcon source={resetIcon} />
        </button>
      </div>
      <FilterMenuPanel
        openMenu={openMenu}
        onClose={closeMenu}
        onClearSection={openMenu === 'date' ? clearDateSection : clearAnswerSection}
        hasActiveSection={openMenu === 'date' ? dateSectionActive : answerSectionActive}
      >
        {panelProps[openMenu]}
      </FilterMenuPanel>
    </div>
  );
}

export default FiltersPanel;
