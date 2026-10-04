function PageRailNavigation({ currentPage, totalPages, setCurrentPage, isVisible }) {
  if (totalPages <= 1 || !isVisible) return null;

  return (
    <nav className="page-rail-navigation" aria-label="Fixed page navigation">
      <button
        type="button"
        className="page-rail-button page-rail-previous"
        onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
        disabled={currentPage === 1}
        aria-label="Previous page"
        title="Previous page"
      >
        <span aria-hidden="true"></span>
      </button>
      <button
        type="button"
        className="page-rail-button page-rail-next"
        onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        title="Next page"
      >
        <span aria-hidden="true"></span>
      </button>
    </nav>
  );
}

export default PageRailNavigation;
