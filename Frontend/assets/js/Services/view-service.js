// assets/js/Services/view-service.js
import { fetchServiceById, updateService } from "./utils/serviceApi.js";
import { renderServiceFields } from "./utils/serviceFields.js";
import {
  serviceDefaults,
  setupFeeOptions,
  serviceTypeOptions,
  referredByOptions,
} from "./utils/serviceSchema.js";
import {
  renderOptionalFields,
  collectOptionalFields,
  bindOptionalFieldEvents,
} from "../utils/optionalfield.js";

import { enforceAccessControl, validateSession, requirePermission } from "../access-control.js";

// Ensure valid session & enforce access control globally
validateSession();
enforceAccessControl();

const normalize = (s = {}) => ({
  serviceId: s.serviceId || s.service_id,
  clientId: s.clientId || s.client_id,
  reference: s.reference,
  serviceType: s.serviceType || s.service_type,
  setupFee: s.setupFee || s.setup_fee,
  setupBudget: s.setupBudget ?? s.setup_budget ?? 0,
  startDate: s.startDate || s.start_date || "",
  endDate: s.endDate || s.end_date || "",
  referredBy: s.referredBy || s.referred_by || "",
  insurance: s.insurance || "",
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
  optional: Array.isArray(s.optional) ? s.optional : (Array.isArray(s.optional_fields) ? s.optional_fields : []),
  notes: s.notes || "",
});

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// Render Service View (Restricted to service.view)
export function renderServiceDetails(data = {}) {
  validateSession();
  enforceAccessControl();

  requirePermission("service", "view", () => {
    const d = normalize(data);
    const form = document.getElementById("serviceForm");
    const buttons = document.querySelector(".service-buttons");
    if (!form) return;

    form.innerHTML = `
      <div class="section-header">Service Information</div>
      ${viewRow("Client ID", d.clientId)}
      ${viewRow("YIL Reference No", d.reference)}
      ${viewRow("Service Type", d.serviceType)}
      ${viewRow("Setup Fee", d.setupFee)}
      ${viewRow("Setup Budget", "£" + parseFloat(d.setupBudget || 0).toFixed(2))}
      ${viewRow("Start Date", formatUK(d.startDate))}
      ${viewRow("End Date", formatUK(d.endDate))}
      ${viewRow("Referred By", d.referredBy || "-")}
      ${viewRow("Insurance", d.insurance || "-")}

      <div class="section-header">Setup Details</div>
      ${renderServiceFields(d.setupFee, d, true)}

      <div class="section-header">Optional Fields</div>
      ${renderOptionalFields(d.optional || [], false)}
    `;

    buttons.innerHTML = `
      <button id="editServiceBtn" class="edit-btn btn-service">✏️ Edit</button>
      <button id="backServiceBtn" class="back-btn">⬅ Back</button>
    `;

    document.getElementById("editServiceBtn").onclick = () =>
      requirePermission("service", "edit", () => renderServiceEditForm(d));

    document.getElementById("backServiceBtn").onclick = () => {
      document.getElementById("serviceDetailsSection").style.display = "none";
      document.querySelector(".service-info").style.display = "block";
    };
  });
}

// Edit Form (service.edit)
function renderServiceEditForm(data = {}) {
  requirePermission("service", "edit", () => {
    const d = normalize({ ...serviceDefaults, ...data });
    const form = document.getElementById("serviceForm");
    const buttons = document.querySelector(".service-buttons");

    form.innerHTML = `
      <div class="section-header">Edit Service</div>

      ${inputRow("Client ID", "client_id", d.clientId, true)}
      ${inputRow("YIL Reference No", "reference", d.reference)}
      ${buildDropdown("referred_by", "Referred By", referredByOptions, d.referredBy)}
      ${inputRow("Insurance", "insurance", d.insurance)}
      ${buildDropdown("service_type", "Service Type", serviceTypeOptions, d.serviceType)}
      ${buildDropdown("setup_fee", "Setup Fee", setupFeeOptions, d.setupFee)}
      ${currencyRow("setup_budget", "Setup Budget (£)", d.setupBudget)}
      ${dateRow("start_date", "Start Date", d.startDate)}
      ${dateRow("end_date", "End Date", d.endDate)}

      <div id="dynamicServiceFields">
        ${renderServiceFields(d.setupFee, d, false)}
      </div>

      <div class="section-header">Optional Fields</div>
      ${renderOptionalFields(d.optional || [], true)}
    `;

    buttons.innerHTML = `
      <button id="saveServiceBtn" class="save-btn btn-service">💾 Save</button>
      <button id="cancelServiceBtn" class="back-btn">❌ Cancel</button>
    `;

    document.getElementById("setup_fee").addEventListener("change", (e) => {
      const newType = e.target.value;
      document.getElementById("dynamicServiceFields").innerHTML =
        renderServiceFields(newType, d, false);
    });

    bindOptionalFieldEvents();

    document.getElementById("saveServiceBtn").onclick = async () =>
      requirePermission("service", "edit", async () => {
        await saveServiceChanges(d.serviceId);
      });

    document.getElementById("cancelServiceBtn").onclick = () => renderServiceDetails(d);
  });
}

