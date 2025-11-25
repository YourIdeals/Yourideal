// ============================================
// clientmanagement.js — with CRUD Access Control + Dynamic CSV
// ============================================

import { initHeader } from './header.js';
import {
  fetchClients,
  fetchCouncilsEnabled,
  updateClient,
  deleteClient,
  fetchClientAddresses,
  fetchClientKins,
} from './api.js';
import { initRowPagination } from './row-pagination.js';
import { renderServicePage } from './Services/services.js';
import {
  fetchAllServices,
  fetchStatements,
  uploadStatementsCSV,
} from './Services/utils/serviceApi.js';
import { enforceAccessControl, validateSession, requirePermission } from './access-control.js';

// =============================
// GLOBAL STATE
// =============================
let allClients = [];
let allServices = null; // cache
const addressCache = {};
const kinCache = {};

// =============================
// REPORT FIELD CONFIG
// =============================

const REPORT_FIELD_GROUPS = [
  {
    id: 'client',
    label: 'Client Basics',
    fields: [
      {
        id: 'client_Title',
        label: 'Title',
        essential: true,
        get: ({ client }) => client.title || '',
      },
      {
        id: 'client_first_name',
        label: 'First Name',
        essential: true,
        get: ({ client }) => client.first_name || '',
      },
      {
        id: 'client_last_name',
        label: 'Last Name',
        essential: true,
        get: ({ client }) => client.last_name || '',
      },
      {
        id: 'client_id',
        label: 'Client ID',
        essential: true,
        get: ({ client }) => client.id || '',
      },
      {
        id: 'client_council',
        label: 'Council',
        essential: true,
        get: ({ client }) => client.council || '',
      },
      {
        id: 'client_status',
        label: 'Status',
        essential: true,
        get: ({ client }) => client.status || '',
      },
      {
        id: 'client_phone',
        label: 'Phone',
        essential: false,
        get: ({ client }) => client.phone || '',
      },
      {
        id: 'client_email',
        label: 'Email',
        essential: false,
        get: ({ client }) => client.email || '',
      },
      {
        id: 'client_dob',
        label: 'DOB',
        essential: false,
        get: ({ client }) => client.dob || '',
      },
      {
        id: 'client_gender',
        label: 'Gender',
        essential: false,
        get: ({ client }) => client.gender || '',
      },
      {
        id: 'client_disabilities',
        label: 'Disability',
        essential: false,
        get: ({ client }) => client.disabilities?.join(", ") || "-",
      },	  
      {
        id: 'client_language',
        label: 'Language',
        essential: false,
        get: ({ client }) => client.language || '',
      },
      {
        id: 'client_ethnicity_type',
        label: 'Ethnicity Type',
        essential: false,
        get: ({ client }) => client.ethnicity_type || '',
      },
      {
        id: 'client_ethnicity',
        label: 'Ethnicity',
        essential: false,
        get: ({ client }) => client.ethnicity || '',
      },
    ],
  },
  {
    id: 'address',
    label: 'Current Address',
    fields: [
      {
        id: 'addr_house_no',
        label: 'House Number',
        essential: false,
        get: ({ address }) => (address?.house_no || ''),
      },
      {
        id: 'addr_street',
        label: 'Street',
        essential: false,
        get: ({ address }) => (address?.street || ''),
      },
      {
        id: 'addr_city',
        label: 'City',
        essential: false,
        get: ({ address }) => (address?.city || ''),
      },
      {
        id: 'addr_country',
        label: 'Country',
        essential: false,
        get: ({ address }) => (address?.country || ''),
      },
      {
        id: 'addr_postcode',
        label: 'Postcode',
        essential: false,
        get: ({ address }) => (address?.postcode || ''),
      },
      {
        id: 'addr_full',
        label: 'Full Address',
        essential: false,
        get: ({ address }) => (address?.full || ''),
      },
    ],
  },
  {
    id: 'kin',
    label: 'Current Next of Kin',
    fields: [
      {
        id: 'kin_name',
        label: 'Kin Name',
        essential: false,
        get: ({ kin }) => (kin?.name || ''),
      },
      {
        id: 'kin_relationship',
        label: 'Kin Relationship',
        essential: false,
        get: ({ kin }) => (kin?.relationship || ''),
      },
      {
        id: 'kin_email',
        label: 'Kin Email',
        essential: false,
        get: ({ kin }) => (kin?.email || ''),
      },
    ],
  },
  {
    id: 'service',
    label: 'Service Details',
    fields: [
      {
        id: 'service_id',
        label: 'Service ID',
        essential: false,
        get: ({ service }) => (service?.serviceId || service?.service_id || ''),
      },
      {
        id: 'service_type',
        label: 'Service Type',
        essential: false,
        get: ({ service }) => (service?.serviceType || service?.service_type || ''),
      },
      {
        id: 'service_reference',
        label: 'YIL Reference No',
        essential: true,
        get: ({ service }) => (service?.reference || ''),
      },
      {
        id: 'service_setup_fee',
        label: 'Setup Fee',
        essential: true,
        get: ({ service }) => (service?.setupFee || service?.setup_fee || ''),
      },
      {
        id: 'service_setup_budget',
        label: 'Setup Budget',
        essential: false,
        get: ({ service }) => String(service?.setupBudget ?? service?.setup_budget ?? ''),
      },
      {
        id: 'service_start_date',
        label: 'Start Date',
        essential: false,
        get: ({ service }) => (service?.startDate || service?.start_date || ''),
      },
      {
        id: 'service_end_date',
        label: 'End Date',
        essential: false,
        get: ({ service }) => (service?.endDate || service?.end_date || ''),
      },
      {
        id: 'service_referred_by',
        label: 'Referred By',
        essential: true,
        get: ({ service }) => (service?.referredBy || service?.referred_by || ''),
      },
      {
        id: 'service_insurance',
        label: 'Insurance',
        essential: false,
        get: ({ service }) => (service?.insurance || ''),
      },
      {
        id: 'service_monthly_fee',
        label: 'Monthly Fee',
        essential: false,
        get: ({ service }) => String(service?.monthlyFee ?? service?.monthly_fee ?? ''),
      },
      {
        id: 'service_initial_fee',
        label: 'Initial Fee',
        essential: false,
        get: ({ service }) => String(service?.initialFee ?? service?.initial_fee ?? ''),
      },
      {
        id: 'service_pension_setup',
        label: 'Pension Setup',
        essential: false,
        get: ({ service }) => String(service?.pensionSetup ?? service?.pension_setup ?? ''),
      },
      {
        id: 'service_pension_fee',
        label: 'Pension Fee',
        essential: false,
        get: ({ service }) => String(service?.pensionFee ?? service?.pension_fee ?? ''),
      },
      {
        id: 'service_annual_fee',
        label: 'Annual Fee',
        essential: false,
        get: ({ service }) => String(service?.annualFee ?? service?.annual_fee ?? ''),
      },
      {
        id: 'service_year_end_fee',
        label: 'Year End Fee',
        essential: false,
        get: ({ service }) => String(service?.yearEndFee ?? service?.year_end_fee ?? ''),
      },
      {
        id: 'service_carer_budget',
        label: 'Carer Budget',
        essential: false,
        get: ({ service }) => String(service?.carerBudget ?? service?.carer_budget ?? ''),
      },
      {
        id: 'service_agency_budget',
        label: 'Agency Budget',
        essential: false,
        get: ({ service }) => String(service?.agencyBudget ?? service?.agency_budget ?? ''),
      },
    ],
  },
  {
    id: 'totals',
    label: 'Statement Totals',
    fields: [
      {
        id: 'total_paid',
        label: 'Total Paid (Debit)',
        essential: true,
        get: ({ totals }) =>
          totals ? totals.totalPaid.toFixed(2) : '',
      },
      {
        id: 'total_remittance',
        label: 'Total Remittance (Credit)',
        essential: true,
        get: ({ totals }) =>
          totals ? totals.totalRemit.toFixed(2) : '',
      },
      {
        id: 'balance',
        label: 'Balance (Credit - Debit)',
        essential: true,
        get: ({ totals }) =>
          totals ? totals.balance.toFixed(2) : '',
      },
    ],
  },
];

