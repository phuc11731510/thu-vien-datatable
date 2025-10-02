// =====================================
// Datatable mini — app.js (robust build)
// - Works with: #search, #status, table#tbl, #btnPrev/#btnNext/#pageIndicator
// - Tries data sources in order:
//     1) window.books (already defined)
//     2) fetch('data/books.json')
//     3) fetch('books.json')
// - If still empty, shows a clear message and (optionally) demo data
// =====================================

const state = {
  filterText: "",
  sort: { id: null, desc: false },
  page: { index: 1, size: 5 }
};

const USE_DEMO_IF_EMPTY = true; // chuyển false nếu không muốn dữ liệu mẫu

const qs  = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function applyFilter(arr, keyword) {
  const k = String(keyword || "").trim().toLowerCase();
  if (!k) return arr;
  return arr.filter(row => {
    for (const key in row) {
      const v = row[key];
      if (v != null && typeof v !== "object" && String(v).toLowerCase().includes(k)) {
        return true;
      }
    }
    return false;
  });
}

function applySort(arr, sort) {
  const { id, desc } = sort || {};
  if (!id) return arr;
  const cloned = arr.slice();
  cloned.sort((a, b) => {
    const va = a?.[id];
    const vb = b?.[id];
    if (va == null && vb == null) return 0;
    if (va == null) return desc ? 1 : -1;
    if (vb == null) return desc ? -1 : 1;
    const na = typeof va === "number" ? va : (Number.isFinite(+va) ? +va : null);
    const nb = typeof vb === "number" ? vb : (Number.isFinite(+vb) ? +vb : null);
    let cmp;
    if (na != null && nb != null) cmp = na - nb;
    else cmp = String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" });
    return desc ? -cmp : cmp;
  });
  return cloned;
}

function paginate(arr, page) {
  const size = Number(page?.size) || 5;
  const totalPages = Math.max(1, Math.ceil(arr.length / size));
  const index = Math.min(Math.max(1, Number(page?.index) || 1), totalPages);
  const start = (index - 1) * size;
  const end = start + size;
  return { items: arr.slice(start, end), index, size, totalPages };
}

function renderTable(items) {
  const table = qs("#tbl");
  if (!table) return;
  const tbody = table.tBodies?.[0] || table.createTBody();

  const ths = qsa("#tbl thead th");
  const useDefinedCols = ths.length > 0 && ths.some(th => th.getAttribute("data-col"));

  let rowsHtml = "";
  if (useDefinedCols) {
    rowsHtml = items.map(row => {
      const tds = ths.map(th => {
        const key = th.getAttribute("data-col");
        if (!key) return "<td></td>";
        const val = row[key];
        return `<td>${val != null ? escapeHtml(String(val)) : ""}</td>`;
      }).join("");
      return `<tr>${tds}</tr>`;
    }).join("");
  } else {
    rowsHtml = items.map(row => {
      const cells = Object.keys(row).map(k => `<td>${escapeHtml(String(row[k]))}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");
  }

  tbody.innerHTML = rowsHtml;
}

function renderStatus(totalAll, shownNow, sort, page, totalPages) {
  const el = qs("#status");
  if (!el) return;

  let text = "";
  if (!Array.isArray(window.books) || window.books.length === 0) {
    text = "Chưa nạp được dữ liệu. Kiểm tra file data/books.json hoặc books.json, hoặc khai báo biến window.books.";
  } else if (shownNow === 0 && !state.filterText) {
    text = "Không có dữ liệu để hiển thị.";
  } else if (shownNow === 0 && state.filterText) {
    text = "Không có kết quả phù hợp với từ khóa.";
  } else {
    const sortText = sort?.id ? ` • Sắp xếp: \"${sort.id}\" (${sort.desc ? "giảm" : "tăng"})` : "";
    const pageText = ` • Trang ${page.index}/${totalPages}`;
    const base = `Tổng ${totalAll} sách • Đang hiển thị ${shownNow} kết quả`;
    text = base + sortText + pageText;
  }
  el.textContent = text;
}

function updateAriaSort(sort) {
  const ths = qsa("#tbl thead th");
  ths.forEach(th => {
    const id = th.getAttribute("data-col");
    if (!id) {
      th.removeAttribute("aria-sort");
      return;
    }
    if (id === sort?.id) {
      th.setAttribute("aria-sort", sort.desc ? "descending" : "ascending");
    } else {
      th.setAttribute("aria-sort", "none");
    }
  });
}

function refresh() {
  const data = Array.isArray(window.books) ? window.books : [];
  const filtered = applyFilter(data, state.filterText);
  const sorted   = applySort(filtered, state.sort);
  const { items, index, size, totalPages } = paginate(sorted, state.page);
  state.page.index = index;

  renderTable(items);
  renderStatus(filtered.length, items.length, state.sort, { index, size }, totalPages);
  updateAriaSort(state.sort);

  const pageIndicator = qs("#pageIndicator");
  const btnPrev = qs("#btnPrev");
  const btnNext = qs("#btnNext");
  if (pageIndicator) pageIndicator.textContent = `Trang ${index}/${totalPages}`;
  if (btnPrev) btnPrev.disabled = index <= 1;
  if (btnNext) btnNext.disabled = index >= totalPages;
}

function setupEvents() {
  const searchEl = qs("#search");
  if (searchEl) {
    searchEl.addEventListener("input", (e) => {
      state.filterText = e.target.value;
      state.page.index = 1;
      refresh();
    });
  }

  qsa("#tbl thead th").forEach(th => {
    th.tabIndex = 0;
    th.addEventListener("click", () => {
      const id = th.getAttribute("data-col");
      if (!id) return;
      if (state.sort.id === id) {
        state.sort.desc = !state.sort.desc;
      } else {
        state.sort = { id, desc: false };
      }
      refresh();
    });
    th.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        th.click();
      }
    });
  });

  const btnPrev = qs("#btnPrev");
  const btnNext = qs("#btnNext");
  if (btnPrev) {
    btnPrev.onclick = () => {
      state.page.index = Math.max(1, (Number(state.page.index) || 1) - 1);
      refresh();
    };
  }
  if (btnNext) {
    btnNext.onclick = () => {
      state.page.index = (Number(state.page.index) || 1) + 1;
      refresh();
    };
  }

  const sel = qs("#pageSize");
  if (sel) {
    sel.addEventListener("change", () => {
      const v = Number(sel.value);
      if (Number.isFinite(v) && v > 0) {
        state.page.size = v;
        state.page.index = 1;
        refresh();
      }
    });
  }
}

