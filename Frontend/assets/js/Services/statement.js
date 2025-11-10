// assets/js/Services/statement.js
import { initRowPagination } from "../row-pagination.js";
import {
  fetchStatements,
  createStatement,
  updateStatement,
  deleteStatement,
  downloadStatement,
  downloadStatementCSV,
} from "./utils/serviceApi.js";

import {
  validateSession,
  enforceAccessControl,
  requirePermission,
  isLoggedIn,
} from "../access-control.js";

// Current user (localStorage only)
function currentUserName() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.display_name || user.username || user.name || "Unknown";
  } catch {
    return "Unknown";
  }
}

// Money & Date Helpers
const GBP = (n) => `£${Number(n || 0).toFixed(2)}`;

function tryParseDate(d) {
  if (!d) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
    const dt = new Date(d);
    return isNaN(dt) ? null : dt;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
    const [dd, mm, yyyy] = d.split("/");
    const dt = new Date(`${yyyy}-${mm}-${dd}`);
    return isNaN(dt) ? null : dt;
  }
  const dt = new Date(d);
  return isNaN(dt) ? null : dt;
}

function toGB(d) {
  const dt = tryParseDate(d);
  return dt ? dt.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";
}

function sortByDateAsc(list) {
  return [...list].sort((a, b) => {
    const ad = tryParseDate(a.date) || new Date(0);
    const bd = tryParseDate(b.date) || new Date(0);
    return ad - bd;
  });
}

function makeRunningBalances(list) {
  const out = new Array(list.length);
  let run = 0;
  for (let i = 0; i < list.length; i++) {
    run += (Number(list[i].credit) || 0) - (Number(list[i].debit) || 0);
    out[i] = run;
  }
  return out;
}

function assertNotBeforeServiceStart(inputDateISO, service) {
  const startStr = service.startDate || service.start_date || "";
  const start = tryParseDate(startStr);
  const val = tryParseDate(inputDateISO);
  if (!start || !val) return true;
  return val >= start;
}

// Allowed statement types by setup fee
function allowedTypes(setupFee) {
  if (setupFee === "Managed Account Setup Cost") {
    return ["monthlyFee", "agency", "selfPa", "nwaRemittance", "insurance", "other"];
  }
  if (setupFee === "Payroll Setup Cost") {
    return ["monthlyFee", "pensionFee", "annualPensionFee", "annualYearEndFee", "selfPa", "carer", "nwaRemittance", "insurance", "other"];
  }
  if (setupFee === "Managed Account and Payroll Setup Cost") {
    return ["monthlyFee", "pensionFee", "annualPensionFee", "annualYearEndFee", "agency", "selfPa", "carer", "nwaRemittance", "insurance", "other"];
  }
  return ["nwaRemittance", "other"];
}

function labelize(key) {
  const map = {
    monthlyFee: "Monthly Fee",
    pensionFee: "Pension Fee",
    annualPensionFee: "Annual Pension Fee",
    annualYearEndFee: "Annual Year-End Fee",
    agency: "Agency",
    selfPa: "Self-Employed PA",
    carer: "Carer",
    nwaRemittance: "NWA Remittance",
    insurance: "Insurance",
    other: "Other",
  };
  return map[key] || key;
}

function buildSummaryBar(service) {
  const wrap = document.createElement("section");
  wrap.className = "summary-bar";
  wrap.innerHTML = `
    <div>Client ID: <span id="clientId">${service.clientId || service.client_id || "-"}</span></div>
    <div>Total Debit: £<span id="totalPaid">0.00</span></div>
    <div>Total Credit: £<span id="totalCredit">0.00</span></div>
    <div>Balance: £<span id="balance">0.00</span></div>
    <div><span id="creditLabel"></span>: <span id="creditStatus"></span></div>

    <div class="filter-bar">
      <label>From: <input type="date" id="filterStartDate"></label>
      <label>To: <input type="date" id="filterEndDate"></label>
      <button id="filterBtn" class="btn-filter">🔍 Filter</button>
      <button id="clearFilterBtn" class="btn-clear">✖ Clear</button>
    </div>

    <div>
      <button id="backToServices" class="btn-back">⬅ Back</button>
      <button id="downloadBtn">⬇ Download PDF</button>
      <button id="statementReportBtn">Statement Report (CSV)</button>
    </div>
  `;
  return wrap;
}