// Save Service Changes (service.edit)
async function saveServiceChanges(serviceId) {
  requirePermission("service", "edit", async () => {
    try {
      const updated = collectFormData();

      // Validate dates
      const start = updated.startDate || updated.start_date;
      const end = updated.endDate || updated.end_date;
      if (start && end) {
        const s = new Date(start);
        const e = new Date(end);
        if (e < s) {
          alert("⚠️ End Date cannot be earlier than Start Date!");
          return;
        }
      }

      const existing = await fetchServiceById(serviceId);
      const merged = { ...existing, ...updated };

      // include a mirrored optional_fields for backend compatibility
      if (Array.isArray(merged.optional) && !merged.optional_fields) {
        merged.optional_fields = merged.optional;
      }

      const result = await updateService(serviceId, merged);

      alert("✅ Service updated successfully!");
      renderServiceDetails(result?.service || merged);
    } catch (err) {
      console.error("❌ Failed to save service:", err);
      alert("❌ Failed to save changes");
    }
  });
}

// Collect Form Data
function collectFormData() {
  const data = {
    reference: getVal("reference"),
    referredBy: getVal("referred_by"),
    insurance: getVal("insurance"),
    serviceType: getVal("service_type"),
    setupFee: getVal("setup_fee"),
    setupBudget: parseFloat(getVal("setup_budget")) || 0,
    startDate: getVal("start_date"),
    endDate: getVal("end_date"),
    optional: collectOptionalFields(),
  };

  document.querySelectorAll("#dynamicServiceFields input").forEach((input) => {
    const id = input.id;
    if (!id) return;
    const val = input.type === "number" ? parseFloat(input.value) || 0 : input.value;
    data[id] = val;
  });

  return data;
}

// UI Helpers
function buildDropdown(id, label, options, selected = "") {
  const opts = options
    .map((opt) => `<option value="${opt}" ${opt === selected ? "selected" : ""}>${opt}</option>`)
    .join("");
  return `
    <div class="form-row">
      <label>${label}:</label>
      <select id="${id}">
        <option value="">--- Select ---</option>
        ${opts}
      </select>
    </div>
  `;
}

function inputRow(label, id, val, readonly = false) {
  return `
    <div class="form-row">
      <label>${label}:</label>
      <input type="text" id="${id}" value="${val || ""}" ${readonly ? "readonly" : ""}/>
    </div>
  `;
}

function dateRow(id, label, val) {
  return `
    <div class="form-row">
      <label>${label}:</label>
      <input type="date" id="${id}" value="${formatDateForInput(val)}"/>
    </div>
  `;
}

function currencyRow(id, label, val = 0) {
  return `
    <div class="form-row">
      <label>${label}:</label>
      <div class="currency-input">
        <span>£</span>
        <input type="number" id="${id}" value="${Number(val || 0)}" step="0.01"/>
      </div>
    </div>
  `;
}

function viewRow(label, value) {
  return `<div class="form-row"><label>${label}:</label><span>${value ?? "-"}</span></div>`;
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function formatUK(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-GB");
}

function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  if (dateStr.includes("/")) {
    const [d, m, y] = dateStr.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return dateStr;
}
