// ============================================
// access-control.js — Global User Permission Manager (CRUD-aware)
// ============================================

// --- Load user info from localStorage ---
export function getCurrentUser() {
  try {
    const userData = localStorage.getItem("user");
    if (!userData) return null;
    return JSON.parse(userData);
  } catch (err) {
    console.error("Error parsing user data:", err);
    return null;
  }
}

// --- Check if a user is logged in ---
export function isLoggedIn() {
  const token = localStorage.getItem("token");
  return !!token && getCurrentUser() !== null;
}

// --- Get permissions safely ---
export function getPermissions() {
  const user = getCurrentUser();
  if (!user) return {};

  // ✅ If SUPER_ADMIN — grant all permissions automatically
  if (user.role === "SUPER_ADMIN") {
    return {
      council:   { view: true, add: true, edit: true, delete: true },
      client:    { view: true, add: true, edit: true, delete: true },
      service:   { view: true, add: true, edit: true, delete: true },
      statement: { view: true, add: true, edit: true, delete: true },
      notes:     { view: true, add: true, edit: true, delete: true },
      user:      { view: true, add: true, edit: true, delete: true },
    };
  }

  // Default structure for regular users
  const defaultPerms = {
    council:   { view: false, add: false, edit: false, delete: false },
    client:    { view: false, add: false, edit: false, delete: false },
    service:   { view: false, add: false, edit: false, delete: false },
    statement: { view: false, add: false, edit: false, delete: false },
    notes:     { view: false, add: false, edit: false, delete: false },
  };

  const perms = user.permissions || {};
  Object.keys(defaultPerms).forEach((key) => {
    perms[key] = { ...defaultPerms[key], ...(perms[key] || {}) };
  });
  return perms;
}

// --- Restrict UI elements dynamically ---
export function enforceAccessControl() {
  const user = getCurrentUser();

  if (!user) {
    window.location.href = "../LoginPage/LoginPage.html";
    return;
  }

  const role = user.role || "STAFF";

  // ✅ Super Admin full access skip
  if (role === "SUPER_ADMIN") {
    console.log("✅ Super Admin: Full access granted (frontend bypass)");
    return;
  }
  
  // Viewprofile1 must NOR hide/disable UI Buttons
  if (window.location.pathname.includes("Viewprofile1.html")){
	console.log("AC UI Bypass on Viewprofile1");
    return;	
  }
	
  const perms = getPermissions();
  console.log("🔒 Applying CRUD access control for:", user.username, perms);

  const disableFeature = (selector, message = "Access denied") => {
    document.querySelectorAll(selector).forEach((el) => {
      el.disabled = true;
      el.classList.add("disabled-control");
      el.addEventListener("click", (e) => {
        e.preventDefault();
        alert(message);
      });
    });
  };

  // 🧩 NAVIGATION VISIBILITY
  if (!perms.council.view) hideNavLink("council");
  if (!perms.client.view) hideNavLink("client");
  if (!perms.service.view) hideNavLink("service");
  if (!perms.statement.view) hideNavLink("statement");

  // 🧩 FEATURE RESTRICTIONS
  if (!perms.council.add) disableFeature(".btn-council", "You cannot add councils.");
  if (!perms.council.edit) disableFeature(".edit-council", "You cannot edit councils.");
  if (!perms.council.delete) disableFeature(".delete-council", "You cannot delete councils.");

  if (!perms.client.add) disableFeature(".btn-client", "You cannot add clients.");
  if (!perms.client.edit) disableFeature(".edit-client", "You cannot edit clients.");
  if (!perms.client.delete) disableFeature(".delete-client", "You cannot delete clients.");

  if (!perms.service.add) disableFeature(".btn-service", "You cannot add services.");
  if (!perms.service.edit) disableFeature(".edit-service", "You cannot edit services.");
  if (!perms.service.delete) disableFeature(".delete-service", "You cannot delete services.");

  if (!perms.statement.add) disableFeature(".btn-statement", "You cannot add statements.");
  if (!perms.statement.edit) disableFeature(".edit-statement", "You cannot edit statements.");
  if (!perms.statement.delete) disableFeature(".delete-statement", "You cannot delete statements.");

  if (!perms.notes.edit) disableFeature(".edit-notes, #notesEditor, .save-notes", "You cannot edit notes.");

  console.log("🔐 Access control (CRUD-level) applied successfully");
}

// --- Utility to hide navigation links ---
function hideNavLink(sectionName) {
  const link = document.querySelector(`a[href*='${sectionName}'], nav .${sectionName}-link`);
  if (link) {
    link.style.pointerEvents = "none";
    link.style.opacity = "0.5";
    link.title = "Access denied";
  }
}

// --- Optional: check permission before executing an action ---
export function requirePermission(section, action = "view", callback) {
  const user = getCurrentUser();

  // ✅ Super Admin always allowed
  if (user?.role === "SUPER_ADMIN") {
    return callback();
  }

  const perms = getPermissions();
  const sectionPerms = perms[section] || {};

  if (!sectionPerms[action]) {
    alert(`Access denied — you do not have permission to ${action} ${section}.`);
    return;
  }

  callback();
}

// --- Logout handler (if token invalid or disabled user) ---
export function validateSession() {
  const user = getCurrentUser();
  if (!user || user.enabled === false) {
    alert("Your account is disabled or session expired. Please log in again.");
    localStorage.clear();
    window.location.href = "../LoginPage/LoginPage.html";
  }
  return { user };
}