function buildControls(service) {
  const sec = document.createElement("section");
  sec.className = "statement-controls";

  const typeSelect = document.createElement("select");
  typeSelect.id = "statementType";
  typeSelect.innerHTML =
    `<option value="">Select</option>` +
    allowedTypes(service.setupFee || service.setup_fee || "")
      .map((v) => `<option value="${v}">${labelize(v)}</option>`)
      .join("");

  const subOptions = document.createElement("div");
  subOptions.id = "subOptions";

  const addBtn = document.createElement("button");
  addBtn.textContent = "➕ Add Statement";
  addBtn.className = "btn-primary";

  sec.append(typeSelect, subOptions, addBtn);
  return { container: sec, typeSelect, subOptions, addBtn };
}

function renderSubOptions(sub, service, type) {
  const safe = (arr) => (Array.isArray(arr) ? arr : []);
  const agencyOpts = safe(service.agency).map((a) => `<option>${a}</option>`).join("");
  const paOpts = safe(service.pa).map((p) => `<option>${p}</option>`).join("");
  const carerOpts = safe(service.carers).map((c) => `<option>${c}</option>`).join("");

  if (!type) return (sub.innerHTML = "");

  switch (type) {
    case "monthlyFee":
      sub.innerHTML = `
        Date: <input type="date" id="stmtDate">
        Month-Year: <input type="month" id="monthYear">
        <input type="number" id="monthlyAmount" value="${service.monthlyFee || 0}" placeholder="Amount">
      `;
      break;
    case "pensionFee":
      sub.innerHTML = `
        Date: <input type="date" id="stmtDate">
        <input type="number" id="pensionFee" value="${service.pensionFee || 0}" placeholder="Debit amount">
      `;
      break;
    case "annualPensionFee":
      sub.innerHTML = `
        Date: <input type="date" id="stmtDate">
        Start Year: <input type="number" id="annualStartYear" placeholder="YYYY">
        End Year: <input type="number" id="annualEndYear" placeholder="YYYY">
        <input type="number" id="annualPensionFee" value="${service.annualFee || 0}" placeholder="Debit amount">
      `;
      break;
    case "annualYearEndFee":
      sub.innerHTML = `
        Date: <input type="date" id="stmtDate">
        Start Year: <input type="number" id="yearEndStart" placeholder="YYYY">
        End Year: <input type="number" id="yearEndEnd" placeholder="YYYY">
        <input type="number" id="yearEndFee" value="${service.yearEndFee || 0}" placeholder="Debit amount">
      `;
      break;
    case "nwaRemittance":
      sub.innerHTML = `
        Date: <input type="date" id="stmtDate">
        Start: <input type="date" id="nwaStart">
        End: <input type="date" id="nwaEnd">
        <input type="number" id="nwaAmount" placeholder="Credit amount">
      `;
      break;
    case "agency":
      sub.innerHTML = `
        Date: <input type="date" id="stmtDate">
        Agency: <select id="agencyName">${agencyOpts}</select>
        Inv: <input type="text" id="agencyInvoice">
        Start: <input type="date" id="agencyStart">
        End: <input type="date" id="agencyEnd">
        <input type="number" id="agencyAmount" placeholder="Debit amount">
      `;
      break;
    case "selfPa":
      sub.innerHTML = `
        Date: <input type="date" id="stmtDate">
        PA: <select id="paName">${paOpts}</select>
        Inv#: <input type="text" id="paInvoice">
        Start: <input type="date" id="paStart">
        End: <input type="date" id="paEnd">
        <input type="number" id="paAmount" placeholder="Debit amount">
      `;
      break;
    case "carer":
      sub.innerHTML = `
        Date: <input type="date" id="stmtDate">
        Carer: <select id="carerName">${carerOpts}</select>
        Month-Year: <input type="month" id="carerMonth">
        <input type="number" id="carerAmount" placeholder="Debit amount">
      `;
      break;
    case "insurance":
      sub.innerHTML = `
        Date: <input type="date" id="stmtDate">
        Insurance: <input type="text" id="insuranceName" value="${service.insurance || ""}">
        Inv: <input type="text" id="insuranceInvoice">
        Start Year: <input type="number" id="insuranceStart" maxlength="2" placeholder="YY">
        End Year: <input type="number" id="insuranceEnd" maxlength="2" placeholder="YY">
        <input type="number" id="insuranceAmount" placeholder="Debit amount">
      `;
      break;
    case "other":
      sub.innerHTML = `
        Date: <input type="date" id="stmtDate">
        Description: <input type="text" id="otherDesc">
        Credit: <input type="number" id="otherCredit" placeholder="Credit">
        Debit: <input type="number" id="otherDebit" placeholder="Debit">
      `;
      break;
    default:
      sub.innerHTML = "";
  }
}

