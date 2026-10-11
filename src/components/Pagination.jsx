function Pagination({
  currentPage,
  setCurrentPage,
  pageInput,
  setPageInput,
  totalPages
}) {
  function applyPageInput() {
    const page = Number(pageInput);
    if (Number.isInteger(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    } else {
      setPageInput(String(currentPage));
    }
  }

  return (
    <div className="pagination-controls">
      <button
        type="button"
        onClick={() => setCurrentPage(1)}
        disabled={currentPage === 1}
        className="pagination-button"
        title="First page"
      >
        ««
      </button>
      <button
        type="button"
        onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
        disabled={currentPage === 1}
        className="pagination-button"
      >
        Previous
      </button>
      <div className="pagination-info">
        <span className="page-label">Page</span>
        <input
          type="number"
          min="1"
          max={totalPages}
          value={pageInput}
          onChange={event => setPageInput(event.target.value)}
          onBlur={applyPageInput}
          className="page-input"
        />
        <span className="page-label">
          of {totalPages}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
        disabled={currentPage === totalPages}
        className="pagination-button"
      >
        Next
      </button>
      <button
        type="button"
        onClick={() => setCurrentPage(totalPages)}
        disabled={currentPage === totalPages}
        className="pagination-button"
        title="Last page"
      >
        »»
      </button>
    </div>
  );
}

export default Pagination;
