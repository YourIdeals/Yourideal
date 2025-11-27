// ============================================
// services.js — with Full CRUD Access Control Integration (FINAL FIXED)
// ============================================

import { initRowPagination } from "../row-pagination.js";
import { fetchAllServices, deleteService, createService } from "./utils/serviceApi.js";
import { renderServiceDetails } from "./view-service.js";
import { openNotes } from "./notes.js";
import { renderServiceFields } from "./utils/serviceFields.js";
import {
  renderOptionalFields,
  collectOptionalFields,
  bindOptionalFieldEvents,
} from "../utils/optionalfield.js";
import {
  referredByOptions,
  serviceTypeOptions,
  setupFeeOptions,
  serviceDefaults,
} from "./utils/serviceSchema.js";
import { renderStatement } from "./statement.js";

// ✅ Access Control Imports
import { enforceAccessControl, validateSession, requirePermission } from "../access-control.js";

const WORKSPACE_ID = "svcWorkspace";

// ============================================
// Date Helper Functions (MOVE THESE OUTSIDE Main Renderer)
// ============================================

function formatDateToUK(date) {
    if (!date) return "-"; 
    if (date.includes('/') && date.split('/')[2]?.length === 4) {
		return date;
    }	
    let d;
    if (date.includes('/')) {
        // Already in dd/mm/yyyy format
        const [day, month, year] = date.split('-');
        d = new Date(year, month, day);
    } else {
        // yyyy-mm-dd format
        d = new Date(date);
    }
  
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-GB");  
}

function formatDateForInput(dateStr) {
    if (!dateStr) return "";
      
    if (dateStr.includes('/')) {
        // Convert dd/mm/yyyy to yyyy-mm-dd for input[type="date"]
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    } else if (dateStr.includes('-')) {
		// Already in yyyy-mm-dd format
		return dateStr;
	}
  
    // Already in yyyy-mm-dd format
    return dateStr;  
}

