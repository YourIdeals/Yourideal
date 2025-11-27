// ============================================
// Viewprofile1.js — Client Profile (view + full edit)
// - Inline Address / Kin history in their sections
// - Single Save button updates client + current address + current kin
// ============================================

import { initHeader } from "./header.js";

import {
  fetchClientById,
  fetchCouncilsEnabled,
  updateClient,

  fetchClientAddresses,
  addClientAddress,
  updateClientAddress,

  fetchClientKins,
  addClientKin,
  updateClientKin,

  downloadAddressCSV,
  downloadKinCSV,
} from "./api.js";

import {
  clientDefault,
  titleOptions,
  genderOptions,
  kinOptions,
  ethnicityOptions,
} from "./utils/clientschema.js";

import {
  renderDisabilitySection,
  collectDisabilityData,
  bindDisabilityEvents,
} from "./utils/disability.js";

import {
  renderOptionalFields,
  collectOptionalFields,
  bindOptionalFieldEvents,
} from "./utils/optionalfield.js";

import {
  enforceAccessControl,
  validateSession,
  requirePermission,
} from "./access-control.js";

// ============================================
// GLOBAL STATE
// ============================================

let CURRENT_CLIENT_ID = null;
let CURRENT_CLIENT = null;

let CURRENT_ADDRESS = null;   // object or null
let ADDRESS_HISTORY = [];     // array of past addresses

let CURRENT_KIN = null;       // object or null
let KIN_HISTORY = [];         // array of past kins

// ============================================
// FIX: prevent dummy <a href="#"> reloads
// ============================================
document.addEventListener("click", function (e) {
  const a = e.target.closest("a");
  if (!a) return;

  const href = a.getAttribute("href");
  if (!href || href === "#" || href.trim() === "") {
    e.preventDefault();
  }
});

// ============================================
// INITIALISE PAGE
// ============================================
document.addEventListener("DOMContentLoaded", async () => {
  validateSession();
  await initHeader();
  enforceAccessControl();

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    alert("Client ID missing");
    return;
  }

  CURRENT_CLIENT_ID = id;

  requirePermission("client", "view", async () => {
    await reloadProfile(id);
  });
});

// ============================================
// LOAD CLIENT + ADDRESS + KIN
// ============================================
async function reloadProfile(clientId) {
  let client = structuredClone(clientDefault);

  CURRENT_ADDRESS = null;
  ADDRESS_HISTORY = [];
  CURRENT_KIN = null;
  KIN_HISTORY = [];

  // ---- CLIENT ----
  try {
    client = await fetchClientById(clientId);
  } catch (err) {
    console.error("Failed to load client", err);
    return;
  }
  CURRENT_CLIENT = client;

  // ---- ADDRESSES ----
  try {
    const addrList = (await fetchClientAddresses(clientId)) || [];

    // Prefer explicit is_current, but fall back to first record as current
    const hasFlag = addrList.some((a) => Object.prototype.hasOwnProperty.call(a, "is_current"));

    if (hasFlag) {
      CURRENT_ADDRESS = addrList.find((a) => a.is_current === true) || null;
      ADDRESS_HISTORY = addrList.filter((a) => a.is_current === false);
    } else {
      CURRENT_ADDRESS = addrList[0] || null;
      ADDRESS_HISTORY = addrList.slice(1);
    }
  } catch (err) {
    console.warn("Failed to load address history", err);
  }

  // ---- KINS ----
  try {
    const kinList = (await fetchClientKins(clientId)) || [];

    const hasFlagKin = kinList.some((k) => Object.prototype.hasOwnProperty.call(k, "is_current"));

    if (hasFlagKin) {
      CURRENT_KIN = kinList.find((k) => k.is_current === true) || null;
      KIN_HISTORY = kinList.filter((k) => k.is_current === false);
    } else {
      CURRENT_KIN = kinList[0] || null;
      KIN_HISTORY = kinList.slice(1);
    }
  } catch (err) {
    console.warn("Failed to load kin history", err);
  }

  renderViewMode();
}

