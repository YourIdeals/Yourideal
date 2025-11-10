// ============================================
// clientmanagement.js — with CRUD Access Control
// ============================================

import { initHeader } from './header.js';
import { fetchClients, fetchCouncilsEnabled, updateClient, deleteClient } from './api.js';
import { initRowPagination } from './row-pagination.js';
import { renderServicePage } from './Services/services.js';
import { fetchAllServices, fetchStatements } from './Services/utils/serviceApi.js';
import { enforceAccessControl, validateSession, requirePermission } from './access-control.js';

document.addEventListener('DOMContentLoaded', async () => {
  validateSession();
  await initHeader();
  enforceAccessControl();

  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '../LoginPage/LoginPage.html';
    return;
  }

  const tbody = document.getElementById('clientTableBody');
  let allClients = [];

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
});

// ------------------ RENDER TABLE ------------------
function renderClients(clients, tbody) {
  tbody.innerHTML = '';

  if (clients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No clients found</td></tr>`;
    return;
  }

  clients.forEach(client => {
    const row = document.createElement('tr');
    const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim();
    row.innerHTML = `
      <td>
        <div class="client-name">
          <img src="${client.profile_img || '../images/profile.png'}" alt="Client">
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
        if (!confirm("⚠️ This action cannot be undone.\nDelete client and all related services?")) return;
        try {
          await deleteClient(client.id);
          row.remove();
          alert("✅ Client Deleted Successfully");
        } catch (err) {
          console.error('❌ Delete failed', err);
          alert("❌ Failed to Delete client");
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

// ------------------ PAGINATION ------------------
function setupPagination(allClients, tbody) {
  const paginationContainer = document.querySelector('.pagination');
  paginationContainer.innerHTML = '';

  const pager = initRowPagination({
    totalItems: allClients.length,
    onPageChange: (page, pageSize) => {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      renderClients(allClients.slice(start, end), tbody);
    }
  });

  paginationContainer.appendChild(pager);
}

// ------------------ SEARCH ------------------
function bindClientSearch(allClients, tbody) {
  const searchInput = document.getElementById("clientSearch");
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase().trim();
    const filtered = allClients.filter(c =>
      (c.first_name + " " + c.last_name).toLowerCase().includes(q) ||
      String(c.id).toLowerCase().includes(q)
    );
    setupPagination(filtered, tbody);
  });
}

// ------------------ ADD CLIENT ------------------
document.getElementById("addClientBtn").addEventListener("click", () => {
  requirePermission('client', 'add', () => {
    window.location.href = "addclient.html";
  });
});

// ------------------ CLIENT REPORT (CSV) ------------------
document.getElementById("clientReportBtn").addEventListener("click", async () => {
  requirePermission('client', 'view', async () => {
    try {
      const search = document.getElementById("clientSearch").value.toLowerCase().trim();
      const clients = await fetchClients();
      const services = await fetchAllServices();

      const filteredClients = clients.filter(c =>
        (`${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(search)) ||
        String(c.id).toLowerCase().includes(search)
      );

      let csv = "Client Name,Client ID,Council,Status,Setup Fee,Referred By,Total Paid,Total Remittance,Balance\n";
      for (const client of filteredClients) {
        const name = `${client.first_name || ''} ${client.last_name || ''}`.trim();
        const clientServices = services.filter(s => (s.client_id || s.clientId) === client.id);
        if (clientServices.length === 0) {
          csv += `"${name}",${client.id},${client.council},${client.status || 'Active'},,,,,\n`;
          continue;
        }
        for (const svc of clientServices) {
          const serviceId = svc.service_id || svc.serviceId;
          const setupFee = svc.setup_fee || svc.setupFee || "";
          const referredBy = svc.referred_by || svc.referredBy || "";
          const stmts = await fetchStatements(serviceId);
          const totalPaid = stmts.reduce((a, s) => a + (Number(s.debit) || 0), 0);
          const totalRemit = stmts.reduce((a, s) => a + (Number(s.credit) || 0), 0);
          const balance = totalRemit - totalPaid;
          csv += `"${name}",${client.id},${client.council},${client.status || 'Active'},${setupFee},${referredBy},${totalPaid.toFixed(2)},${totalRemit.toFixed(2)},${balance.toFixed(2)}\n`;
        }
      }

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Client_Report.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export failed", err);
      alert("Client Report export failed");
    }
  });
});
