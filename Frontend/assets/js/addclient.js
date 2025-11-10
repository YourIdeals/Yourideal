// assets/js/addclient.js
import { initHeader } from "./header.js";
import { addClient, fetchCouncilsEnabled, fetchClients } from "./api.js";
import { createService, fetchAllServices } from "./Services/utils/serviceApi.js";
import { renderServiceFields } from "./Services/utils/serviceFields.js";
import {
  serviceDefaults,
  serviceTypeOptions,
  setupFeeOptions,
  referredByOptions,
} from "./Services/utils/serviceSchema.js";
import {
  renderOptionalFields,
  collectOptionalFields,
  bindOptionalFieldEvents,
} from "./utils/optionalfield.js";
import {
  titleOptions,
  genderOptions,
  kinOptions,
  ethnicityOptions,
} from "./utils/clientSchema.js";
import {
  renderDisabilitySection,
  bindDisabilityEvents,
  collectDisabilityData,
} from "./utils/disability.js";

import { enforceAccessControl, validateSession, requirePermission } from "./access-control.js";

let createdClient = null;

document.addEventListener("DOMContentLoaded", async () => {
  validateSession();
  await initHeader();
  enforceAccessControl();

  requirePermission("client", "add", async () => {
    const councils = await fetchCouncilsEnabled().catch(() => []);
    const s = { ...serviceDefaults };

    const clientForm = document.getElementById("addClientForm");
    clientForm.innerHTML = `
      <div class="section-header">Personal Information</div>
      <div class="form-group">
        <label>Client ID <span style="color:red">*</span></label>
        <input id="id" placeholder="Enter council-assigned ID" required />
      </div>
      <div class="form-group">
        <label>Title</label>
        <select id="title">
          <option value="">Select</option>
          ${titleOptions.map((t) => `<option>${t}</option>`).join("")}
        </select>
      </div>
      <div class="form-group"><label>First Name</label><input id="first_name" required /></div>
      <div class="form-group"><label>Last Name</label><input id="last_name" required /></div>
      <div class="form-group"><label>Date of Birth</label><input type="date" id="dob" /></div>
      <div class="form-group">
        <label>Gender</label>
        <select id="gender">
          <option value="">Select</option>
          ${genderOptions.map((g) => `<option>${g}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Local Council</label>
        <select id="councilId">
          <option value="">Select</option>
          ${councils.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")}
        </select>
      </div>

      <div class="section-header">Contact Details</div>
      <div class="form-group"><label>Phone</label><input id="phone" /></div>
      <div class="form-group"><label>Email</label><input id="email" /></div>
      <div class="form-group" style="grid-column: span 2;">
        <label>Address</label><input id="address" />
      </div>

      <div class="section-header">Disability Information</div>
      ${renderDisabilitySection([])}

      <div class="section-header">Kin Information</div>
      <div class="form-group"><label>Next of Kin Name</label><input id="kin_name" /></div>
      <div class="form-group"><label>Kin Relation</label>
        <select id="kin_relation">
          <option value="">Select</option>
          ${kinOptions.map((r) => `<option>${r}</option>`).join("")}
        </select>
      </div>
      <div class="form-group" id="kin_relation_other_container" style="display:none;">
        <label>Specify Other Relation</label>
        <input id="kin_relation_other" placeholder="Enter relation (e.g. Cousin)" />
      </div>
      <div class="form-group"><label>Kin Address</label><input id="kin_address" /></div>
      <div class="form-group"><label>Kin Email</label><input id="kin_email" /></div>

      <div class="section-header">Other Information</div>
      <div class="form-group">
        <label>Ethnicity Type</label>
        <select id="ethnicity_type">
          <option value="">Select</option>
          ${Object.keys(ethnicityOptions).map((k) => `<option>${k}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Ethnicity</label>
        <select id="ethnicity"><option value="">Select</option></select>
      </div>
      <div class="form-group"><label>Language</label><input id="language" placeholder="e.g. English" /></div>

      <div class="section-header">Optional Fields</div>
      <div id="clientOptionalFields">${renderOptionalFields([], true)}</div>
    `;

    bindOptionalFieldEvents(document.getElementById("clientOptionalFields"));
    bindDisabilityEvents();

    document.getElementById("ethnicity_type").addEventListener("change", (e) => {
      const val = e.target.value;
      const target = document.getElementById("ethnicity");
      target.innerHTML = (ethnicityOptions[val] || []).map((x) => `<option>${x}</option>`).join("");
    });

    document.getElementById("kin_relation").addEventListener("change", (e) => {
      const show = e.target.value === "Other";
      document.getElementById("kin_relation_other_container").style.display = show ? "block" : "none";
      if (!show) document.getElementById("kin_relation_other").value = "";
    });

    document.getElementById("saveClientBtn").addEventListener("click", () =>
      requirePermission("client", "add", async () => {
        const disabilities = collectDisabilityData();

        const payload = {
          id: v("id"),
          title: v("title"),
          first_name: v("first_name"),
          last_name: v("last_name"),
          dob: v("dob"),
          gender: v("gender"),
          councilId: parseInt(v("councilId")) || null,
          phone: v("phone"),
          email: v("email"),
          address: v("address"),
          disabilities,
          kin_name: v("kin_name"),
          kin_relation: v("kin_relation"),
          kin_relation_other: v("kin_relation_other"),
          kin_address: v("kin_address"),
          kin_email: v("kin_email"),
          ethnicity_type: v("ethnicity_type"),
          ethnicity: v("ethnicity"),
          language: v("language"),
          status: "Active",
          optional_fields: collectOptionalFields(document.getElementById("clientOptionalFields")),
        };

        const allClients = await fetchClients();
        if (allClients.some((c) => c.id === payload.id)) {
          alert("❌ Client ID already exists");
          return;
        }
        if (!payload.id || !payload.first_name || !payload.last_name) {
          alert("⚠️ Client ID, First Name and Last Name are required.");
          return;
        }

        try {
          const { client } = await addClient(payload);
          if (!client?.id) throw new Error("Client creation failed");
          createdClient = client;
          alert("✅ Client created successfully.");
          openServiceModal(client, s);
        } catch (err) {
          console.error("❌ addClient failed:", err);
          alert("Failed to create client.");
        }
      })
    );

    document.getElementById("cancelBtn").addEventListener("click", () => history.back());
  });
});

/* ---------------------------
   Modal: Build & Save Service
---------------------------- */
function openServiceModal(client, s) {
  const modal = document.getElementById("serviceModal");
  const form = document.getElementById("addServiceForm");

  form.innerHTML = `
    <div class="form-group">
      <label>YIL Reference No <span style="color:red">*</span></label>
      <input id="YI" placeholder="Enter YourIdeal Ref no" />
    </div>
    <div class="form-group">
      <label>Service Type</label>
      <select id="serviceType">
        <option value="">Select</option>
        ${serviceTypeOptions.map((o) => `<option>${o}</option>`).join("")}
      </select>
    </div>
    <div class="form-group">
      <label>Setup Fee</label>
      <select id="setupFee">
        <option value="">Select</option>
        ${setupFeeOptions.map((o) => `<option>${o}</option>`).join("")}
      </select>
    </div>
    <div class="form-group" style="grid-column: span 2;">
      <div id="dynamicServiceFields">${renderServiceFields(s.setupFee, s, false)}</div>
    </div>
    <div class="form-group">
      <label>Setup Budget (£)</label>
      <input type="number" id="setupBudget" step="0.01" />
    </div>
    <div class="form-group"><label>Start Date</label><input type="date" id="startDate" /></div>
    <div class="form-group"><label>End Date</label><input type="date" id="endDate" /></div>
    <div class="form-group">
      <label>Referred By</label>
      <select id="referredBy">
        <option value="">Select</option>
        ${referredByOptions.map((o) => `<option>${o}</option>`).join("")}
      </select>
    </div>
    <div class="form-group" style="grid-column: span 2;">
      <label>Insurance</label>
      <input id="insurance" placeholder="Insurance Company Name" />
    </div>
    <div class="section-header" style="grid-column: span 2;">Optional Fields</div>
    <div id="serviceOptionalFields" style="grid-column: span 2;">
      ${renderOptionalFields([], true)}
    </div>
  `;

  bindOptionalFieldEvents(document.getElementById("serviceOptionalFields"));
  form.querySelector("#setupFee").addEventListener("change", (e) => {
    document.getElementById("dynamicServiceFields").innerHTML =
      renderServiceFields(e.target.value, s, false);
  });

  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");

  document.getElementById("saveServiceBtn").onclick = () =>
    requirePermission("service", "add", async () => {
      const optional = collectOptionalFields(document.getElementById("serviceOptionalFields"));
      const payload = {
        clientId: client.id,
        reference: gv("YI"),
        serviceType: gv("serviceType"),
        setupFee: gv("setupFee"),
        setupBudget: parseFloat(gv("setupBudget")) || 0,
        startDate: gv("startDate"),
        endDate: gv("endDate"),
        referredBy: gv("referredBy"),
        insurance: gv("insurance"),
        monthlyFee: nf("monthlyFee"),
        initialFee: nf("initialFee"),
        pensionFee: nf("pensionFee"),
        pensionSetup: nf("pensionSetup"),
        annualFee: nf("annualFee"),
        yearEndFee: nf("yearEndFee"),
        carerBudget: nf("carerBudget"),
        agencyBudget: nf("agencyBudget"),
        carers: Array.from(document.querySelectorAll(".carer-name")).map((i) => i.value.trim()).filter(Boolean),
        agency: Array.from(document.querySelectorAll(".agency-name")).map((i) => i.value.trim()).filter(Boolean),
        pa: Array.from(document.querySelectorAll(".pa-name")).map((i) => i.value.trim()).filter(Boolean),
        optional,
        optional_fields: optional, // mirror for backend compatibility
      };

      if (!payload.reference) return alert("YIL Reference is required");
      if (!payload.serviceType) return alert("Service Type is required");
      if (!payload.setupFee) return alert("Setup Fee is required");
      if (!payload.startDate) return alert("Start Date is required");

      // Check unique reference globally
      const allServices = await fetchAllServices();
      const enteredRef = payload.reference.trim();
      if (allServices.some((svc) => (svc.reference || "").trim() === enteredRef)) {
        alert("❌ YI Reference already exists");
        return;
      }

      try {
        await createService(payload);
        alert("✅ Service created successfully.");
        closeModal();
        window.location.href = `clientmanagement.html?openServicesFor=${client.id}`;
      } catch (err) {
        console.error("❌ createService failed:", err);
        alert("Failed to create service.");
      }
    });
}

function closeModal() {
  const modal = document.getElementById("serviceModal");
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
}

// Helpers
function v(id) { return document.getElementById(id)?.value?.trim() || ""; }
function gv(id) { return document.getElementById(id)?.value?.trim() || ""; }
function nf(id) {
  const el = document.getElementById(id);
  const n = parseFloat(el?.value || 0);
  return Number.isFinite(n) ? n : 0;
}
