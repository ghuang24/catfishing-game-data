function SearchFilterPanel({
  searchRef,
  searchInput,
  setSearchInput,
  filteredDays,
  totalDays,
  filteredArticles,
  totalArticles
}) {
  return (
    <>
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
  );
}

export default SearchFilterPanel;
