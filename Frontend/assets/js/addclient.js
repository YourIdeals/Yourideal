// ============================================
// assets/js/addclient.js — FINAL FULL VERSION
// Supports: address history + kin history + service creation
// ============================================

import { initHeader } from "./header.js";

import {
  addClient,
  addClientAddress,
  addClientKin,
  fetchCouncilsEnabled,
  fetchClients,
} from "./api.js";

import {
  createService,
  fetchAllServices,
} from "./Services/utils/serviceApi.js";

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
} from "./utils/clientschema.js";

import {
  renderDisabilitySection,
  bindDisabilityEvents,
  collectDisabilityData,
} from "./utils/disability.js";

import {
  enforceAccessControl,
  validateSession,
  requirePermission,
} from "./access-control.js";

let createdClient = null;

// ============================================
// INIT PAGE
// ============================================
document.addEventListener("DOMContentLoaded", async () => {
  validateSession();
  await initHeader();
  enforceAccessControl();

  requirePermission("client", "add", async () => {
    const councils = await fetchCouncilsEnabled().catch(() => []);
    const serviceData = { ...serviceDefaults };

    const form = document.getElementById("addClientForm");

    // ============================================
    // BUILD FORM UI
    // ============================================
    form.innerHTML = `
      <div class="section-header">Personal Information</div>

      <div class="form-group">
        <label>Client ID <span style="color:red">*</span></label>
        <input id="id" placeholder="Enter council-assigned ID" />
      </div>

      <div class="form-group">
        <label>Title</label>
        <select id="title">
          <option value="">Select</option>
          ${titleOptions.map(t => `<option>${t}</option>`).join("")}
        </select>
      </div>

      <div class="form-group">
        <label>First Name</label>
        <input id="first_name" />
      </div>

      <div class="form-group">
        <label>Last Name</label>
        <input id="last_name" />
      </div>

      <div class="form-group">
        <label>Date of Birth</label>
        <input type="date" id="dob" />
      </div>

      <div class="form-group">
        <label>Gender</label>
        <select id="gender">
          <option value="">Select</option>
          ${genderOptions.map(g => `<option>${g}</option>`).join("")}
        </select>
      </div>

      <div class="form-group">
        <label>Local Council</label>
        <select id="councilId">
          <option value="">Select</option>
          ${councils.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
        </select>
      </div>

      <!-- ADDRESS -->
      <div class="section-header">Client Address</div>

      <div class="form-group">
        <label>House Number</label>
        <input id="address_house_number" />
      </div>
      <div class="form-group">
        <label>Street Name</label>
        <input id="address_street_name" />
      </div>
      <div class="form-group">
        <label>City</label>
        <input id="address_city" />
      </div>
      <div class="form-group">
        <label>Country</label>
        <input id="address_country" />
      </div>
      <div class="form-group">
        <label>Postcode</label>
        <input id="address_postcode" />
      </div>

      <!-- CONTACT -->
      <div class="section-header">Contact Details</div>

      <div class="form-group">
        <label>Phone</label>
        <input id="phone" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input id="email" />
      </div>

      <!-- DISABILITY -->
      <div class="section-header">Disability Information</div>
      ${renderDisabilitySection([])}

      <!-- KIN -->
      <div class="section-header">Next of Kin</div>

      <div class="form-group">
        <label>Kin Name</label>
        <input id="kin_name" />
      </div>

      <div class="form-group">
        <label>Kin Relationship</label>
        <select id="kin_relationship">
          <option value="">Select</option>
          ${kinOptions.map(k => `<option>${k}</option>`).join("")}
        </select>
      </div>

      <div class="form-group" id="kin_relation_other_container" style="display:none;">
        <label>Specify Relationship</label>
        <input id="kin_relationship_other" placeholder="Enter relation (e.g. Cousin)" />
      </div>

      <div class="form-group">
        <label>Kin House Number</label>
        <input id="kin_house_number" />
      </div>
      <div class="form-group">
        <label>Kin Street Name</label>
        <input id="kin_street_name" />
      </div>
      <div class="form-group">
        <label>Kin City</label>
        <input id="kin_city" />
      </div>
      <div class="form-group">
        <label>Kin Country</label>
        <input id="kin_country" />
      </div>
      <div class="form-group">
        <label>Kin Postcode</label>
        <input id="kin_postcode" />
      </div>
      <div class="form-group">
        <label>Kin Email</label>
        <input id="kin_email" />
      </div>

      <!-- OTHER -->
      <div class="section-header">Other Information</div>

      <div class="form-group">
        <label>Ethnicity Type</label>
        <select id="ethnicity_type">
          <option value="">Select</option>
          ${Object.keys(ethnicityOptions).map(k => `<option>${k}</option>`).join("")}
        </select>
      </div>

      <div class="form-group">
        <label>Ethnicity</label>
        <select id="ethnicity"><option value="">Select</option></select>
      </div>

      <div class="form-group">
        <label>Language</label>
        <input id="language" placeholder="e.g. English" />
      </div>

      <!-- OPTIONAL -->
      <div class="section-header">Optional Fields</div>
      <div id="clientOptionalFields">
        ${renderOptionalFields([], true)}
      </div>
    `;

    // Bind events
    bindOptionalFieldEvents(document.getElementById("clientOptionalFields"));
    bindDisabilityEvents();

    // Ethnicity linkage
    document.getElementById("ethnicity_type").addEventListener("change", e => {
      const list = ethnicityOptions[e.target.value] || [];
      document.getElementById("ethnicity").innerHTML =
        list.map(x => `<option>${x}</option>`).join("");
    });

    // Show "other" relationship
    document.getElementById("kin_relationship").addEventListener("change", e => {
      document.getElementById("kin_relation_other_container").style.display =
        e.target.value === "Other" ? "block" : "none";
      if (e.target.value !== "Other") {
        const other = document.getElementById("kin_relationship_other");
        if (other) other.value = "";
      }
    });

    // ============================================
    // SAVE CLIENT
    // ============================================
    const saveBtn = document.getElementById("saveClientBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", (e) =>
        requirePermission("client", "add", async () => {
		  e.preventDefault();	
          const disabilities = collectDisabilityData();

          // Resolve kin relationship (with Other)
          let kinRel = v("kin_relationship");
          if (kinRel === "Other") {
            kinRel = v("kin_relationship_other");
          }

          // CLEAN CLIENT PAYLOAD (ONLY client table fields)
          const clientPayload = {
            id: v("id"),
            title: v("title"),
            first_name: v("first_name"),
            last_name: v("last_name"),
            dob: v("dob"),
            gender: v("gender"),
            councilId: parseInt(v("councilId")) || null,
            phone: v("phone"),
            email: v("email"),
            disabilities,
            ethnicity_type: v("ethnicity_type"),
            ethnicity: v("ethnicity"),
            language: v("language"),
            status: "Active",
            optional_fields: collectOptionalFields(document.getElementById("clientOptionalFields")),
          };

          // Required fields check
          if (!clientPayload.id || !clientPayload.first_name || !clientPayload.last_name) {
            alert("⚠️ Client ID, First Name, Last Name are required.");
            return;
          }

          // Duplicate ID check
          const allClients = await fetchClients();
          if (allClients.some(c => c.id === clientPayload.id)) {
            alert("❌ Client ID already exists");
            return;
          }

          try {
            // STEP 1 — Create client
            const { client } = await addClient(clientPayload);
            if (!client || !client.id) {
              throw new Error("Client creation failed");
            }

            // STEP 2 — Create initial address (history table)
            await addClientAddress(client.id, {
              // NOTE: keys match backend /clients/{id}/addresses (house_no, street, city, country, postcode)
              house_no: v("address_house_number"),
              street: v("address_street_name"),
              city: v("address_city"),
              country: v("address_country"),
              postcode: v("address_postcode"),
            });

            // STEP 3 — Create initial kin (history table) — only if any kin_name provided
            if (v("kin_name")) {
              await addClientKin(client.id, {
                // NOTE: keys match backend /clients/{id}/kins (kin_name, kin_relationship, house_no, street, city, country, postcode, email)
                kin_name: v("kin_name"),
                kin_relationship: kinRel || null,
                house_no: v("kin_house_number"),
                street: v("kin_street_name"),
                city: v("kin_city"),
                country: v("kin_country"),
                postcode: v("kin_postcode"),
                email: v("kin_email"),
              });
            }

            alert("✅ Client created successfully.");
            createdClient = client;

            // Open service modal for this client
            openServiceModal(client, serviceData);
          } catch (err) {
            console.error("❌ Failed to create client or related records:", err);
            alert("Failed to create client. Please check console for details.");
          }
        })
      );
    }

    const cancelBtn = document.getElementById("cancelBtn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => history.back());
    }
  });
});

