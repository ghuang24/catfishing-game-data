import { MENU_TITLES } from './filterMenuConfig.js';

function FilterMenuPanel({
  openMenu,
  onClose,
  onClearSection,
  hasActiveSection,
  children
}) {
  if (!openMenu) return null;

  const isSearch = openMenu === 'search';
  return (
    <div className="header-menu-panel" id={`${openMenu}-menu`}>
      <div className="header-menu-panel-heading">
        {isSearch ? (
          <label className="menu-title" htmlFor="search-filter">Search</label>
        ) : (
          <span className="menu-title">{MENU_TITLES[openMenu]}</span>
        )}
        <div className="menu-heading-actions">
          {openMenu !== 'search' && hasActiveSection && (
            <button
              type="button"
              className="menu-clear-button"
              onClick={onClearSection}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            className="menu-close-button"
            aria-label={`Close ${MENU_TITLES[openMenu]} window`}
            onClick={onClose}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

export default FilterMenuPanel;
