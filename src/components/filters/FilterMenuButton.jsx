import MenuIcon from './MenuIcon.jsx';

function FilterMenuButton({
  menu,
  openMenu,
  isActive,
  activeFilterCount,
  onToggle
}) {
  return (
    <button
      type="button"
      className={`header-menu-button ${openMenu === menu.id ? 'is-open' : ''}`}
      onClick={() => onToggle(menu.id)}
      aria-expanded={openMenu === menu.id}
      aria-controls={`${menu.id}-menu`}
    >
      <MenuIcon source={menu.icon} />
      <span>{menu.label}</span>
      {menu.id !== 'filters' && isActive && (
        <span
          className="filter-count filter-indicator"
          aria-label={`${menu.label} active`}
        />
      )}
      {menu.id === 'filters' && activeFilterCount > 0 && (
        <span
          className="filter-count filter-indicator"
          aria-label={`${activeFilterCount} active filters`}
        />
      )}
    </button>
  );
}

export default FilterMenuButton;
