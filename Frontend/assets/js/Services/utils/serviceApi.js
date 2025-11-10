// ============================================
// assets/js/Services/utils/serviceApi.js
// ============================================
// Full CRUD + Statement API + Secure CORS + Normalization
// ============================================

const BASE_URL = "http://127.0.0.1:8000/api/services"; // ← Adjust if backend runs on another port

// --------------------
// Auth & Helpers
// --------------------
function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  // always try to parse for better debugging
  const contentType = res.headers.get("content-type");
  if (!res.ok) {
    let msg = "";
    try {
      if (contentType && contentType.includes("application/json")) {
        const j = await res.json();
        msg = j.detail || JSON.stringify(j);
      } else {
        msg = await res.text();
      }
    } catch {
      msg = `${res.status} ${res.statusText}`;
    }
    console.error("❌ API error:", msg);
    throw new Error(msg);
  }

  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

// normalize inbound service shape to a common camelCase
function normalizeService(s = {}) {
  const num = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);
  return {
    serviceId: s.serviceId ?? s.service_id ?? s.id,
    clientId: s.clientId ?? s.client_id,
    reference: s.reference ?? "",
    serviceType: s.serviceType ?? s.service_type ?? "",
    setupFee: s.setupFee ?? s.setup_fee ?? "",
    setupBudget: s.setupBudget ?? s.setup_budget ?? 0,
    startDate: s.startDate ?? s.start_date ?? "",
    endDate: s.endDate ?? s.end_date ?? "",
    referredBy: s.referredBy ?? s.referred_by ?? "",
    insurance: s.insurance ?? "",
    monthlyFee: num(s.monthlyFee ?? s.monthly_fee),
    initialFee: num(s.initialFee ?? s.initial_fee),
    pensionFee: num(s.pensionFee ?? s.pension_fee),
    pensionSetup: num(s.pensionSetup ?? s.pension_setup),
    annualFee: num(s.annualFee ?? s.annual_fee),
    yearEndFee: num(s.yearEndFee ?? s.year_end_fee),
    carerBudget: num(s.carerBudget ?? s.carer_budget),
    agencyBudget: num(s.agencyBudget ?? s.agency_budget),
    carers: Array.isArray(s.carers) ? s.carers : [],
    agency: Array.isArray(s.agency) ? s.agency : [],
    pa: Array.isArray(s.pa) ? s.pa : [],
    optional: Array.isArray(s.optional)
      ? s.optional
      : Array.isArray(s.optional_fields)
      ? s.optional_fields
      : [],
    notes: s.notes ?? "",
  };
}

// when sending, include both keys so backend is happy either way
function serializeServicePayload(data = {}) {
  const payload = { ...data };
  if (payload.optional && !payload.optional_fields) {
    payload.optional_fields = payload.optional;
  }
  return payload;
}

// ============================================
// SERVICES CRUD
// ============================================
export async function fetchAllServices() {
  const res = await fetch(BASE_URL, {
    method: "GET",
    headers: { ...authHeaders() },
    mode: "cors",
  });
  const json = await handle(res);
  return Array.isArray(json) ? json : json.services || [];
}

export async function fetchServiceById(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "GET",
    headers: { ...authHeaders() },
    mode: "cors",
  });
  const json = await handle(res);
  const raw = json?.service ?? json;
  return normalizeService(raw);
}

export async function createService(data) {
  console.log("🟡 Creating service:", data);
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    mode: "cors",
    body: JSON.stringify(serializeServicePayload(data)),
  });
  const result = await handle(res);
  console.log("✅ Created service:", result);
  return result;
}

export async function updateService(id, data) {
  console.log("🟠 Updating service:", id);
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    mode: "cors",
    body: JSON.stringify(serializeServicePayload(data)),
  });
  return handle(res);
}

export async function deleteService(id) {
  console.log("🔴 Deleting service:", id);
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
    mode: "cors",
  });
  return handle(res);
}

// ============================================
// STATEMENTS (Nested under serviceId)
// ============================================
export async function fetchStatements(serviceId) {
  const res = await fetch(`${BASE_URL}/${serviceId}/statements`, {
    headers: { ...authHeaders() },
    mode: "cors",
  });
  return handle(res);
}

export async function createStatement(serviceId, statementData) {
  const res = await fetch(`${BASE_URL}/${serviceId}/statements`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    mode: "cors",
    body: JSON.stringify(statementData),
  });
  return handle(res);
}

export async function updateStatement(serviceId, statementId, data) {
  const res = await fetch(`${BASE_URL}/${serviceId}/statements/${statementId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    mode: "cors",
    body: JSON.stringify(data),
  });
  return handle(res);
}

export async function deleteStatement(serviceId, statementId) {
  const res = await fetch(`${BASE_URL}/${serviceId}/statements/${statementId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
    mode: "cors",
  });
  return handle(res);
}

// ============================================
// FILE DOWNLOADS
// ============================================
export async function downloadStatement(serviceId, format = "pdf") {
  const res = await fetch(`${BASE_URL}/${serviceId}/statements/download?format=${format}`, {
    headers: { ...authHeaders() },
    mode: "cors",
  });
  if (!res.ok) throw new Error("Failed to download file");

  const disposition = res.headers.get("Content-Disposition");
  let filename = "";
  if (disposition && disposition.includes("filename=")) {
    filename = disposition.split("filename=")[1].replace(/["']/g, "").trim();
  }
  if (!filename) filename = `Statement_${serviceId}.${format}`;

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function downloadStatementCSV(serviceId, start, end) {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);

  const url = `${BASE_URL}/${encodeURIComponent(serviceId)}/statements/report/csv${
    params.toString() ? `?${params}` : ""
  }`;

  const res = await fetch(url, {
    method: "GET",
    headers: { ...authHeaders() },
    mode: "cors",
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "Failed to download CSV");
  }

  const blob = await res.blob();
  const dlUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = dlUrl;
  a.download = `Statement_Report_${serviceId}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(dlUrl);
}