/**
 * Universal Row Pagination (Left-Aligned)
 * --------------------------------------
 * Usage:
 *   const pager = initRowPagination({
 *     totalItems,
 *     onPageChange: (page, pageSize) => { ... },
 *     pageSizeOptions: [100,200,500],   // optional
 *     defaultPageSize: 100              // optional
 *   });
 *   container.appendChild(pager);
 *
 * You can later update totals without re-creating:
 *   pager.setTotalItems(newTotal);
 *   pager.setPage(1);           // go to page 1
 *   const {page, pageSize} = pager.getState();
 */

export function initRowPagination({ totalItems, onPageChange }) {
  let currentPage = 1;
  const rowsPerPage = 100;

  const container = document.createElement('div');
  container.className = 'row-pagination';

  const label = document.createElement('span');
  label.className = 'row-pagination-label';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '⬅';
  prevBtn.className = 'row-pagination-btn';

  const nextBtn = document.createElement('button');
  nextBtn.textContent = '➡';
  nextBtn.className = 'row-pagination-btn';

  function totalPages() {
    return Math.ceil(totalItems / rowsPerPage);
  }

  function renderLabel() {
    const start = (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, totalItems);
    label.textContent = `Rows ${start}-${end} of ${totalItems}`;
  }

  function updatePage() {
    renderLabel();
    onPageChange(currentPage, rowsPerPage);
  }

  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      updatePage();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages()) {
      currentPage++;
      updatePage();
    }
  });

  container.appendChild(prevBtn);
  container.appendChild(label);
  container.appendChild(nextBtn);

  updatePage();
  return container;
}
