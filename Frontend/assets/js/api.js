// ============================================
// assets/js/api.js — Global API for login, users, clients, councils
// ============================================

const BASE_URL = "http://127.0.0.1:8000/api"; // ✅ matches FastAPI backend
// ---------- COUNCILS (dynamic) ----------
const COUNCIL_BASE = "http://127.0.0.1:8000/api/councils";

// ---------------- AUTH ----------------
export async function apiLogin(username, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  return await res.json(); // { token, user }
}

// ---------------- USER PROFILE ----------------
export async function getUserProfile(token) {
  const res = await fetch(`${BASE_URL}/user/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch profile");
  return await res.json();
}

// ---------------- COUNCILS ----------------
export async function fetchCouncilsAll() {
  const r = await fetch(COUNCIL_BASE);
  if (!r.ok) throw new Error("Failed to fetch councils");
  return r.json();
}

export async function fetchCouncilsEnabled() {
  const r = await fetch(`${COUNCIL_BASE}/enabled`);
  if (!r.ok) throw new Error("Failed to fetch enabled councils");
  return r.json();
}

export async function createCouncil(data) {
  const token = localStorage.getItem("token");
  const r = await fetch(COUNCIL_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}


export async function updateCouncil(id, data) {
  const token = localStorage.getItem("token");
  const r = await fetch(`${COUNCIL_BASE}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function setCouncilStatus(id, status) {
  const token = localStorage.getItem("token");
  const r = await fetch(`${COUNCIL_BASE}/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ status }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}


export async function deleteCouncil(id) {
  const token = localStorage.getItem("token");
  const r = await fetch(`${COUNCIL_BASE}/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ---------------- CLIENTS ----------------
export async function fetchClients() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch clients");
  return await res.json();
}

export async function fetchClientById(id) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients/${id}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch client");
  return await res.json();
}

export async function addClient(data) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add client");
  return await res.json();
}

export async function updateClient(id, data) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update client");
  return await res.json();
}

export async function deleteClient(id) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete client");
  return await res.json();
}


// ---------- USER MANAGEMENT ----------
export async function fetchUsers(token) {
  const res = await fetch(`${BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch users");
  return await res.json();
}

export async function createUser(data, token) {
  const res = await fetch(`${BASE_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const msg = await res.text();
    console.error("❌ User creation failed:", msg);
    throw new Error(msg || "Failed to create user");
  }

  return await res.json();
}

export async function updateUser(username, data, token) {
  const res = await fetch(`${BASE_URL}/users/${username}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function toggleUserStatus(username, data, token) {
  const res = await fetch(`${BASE_URL}/users/${username}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function deleteUser(username, token) {
  const res = await fetch(`${BASE_URL}/users/${username}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// ---------------- NOTIFICATIONS ----------------
export async function fetchNotifications() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/notifications`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return await res.json();
}