// Try loading data from multiple sources
async function ensureData() {
  // 1) Use existing window.books if present & non-empty
  if (Array.isArray(window.books) && window.books.length > 0) return;

  // 2) Try fetch('data/books.json')
  try {
    const r1 = await fetch("data/books.json", { cache: "no-store" });
    if (r1.ok) {
      const j1 = await r1.json();
      if (Array.isArray(j1) && j1.length > 0) { window.books = j1; return; }
    }
  } catch (e) { /* ignore */ }

  // 3) Try fetch('books.json')
  try {
    const r2 = await fetch("books.json", { cache: "no-store" });
    if (r2.ok) {
      const j2 = await r2.json();
      if (Array.isArray(j2) && j2.length > 0) { window.books = j2; return; }
    }
  } catch (e) { /* ignore */ }

  // 4) Optional: demo data so UI still works
  if (USE_DEMO_IF_EMPTY) {
    window.books = [
      { id: 1,  title: "Clean Code",          author: "R. Martin", year: 2008, genre: "Software" },
      { id: 2,  title: "You Don't Know JS",   author: "K. Simpson", year: 2015, genre: "JavaScript" },
      { id: 3,  title: "Eloquent JavaScript", author: "M. Haverbeke", year: 2018, genre: "JavaScript" },
      { id: 4,  title: "The Pragmatic Programmer", author: "Hunt & Thomas", year: 1999, genre: "Software" },
      { id: 5,  title: "Design Patterns",     author: "GoF", year: 1994, genre: "Software" },
      { id: 6,  title: "Introduction to Algorithms", author: "CLRS", year: 2009, genre: "Algorithms" },
      { id: 7,  title: "Refactoring",         author: "M. Fowler", year: 2018, genre: "Software" },
      { id: 8,  title: "Deep Learning",       author: "Goodfellow", year: 2016, genre: "AI" },
      { id: 9,  title: "Python Crash Course", author: "E. Matthes", year: 2015, genre: "Python" },
      { id: 10, title: "Fluent Python",       author: "L. Ramalho", year: 2015, genre: "Python" }
    ];
    console.warn("Không tìm thấy dữ liệu thật; đang dùng DEMO. Hãy đặt data/books.json hoặc books.json, hoặc gán window.books = [...].");
  } else {
    window.books = [];
  }
}

async function init() {
  await ensureData();
  setupEvents();
  refresh();
}

document.addEventListener("DOMContentLoaded", init);

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