// ============================================
// VIEW MODE RENDER
// ============================================
function renderViewMode() {
  const client = CURRENT_CLIENT;
  const form = document.getElementById("clientForm");
  if (!form) return;
  form.innerHTML = "";

  // ========= PERSONAL =========
  form.appendChild(section("Personal Information"));
  form.appendChild(read("Title", client.title));
  form.appendChild(read("First Name", client.first_name));
  form.appendChild(read("Last Name", client.last_name));
  form.appendChild(read("Client ID", client.id));
  form.appendChild(read("DOB", client.dob));
  form.appendChild(read("Gender", client.gender));

  // ========= COUNCIL =========
  form.appendChild(section("Council Information"));
  form.appendChild(read("Local Council", client.council || "-"));

  // ========= CONTACT =========
  form.appendChild(section("Contact Details"));
  form.appendChild(read("Phone", client.phone));
  form.appendChild(read("Email", client.email));

  // ========= ADDRESS (current + history + CSV) =========
  form.appendChild(section("Client Address"));

  const addrText = CURRENT_ADDRESS ? formatAddress(CURRENT_ADDRESS) : "-";
  form.appendChild(read("Current Address", addrText));

  const addrBtns = document.createElement("div");
  addrBtns.className = "form-group";
  addrBtns.innerHTML = `
    <button type="button" class="btn btn-small btn-client" id="addAddrBtn">+ Add Address</button>
    <button type="button" class="btn btn-small" id="addrHistoryBtn">View History</button>
    <button type="button" class="btn btn-small" id="addrCSVBtn">Download CSV</button>
  `;
  form.appendChild(addrBtns);

  const addrHistoryPanel = document.createElement("div");
  addrHistoryPanel.id = "addressHistoryPanel";
  addrHistoryPanel.className = "form-group";
  addrHistoryPanel.innerHTML = `<label>Address History</label>${renderAddressHistoryList(
    ADDRESS_HISTORY
  )}`;
  form.appendChild(addrHistoryPanel);

  // container for inline add form
  form.appendChild(div("addressEditContainer"));

  // Wire address buttons safely
  const addAddrBtn = document.getElementById("addAddrBtn");
  if (addAddrBtn) {
    addAddrBtn.onclick = (e) => {
      e.preventDefault();
      requirePermission("client", "edit", () => showAddressInlineForm());
    };
  }

  const addrHistoryBtn = document.getElementById("addrHistoryBtn");
  if (addrHistoryBtn) {
    addrHistoryBtn.onclick = (e) => {
      e.preventDefault();
      document
        .getElementById("addressHistoryPanel")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
  }

  const addrCSVBtn = document.getElementById("addrCSVBtn");
  if (addrCSVBtn) {
    addrCSVBtn.onclick = async (e) => {
      e.preventDefault();
      await triggerAddressCSV(CURRENT_CLIENT_ID);
    };
  }

  // ========= DISABILITY =========
  form.appendChild(section("Disability Information"));
  form.appendChild(
    read("Disabilities", client.disabilities?.join(", ") || "-")
  );

  // ========= KIN (current + history + CSV) =========
  form.appendChild(section("Next of Kin"));

  const kinName = CURRENT_KIN?.name || CURRENT_KIN?.kin_name || "-";
  const kinRel = CURRENT_KIN?.relationship || CURRENT_KIN?.kin_relationship || "-";
  const kinAddr = CURRENT_KIN ? formatAddress(CURRENT_KIN) : "-";
  const kinEmail = CURRENT_KIN?.email || "-";

  form.appendChild(read("Name", kinName));
  form.appendChild(read("Relationship", kinRel));
  form.appendChild(read("Address", kinAddr));
  form.appendChild(read("Email", kinEmail));

  const kinBtns = document.createElement("div");
  kinBtns.className = "form-group";
  kinBtns.innerHTML = `
    <button type="button" class="btn btn-small btn-client" id="addKinBtn">+ Add Next of Kin</button>
    <button type="button" class="btn btn-small" id="kinHistoryBtn">View History</button>
    <button type="button" class="btn btn-small" id="kinCSVBtn">Download CSV</button>
  `;
  form.appendChild(kinBtns);

  const kinHistoryPanel = document.createElement("div");
  kinHistoryPanel.id = "kinHistoryPanel";
  kinHistoryPanel.className = "form-group";
  kinHistoryPanel.innerHTML = `<label>Next of Kin History</label>${renderKinHistoryList(
    KIN_HISTORY
  )}`;
  form.appendChild(kinHistoryPanel);

  form.appendChild(div("kinEditContainer"));

  const addKinBtn = document.getElementById("addKinBtn");
  if (addKinBtn) {
    addKinBtn.onclick = (e) => {
      e.preventDefault();
      requirePermission("client", "edit", () => showKinInlineForm());
    };
  }

  const kinHistoryBtn = document.getElementById("kinHistoryBtn");
  if (kinHistoryBtn) {
    kinHistoryBtn.onclick = (e) => {
      e.preventDefault();
      document
        .getElementById("kinHistoryPanel")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
  }

  const kinCSVBtn = document.getElementById("kinCSVBtn");
  if (kinCSVBtn) {
    kinCSVBtn.onclick = async (e) => {
      e.preventDefault();
      await triggerKinCSV(CURRENT_CLIENT_ID);
    };
  }

  // ========= OTHER =========
  form.appendChild(section("Other Information"));
  form.appendChild(read("Ethnicity Type", client.ethnicity_type));
  form.appendChild(read("Ethnicity", client.ethnicity));
  form.appendChild(read("Language", client.language));

  // ========= OPTIONAL =========
  form.appendChild(section("Optional Fields"));
  if (client.optional_fields?.length) {
    client.optional_fields.forEach((o) =>
      form.appendChild(read(o.name, o.value))
    );
  } else {
    form.appendChild(read("Optional", "-"));
  }

  // ========= BUTTONS =========
  const btnBox = document.querySelector(".button-group");
  if (btnBox) {
    btnBox.innerHTML = `<button type="button" class="btn btn-client edit" id="editBtn">Edit</button>`;
    const editBtn = document.getElementById("editBtn");
    if (editBtn) {
      editBtn.onclick = (e) => {
        e.preventDefault();
        requirePermission("client", "edit", () => renderEditMode());
      };
    }
  }
}

// ============================================
// INLINE ADD-ONLY FOR ADDRESS (in VIEW mode)
// ============================================
function showAddressInlineForm() {
  const c = document.getElementById("addressEditContainer");
  if (!c) return;

  c.innerHTML = `
    <div class="section-header">Add New Address</div>
    ${field("House Number", "addr_house_new")}
    ${field("Street Name", "addr_street_new")}
    ${field("City", "addr_city_new")}
    ${field("Country", "addr_country_new")}
    ${field("Postcode", "addr_postcode_new")}
    <button type="button" class="btn btn-client save" id="saveAddrNew">Save</button>
    <button type="button" class="btn edit" id="cancelAddrNew">Cancel</button>
  `;

  const cancelBtn = document.getElementById("cancelAddrNew");
  if (cancelBtn) {
    cancelBtn.onclick = (e) => {
      e.preventDefault();
      c.innerHTML = "";
    };
  }

  const saveBtn = document.getElementById("saveAddrNew");
  if (saveBtn) {
    saveBtn.onclick = async (e) => {
      e.preventDefault();

      const payload = {
        house_number: val("addr_house_new"),
        street_name: val("addr_street_new"),
        city: val("addr_city_new"),
        country: val("addr_country_new"),
        postcode: val("addr_postcode_new"),
      };

      try {
        await addClientAddress(CURRENT_CLIENT_ID, payload);
        alert("Address added");
        await reloadProfile(CURRENT_CLIENT_ID);
      } catch (err) {
        console.error(err);
        alert("Failed to add address");
      }
    };
  }
}

// ============================================
// INLINE ADD-ONLY FOR KIN (in VIEW mode)
// ============================================
function showKinInlineForm() {
  const c = document.getElementById("kinEditContainer");
  if (!c) return;

  c.innerHTML = `
    <div class="section-header">Add New Next of Kin</div>
    ${field("Name", "kin_name_new")}
    <div class="form-group">
      <label>Relationship</label>
      <select id="kin_rel_new">
        <option value="">Select</option>
        ${kinOptions.map((k) => `<option>${k}</option>`).join("")}
        <option value="Other">Other</option>
      </select>
    </div>
    ${field("Other Relationship", "kin_other_new", "display:none;")}
    ${field("House Number", "kin_house_new")}
    ${field("Street Name", "kin_street_new")}
    ${field("City", "kin_city_new")}
    ${field("Country", "kin_country_new")}
    ${field("Postcode", "kin_postcode_new")}
    ${field("Email", "kin_email_new")}
    <button type="button" class="btn btn-client save" id="saveKinNew">Save</button>
    <button type="button" class="btn edit" id="cancelKinNew">Cancel</button>
  `;

  const rel = document.getElementById("kin_rel_new");
  const otherWrapper = document.getElementById("kin_other_new")?.parentElement;

  if (rel && otherWrapper) {
    rel.onchange = () => {
      otherWrapper.style.display = rel.value === "Other" ? "block" : "none";
    };
  }

  const cancelBtn = document.getElementById("cancelKinNew");
  if (cancelBtn) {
    cancelBtn.onclick = (e) => {
      e.preventDefault();
      c.innerHTML = "";
    };
  }

  const saveBtn = document.getElementById("saveKinNew");
  if (saveBtn) {
    saveBtn.onclick = async (e) => {
      e.preventDefault();

      let relation = val("kin_rel_new");
      if (relation === "Other") {
        if (!val("kin_other_new")) {
          alert("Enter relationship");
          return;
        }
        relation = val("kin_other_new");
      }

      const payload = {
        name: val("kin_name_new"),
        relationship: relation,
        house_number: val("kin_house_new"),
        street_name: val("kin_street_new"),
        city: val("kin_city_new"),
        country: val("kin_country_new"),
        postcode: val("kin_postcode_new"),
        email: val("kin_email_new"),
      };

      try {
        await addClientKin(CURRENT_CLIENT_ID, payload);
        alert("Next of Kin added");
        await reloadProfile(CURRENT_CLIENT_ID);
      } catch (err) {
        console.error(err);
        alert("Failed to add next of kin");
      }
    };
  }
}

// ============================================
// EDIT MODE (client + CURRENT address + CURRENT kin)
// ============================================
async function renderEditMode() {
  const client = CURRENT_CLIENT;
  const form = document.getElementById("clientForm");
  if (!form) return;
  form.innerHTML = "";

  // ---- PERSONAL
  form.appendChild(section("Personal Information"));
  form.appendChild(select("Title", "title", titleOptions, client.title));
  form.appendChild(input("First Name", "first_name", client.first_name));
  form.appendChild(input("Last Name", "last_name", client.last_name));

  const readonlyId = client.status !== "TBA";
  form.appendChild(input("Client ID", "id", client.id, readonlyId));
  form.appendChild(input("DOB", "dob", client.dob, false, "date"));
  form.appendChild(select("Gender", "gender", genderOptions, client.gender));

  // ---- COUNCIL
  form.appendChild(section("Council Information"));
  const cg = document.createElement("div");
  cg.className = "form-group";
  cg.innerHTML = `<label>Local Council</label><select id="councilId"></select>`;
  form.appendChild(cg);

  try {
    const councils = await fetchCouncilsEnabled();
    const sel = document.getElementById("councilId");
    if (sel) {
      councils.forEach((c) => {
        const op = document.createElement("option");
        op.value = c.id;
        op.textContent = c.name;
        if (c.id === client.councilId) op.selected = true;
        sel.appendChild(op);
      });
    }
  } catch (err) {
    console.warn("Failed to load councils", err);
  }

  // ---- CONTACT
  form.appendChild(section("Contact Details"));
  form.appendChild(input("Phone", "phone", client.phone));
  form.appendChild(input("Email", "email", client.email));

  // ---- ADDRESS (current editable + history inline)
  form.appendChild(section("Current Address (Editable)"));

  const addr = CURRENT_ADDRESS || {};
  form.appendChild(
    input("House Number", "addr_house_edit", addr.house_number || addr.house_no || "")
  );
  form.appendChild(
    input("Street Name", "addr_street_edit", addr.street_name || addr.street || "")
  );
  form.appendChild(input("City", "addr_city_edit", addr.city || ""));
  form.appendChild(input("Country", "addr_country_edit", addr.country || ""));
  form.appendChild(input("Postcode", "addr_postcode_edit", addr.postcode || ""));

  const addrHistoryPanel = document.createElement("div");
  addrHistoryPanel.id = "addressHistoryPanel";
  addrHistoryPanel.className = "form-group";
  addrHistoryPanel.innerHTML = `<label>Address History</label>${renderAddressHistoryList(
    ADDRESS_HISTORY
  )}`;
  form.appendChild(addrHistoryPanel);

  // ---- DISABILITY
  form.appendChild(section("Disability Information"));
  const dis = document.createElement("div");
  dis.innerHTML = renderDisabilitySection(client.disabilities);
  form.appendChild(dis);
  bindDisabilityEvents();

  // ---- KIN (current editable + history inline)
  form.appendChild(section("Next of Kin (Editable Current)"));

  const kin = CURRENT_KIN || {};
  const kinName = kin.name || kin.kin_name || "";
  const kinRel = kin.relationship || kin.kin_relationship || "";

  form.appendChild(input("Name", "kin_name_edit", kinName));

  const kinRelGroup = document.createElement("div");
  kinRelGroup.className = "form-group";
  kinRelGroup.innerHTML = `
    <label>Relationship</label>
    <select id="kin_rel_edit">
      <option value="">Select</option>
      ${kinOptions.map((k) => `<option>${k}</option>`).join("")}
    </select>
  `;
  form.appendChild(kinRelGroup);

  const kinRelSelect = document.getElementById("kin_rel_edit");
  if (kinRelSelect) {
    if (kinRel && kinOptions.includes(kinRel)) {
      kinRelSelect.value = kinRel;
    } else if (kinRel) {
      kinRelSelect.value = "Other";
    }
  }

  form.appendChild(
    input(
      "Other Relationship",
      "kin_other_edit",
      kinRel && !kinOptions.includes(kinRel) ? kinRel : "",
      false
    )
  );

  form.appendChild(
    input(
      "House Number",
      "kin_house_edit",
      kin.house_number || kin.house_no || ""
    )
  );
  form.appendChild(
    input(
      "Street Name",
      "kin_street_edit",
      kin.street_name || kin.street || ""
    )
  );
  form.appendChild(input("City", "kin_city_edit", kin.city || ""));
  form.appendChild(input("Country", "kin_country_edit", kin.country || ""));
  form.appendChild(input("Postcode", "kin_postcode_edit", kin.postcode || ""));
  form.appendChild(input("Email", "kin_email_edit", kin.email || ""));

  const kinHistoryPanel = document.createElement("div");
  kinHistoryPanel.id = "kinHistoryPanel";
  kinHistoryPanel.className = "form-group";
  kinHistoryPanel.innerHTML = `<label>Next of Kin History</label>${renderKinHistoryList(
    KIN_HISTORY
  )}`;
  form.appendChild(kinHistoryPanel);

  // ---- OTHER INFO
  form.appendChild(section("Other Information"));
  form.appendChild(
    select(
      "Ethnicity Type",
      "ethnicity_type",
      Object.keys(ethnicityOptions),
      client.ethnicity_type
    )
  );
  form.appendChild(
    select(
      "Ethnicity",
      "ethnicity",
      ethnicityOptions[client.ethnicity_type] || [],
      client.ethnicity
    )
  );
  form.appendChild(input("Language", "language", client.language));

  // ---- OPTIONAL
  form.appendChild(section("Optional Fields"));
  const opt = document.createElement("div");
  opt.innerHTML = renderOptionalFields(client.optional_fields || [], true);
  form.appendChild(opt);
  bindOptionalFieldEvents();

  // ---- BUTTONS
  const btn = document.querySelector(".button-group");
  if (btn) {
    btn.innerHTML = `
      <button type="button" class="btn btn-client save" id="saveEdits">Save</button>
      <button type="button" class="btn edit" id="cancelEdits">Cancel</button>
    `;
  }

  const cancelBtn = document.getElementById("cancelEdits");
  if (cancelBtn) {
    cancelBtn.onclick = async (e) => {
      e.preventDefault();
      await reloadProfile(CURRENT_CLIENT_ID);
    };
  }

  const saveBtn = document.getElementById("saveEdits");
  if (saveBtn) {
    saveBtn.onclick = async (e) => {
      e.preventDefault();
      try {
        // CLIENT core
        const clientUpdate = {
          title: val("title"),
          first_name: val("first_name"),
          last_name: val("last_name"),
          id: val("id"),
          dob: val("dob"),
          gender: val("gender"),
          councilId: parseInt(val("councilId")),
          phone: val("phone"),
          email: val("email"),
          ethnicity_type: val("ethnicity_type"),
          ethnicity: val("ethnicity"),
          language: val("language"),
          disabilities: collectDisabilityData(),
          optional_fields: collectOptionalFields(),
        };

        await updateClient(CURRENT_CLIENT_ID, clientUpdate);

        // ADDRESS (current)
        const addrPayload = {
          house_number: val("addr_house_edit"),
          street_name: val("addr_street_edit"),
          city: val("addr_city_edit"),
          country: val("addr_country_edit"),
          postcode: val("addr_postcode_edit"),
        };
        const hasAddrData = Object.values(addrPayload).some((v) => v);

        if (hasAddrData) {
          if (CURRENT_ADDRESS && CURRENT_ADDRESS.id && updateClientAddress) {
            // update existing current address
            await updateClientAddress(
              CURRENT_CLIENT_ID,
              CURRENT_ADDRESS.id,
              addrPayload
            );
          } else if (addClientAddress) {
            // no current address -> create first one (backend will mark as current)
            await addClientAddress(CURRENT_CLIENT_ID, addrPayload);
          }
        }

        // KIN (current)
        let relVal = val("kin_rel_edit");
        const otherRel = val("kin_other_edit");
        if (relVal === "Other" && otherRel) {
          relVal = otherRel;
        } else if (!relVal && otherRel) {
          relVal = otherRel;
        }

        const kinPayload = {
          name: val("kin_name_edit"),
          relationship: relVal,
          house_number: val("kin_house_edit"),
          street_name: val("kin_street_edit"),
          city: val("kin_city_edit"),
          country: val("kin_country_edit"),
          postcode: val("kin_postcode_edit"),
          email: val("kin_email_edit"),
        };
        const hasKinData = Object.values(kinPayload).some((v) => v);

        if (hasKinData) {
          if (CURRENT_KIN && CURRENT_KIN.id && updateClientKin) {
            await updateClientKin(
              CURRENT_CLIENT_ID,
              CURRENT_KIN.id,
              kinPayload
            );
          } else if (addClientKin) {
            await addClientKin(CURRENT_CLIENT_ID, kinPayload);
          }
        }

        alert("Client updated");
        await reloadProfile(CURRENT_CLIENT_ID);
      } catch (err) {
        console.error(err);
        alert("Failed to save changes");
      }
    };
  }
}

// ============================================
// CSV DOWNLOAD HELPERS
// ============================================
async function triggerAddressCSV(clientId) {
  try {
    const blob = await downloadAddressCSV(clientId);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `client_${clientId}_address_history.csv`;
    a.click();
  } catch (err) {
    console.error(err);
    alert("Failed to download address CSV");
  }
}

async function triggerKinCSV(clientId) {
  try {
    const blob = await downloadKinCSV(clientId);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `client_${clientId}_kin_history.csv`;
    a.click();
  } catch (err) {
    console.error(err);
    alert("Failed to download kin CSV");
  }
}

// ============================================
// SMALL HELPERS
// ============================================
function section(t) {
  const d = document.createElement("div");
  d.className = "section-header";
  d.textContent = t;
  return d;
}

function read(label, value) {
  const d = document.createElement("div");
  d.className = "form-group";
  d.innerHTML = `<label>${label}</label><span>${value || "-"}</span>`;
  return d;
}

function input(label, id, value, readonly = false, type = "text") {
  const d = document.createElement("div");
  d.className = "form-group";
  d.innerHTML = `
    <label>${label}</label>
    <input id="${id}" type="${type}" value="${value || ""}" ${
    readonly ? "readonly" : ""
  }>
  `;
  return d;
}

function select(label, id, list, valSelected) {
  const d = document.createElement("div");
  d.className = "form-group";
  d.innerHTML = `
    <label>${label}</label>
    <select id="${id}">
      ${list
        .map(
          (o) =>
            `<option ${
              o === valSelected ? "selected" : ""
            } value="${o}">${o}</option>`
        )
        .join("")}
    </select>
  `;
  return d;
}

function field(label, id, extra = "") {
  return `
    <div class="form-group" style="${extra}">
      <label>${label}</label>
      <input id="${id}">
    </div>
  `;
}

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function div(id) {
  const d = document.createElement("div");
  d.id = id;
  return d;
}

function formatAddress(a) {
  if (!a) return "";
  const parts = [];
  const hn = a.house_number || a.house_no;
  const st = a.street_name || a.street;
  if (hn) parts.push(hn);
  if (st) parts.push(st);
  if (a.city) parts.push(a.city);
  if (a.country) parts.push(a.country);
  if (a.postcode) parts.push(a.postcode);
  return parts.join(", ");
}

function renderAddressHistoryList(list) {
  if (!list || !list.length) return "<div><em>No address history.</em></div>";
  const items = list
    .map((a) => `<li>${formatAddress(a)}</li>`)
    .join("");
  return `<ul>${items}</ul>`;
}

function renderKinHistoryList(list) {
  if (!list || !list.length) return "<div><em>No next of kin history.</em></div>";
  const items = list
    .map((k) => {
      const nm = k.name || k.kin_name || "";
      const rel = k.relationship || k.kin_relationship || "";
      return `<li>${nm || "-"} — ${rel || "-"}</li>`;
    })
    .join("");
  return `<ul>${items}</ul>`;
}