// ============================================
// SERVICE MODAL — Build & Save Service
// ============================================
function openServiceModal(client, s) {
  const modal = document.getElementById("serviceModal");
  const form = document.getElementById("addServiceForm");

  if (!modal || !form) {
    console.warn("Service modal elements not found in DOM.");
    return;
  }

  // Build service form UI
  form.innerHTML = `
    <div class="form-group">
      <label>YIL Reference No <span style="color:red">*</span></label>
      <input id="YI" placeholder="Enter YourIdeal Ref no" />
    </div>

    <div class="form-group">
      <label>Service Type</label>
      <select id="serviceType">
        <option value="">Select</option>
        ${serviceTypeOptions.map(o => `<option>${o}</option>`).join("")}
      </select>
    </div>

    <div class="form-group">
      <label>Setup Fee</label>
      <select id="setupFee">
        <option value="">Select</option>
        ${setupFeeOptions.map(o => `<option>${o}</option>`).join("")}
      </select>
    </div>

    <div class="form-group" style="grid-column: span 2;">
      <div id="dynamicServiceFields">
        ${renderServiceFields(s.setupFee, s, false)}
      </div>
    </div>

    <div class="form-group">
      <label>Setup Budget (£)</label>
      <input type="number" id="setupBudget" step="0.01" />
    </div>

    <div class="form-group">
      <label>Start Date</label>
      <input type="date" id="startDate" />
    </div>

    <div class="form-group">
      <label>End Date</label>
      <input type="date" id="endDate" />
    </div>

    <div class="form-group">
      <label>Referred By</label>
      <select id="referredBy">
        <option value="">Select</option>
        ${referredByOptions.map(o => `<option>${o}</option>`).join("")}
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

  // Bind optional field events for service
  bindOptionalFieldEvents(document.getElementById("serviceOptionalFields"));

  // Re-render dynamic fields when setupFee changes
  form.querySelector("#setupFee").addEventListener("change", e => {
    const value = e.target.value;
    document.getElementById("dynamicServiceFields").innerHTML =
      renderServiceFields(value, s, false);
  });

  // Show modal
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");

  const saveServiceBtn = document.getElementById("saveServiceBtn");
  const cancelServiceBtn = document.getElementById("cancelServiceBtn");

  if (cancelServiceBtn) {
    cancelServiceBtn.onclick = () => closeModal();
  }

  if (saveServiceBtn) {
    saveServiceBtn.onclick = () =>
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

          carers: Array.from(document.querySelectorAll(".carer-name"))
            .map(i => i.value.trim())
            .filter(Boolean),
          agency: Array.from(document.querySelectorAll(".agency-name"))
            .map(i => i.value.trim())
            .filter(Boolean),
          pa: Array.from(document.querySelectorAll(".pa-name"))
            .map(i => i.value.trim())
            .filter(Boolean),

          optional,
          optional_fields: optional, // mirror for backend compatibility
        };

        // Basic validations
        if (!payload.reference) {
          alert("YIL Reference is required");
          return;
        }
        if (!payload.serviceType) {
          alert("Service Type is required");
          return;
        }
        if (!payload.setupFee) {
          alert("Setup Fee is required");
          return;
        }
        if (!payload.startDate) {
          alert("Start Date is required");
          return;
        }

        // Enforce globally unique YI reference
        try {
          const allServices = await fetchAllServices();
          const enteredRef = payload.reference.trim();
          if (allServices.some(svc => (svc.reference || "").trim() === enteredRef)) {
            alert("❌ YI Reference already exists");
            return;
          }
        } catch (e) {
          console.warn("Could not validate YI reference uniqueness:", e);
        }

        try {
          await createService(payload);
          alert("✅ Service created successfully.");
          closeModal();
          // redirect to client management services tab for this client
          window.location.href = `clientmanagement.html?openServicesFor=${client.id}`;
        } catch (err) {
          console.error("❌ createService failed:", err);
          alert("Failed to create service.");
        }
      });
  }
}

function closeModal() {
  const modal = document.getElementById("serviceModal");
  if (!modal) return;
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
}

// ============================================
// HELPERS
// ============================================
function v(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function gv(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function nf(id) {
  const el = document.getElementById(id);
  const n = parseFloat(el?.value || 0);
  return Number.isFinite(n) ? n : 0;
}