function buildStatement(type, service, enteredBy) {
  const date = document.getElementById("stmtDate")?.value || new Date().toISOString().slice(0, 10);
  if (!assertNotBeforeServiceStart(date, service)) {
    alert("Statement date cannot be earlier than the service start date.");
    return null;
  }

  let description = "";
  let credit = 0;
  let debit = 0;

  const short = (inputDate) => {
    const d = tryParseDate(inputDate);
    if (!d) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const mon = d.toLocaleString("en-GB", { month: "short" });
    const yr = String(d.getFullYear()).slice(-2);
    return `${day}-${mon}-${yr}`;
  };

  const monYear = (inputMonth) => {
    const d = tryParseDate(inputMonth ? `${inputMonth}-01` : null) || new Date();
    const mon = d.toLocaleString("en-GB", { month: "short" });
    const yr = String(d.getFullYear()).slice(-2);
    return `${mon} ${yr}`;
  };

  switch (type) {
    case "monthlyFee":
      description = `Monthly Fee - ${monYear(document.getElementById("monthYear")?.value)}`;
      debit = parseFloat(document.getElementById("monthlyAmount")?.value || 0);
      break;
    case "pensionFee":
      description = "Pension Setup";
      debit = parseFloat(document.getElementById("pensionFee")?.value || 0);
      break;
    case "annualPensionFee":
      description = `Annual Pension Fee ${(document.getElementById("annualStartYear")?.value || "")}-${(document.getElementById("annualEndYear")?.value || "")}`;
      debit = parseFloat(document.getElementById("annualPensionFee")?.value || 0);
      break;
    case "annualYearEndFee":
      description = `Annual Year End Fee ${(document.getElementById("yearEndStart")?.value || "")}-${(document.getElementById("yearEndEnd")?.value || "")}`;
      debit = parseFloat(document.getElementById("yearEndFee")?.value || 0);
      break;
    case "nwaRemittance":
      description = `NWA Remittance From ${short(document.getElementById("nwaStart")?.value || "")} to ${short(document.getElementById("nwaEnd")?.value || "")}`;
      credit = parseFloat(document.getElementById("nwaAmount")?.value || 0);
      break;
    case "agency":
      description = `${document.getElementById("agencyName")?.value || ""} - Inv ${document.getElementById("agencyInvoice")?.value || ""} - ${short(document.getElementById("agencyStart")?.value || "")} - ${short(document.getElementById("agencyEnd")?.value || "")}`;
      debit = parseFloat(document.getElementById("agencyAmount")?.value || 0);
      break;
    case "selfPa":
      description = `${document.getElementById("paName")?.value || ""} - Inv ${document.getElementById("paInvoice")?.value || ""} - ${short(document.getElementById("paStart")?.value || "")} - ${short(document.getElementById("paEnd")?.value || "")}`;
      debit = parseFloat(document.getElementById("paAmount")?.value || 0);
      break;
    case "carer":
      description = `PA - ${(document.getElementById("carerName")?.value || "")} - ${monYear(document.getElementById("carerMonth")?.value || "")} Salary`;
      debit = parseFloat(document.getElementById("carerAmount")?.value || 0);
      break;
    case "insurance":
      description = `${document.getElementById("insuranceName")?.value || ""} - Inv ${document.getElementById("insuranceInvoice")?.value || ""} - ${(document.getElementById("insuranceStart")?.value || "")} - ${(document.getElementById("insuranceEnd")?.value || "")}`;
      debit = parseFloat(document.getElementById("insuranceAmount")?.value || 0);
      break;
    case "other":
      description = document.getElementById("otherDesc")?.value || "Other Transaction";
      credit = parseFloat(document.getElementById("otherCredit")?.value || 0);
      debit = parseFloat(document.getElementById("otherDebit")?.value || 0);
      break;
  }

  return { date, description, credit, debit, enteredBy: enteredBy || "System" };
}

function updateSummary(statements) {
  const totalDebit = statements.reduce((a, s) => a + (Number(s.debit) || 0), 0);
  const totalCredit = statements.reduce((a, s) => a + (Number(s.credit) || 0), 0);
  const balance = totalCredit - totalDebit;

  document.getElementById("totalPaid").textContent = totalDebit.toFixed(2);
  document.getElementById("totalCredit").textContent = totalCredit.toFixed(2);
  document.getElementById("balance").textContent = balance.toFixed(2);

  const labelEl = document.getElementById("creditLabel");
  const statusEl = document.getElementById("creditStatus");
  labelEl.textContent = balance < 0 ? "Overdrawn" : "Credit";
  statusEl.style.color = balance < 0 ? "red" : "green";
  statusEl.textContent = Math.abs(balance).toFixed(2);
}

