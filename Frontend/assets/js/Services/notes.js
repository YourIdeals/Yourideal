// =====================================================
// notes.js — Full-page Notes (statement-style) with View
// =====================================================

import { initRowPagination } from "../row-pagination.js";

import {
  fetchNotes,
  createNote,
  updateNote,
  deleteNote,
  downloadNotesCSV,
} from "./utils/serviceApi.js";

import { requirePermission } from "../access-control.js";

// ---------- Helpers ----------
function formatDateUK(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB");
}

// Current logged-in user display name
function currentUserName() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.display_name || user.username || user.name || "System";
  } catch {
    return "System";
  }
}

// =====================================================
// MAIN ENTRY
// =====================================================
export function openNotes(service) {
  const root =
    service.root || document.getElementById("notesRoot") || document.body;

  const serviceId = service.serviceId;
  const clientId = service.clientId || service.client_id;
  const onBack = service.onBack || null;

  if (!serviceId) {
    console.error("openNotes: serviceId missing");
    return;
  }

  // 30 rows per page (fixed)
  const PAGE_SIZE = 30;
  let allNotes = [];
  let filteredNotes = [];
  let currentPage = 1;

  // -----------------------------
  // Build page layout
  // -----------------------------
  root.innerHTML = `
    <div class="notes-page">
      <div class="notes-header">
        <div>
          <h2>Service Notes</h2>
          <div class="notes-subtitle">
            Service: <strong>${serviceId || ""}</strong>
            ${clientId ? ` &nbsp;|&nbsp; Client: <strong>${clientId}</strong>` : ""}
          </div>
        </div>
        <div class="notes-header-actions">
          <button id="notesBackBtn" class="notes-btn-back">⬅ Back to Services</button>
        </div>
      </div>

      <div class="notes-filter-bar">
        <div class="notes-filter-group">
          <label for="notesFromDate">From:</label>
          <input type="date" id="notesFromDate">
        </div>
        <div class="notes-filter-group">
          <label for="notesToDate">To:</label>
          <input type="date" id="notesToDate">
        </div>
        <button id="notesFilterBtn" class="btn-notes-filter">Filter</button>
        <button id="notesClearFilterBtn" class="btn-notes-clear">Clear</button>

        <div class="notes-filter-spacer"></div>

        <button id="notesCsvBtn" class="btn-notes-csv">⬇ CSV</button>
        <button id="notesAddBtn" class="btn-notes-add">➕ Add Note</button>
      </div>

      <div class="notes-table-wrapper">
        <table class="notes-table">
          <thead>
            <tr>
              <th style="width:120px;">Date</th>
              <th>Description</th>
              <th style="width:180px;">Actions</th>
              <th style="width:140px;">Entered By</th>
            </tr>
          </thead>
          <tbody id="notesTableBody">
            <tr><td colspan="4" style="text-align:center;">Loading...</td></tr>
          </tbody>
        </table>
      </div>

      <div id="notesPager" class="notes-pagination"></div>

      <!-- Edit Panel -->
      <div id="notesEditPanel" class="notes-edit-panel" style="display:none;">
        <h3 id="notesEditTitle">Add Note</h3>
        <div class="notes-edit-row">
          <label for="notesDateInput">Date:</label>
          <input type="date" id="notesDateInput">
        </div>
        <div class="notes-edit-row">
          <label for="notesArea">Description:</label>
          <textarea id="notesArea" placeholder="Type notes..."></textarea>
        </div>
        <div class="notes-edit-actions">
          <button id="notesSaveBtn" class="btn-save-note">Save</button>
          <button id="notesCancelBtn" class="btn-cancel-note">Cancel</button>
        </div>
      </div>

      <!-- View Panel -->
      <div id="notesViewPanel" class="notes-view-panel" style="display:none;">
        <div class="notes-view-card">
          <div class="notes-view-header">
            <h3>View Note</h3>
            <button id="notesCloseViewBtn" class="btn-close-view">✖</button>
          </div>
          <div class="notes-view-body">
            <div class="notes-view-row">
              <label>Date:</label>
              <div id="viewNoteDate" class="notes-view-date"></div>
            </div>
            <div class="notes-view-row">
              <label>Description:</label>
              <div id="viewNoteText" class="notes-view-text"></div>
            </div>
            <div class="notes-view-row">
              <label>Entered By:</label>
              <div id="viewNoteUser" class="notes-view-user"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // -----------------------------
  // DOM references
  // -----------------------------
  const backBtn = root.querySelector("#notesBackBtn");
  const fromInput = root.querySelector("#notesFromDate");
  const toInput = root.querySelector("#notesToDate");
  const filterBtn = root.querySelector("#notesFilterBtn");
  const clearFilterBtn = root.querySelector("#notesClearFilterBtn");
  const csvBtn = root.querySelector("#notesCsvBtn");
  const addBtn = root.querySelector("#notesAddBtn");

  const tbody = root.querySelector("#notesTableBody");
  const pagerHost = root.querySelector("#notesPager");

  const editPanel = root.querySelector("#notesEditPanel");
  const editTitle = root.querySelector("#notesEditTitle");
  const dateInput = root.querySelector("#notesDateInput");
  const notesArea = root.querySelector("#notesArea");
  const saveBtn = root.querySelector("#notesSaveBtn");
  const cancelBtn = root.querySelector("#notesCancelBtn");

  const viewPanel = root.querySelector("#notesViewPanel");
  const viewDate = root.querySelector("#viewNoteDate");
  const viewText = root.querySelector("#viewNoteText");
  const viewUser = root.querySelector("#viewNoteUser");
  const closeViewBtn = root.querySelector("#notesCloseViewBtn");

  let editingNoteId = null;

  // -----------------------------
  // Navigation
  // -----------------------------
  if (backBtn) {
    backBtn.onclick = () => {
      if (typeof onBack === "function") {
        onBack();
      } else {
        // Fallback: simple hide
        root.style.display = "none";
      }
    };
  }

  // -----------------------------
  // Edit panel helpers
  // -----------------------------
  function openEditor(note) {
    editingNoteId = note ? note.id : null;

    if (note) {
      editTitle.textContent = "Edit Note";
      dateInput.value = note.note_date ? String(note.note_date).substring(0, 10) : "";
      notesArea.value = note.description || "";
    } else {
      editTitle.textContent = "Add Note";
      dateInput.value = "";
      notesArea.value = "";
    }

    editPanel.style.display = "block";
    viewPanel.style.display = "none";
    // Scroll to edit panel
    editPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeEditor() {
    editingNoteId = null;
    dateInput.value = "";
    notesArea.value = "";
    editPanel.style.display = "none";
  }

  if (cancelBtn) {
    cancelBtn.onclick = closeEditor;
  }

  if (addBtn) {
    addBtn.onclick = () => {
      requirePermission("notes", "add", () => openEditor(null));
    };
  }

  // -----------------------------
  // View panel
  // -----------------------------
  function openViewer(note) {
    if (!note) return;
    viewDate.textContent = formatDateUK(note.note_date);
    viewText.textContent = note.description || "";
    viewUser.textContent = note.created_by || "System";

    viewPanel.style.display = "block";
    editPanel.style.display = "none";
    viewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (closeViewBtn) {
    closeViewBtn.onclick = () => {
      viewPanel.style.display = "none";
    };
  }

  // -----------------------------
  // Filtering
  // -----------------------------
  function applyDateFilter() {
    const fromVal = fromInput.value ? new Date(fromInput.value) : null;
    const toVal = toInput.value ? new Date(toInput.value) : null;

    if (!fromVal && !toVal) {
      filteredNotes = [...allNotes];
      return;
    }

    filteredNotes = allNotes.filter((n) => {
      if (!n.note_date) return false;
      const d = new Date(n.note_date);
      if (Number.isNaN(d.getTime())) return false;

      if (fromVal && d < fromVal) return false;
      if (toVal) {
        // include end date fully
        const end = new Date(toVal);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }

  function handleFilter() {
    applyDateFilter();
    currentPage = 1;
    renderNotesPage(1);
    renderPager();
  }

  if (filterBtn) filterBtn.onclick = handleFilter;

  if (clearFilterBtn) {
    clearFilterBtn.onclick = () => {
      fromInput.value = "";
      toInput.value = "";
      filteredNotes = [...allNotes];
      currentPage = 1;
      renderNotesPage(1);
      renderPager();
    };
  }

  // -----------------------------
  // Table + Pagination
  // -----------------------------
  function renderNotesPage(page = 1) {
    if (!tbody) return;

    if (!filteredNotes.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No notes found</td></tr>`;
      return;
    }

    const totalItems = filteredNotes.length;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
    currentPage = Math.min(Math.max(1, page), totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageItems = filteredNotes.slice(start, end);

    tbody.innerHTML = "";

    pageItems.forEach((n) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${formatDateUK(n.note_date)}</td>
        <td>${n.description || ""}</td>
        <td>
          <button class="notes-row-btn view">View</button>
          <button class="notes-row-btn edit">Edit</button>
          <button class="notes-row-btn delete">Delete</button>
        </td>
        <td>${n.created_by || "System"}</td>
      `;

      tr.querySelector(".view").onclick = () =>
        requirePermission("notes", "view", () => openViewer(n));

      tr.querySelector(".edit").onclick = () =>
        requirePermission("notes", "edit", () => openEditor(n));

      tr.querySelector(".delete").onclick = () =>
        requirePermission("notes", "delete", async () => {
          if (!confirm("Delete this note?")) return;
          await deleteNote(serviceId, n.id);
          await loadNotes();
        });

      tbody.appendChild(tr);
    });
  }

  function renderPager() {
    if (!pagerHost) return;

    pagerHost.innerHTML = "";

    if (!filteredNotes.length) return;

    const pager = initRowPagination({
      totalItems: filteredNotes.length,
      fixedPageSize: PAGE_SIZE, // 🔒 30 per page
      onPageChange: (page /*, pageSize */) => {
        renderNotesPage(page);
      },
    });

    pagerHost.appendChild(pager.el ?? pager);
  }

  // -----------------------------
  // Load Notes
  // -----------------------------
  async function loadNotes() {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>`;
    }
    if (pagerHost) pagerHost.innerHTML = "";

    try {
      const list = await fetchNotes(serviceId);

      allNotes = (list || []).slice().sort((a, b) => {
        const da = new Date(a.note_date || a.created_at || 0);
        const db = new Date(b.note_date || b.created_at || 0);
        return db - da; // newest first
      });

      filteredNotes = [...allNotes];
      currentPage = 1;
      renderNotesPage(1);
      renderPager();
    } catch (err) {
      console.error("❌ Failed to load notes:", err);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red;">Failed to load notes</td></tr>`;
      }
    }
  }

  // -----------------------------
  // Save Note
  // -----------------------------
  if (saveBtn) {
    saveBtn.onclick = async () => {
      const noteDate = dateInput.value || null;
      const noteDescription = notesArea.value.trim();

      if (!noteDescription) {
        alert("Note description required");
        return;
      }

      const payload = {
        note_date: noteDate,
        description: noteDescription,
        created_by: currentUserName(),
      };

      try {
        if (editingNoteId) {
          await updateNote(serviceId, editingNoteId, payload);
        } else {
          await createNote(serviceId, payload);
        }

        closeEditor();
        await loadNotes();
      } catch (e) {
        console.error("❌ Failed to save note:", e);
        alert("Failed to save note");
      }
    };
  }

  // -----------------------------
  // CSV Download (uses current filter dates)
  // -----------------------------
  if (csvBtn) {
    csvBtn.onclick = () => {
      requirePermission("notes", "view", () => {
        if (!serviceId) return alert("Invalid service");

        const fromVal = fromInput.value || null;
        const toVal = toInput.value || null;

        // Extra args are safe; backend can read them if you wire it up.
        downloadNotesCSV(serviceId, fromVal, toVal).catch(() =>
          alert("Failed to download CSV")
        );
      });
    };
  }

  // -----------------------------
  // Initial load
  // -----------------------------
  loadNotes();
}