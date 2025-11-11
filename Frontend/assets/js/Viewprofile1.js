// ============================================
// Viewprofile1.js — Client Profile with CRUD Access Control
// ============================================

import { initHeader } from './header.js';
import { fetchClientById, fetchCouncilsEnabled, updateClient } from './api.js';

import {
  clientDefault,
  titleOptions,
  genderOptions,
  kinOptions,
  ethnicityOptions
} from './utils/clientschema.js';

import {
  renderDisabilitySection,
  collectDisabilityData,
  bindDisabilityEvents
} from './utils/disability.js';

import {
  renderOptionalFields,
  collectOptionalFields,
  bindOptionalFieldEvents
} from './utils/optionalfield.js';

// ✅ Access Control Imports
import { enforceAccessControl, validateSession, requirePermission } from './access-control.js';

// ============================================
// 🚀 Init
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  validateSession();
  await initHeader();
  enforceAccessControl();

  const params = new URLSearchParams(window.location.search);
  const clientId = params.get('id');
  if (!clientId) {
    alert('No client ID provided in URL');
    return;
  }

  // ✅ Only allow viewing if user has client.view permission
  requirePermission('client', 'view', async () => {
    let currentClient = structuredClone(clientDefault);
    try {
      currentClient = await fetchClientById(clientId);
      renderClientProfile(currentClient);
    } catch (err) {
      console.error('❌ Failed to fetch client:', err);
      alert('Failed to load client details.');
    }
  });
});

// =======================
// 🧱 View Mode Renderer
// =======================
function renderClientProfile(client) {
  const form = document.getElementById('clientForm');
  form.innerHTML = '';

  // Personal Information
  form.appendChild(sectionHeader('Personal Information'));
  form.appendChild(renderReadField('Title', client.title));
  form.appendChild(renderReadField('First Name', client.first_name));
  form.appendChild(renderReadField('Last Name', client.last_name));
  form.appendChild(renderReadField('Client ID', client.id));
  form.appendChild(renderReadField('DOB', client.dob));
  form.appendChild(renderReadField('Gender', client.gender));

  // 🏛️ Local Council
  form.appendChild(sectionHeader('Council Information'));
  form.appendChild(renderReadField('Local Council', client.council || '-'));

  // Contact Details
  form.appendChild(sectionHeader('Contact Details'));
  form.appendChild(renderReadField('Phone', client.phone || '-'));
  form.appendChild(renderReadField('Email', client.email || '-'));
  form.appendChild(renderReadField('Address', client.address || '-'));

  // Disability
  form.appendChild(sectionHeader('Disability Information'));
  form.appendChild(renderReadField('Disabilities', client.disabilities?.join(', ') || 'None'));

  // Kin
  form.appendChild(sectionHeader('Kin Information'));
  form.appendChild(renderReadField('Next of Kin Name', client.kin_name));
  form.appendChild(renderReadField('Kin Relationship', kinRelationLabel(client)));
  form.appendChild(renderReadField('Kin Address', client.kin_address));
  form.appendChild(renderReadField('Kin Email', client.kin_email));

  // Other
  form.appendChild(sectionHeader('Other Information'));
  form.appendChild(renderReadField('Ethnicity Type', client.ethnicity_type));
  form.appendChild(renderReadField('Ethnicity', client.ethnicity));
  form.appendChild(renderReadField('Language', client.language));

  // Optional
  form.appendChild(sectionHeader('Optional Fields'));
  if (client.optional_fields && client.optional_fields.length > 0) {
    client.optional_fields.forEach(opt => {
      form.appendChild(renderReadField(opt.name, opt.value));
    });
  } else {
    form.appendChild(renderReadField('Optional', '-'));
  }

  // Edit Button (only visible if user has edit permission)
  const btnContainer = document.querySelector('.button-group');
  btnContainer.innerHTML = '';
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'btn edit btn-client';
  editBtn.textContent = 'Edit';

  editBtn.addEventListener('click', () => {
    requirePermission('client', 'edit', () => renderEditForm(client));
  });

  btnContainer.appendChild(editBtn);
}