// EXPORTABLE MAIN FUNCTION
export async function renderStatement(service) {
  validateSession();
  enforceAccessControl();

  if (!isLoggedIn()) {
    window.location.href = "../LoginPage/LoginPage.html";
    return;
  }

  requirePermission("statement", "view", async () => {
    const root = document.getElementById("statementRoot");
    root.innerHTML = "";
    root.scrollTo({ top: 0, behavior: "smooth" });
    root.style.display = "block";

    if (!service || !service.serviceId) {
      alert("Service details are missing. Please refresh the page.");
      return;
    }

    const enteredBy = currentUserName();

    // Load statements
    let statements = [];
    try {
      const res = await fetchStatements(service.serviceId);
      statements = Array.isArray(res) ? res : res?.statements || [];
    } catch {
      statements = [];
    }

    // Build UI
    const summaryBar = buildSummaryBar(service);
    const controls = buildControls(service);
    const tableWrap = document.createElement("section");
    tableWrap.className = "statement-table";
    tableWrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Credit</th>
            <th>Debit</th>
            <th>Balance</th>
            <th>Action</th>
            <th>Entered By</th>
          </tr>
        </thead>
        <tbody id="statementBody"></tbody>
      </table>
      <div id="stmtPager"></div>
    `;
    const tbody = tableWrap.querySelector("#statementBody");
    const pagerHost = tableWrap.querySelector("#stmtPager");

    root.append(summaryBar, controls.container, tableWrap);

    const PAGE_SIZE = 100;
    let sorted = sortByDateAsc(statements);
    let running = makeRunningBalances(sorted);
    let currentPage = 1;

    const getRawIndex = (sortedIdx) => {
      const obj = sorted[sortedIdx];
      return statements.indexOf(obj);
    };

    function refresh(page = 1, customList = null) {
      sorted = sortByDateAsc(customList || statements);
      running = makeRunningBalances(sorted);
      updateSummary(sorted);
      currentPage = Math.max(1, Math.min(page, Math.ceil(sorted.length / PAGE_SIZE) || 1));
      renderPage(currentPage);
      renderPager();
    }

    function renderPage(page) {
      const total = sorted.length;
      const startIdx = (page - 1) * PAGE_SIZE;
      const endIdx = Math.min(startIdx + PAGE_SIZE, total);
      tbody.innerHTML = "";

      for (let i = startIdx; i < endIdx; i++) {
        const s = sorted[i];
        const run = running[i];
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${toGB(s.date)}</td>
          <td>${s.description || "-"}</td>
          <td>${s.credit ? GBP(s.credit) : "-"}</td>
          <td>${s.debit ? GBP(s.debit) : "-"}</td>
          <td style="color:${run < 0 ? "red" : "green"}">${GBP(run)}</td>
          <td>
            <button class="edit-btn" data-idx="${i}">✏️</button>
            <button class="delete-btn" data-idx="${i}">🗑️</button>
          </td>
          <td>${s.enteredBy || "Unknown"}</td>
        `;
        tbody.appendChild(tr);
      }

      // Delete
      tbody.querySelectorAll(".delete-btn").forEach((btn) =>
        btn.addEventListener("click", () =>
          requirePermission("statement", "delete", () => {
            const rawIdx = getRawIndex(Number(btn.dataset.idx));
            handleDelete(rawIdx);
          })
        )
      );

      // Edit
      tbody.querySelectorAll(".edit-btn").forEach((btn) =>
        btn.addEventListener("click", () =>
          requirePermission("statement", "edit", () => {
            const sortedIdx = Number(btn.dataset.idx);
            const rawIdx = getRawIndex(sortedIdx);
            const s = sorted[sortedIdx];
            const tr = btn.closest("tr");
            tr.innerHTML = `
              <td><input type="date" id="editDate" value="${(s.date || "").slice(0,10)}"></td>
              <td><input type="text" id="editDesc" value="${s.description || ""}"></td>
              <td><input type="number" id="editCredit" value="${s.credit || 0}"></td>
              <td><input type="number" id="editDebit" value="${s.debit || 0}"></td>
              <td>${GBP((Number(s.credit)||0)-(Number(s.debit)||0))}</td>
              <td>
                <button class="save-row">💾</button>
                <button class="cancel-row">❌</button>
              </td>
              <td>${s.enteredBy || "Unknown"}</td>
            `;

            tr.querySelector(".save-row").addEventListener("click", () => {
              const iso = tr.querySelector("#editDate").value || (s.date || "").slice(0, 10);
              if (!assertNotBeforeServiceStart(iso, service)) {
                alert("Statement date cannot be earlier than the service start date.");
                return;
              }
              const updated = {
                date: iso,
                description: tr.querySelector("#editDesc").value,
                credit: parseFloat(tr.querySelector("#editCredit").value) || 0,
                debit: parseFloat(tr.querySelector("#editDebit").value) || 0,
                enteredBy: currentUserName(),
              };
              handleEdit(rawIdx, updated);
            });

            tr.querySelector(".cancel-row").addEventListener("click", () => refresh(currentPage));
          })
        )
      );
    }

    function renderPager() {
      pagerHost.innerHTML = "";
      const pg = initRowPagination({
        totalItems: sorted.length,
        fixedPageSize: PAGE_SIZE,
        onPageChange: (page, pageSize) => {
          currentPage = page;
          renderPage(page);
        },
      });
      // Support both .el or direct node
      pagerHost.appendChild(pg.el ?? pg);
    }

    function handleDelete(rawIndex) {
      const stmt = statements[rawIndex];
      const stmtId = stmt?._id || stmt?.statementId || stmt?.id;
      if (!stmtId) {
        alert("Cannot delete: Missing statement ID.");
        return;
      }
      if (!confirm("Delete this statement?")) return;

      deleteStatement(service.serviceId, stmtId)
        .then((res) => {
          statements = res.statements || [];
          refresh(currentPage);
        })
        .catch((err) => {
          console.error("Delete failed", err);
          alert("Failed to delete statement.");
        });
    }

    function handleEdit(rawIndex, updated) {
      const stmt = statements[rawIndex];
      const stmtId = stmt?._id || stmt?.statementId || stmt?.id;
      if (!stmtId) {
        alert("Cannot update: Missing statement ID.");
        return;
      }

      updateStatement(service.serviceId, stmtId, updated)
        .then((res) => {
          statements = res.statements || [];
          refresh(currentPage);
        })
        .catch((err) => {
          console.error("Update failed:", err);
          alert("Failed to update statement.");
        });
    }

    // Initial render
    refresh(1);

    // Add new statement
    controls.typeSelect.addEventListener("change", () =>
      renderSubOptions(controls.subOptions, service, controls.typeSelect.value)
    );

    controls.addBtn.addEventListener("click", async () =>
      requirePermission("statement", "add", async () => {
        const type = controls.typeSelect.value;
        if (!type) return alert("Select a statement type first.");
        const stmt = buildStatement(type, service, enteredBy);
        if (!stmt) return;

        try {
          const res = await createStatement(service.serviceId, stmt);
          statements = res.statements || [];
          // Jump to last page so the newly added row is visible
          const lastPage = Math.ceil((statements.length || 1) / PAGE_SIZE);
          refresh(lastPage);
          controls.subOptions
            .querySelectorAll("input[type='text'], input[type='number']")
            .forEach((i) => (i.value = ""));
        } catch (err) {
          console.error("Add failed:", err);
          alert("Failed to add statement.");
        }
      })
    );

    // Filters
    document.getElementById("filterBtn").addEventListener("click", () =>
      requirePermission("statement", "view", () => {
        const start = document.getElementById("filterStartDate").value;
        const end = document.getElementById("filterEndDate").value;
        if (!start && !end) return alert("Please select a date range to filter.");

        const sDate = start ? tryParseDate(start) : null;
        const eDate = end ? tryParseDate(end) : null;

        const filtered = statements.filter((row) => {
          const d = tryParseDate(row.date);
          if (!d) return false;
          const afterStart = sDate ? d >= sDate : true;
          const beforeEnd = eDate ? d <= eDate : true;
          return afterStart && beforeEnd;
        });

        refresh(1, filtered);
      })
    );

    document.getElementById("clearFilterBtn").addEventListener("click", () => {
      refresh(1, statements);
      document.getElementById("filterStartDate").value = "";
      document.getElementById("filterEndDate").value = "";
    });

    // Downloads
    const dlBtn = document.getElementById("downloadBtn");
    const csvBtn = document.getElementById("statementReportBtn");

    if (dlBtn) {
      dlBtn.addEventListener("click", () =>
        requirePermission("statement", "view", () => {
          downloadStatement(service.serviceId);
        })
      );
    }

    if (csvBtn) {
      csvBtn.addEventListener("click", () =>
        requirePermission("statement", "view", () => {
          const start = document.getElementById("filterStartDate").value || null;
          const end = document.getElementById("filterEndDate").value || null;
          downloadStatementCSV(service.serviceId, start, end);
        })
      );
    }

    // Back button
    document.getElementById("backToServices").addEventListener("click", () => {
      root.innerHTML = "";
      root.style.display = "none";
      document.querySelector(".service-info").style.display = "block";
    });
  });
}
