// ==========================================
// assets/js/usermanagement.js
// User Management — SUPER ADMIN ONLY
// ==========================================
import { initHeader } from "./header.js";
import { initRowPagination } from "./row-pagination.js";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
} from "./api.js";

document.addEventListener("DOMContentLoaded", async () => {
  // ✅ Inject header first
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");

  // ✅ Redirect if not logged in
  if (!token || !user) {
    alert("Please log in to continue.");
    window.location.href = "../LoginPage/LoginPage.html";
    return;
  }

  await initHeader();

  // ✅ Only allow Super Admins
  if (user.role !== "SUPER_ADMIN") {
    alert("Access denied: Super Admins only.");
    window.location.href = "../HomePage/homepage.html";
    return;
  }

  const tbody = document.getElementById("userTableBody");
  const formSection = document.getElementById("userFormSection");
  const addBtn = document.getElementById("addUserBtn");
  const cancelBtn = document.getElementById("cancelUserBtn");
  const form = document.getElementById("userForm");

  let allUsers = [];
  let editingUser = null;

  // --------------------------
  // Load all users
  // --------------------------
  async function loadUsers() {
    try {
      const data = await fetchUsers(token);
      allUsers = data;
      setupPagination(allUsers, tbody);
    } catch (err) {
      console.error("❌ Failed to load users:", err);
      alert("Error loading user list.");
    }
  }

  // --------------------------
  // Render user rows
  // --------------------------
  function renderUsers(users, tbody) {
    tbody.innerHTML = "";

    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No users found</td></tr>`;
      return;
    }

    users.forEach((u) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.emp_id || "-"}</td>
        <td>${u.display_name || u.username}</td>
        <td>${u.username}</td>
        <td>${u.role}</td>
        <td><span class="status ${u.enabled ? "enabled" : "disabled"}">
          ${u.enabled ? "Enabled" : "Disabled"}
        </span></td>
        <td>
          <button class="edit-user" data-username="${u.username}">✏️ Edit</button>
          <button class="delete-user" data-username="${u.username}">🗑 Delete</button>
        </td>
      `;

      // --- Delete user
      tr.querySelector(".delete-user").addEventListener("click", async () => {
        if (confirm(`Delete user ${u.username}? This action cannot be undone.`)) {
          try {
            await deleteUser(u.username, token);
            alert("✅ User deleted successfully");
            loadUsers();
          } catch (err) {
            console.error("❌ Delete failed:", err);
            alert("Failed to delete user.");
          }
        }
      });

      // --- Edit user
      tr.querySelector(".edit-user").addEventListener("click", () => {
        editingUser = u.username;
        openEditForm(u);
      });

      tbody.appendChild(tr);
    });
  }

  // --------------------------
  // Pagination setup
  // --------------------------
  function setupPagination(allUsers, tbody) {
    const paginationContainer = document.querySelector(".pagination");
    paginationContainer.innerHTML = "";
    const pager = initRowPagination({
      totalItems: allUsers.length,
      onPageChange: (page, pageSize) => {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        renderUsers(allUsers.slice(start, end), tbody);
      },
    });
    paginationContainer.appendChild(pager);
  }

  // --------------------------
  // Add / Edit Form
  // --------------------------
  addBtn.addEventListener("click", () => {
    editingUser = null;
    form.reset();
    document.getElementById("formTitle").textContent = "Add New Employee";
    formSection.classList.remove("hidden");
    document.getElementById("username").disabled = false;
    document.getElementById("password").required = true;
  });

  cancelBtn.addEventListener("click", () => {
    formSection.classList.add("hidden");
    form.reset();
    editingUser = null;
  });

  function openEditForm(user) {
    document.getElementById("formTitle").textContent = `Edit Employee - ${user.username}`;
    formSection.classList.remove("hidden");

    document.getElementById("empName").value = user.display_name || "";
    document.getElementById("empId").value = user.emp_id || "";
    document.getElementById("username").value = user.username;
    document.getElementById("username").disabled = true;
    document.getElementById("password").value = "";
    document.getElementById("password").required = false;
    document.getElementById("status").value = user.enabled ? "enabled" : "disabled";

    // Populate permissions
    document.querySelectorAll(".access-table input[type='checkbox']").forEach((cb) => {
      const [mod, act] = cb.name.split("_");
      cb.checked = Boolean(user.permissions?.[mod]?.[act]);
    });
  }

  // --------------------------
  // Save user (create / update)
  // --------------------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      emp_name: document.getElementById("empName").value.trim(),
      emp_id: document.getElementById("empId").value.trim(),
      username: document.getElementById("username").value.trim(),
      password: document.getElementById("password").value,
      enabled: document.getElementById("status").value === "enabled",
      permissions: {},
    };

    // Build permissions structure
    const modules = ["council", "client", "service", "statement", "notes"];
    const actions = ["view", "add", "edit", "delete"];

    modules.forEach((mod) => {
      payload.permissions[mod] = {};
      actions.forEach((act) => {
        const cb = document.querySelector(`input[name="${mod}_${act}"]`);
        payload.permissions[mod][act] = cb ? cb.checked : false;
      });
    });

    try {
      if (editingUser) {
        await updateUser(editingUser, payload, token);
        alert("✅ User updated successfully");
      } else {
        await createUser(payload, token);
        alert("✅ User created successfully");
      }

      formSection.classList.add("hidden");
      form.reset();
      editingUser = null;
      loadUsers();
    } catch (err) {
      console.error("❌ Save failed:", err);
      alert("Failed to save user.");
    }
  });

  // --------------------------
  // Initialize on load
  // --------------------------
  loadUsers();
});
