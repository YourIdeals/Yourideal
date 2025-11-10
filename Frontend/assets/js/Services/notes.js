// assets/js/Services/notes.js
import { updateService } from "./utils/serviceApi.js";
import { enforceAccessControl, validateSession, requirePermission } from "../access-control.js";

export function openNotes(service) {
  // Validate session and UI restrictions
  validateSession();
  enforceAccessControl();

  const modal = document.getElementById("notesModal");
  const notesArea = document.getElementById("notesArea");
  const notesText = document.getElementById("notesText");
  const backBtn = document.getElementById("closeNoteBtn");

  if (!modal || !notesArea || !notesText) {
    console.error("❌ Notes modal elements missing in DOM");
    return;
  }

  requirePermission("notes", "view", () => {
    notesText.textContent = service.notes || "-";
    notesArea.value = service.notes || "";

    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
    showViewMode();

    const editBtn = document.getElementById("editNoteBtn");
    if (editBtn) {
      editBtn.onclick = () =>
        requirePermission("notes", "edit", () => showEditMode());
    }

    const cancelBtn = document.getElementById("cancelNoteBtn");
    if (cancelBtn) {
      cancelBtn.onclick = () => showViewMode();
    }

    const saveBtn = document.getElementById("saveNoteBtn");
    if (saveBtn) {
      saveBtn.onclick = async () =>
        requirePermission("notes", "edit", async () => {
          const newNote = notesArea.value.trim();
          const sid = service.serviceId || service.service_id || service.id;
          if (!sid) return alert("Missing service ID");

          try {
            await updateService(sid, { notes: newNote });
            service.notes = newNote; // reflect in local object
            notesText.textContent = newNote || "-";
            alert("✅ Note saved successfully!");
            modal.style.display = "none";
            modal.setAttribute("aria-hidden", "true");
          } catch (err) {
            console.error("❌ Failed to update note:", err);
            alert("Failed to save note. Please try again.");
          }
        });
    }

    if (backBtn) {
      backBtn.onclick = () => {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
      };
    }

    const onClickOutside = (ev) => {
      if (ev.target === modal) {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
        window.removeEventListener("click", onClickOutside, true);
      }
    };
    window.addEventListener("click", onClickOutside, true);
  });
}

function showViewMode() {
  const display = document.getElementById("notesDisplay");
  const edit = document.getElementById("notesEdit");
  if (display) display.style.display = "block";
  if (edit) edit.style.display = "none";
}

function showEditMode() {
  const display = document.getElementById("notesDisplay");
  const edit = document.getElementById("notesEdit");
  if (display) display.style.display = "none";
  if (edit) edit.style.display = "block";
}