// =============================
// DOM READY
// =============================
document.addEventListener('DOMContentLoaded', async () => {
  validateSession();
  await initHeader();
  enforceAccessControl();

  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '../LoginPage/LoginPage.html';
    return;
  }

  ensureReportModal();

  const tbody = document.getElementById('clientTableBody');

  // ✅ Only load clients if user can VIEW
  requirePermission('client', 'view', async () => {
    try {
      allClients = await fetchClients();
      await fetchCouncilsEnabled();
      setupPagination(allClients, tbody);
      bindClientSearch(allClients, tbody);

      const params = new URLSearchParams(window.location.search);
      const openFor = params.get('openServicesFor');
      if (openFor) renderServicePage(String(openFor));
    } catch (err) {
      console.error('❌ Failed to load clients or councils', err);
    }
  });

  // ------------------ CLIENT REPORT BUTTON ------------------
  const reportBtn = document.getElementById('clientReportBtn');
  if (reportBtn) {
    reportBtn.addEventListener('click', () => {
      requirePermission('client', 'view', () => {
        const modal = document.getElementById('clientReportModal');
        if (modal) modal.classList.add('show');
      });
    });
  }
});

// =============================
// RENDER TABLE
// =============================
function renderClients(clients, tbody) {
  tbody.innerHTML = '';

  if (!clients.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No clients found</td></tr>`;
    return;
  }

  clients.forEach((client) => {
    const row = document.createElement('tr');
    const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim();
    row.innerHTML = `
      <td>
        <div class="client-name">
          <img src="${client.profileImg || '../images/profile.png'}" alt="Client">
          <span>${fullName}</span>
        </div>
      </td>
      <td>${client.id}</td>
      <td>${client.council}</td>
      <td><span class="status ${String(client.status || '').toLowerCase()}">${client.status || 'Active'}</span></td>
      <td>
        <div class="row-actions">
          <a href="Viewprofile1.html?id=${client.id}" class="view-client">👤 View Profile</a>
          <button class="open-services btn-service" data-client-id="${client.id}">📄 Service Information</button>
          <button class="delete-client btn-client" data-client-id="${client.id}">🗑 Delete</button>
          <select aria-label="Client Status">
            <option ${client.status === 'Active' ? 'selected' : ''}>Active</option>
            <option ${client.status === 'TBA' ? 'selected' : ''}>TBA</option>
            <option ${client.status === 'Passed Away' ? 'selected' : ''}>Passed Away</option>
            <option ${client.status === 'Ceased' ? 'selected' : ''}>Ceased</option>
            <option ${client.status === 'Suspended' ? 'selected' : ''}>Suspended</option>
            <option ${client.status === 'On Hold' ? 'selected' : ''}>On Hold</option>
            <option ${client.status === 'Not Started' ? 'selected' : ''}>Not Started</option>
            <option ${client.status === 'One Off Payment' ? 'selected' : ''}>One Off Payment</option>
            <option ${client.status === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
      </td>
    `;

    const deleteBtn = row.querySelector('.delete-client');
    const select = row.querySelector('select');
    const statusSpan = row.querySelector('.status');
    const openBtn = row.querySelector('.open-services');

    // ✅ DELETE CLIENT (client.delete)
    deleteBtn.addEventListener('click', async () => {
      requirePermission('client', 'delete', async () => {
        if (!confirm('⚠️ This action cannot be undone.\nDelete client and all related services?')) return;
        try {
          await deleteClient(client.id);
          row.remove();
          alert('✅ Client Deleted Successfully');
        } catch (err) {
          console.error('❌ Delete failed', err);
          alert('❌ Failed to Delete client');
        }
      });
    });

    // ✅ STATUS CHANGE (client.edit)
    select.addEventListener('change', async () => {
      requirePermission('client', 'edit', async () => {
        const newStatus = select.value;
        statusSpan.textContent = newStatus;
        statusSpan.className = `status ${newStatus === 'Active' ? 'active' : 'inactive'}`;
        try {
          await updateClient(client.id, { status: newStatus });
        } catch (err) {
          console.error('❌ Status update failed', err);
          alert('Failed to update status');
        }
      });
    });

    // ✅ OPEN SERVICE WORKSPACE (service.view)
    openBtn.addEventListener('click', () => {
      requirePermission('service', 'view', () => {
        renderServicePage(String(client.id));
        const url = new URL(window.location.href);
        url.searchParams.set('openServicesFor', client.id);
        window.history.replaceState({}, '', url);
      });
    });

    tbody.appendChild(row);
  });
}

// =============================
// PAGINATION
// =============================
function setupPagination(clientsArr, tbody) {
  const paginationContainer = document.querySelector('.pagination');
  if (!paginationContainer) return;

  paginationContainer.innerHTML = '';

  const pager = initRowPagination({
    totalItems: clientsArr.length,
    onPageChange: (page, pageSize) => {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      renderClients(clientsArr.slice(start, end), tbody);
    },
  });

  paginationContainer.appendChild(pager);
}

// =============================
// SEARCH
// =============================
function bindClientSearch(clientsArr, tbody) {
  const searchInput = document.getElementById('clientSearch');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    const filtered = clientsArr.filter(
      (c) =>
        (`${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(q)) ||
        String(c.id).toLowerCase().includes(q)
    );
    setupPagination(filtered, tbody);
  });
}

