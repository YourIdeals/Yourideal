// ============================================
// assets/js/api.js — Global API for login, users, clients, councils
// ============================================

const BASE_URL = "http://127.0.0.1:8000/api";
const COUNCIL_BASE = "http://127.0.0.1:8000/api/councils";

// ---------------- AUTH ----------------
export async function apiLogin(username, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  return await res.json();
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
  const res = await fetch(COUNCIL_BASE);
  if (!res.ok) throw new Error("Failed to fetch councils");
  return await res.json();
}

export async function fetchCouncilsEnabled() {
  const res = await fetch(`${COUNCIL_BASE}/enabled`);
  if (!res.ok) throw new Error("Failed to fetch enabled councils");
  return await res.json();
}

export async function createCouncil(data) {
  const token = localStorage.getItem("token");
  const res = await fetch(COUNCIL_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function updateCouncil(id, data) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${COUNCIL_BASE}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function setCouncilStatus(id, status) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${COUNCIL_BASE}/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function deleteCouncil(id) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${COUNCIL_BASE}/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// ---------------- CLIENTS ----------------
export async function fetchClients() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch clients");
  return await res.json();
}

export async function fetchClientById(id) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients/${id}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch client");
  return await res.json();
}

/**
 * CREATE CLIENT
 */
export async function addClient(data) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add client");
  return await res.json();   // { message, client }
}

// ---------------- CLIENT ADDRESS HISTORY ----------------
export async function fetchClientAddresses(clientId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients/${clientId}/addresses`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch address history");
  return await res.json();
}

/**
 * ADD NEW ADDRESS (primary function)
 */
export async function addClientAddress(clientId, addressData) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients/${clientId}/addresses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(addressData),
  });
  if (!res.ok) throw new Error("Failed to add address");
  return await res.json();
}

/**
 * Alias for compatibility with addclient.js (createClientAddress)
 */
export async function createClientAddress(clientId, addressData) {
  return addClientAddress(clientId, addressData);
}

// ---------------- CLIENT KIN HISTORY ----------------
export async function fetchClientKins(clientId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients/${clientId}/kins`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch kin history");
  return await res.json();
}

/**
 * ADD NEW KIN (primary function)
 */
export async function addClientKin(clientId, kinData) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients/${clientId}/kins`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(kinData),
  });
  if (!res.ok) throw new Error("Failed to add new kin");
  return await res.json();
}

/**
 * Alias for compatibility with addclient.js (createClientKin)
 */
export async function createClientKin(clientId, kinData) {
  return addClientKin(clientId, kinData);
}

// ---------------- UPDATE CLIENT ----------------
export async function updateClient(id, data) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update client");
  return await res.json();
}

export async function updateClientAddress(clientId, addressId, data) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients/${clientId}/addresses/${addressId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update address");
  return await res.json();
}

export async function updateClientKin(clientId, kinId, data) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients/${clientId}/kins/${kinId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update kin");
  return await res.json();
}

// ---------------- DELETE CLIENT ----------------
export async function deleteClient(id) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` },
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Failed to delete client");
  }

  return await res.json();
}

// DELETE old address
export async function deleteClientAddress(clientId, addressId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients/${clientId}/addresses/${addressId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to delete address");
  return await res.json();      // ← add await
}

// DELETE old kin
export async function deleteClientKin(clientId, kinId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients/${clientId}/kins/${kinId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to delete kin record");
  return await res.json();      // ← add await
}

// DOWNLOAD CSV (address history)
export async function downloadAddressCSV(clientId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/clients/${clientId}/addresses/csv`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to download address CSV");
  return res.blob();
}

// (If you later add kin CSV in backend, front-end function will look like this)
 export async function downloadKinCSV(clientId) {
   const token = localStorage.getItem("token");
   const res = await fetch(`${BASE_URL}/clients/${clientId}/kins/csv`, {
     headers: { "Authorization": `Bearer ${token}` }
   });
   if (!res.ok) throw new Error("Failed to download kin CSV");
   return res.blob();
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

  if (!res.ok) throw new Error(await res.text());
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
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return await res.json();
}