// =======================
// ✍️ Edit Mode Renderer
// =======================
async function renderEditForm(client) {
  const form = document.getElementById('clientForm');
  form.innerHTML = '';

  // Personal Info
  form.appendChild(sectionHeader('Personal Information'));
  form.appendChild(renderSelectField('Title', 'title', titleOptions, client.title));
  form.appendChild(renderInputField('First Name', 'first_name', client.first_name));
  form.appendChild(renderInputField('Last Name', 'last_name', client.last_name));

  // Client ID editable only when status = TBA
  const isTBA = client.status === "TBA";
  form.appendChild(renderInputField('Client ID', 'id', client.id, !isTBA));

  form.appendChild(renderInputField('DOB', 'dob', client.dob, false, 'date'));
  form.appendChild(renderSelectField('Gender', 'gender', genderOptions, client.gender));

  // 🏛️ Council dropdown
  form.appendChild(sectionHeader('Council Information'));
  const councilGroup = document.createElement('div');
  councilGroup.className = 'form-group';
  const councilLabel = document.createElement('label');
  councilLabel.textContent = 'Local Council';
  const councilSelect = document.createElement('select');
  councilSelect.id = 'councilId';

  try {
    const councils = await fetchCouncilsEnabled();
    councils.forEach(c => {
      const option = document.createElement('option');
      option.value = c.id;
      option.textContent = c.name;
      if (client.councilId === c.id) option.selected = true;
      councilSelect.appendChild(option);
    });
  } catch (err) {
    console.error('❌ Failed to fetch councils', err);
  }

  councilGroup.append(councilLabel, councilSelect);
  form.appendChild(councilGroup);

  // Contact Details
  form.appendChild(sectionHeader('Contact Details'));
  form.appendChild(renderInputField('Phone', 'phone', client.phone));
  form.appendChild(renderInputField('Email', 'email', client.email));
  form.appendChild(renderInputField('Address', 'address', client.address));

  // Disability
  form.appendChild(sectionHeader('Disability Information'));
  const disabilityWrapper = document.createElement('div');
  disabilityWrapper.innerHTML = renderDisabilitySection(client.disabilities);
  form.appendChild(disabilityWrapper);
  bindDisabilityEvents();

  // Kin
  form.appendChild(sectionHeader('Kin Information'));
  form.appendChild(renderInputField('Next of Kin Name', 'kin_name', client.kin_name));
  form.appendChild(renderSelectField('Kin Relationship', 'kin_relation', kinOptions, client.kin_relation));
  form.appendChild(renderInputField('Kin Relation Other', 'kin_relation_other', client.kin_relation_other));
  form.appendChild(renderInputField('Kin Address', 'kin_address', client.kin_address));
  form.appendChild(renderInputField('Kin Email', 'kin_email', client.kin_email));

  // Ethnicity
  form.appendChild(sectionHeader('Other Information'));
  const ethTypeField = renderSelectField('Ethnicity Type', 'ethnicity_type', Object.keys(ethnicityOptions), client.ethnicity_type);
  const ethField = renderSelectField('Ethnicity', 'ethnicity', ethnicityOptions[client.ethnicity_type] || [], client.ethnicity);
  form.appendChild(ethTypeField);
  form.appendChild(ethField);
  ethTypeField.querySelector('select').addEventListener('change', (e) => {
    populateEthnicityOptions(e.target.value, "");
  });

  form.appendChild(renderInputField('Language', 'language', client.language));

  // Optional Fields
  form.appendChild(sectionHeader('Optional Fields'));
  const optionalWrapper = document.createElement('div');
  optionalWrapper.innerHTML = renderOptionalFields(client.optional_fields || [], true);
  form.appendChild(optionalWrapper);
  bindOptionalFieldEvents();

  // Buttons
  const btnContainer = document.querySelector('.button-group');
  btnContainer.innerHTML = `
    <button type="button" class="btn save btn-client" id="saveBtn">Save</button>
    <button type="button" class="btn edit" id="cancelBtn">Cancel</button>
  `;

  document.getElementById('saveBtn').addEventListener('click', () => {
    requirePermission('client', 'edit', async () => await saveClientEdits(client));
  });

  document.getElementById('cancelBtn').addEventListener('click', () => renderClientProfile(client));
}

// =======================
// 💾 Save Edits
// =======================
async function saveClientEdits(originalClient) {
  const updated = {
    title: getValue('title'),
    first_name: getValue('first_name'),
    last_name: getValue('last_name'),
    id: getValue('id'),
    dob: getValue('dob'),
    gender: getValue('gender'),
    councilId: parseInt(getValue('councilId')),
    phone: getValue('phone'),
    email: getValue('email'),
    address: getValue('address'),
    kin_name: getValue('kin_name'),
    kin_relation: getValue('kin_relation'),
    kin_relation_other: getValue('kin_relation_other'),
    kin_address: getValue('kin_address'),
    kin_email: getValue('kin_email'),
    ethnicity_type: getValue('ethnicity_type'),
    ethnicity: getValue('ethnicity'),
    language: getValue('language'),
    disabilities: collectDisabilityData(),
    optional_fields: collectOptionalFields()
  };

  if (originalClient.status !== 'TBA' && originalClient.id !== updated.id) {
    alert("❌ Client ID can only be edited when status is TBA.");
    return;
  }

  try {
    const result = await updateClient(originalClient.id, updated);
    renderClientProfile(result.client);
    alert('✅ Client updated successfully');
  } catch (err) {
    console.error('❌ Failed to update client:', err);
    alert(err?.message || 'Failed to update client');
  }
}

// =======================
// 🧰 Helpers
// =======================
function sectionHeader(text) {
  const h = document.createElement('div');
  h.className = 'section-header';
  h.textContent = text;
  return h;
}

function renderReadField(label, value) {
  const div = document.createElement('div');
  div.className = 'form-group';
  div.innerHTML = `<label>${label}</label><span>${value || '-'}</span>`;
  return div;
}

function renderInputField(label, id, value, readonly = false, type = 'text') {
  const div = document.createElement('div');
  div.className = 'form-group';
  const lbl = document.createElement('label');
  lbl.textContent = label;
  const input = document.createElement('input');
  input.type = type;
  input.id = id;
  input.value = value || '';
  if (readonly) input.setAttribute('readonly', 'readonly');
  div.append(lbl, input);
  return div;
}

function renderSelectField(label, id, options, selectedValue) {
  const div = document.createElement('div');
  div.className = 'form-group';
  const lbl = document.createElement('label');
  lbl.textContent = label;
  const select = document.createElement('select');
  select.id = id;
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    if (opt === selectedValue) option.selected = true;
    select.appendChild(option);
  });
  div.append(lbl, select);
  return div;
}

function populateEthnicityOptions(type, selectedValue) {
  const ethnicitySelect = document.getElementById('ethnicity');
  ethnicitySelect.innerHTML = '';
  if (ethnicityOptions[type]) {
    ethnicityOptions[type].forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (opt === selectedValue) option.selected = true;
      ethnicitySelect.appendChild(option);
    });
  }
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function kinRelationLabel(client) {
  if (client.kin_relation === 'Other' && client.kin_relation_other) {
    return `${client.kin_relation} (${client.kin_relation_other})`;
  }
  return client.kin_relation || '-';
}