function formatDateForAPI(dateStr) {
    if (!dateStr) return "";
    
    if (dateStr.includes('/')) {
        // Convert dd/mm/yyyy to yyyy-mm-dd for API
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    
    // Already in yyyy-mm-dd format (from date input)
    return dateStr; 
}

// NEW FUNCTION: Convert database date to proper display format
function convertDatabaseDateToDisplay(dbDate) {
    if (!dbDate) return "";
    
    if (dbDate.includes('-')) {
        const [year, month, day] = dbDate.split('-');
        // Convert yyyy-mm-dd to dd/mm/yyyy for display
        return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
    }
    
    return dbDate;
}

// NEW FUNCTION: Convert display date to database format
function convertDisplayDateToDatabase(displayDate) {
    if (!displayDate) return "";
    
    if (displayDate.includes('/')) {
        const [day, month, year] = displayDate.split('/');
        // Convert dd/mm/yyyy to yyyy-mm-dd for database
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    
    return displayDate;
}

// ============================================
// Workspace Shell
// ============================================
function ensureWorkspaceShell() {
  let shell = document.getElementById(WORKSPACE_ID);
  if (shell) return shell;

  shell = document.createElement("div");
  shell.id = WORKSPACE_ID;
  shell.innerHTML = `
    <div class="svc-header">
      <img id="yiLogo" src="./../images/logo.png" alt="Your Ideal">
      <div class="title" id="svcTitle">Service Workspace</div>
      <div class="spacer"></div>
      <button id="svcBackBtn">⬅ Back</button>
    </div>

    <div class="svc-body">
      <div class="service-info">
        <div class="toolbar">
          <div id="svcSubtitle"></div>
          <button id="addServiceBtn" class="add-btn btn-service">➕ Add Service</button>
        </div>

        <table class="service-table">
          <thead>
            <tr>
              <th>Start</th>
              <th>End</th>
              <th>Referred</th>
              <th>Service Type</th>
              <th>Setup Fee</th>
              <th>Setup Budget</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>

        <div id="paginationContainer" class="pagination"></div>
      </div>

      <section id="serviceDetailsSection">
        <form id="serviceForm"></form>
        <div class="service-buttons"></div>
      </section>

      <section id="statementRoot"></section>
	  <section id="notesRoot" style="display:none;"></section>
    </div>
  `;
  document.body.appendChild(shell);

  shell.querySelector("#svcBackBtn").addEventListener("click", () => {
    window.location.href = "clientmanagement.html";
  });

  shell.querySelector("#yiLogo").addEventListener("click", () => {
    window.location.href = "../HomePage/homepage.html";
  });

  return shell;
}

// ============================================
// Main Renderer
// ============================================
export async function renderServicePage(clientId) {
  const shell = ensureWorkspaceShell();
  shell.style.display = "block";

  const subEl = shell.querySelector("#svcSubtitle");
  const tbody = shell.querySelector(".service-table tbody");
  const paginationContainer = shell.querySelector("#paginationContainer");
  const addServiceBtn = shell.querySelector("#addServiceBtn");

  subEl.textContent = `Client ID: ${clientId}`;

  const safe = (v) => (v ?? v === 0 ? v : "-");
  const num = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);
    
  // Update the normalize function to handle date formats consistently
  const normalize = (s) => ({
    serviceId: s.serviceId || s.service_id,
    clientId: s.clientId || s.client_id,
    reference: s.reference,
    serviceType: s.serviceType || s.service_type,
    setupFee: s.setupFee || s.setup_fee,
    setupBudget: s.setupBudget ?? s.setup_budget ?? 0,
    startDate: convertDatabaseDateToDisplay(s.startDate || s.start_date || ""), // CONVERT HERE
    endDate: convertDatabaseDateToDisplay(s.endDate || s.end_date || ""), // CONVERT HERE
    referredBy: s.referredBy || s.referred_by || "",
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
    optional: Array.isArray(s.optional) ? s.optional : [],   
  });

  let allServices = [];
  let clientServices = [];

  // ======================================================
  // Load Services (with view permission)
  // ======================================================
  async function loadServices() {
    requirePermission("service", "view", async () => {
      if (!tbody) return;
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Loading...</td></tr>`;
      try {
        allServices = await fetchAllServices();
        clientServices = allServices
          .map(normalize)
          .filter((s) => String(s.clientId) === String(clientId));
        setupPagination(clientServices);
      } catch (err) {
        console.error("❌ Failed to load services:", err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">Failed to load services</td></tr>`;
      }
    });
  }

  // ======================================================
  // Render Services Table
  // ======================================================
  function renderServices(list) {
    if (!tbody) return;
    tbody.innerHTML = "";
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No services found</td></tr>`;
      return;
    }

    list.forEach((data) => {
      const row = document.createElement("tr");
      [
        formatDateToUK(data.startDate),
        formatDateToUK(data.endDate),
        safe(data.referredBy),
        safe(data.serviceType),
        safe(data.setupFee),
        "£" + parseFloat(data.setupBudget || 0).toFixed(2),
      ].forEach((f) => {
        const td = document.createElement("td");
        td.textContent = f;
        row.appendChild(td);
      });

      const actionCell = document.createElement("td");

      // ✅ View Button (service.view)
      const viewBtn = document.createElement("button");
      viewBtn.className = "view-btn";
      viewBtn.textContent = "View";
      viewBtn.onclick = () => {
        requirePermission("service", "view", () => {
          shell.querySelector(".service-info").style.display = "none";
          shell.querySelector("#serviceDetailsSection").style.display = "block";
          renderServiceDetails(data);
        });
      };
      actionCell.appendChild(viewBtn);

      // ✅ Statement Button (statement.view)
      const stmtBtn = document.createElement("button");
      stmtBtn.className = "stmt-btn btn-statement";
      stmtBtn.textContent = "Statement";
      stmtBtn.onclick = () => {
        requirePermission("statement", "view", () => {
          shell.querySelector(".service-info").style.display = "none";
          shell.querySelector("#serviceDetailsSection").style.display = "none";
          const statementRoot = shell.querySelector("#statementRoot");
          if (statementRoot) {
            statementRoot.innerHTML = "";
            statementRoot.style.display = "block";
          }
          renderStatement(data);
        });
      };
      actionCell.appendChild(stmtBtn);

      // ✅ Notes Button (notes.view)
      const noteBtn = document.createElement("button");
      noteBtn.className = "note-btn btn-notes";
      noteBtn.textContent = "Note";
      noteBtn.onclick = () => {
        requirePermission("notes", "view", () => {
		  const serviceInfo = shell.querySelector(".service-info");
		  const detailsSection = shell.querySelector("#serviceDetailsSection");
		  const statementRoot = shell.querySelector("#statementRoot");
          const notesRoot = shell.querySelector("#notesRoot");
		  if (serviceInfo) serviceInfo.style.display = "none";
		  if (detailsSection) detailsSection.style.display = "none";
		  if (statementRoot) statementRoot.style.display = "none"
          if (notesRoot) {
            notesRoot.style.display = "block";
            notesRoot.innerHTML = ""; // clear previous
            openNotes({
              serviceId: data.serviceId,
              clientId: data.clientId,
              root: notesRoot,
              onBack: () => {
                // Called from inside notes.js when user clicks Back
                notesRoot.style.display = "none";
                serviceInfo.style.display = "block";
              },
            });
          }
        });
      }
      actionCell.appendChild(noteBtn);

      // ✅ Delete Button (service.delete)
      const delBtn = document.createElement("button");
      delBtn.className = "delete-btn btn-service";
      delBtn.textContent = "Delete";
      delBtn.onclick = async () => {
        requirePermission("service", "delete", async () => {
          if (confirm("Delete this service?")) {
            await deleteService(data.serviceId);
            await loadServices();
          }
        });
      };
      actionCell.appendChild(delBtn);

      row.appendChild(actionCell);
      tbody.appendChild(row);
    });
  }

  // Pagination Setup
  function setupPagination(list) {
    paginationContainer.innerHTML = "";
    const pager = initRowPagination({
      totalItems: list.length,
      onPageChange: (page, pageSize) => {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        renderServices(list.slice(start, end));
      },
    });
    paginationContainer.appendChild(pager);
  }

  // ======================================================
  // UI Helper Functions (restored)
  // ======================================================
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

  function currencyRow(id, label, value = 0) {
    return `
      <div class="form-row">
        <label>${label}:</label>
        <div class="service-currency-input">
          <span>£</span>
          <input type="number" id="${id}" value="${Number(value || 0)}" step="0.01"/>
        </div>
      </div>
    `;
  }

  function dateRow(id, label, value = "") {
    return `
      <div class="form-row">
        <label>${label}:</label>
        <input type="date" id="${id}" value="${value || ""}"/>
      </div>
    `;
  }

  // ======================================================
  // Add Service (service.add)
  // ======================================================
  function openAddServiceForm() {
    requirePermission("service", "add", () => {
      shell.querySelector(".service-info").style.display = "none";
      const details = shell.querySelector("#serviceDetailsSection");
      details.style.display = "block";

      const d = { ...serviceDefaults, clientId, reference: "" };
      // Format dates for display in input fields
      const formattedStartDate = formatDateForInput(d.startDate);
      const formattedEndDate = formatDateForInput(d.endDate);	
	  
      const form = shell.querySelector("#serviceForm");
      form.innerHTML = `
        <div class="section-header">Add New Service</div>

        <div class="form-row">
          <label>Client ID:</label>
          <input type="text" id="clientId" value="${clientId}" readonly style="background:#f3f3f3;"/>
        </div>
        
        <div class="form-row">
          <label>YIL Reference No:</label>
          <input type="text" id="reference" value="" placeholder="Enter YIL Ref (unique per client/category)"/>
        </div>

        ${buildDropdown("serviceType", "Service Type", serviceTypeOptions, d.serviceType)}
        ${buildDropdown("setupFee", "Setup Fee", setupFeeOptions, d.setupFee)}
        ${currencyRow("setupBudget", "Setup Budget (£)", d.setupBudget)}
        ${dateRow("startDate", "Start Date", formattedStartDate)}
        ${dateRow("endDate", "End Date", formattedEndDate)}
        ${buildDropdown("referredBy", "Referred By", referredByOptions, d.referredBy)}

        <div class="form-row">
          <label>Insurance:</label>
          <input type="text" id="insurance" value="${d.insurance || ""}" placeholder="Insurance Company Name"/>
        </div>

        <div id="dynamicServiceFields">
          ${renderServiceFields(d.setupFee, d, false)}
        </div>

        <div class="section-header">Optional Fields</div>
        <div id="serviceOptionalFields">${renderOptionalFields([], true)}</div>
      `;

      const buttons = shell.querySelector(".service-buttons");
      buttons.innerHTML = `
        <button id="saveNewServiceBtn" class="save-btn btn-service">Save</button>
        <button id="cancelNewServiceBtn" class="back-btn">Cancel</button>
      `;

      shell.querySelector("#setupFee").addEventListener("change", (e) => {
        const newType = e.target.value;
        shell.querySelector("#dynamicServiceFields").innerHTML =
          renderServiceFields(newType, d, false);
      });

      const refInput = shell.querySelector("#reference");
      shell.querySelector("#referredBy").addEventListener("change", () => {
        if (refInput.value) {
          refInput.value = "";
          alert("Referred By changed. Please enter a new YIL Reference No.");
        }
      });

      bindOptionalFieldEvents(shell.querySelector("#serviceOptionalFields"));

      shell.querySelector("#saveNewServiceBtn").onclick = saveNewServiceAPI;
      shell.querySelector("#cancelNewServiceBtn").onclick = () => {
        details.style.display = "none";
        shell.querySelector(".service-info").style.display = "block";
      };
    });
  }

  // ======================================================
  // Save New Service (service.add)
  // ======================================================
  async function saveNewServiceAPI() {
    requirePermission("service", "add", async () => {
      const pick = (id) => (shell.querySelector(`#${id}`)?.value || "").trim();

      const payload = {
        clientId: pick("clientId"),
        reference: pick("reference"),
        serviceType: pick("serviceType"),
        setupFee: pick("setupFee"),
        setupBudget: parseFloat(pick("setupBudget")) || 0,
        startDate: convertDisplayDateToDatabase(pick("startDate")), // USE NEW FUNCTION
        endDate: convertDisplayDateToDatabase(pick("endDate")), // USE NEW FUNCTION
        referredBy: pick("referredBy"),
        insurance: pick("insurance"),
        monthlyFee: parseFloat(pick("monthlyFee")) || 0,
        initialFee: parseFloat(pick("initialFee")) || 0,
        pensionFee: parseFloat(pick("pensionFee")) || 0,
        pensionSetup: parseFloat(pick("pensionSetup")) || 0,
        annualFee: parseFloat(pick("annualFee")) || 0,
        yearEndFee: parseFloat(pick("yearEndFee")) || 0,
        carerBudget: parseFloat(pick("carerBudget")) || 0,
        agencyBudget: parseFloat(pick("agencyBudget")) || 0,
        carers: Array.from(shell.querySelectorAll(".carer-name"))
          .map((i) => i.value.trim())
          .filter(Boolean),
        agency: Array.from(shell.querySelectorAll(".agency-name"))
          .map((i) => i.value.trim())
          .filter(Boolean),
        pa: Array.from(shell.querySelectorAll(".pa-name"))
          .map((i) => i.value.trim())
          .filter(Boolean),
        optional: collectOptionalFields(shell.querySelector("#serviceOptionalFields")),
      };

      if (!payload.clientId) return alert("Client ID is required");
      if (!payload.reference) return alert("Reference is required");
      if (!payload.startDate) return alert("Start Date is required");
      if (!payload.serviceType) return alert("Service Type is required");
      if (!payload.setupFee) return alert("Setup Fee is required");
      if (!payload.referredBy) return alert("Referred By is required");

      try {
        const { service } = await createService(payload);
        if (!service) throw new Error("No service returned");
        await loadServices();
        shell.querySelector("#serviceDetailsSection").style.display = "none";
        shell.querySelector(".service-info").style.display = "block";
        alert("✅ Service created successfully");
      } catch (err) {
        console.error("❌ Failed to add service:", err);
        alert("Failed to save service");
      }
    });
  }

  // ======================================================
  // Init
  // ======================================================
  if (addServiceBtn) addServiceBtn.addEventListener("click", openAddServiceForm);

  await loadServices();
}