// =============================
// ADD CLIENT
// =============================
document.getElementById('addClientBtn')?.addEventListener('click', () => {
  requirePermission('client', 'add', () => {
    window.location.href = 'addclient.html';
  });
});

// =============================
// REPORT MODAL (HTML IN JS)
// =============================
function ensureReportModal() {
  if (document.getElementById('clientReportModal')) return;

  const modal = document.createElement('div');
  modal.id = 'clientReportModal';
  modal.className = 'report-modal';

  // build field groups HTML
  let groupsHtml = '';
  for (const group of REPORT_FIELD_GROUPS) {
    const fieldsHtml = group.fields
      .map(
        (f) => `
        <label class="report-checkbox">
          <input type="checkbox" data-field-id="${f.id}" ${f.essential ? 'checked' : ''}>
          <span>${f.label}</span>
        </label>`
      )
      .join('');

    groupsHtml += `
      <div class="report-field-group">
        <h4>${group.label}</h4>
        ${fieldsHtml}
      </div>
    `;
  }

  modal.innerHTML = `
    <div class="report-modal-content">
      <div class="report-modal-header">
        <h3>Client & Service CSV Report</h3>
        <button type="button" class="report-close-btn" id="clientReportCloseBtn">&times;</button>
      </div>
      <p class="report-modal-subtitle">
        Tick the fields you want in the CSV report.  
        One row = Client + Service. Totals are calculated from statements.
      </p>

      <div class="report-grid">
        ${groupsHtml}
      </div>

      <div class="report-actions">
        <div class="report-actions-left">
          <button type="button" class="btn-secondary" id="reportSelectEssentialBtn">Essential Only</button>
          <button type="button" class="btn-secondary" id="reportSelectAllBtn">Select All</button>
          <button type="button" class="btn-ghost" id="reportClearAllBtn">Clear All</button>
        </div>
        <div class="report-actions-right">
          <button type="button" class="btn-secondary" id="reportCancelBtn">Cancel</button>
          <button type="button" class="btn-primary" id="reportDownloadBtn">Download CSV</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // close handlers
  const closeModal = () => modal.classList.remove('show');

  document.getElementById('clientReportCloseBtn')?.addEventListener('click', closeModal);
  document.getElementById('reportCancelBtn')?.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // select/clear helpers
  const getAllCheckboxes = () =>
    Array.from(modal.querySelectorAll('.report-checkbox input[type="checkbox"]'));

  document.getElementById('reportSelectEssentialBtn')?.addEventListener('click', () => {
    const map = buildFieldMap();
    for (const cb of getAllCheckboxes()) {
      const id = cb.dataset.fieldId;
      const def = map[id];
      cb.checked = !!def?.essential;
    }
  });

  document.getElementById('reportSelectAllBtn')?.addEventListener('click', () => {
    for (const cb of getAllCheckboxes()) cb.checked = true;
  });

  document.getElementById('reportClearAllBtn')?.addEventListener('click', () => {
    for (const cb of getAllCheckboxes()) cb.checked = false;
  });

  // download handler
  document.getElementById('reportDownloadBtn')?.addEventListener('click', async () => {
    try {
      await generateDynamicClientCSV();
      closeModal();
    } catch (err) {
      console.error('CSV export failed', err);
      alert('Client Report export failed');
    }
  });
}

// helper: map field id -> def
function buildFieldMap() {
  const map = {};
  for (const group of REPORT_FIELD_GROUPS) {
    for (const f of group.fields) {
      map[f.id] = f;
    }
  }
  return map;
}

// =============================
// DYNAMIC CSV GENERATION
// =============================
async function generateDynamicClientCSV() {
  // selected fields in the order of groups
  const modal = document.getElementById('clientReportModal');
  if (!modal) return;

  const fieldMap = buildFieldMap();
  const selectedFieldIds = Array.from(
    modal.querySelectorAll('.report-checkbox input[type="checkbox"]:checked')
  ).map((cb) => cb.dataset.fieldId);

  if (!selectedFieldIds.length) {
    alert('Please select at least one field for the CSV.');
    return;
  }

  // build flat ordered fieldDefs array
  const selectedFields = [];
  for (const group of REPORT_FIELD_GROUPS) {
    for (const f of group.fields) {
      if (selectedFieldIds.includes(f.id)) selectedFields.push(f);
    }
  }

  // search filter
  const searchInput = document.getElementById('clientSearch');
  const q = (searchInput?.value || '').toLowerCase().trim();

  if (!allClients.length) {
    allClients = await fetchClients();
  }

  const filteredClients = allClients.filter(
    (c) =>
      (`${c.title|| ''} ${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(q)) ||
      String(c.id).toLowerCase().includes(q)
  );

  if (!allServices) {
    allServices = await fetchAllServices();
  }

  // CSV header
  let csv = selectedFields.map((f) => safeCsvValue(f.label)).join(',') + '\n';

  // loop through clients
  for (const client of filteredClients) {
    const clientId = client.id;

    // resolve address if any address field selected
    let address = null;
    if (selectedFieldIds.some((id) => id.startsWith('addr_'))) {
      address = await getCurrentAddressForClient(clientId);
    }

    // resolve kin if any kin field selected
    let kin = null;
    if (selectedFieldIds.some((id) => id.startsWith('kin_'))) {
      kin = await getCurrentKinForClient(clientId);
    }

    const clientServices = allServices.filter(
      (s) => (s.client_id || s.clientId) === clientId
    );

    if (!clientServices.length) {
      // create one row with no service/totals
      const rowContext = {
        client,
        address,
        kin,
        service: null,
        totals: null,
      };
      const rowValues = selectedFields.map((f) => safeCsvValue(f.get(rowContext)));
      csv += rowValues.join(',') + '\n';
      continue;
    }

    // each service as a row
    for (const svc of clientServices) {
      const serviceId = svc.service_id || svc.serviceId;

      // totals
      let totals = null;
      if (selectedFieldIds.some((id) =>
        id === 'total_paid' ||
        id === 'total_remittance' ||
        id === 'balance'
      )) {
        const stmts = await fetchStatements(serviceId);
        const totalPaid = stmts.reduce((a, s) => a + (Number(s.debit) || 0), 0);
        const totalRemit = stmts.reduce((a, s) => a + (Number(s.credit) || 0), 0);
        totals = {
          totalPaid,
          totalRemit,
          balance: totalRemit - totalPaid,
        };
      }

      const rowContext = {
        client,
        address,
        kin,
        service: svc,
        totals,
      };

      const rowValues = selectedFields.map((f) => safeCsvValue(f.get(rowContext)));
      csv += rowValues.join(',') + '\n';
    }
  }

  // download CSV
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Client_Service_Report.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// =============================
// ADDRESS / KIN HELPERS FOR CSV
// =============================
async function getCurrentAddressForClient(clientId) {
  if (Object.prototype.hasOwnProperty.call(addressCache, clientId)) {
    return addressCache[clientId];
  }

  try {
    const list = (await fetchClientAddresses(clientId)) || [];
    if (!list.length) {
      addressCache[clientId] = null;
      return null;
    }

    const hasFlag = list.some((a) =>
      Object.prototype.hasOwnProperty.call(a, 'is_current')
    );
    let current = null;
    if (hasFlag) {
      current = list.find((a) => a.is_current === true) || list[0];
    } else {
      current = list[0];
    }

    const addr = {
      house_no: current.house_no || '',
      street: current.street || '',
      city: current.city || '',
      country: current.country || '',
      postcode: current.postcode || '',
    };
    addr.full = [addr.house_no, addr.street, addr.city, addr.country, addr.postcode]
      .filter(Boolean)
      .join(', ');

    addressCache[clientId] = addr;
    return addr;
  } catch (e) {
    console.warn('Failed to load address for CSV', e);
    addressCache[clientId] = null;
    return null;
  }
}

