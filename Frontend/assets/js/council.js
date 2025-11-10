// ===============================================
// assets/js/council.js — Local Council Management
// ===============================================

import { initHeader } from "./header.js";
import {
  fetchCouncilsAll,
  createCouncil,
  updateCouncil,
  deleteCouncil
} from "./api.js";

// ✅ Access Control
import {
  validateSession,
  enforceAccessControl,
  requirePermission
} from "./access-control.js";

let councils = [];
let activeId = null;

// -----------------------------------------------
// INIT
// -----------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  validateSession();        // ✅ Redirect if session invalid
  await initHeader();       // ✅ Inject header
  enforceAccessControl();   // ✅ Apply global access control

  // ✅ Require view permission to load the page
  requirePermission("council", "view", async () => {
    await loadCouncils();
    bindCreateForm();
    bindSearch();
  });
});

// ===============================
// 📋 Load and Display Councils
// ===============================
async function loadCouncils() {
  try {
    councils = await fetchCouncilsAll();
    if (councils.length) activeId = activeId ?? councils[0].id;
    renderList(councils);
    renderDetails(activeId);
  } catch (err) {
    console.error("❌ Failed to load councils:", err);
    alert("Failed to load council list.");
  }
}

function renderList(data) {
  const ul = document.getElementById("councilList");
  const q = document.querySelector(".sidebar input")?.value?.toLowerCase() || "";
  const filtered = data.filter(c =>
    [c.name, c.city, c.postcode].some(v => (v || "").toLowerCase().includes(q))
  );
  ul.innerHTML = "";
  filtered.forEach(c => {
    const li = document.createElement("li");
    li.textContent = c.name;
    if (c.id === activeId) li.classList.add("active");
    li.onclick = () => { activeId = c.id; renderList(data); renderDetails(c.id); };
    ul.appendChild(li);
  });
}

// ===============================
// 🧱 Council Detail + Actions
// ===============================
function renderDetails(id) {
  const c = councils.find(x => x.id === id);
  const panel = document.getElementById("councilDetails");

  if (!c) {
    panel.innerHTML = `<h3>Council Details</h3><p>Select a council</p>`;
    return;
  }

  panel.innerHTML = `
    <h3>Council Details</h3>
    <div class="detail-row"><b>COUNCIL NAME:</b> <span>${c.name}</span></div>
    <div class="detail-row"><b>ADDRESS:</b> <span>${[c.address, c.city, c.postcode].filter(Boolean).join(", ")}</span></div>
    <div class="detail-row"><b>STATUS:</b> <span>${c.status}</span></div>

    <div class="buttons">
      <button class="edit btn-council" id="editBtn">Edit</button>
      <button class="delete btn-council" id="deleteBtn">Delete</button>
    </div>
  `;

  // ✅ Protect Edit
  document.getElementById("editBtn").onclick = () =>
    requirePermission("council", "edit", () => openEditForm(c));

  // ✅ Protect Delete
  document.getElementById("deleteBtn").onclick = () =>
    requirePermission("council", "delete", () => onDelete(c.id, c.name));
}

// ===============================
// ✏️ Edit Council
// ===============================
function openEditForm(c) {
  const panel = document.getElementById("councilDetails");

  panel.innerHTML = `
    <h3>Edit Council</h3>
    <div class="form-group"><input id="editName" value="${c.name}" placeholder="Council Name"></div>
    <div class="form-group"><input id="editAddr" value="${c.address || ""}" placeholder="Address"></div>
    <div class="form-group">
      <input id="editCity" value="${c.city || ""}" placeholder="City">
      <input id="editPost" value="${c.postcode || ""}" placeholder="Postcode">
    </div>
    <div class="form-group">
      <select id="editStatus">
        <option value="Enabled" ${c.status === "Enabled" ? "selected" : ""}>Enabled</option>
        <option value="Disabled" ${c.status === "Disabled" ? "selected" : ""}>Disabled</option>
      </select>
    </div>
    <div class="buttons">
      <button class="edit btn-council" id="saveBtn">Save</button>
      <button class="delete" id="cancelBtn">Cancel</button>
    </div>
  `;

  // ✅ Protect Save
  document.getElementById("saveBtn").onclick = () =>
    requirePermission("council", "edit", () => saveEdit(c.id));

  document.getElementById("cancelBtn").onclick = () => renderDetails(c.id);
}

async function saveEdit(id) {
  const payload = {
    name: document.getElementById("editName").value.trim(),
    address: document.getElementById("editAddr").value.trim(),
    city: document.getElementById("editCity").value.trim(),
    postcode: document.getElementById("editPost").value.trim(),
    status: document.getElementById("editStatus").value
  };

  if (!payload.name) return alert("Council name is required");

  try {
    await updateCouncil(id, payload);
    await loadCouncils();
    alert("✅ Council updated successfully");
  } catch (err) {
    console.error("❌ Failed to update council:", err);
    alert("Failed to update council.");
  }
}

// ===============================
// ❌ Delete Council
// ===============================
async function onDelete(id, name) {
  if (!confirm(`Delete "${name}"?`)) return;
  try {
    await deleteCouncil(id);
    await loadCouncils();
    alert("✅ Council deleted successfully");
  } catch (err) {
    console.error("❌ Failed to delete council:", err);
    alert("Failed to delete council.");
  }
}

// ===============================
// ➕ Create Council
// ===============================
function bindCreateForm() {
  const nameI = document.getElementById("newName");
  const addrI = document.getElementById("newAddress");
  const cityI = document.getElementById("newCity");
  const postI = document.getElementById("newPostcode");
  const btn = document.getElementById("createBtn");

  // ✅ Protect Create button
  btn.onclick = () =>
    requirePermission("council", "add", async () => {
      const payload = {
        name: nameI.value.trim(),
        address: addrI.value.trim(),
        city: cityI.value.trim(),
        postcode: postI.value.trim(),
        status: "Enabled"
      };

      if (!payload.name) return alert("Council name is required");

      try {
        await createCouncil(payload);
        nameI.value = addrI.value = cityI.value = postI.value = "";
        await loadCouncils();
        alert("✅ Council created");
      } catch (err) {
        console.error("❌ Failed to create council:", err);
        alert("Failed to create council.");
      }
    });
}

// ===============================
// 🔍 Search Filter
// ===============================
function bindSearch() {
  document.getElementById("councilSearch").addEventListener("input", () => {
    renderList(councils);
  });
}
