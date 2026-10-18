export function getArrowKeyPage(key, currentPage, totalPages) {
  if (key === 'ArrowLeft') {
    return Math.max(1, currentPage - 1);
  }
  if (key === 'ArrowRight') {
    return Math.min(totalPages, currentPage + 1);
  }
  return currentPage;
}