async function getCurrentKinForClient(clientId) {
  if (Object.prototype.hasOwnProperty.call(kinCache, clientId)) {
    return kinCache[clientId];
  }

  try {
    const list = (await fetchClientKins(clientId)) || [];
    if (!list.length) {
      kinCache[clientId] = null;
      return null;
    }

    const hasFlag = list.some((k) =>
      Object.prototype.hasOwnProperty.call(k, 'is_current')
    );
    let current = null;
    if (hasFlag) {
      current = list.find((k) => k.is_current === true) || list[0];
    } else {
      current = list[0];
    }

    const kin = {
      name: current.name || current.kin_name || '',
      relationship: current.relationship || current.kin_relationship || '',
      email: current.email || '',
    };

    kinCache[clientId] = kin;
    return kin;
  } catch (e) {
    console.warn('Failed to load kin for CSV', e);
    kinCache[clientId] = null;
    return null;
  }
}

// =============================
// CSV VALUE ESCAPE
// =============================
function safeCsvValue(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ------------------ BULK STATEMENT UPLOAD (CSV) ------------------
const uploadBtn = document.getElementById("uploadStatementBtn");
const fileInput = document.getElementById("statementFileInput");

if (uploadBtn && fileInput) {

  // Open file chooser ONLY IF permission exists
  uploadBtn.addEventListener("click", () => {
    requirePermission("statement", "add", () => {
      fileInput.click();
    });
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    requirePermission("statement", "add", async () => {
      try {
        const result = await uploadStatementsCSV(file);

        let msg = `✅ Upload complete\nInserted: ${result.inserted || 0}`;

        if (Array.isArray(result.duplicates) && result.duplicates.length) {
          msg += `\nSkipped duplicates: ${result.duplicates.length}`;
        }

        if (Array.isArray(result.errors) && result.errors.length) {
          msg += `\n\nErrors:\n - ${result.errors.join("\n - ")}`;
        }

        alert(msg);
      } catch (err) {
        console.error("❌ Upload failed", err);
        alert(`❌ Upload failed: ${err.message || err}`);
      } finally {
        fileInput.value = "";
      }
    });
  });
}