// assets/js/Services/utils/serviceFields.js

// Main
export function renderServiceFields(setupFeeType, data = {}, isView = false) {
  const d = normalize(data);
  switch (setupFeeType) {
    case "Managed Account Setup Cost":
      return isView ? managedAccountView(d) : managedAccountEdit(d);

    case "Payroll Setup Cost":
      return isView ? payrollView(d) : payrollEdit(d);

    case "Managed Account and Payroll Setup Cost":
      return isView ? managedAccountPayrollView(d) : managedAccountPayrollEdit(d);

    default:
      return `<div><span>No setup fields for this type.</span></div>`;
  }
}

// normalize fee fields so view/edit never shows 0 when value exists
function normalize(s = {}) {
  const p = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);
  return {
    ...s,
    monthlyFee: p(s.monthlyFee),
    initialFee: p(s.initialFee),
    pensionFee: p(s.pensionFee),
    pensionSetup: p(s.pensionSetup),
    annualFee: p(s.annualFee),
    yearEndFee: p(s.yearEndFee),
    carerBudget: p(s.carerBudget),
    agencyBudget: p(s.agencyBudget),
    carers: Array.isArray(s.carers) ? s.carers : [],
    agency: Array.isArray(s.agency) ? s.agency : [],
    pa: Array.isArray(s.pa) ? s.pa : [],
  };
}

// ================================
// EDIT
// ================================
function managedAccountEdit(d) {
  return `
    ${feeInput("Monthly Fee", "monthlyFee", d.monthlyFee)}
    ${feeInput("Initial Fee", "initialFee", d.initialFee)}

    ${feeInput("Weekly Agency Budget", "agencyBudget", d.agencyBudget)}
    ${calcMonthlyBudget("Agency", d.agencyBudget)}

    ${dynamicGroup("Agency", "agency-name", d.agency)}
    ${dynamicGroup("Self Employed PA", "pa-name", d.pa)}
  `;
}

function payrollEdit(d) {
  return `
    ${feeInput("Monthly Fee", "monthlyFee", d.monthlyFee)}
    ${feeInput("Initial Fee", "initialFee", d.initialFee)}

    ${feeInput("Weekly Budget for Carer", "carerBudget", d.carerBudget)}
    ${calcMonthlyBudget("Carer", d.carerBudget)}

    ${feeInput("Annual Pension Fee", "pensionFee", d.pensionFee)}
    ${feeInput("Annual Year End Fee", "yearEndFee", d.yearEndFee)}
    ${feeInput("Pension Setup Cost", "pensionSetup", d.pensionSetup)}

    ${dynamicGroup("Carers", "carer-name", d.carers)}
    ${dynamicGroup("Self Employed PA", "pa-name", d.pa)}
  `;
}

function managedAccountPayrollEdit(d) {
  return `
    ${feeInput("Monthly Fee", "monthlyFee", d.monthlyFee)}
    ${feeInput("Initial Fee", "initialFee", d.initialFee)}

    ${feeInput("Weekly Budget for Carer", "carerBudget", d.carerBudget)}
    ${calcMonthlyBudget("Carer", d.carerBudget)}

    ${feeInput("Weekly Agency Budget", "agencyBudget", d.agencyBudget)}
    ${calcMonthlyBudget("Agency", d.agencyBudget)}

    ${feeInput("Annual Pension Fee", "pensionFee", d.pensionFee)}
    ${feeInput("Annual Fee", "annualFee", d.annualFee)}
    ${feeInput("Annual Year End Fee", "yearEndFee", d.yearEndFee)}
    ${feeInput("Pension Setup Cost", "pensionSetup", d.pensionSetup)}

    ${dynamicGroup("Carers", "carer-name", d.carers)}
    ${dynamicGroup("Agency", "agency-name", d.agency)}
    ${dynamicGroup("Self Employed PA", "pa-name", d.pa)}
  `;
}

// ================================
// VIEW
// ================================
function managedAccountView(d) {
  return `
    ${viewRow("Monthly Fee", d.monthlyFee)}
    ${viewRow("Initial Fee", d.initialFee)}

    ${viewRow("Weekly Agency Budget", d.agencyBudget)}
    ${viewRow("Agency Monthly Budget", (d.agencyBudget || 0) * 4)}

    ${viewGroup("Agency", d.agency)}
    ${viewGroup("Self Employed PA", d.pa)}
  `;
}

function payrollView(d) {
  return `
    ${viewRow("Monthly Fee", d.monthlyFee)}
    ${viewRow("Initial Fee", d.initialFee)}

    ${viewRow("Weekly Budget for Carer", d.carerBudget)}
    ${viewRow("Carer Monthly Budget", (d.carerBudget || 0) * 4)}

    ${viewRow("Annual Pension Fee", d.pensionFee)}
    ${viewRow("Annual Year End Fee", d.yearEndFee)}
    ${viewRow("Pension Setup Cost", d.pensionSetup)}

    ${viewGroup("Carers", d.carers)}
    ${viewGroup("Self Employed PA", d.pa)}
  `;
}

function managedAccountPayrollView(d) {
  return `
    ${viewRow("Monthly Fee", d.monthlyFee)}
    ${viewRow("Initial Fee", d.initialFee)}

    ${viewRow("Weekly Budget for Carer", d.carerBudget)}
    ${viewRow("Carer Monthly Budget", (d.carerBudget || 0) * 4)}

    ${viewRow("Weekly Agency Budget", d.agencyBudget)}
    ${viewRow("Agency Monthly Budget", (d.agencyBudget || 0) * 4)}

    ${viewRow("Annual Pension Fee", d.pensionFee)}
    ${viewRow("Annual Fee", d.annualFee)}
    ${viewRow("Annual Year End Fee", d.yearEndFee)}
    ${viewRow("Pension Setup Cost", d.pensionSetup)}

    ${viewGroup("Carers", d.carers)}
    ${viewGroup("Agency", d.agency)}
    ${viewGroup("Self Employed PA", d.pa)}
  `;
}

// ================================
// helpers
// ================================
function feeInput(label, id, value = "") {
  return `
    <div class="form-row">
      <label>${label}:</label>
      <div class="currency-input">
        <span>£</span>
        <input type="number" id="${id}" value="${value || ""}" step="0.01" />
      </div>
    </div>
  `;
}

function calcMonthlyBudget(type, weeklyVal = 0) {
  const monthly = (parseFloat(weeklyVal) || 0) * 4;
  return `
    <div class="form-row">
      <label>${type} Monthly Budget (auto):</label>
      <div class="currency-input">
        <span>£</span>
        <input type="number" id="${type.toLowerCase()}MonthlyBudget" value="${monthly.toFixed(2)}" readonly />
      </div>
    </div>
  `;
}

function viewRow(label, val) {
  return `
    <div><label>${label}:</label><span>£${parseFloat(val || 0).toFixed(2)}</span></div>
  `;
}

function viewGroup(label, arr = []) {
  if (!arr?.length) return `<div><label>${label}:</label><span>-</span></div>`;
  return `<div><label>${label}:</label><span>${arr.join(", ")}</span></div>`;
}

// dynamic (add/remove)
function dynamicGroup(label, cls, arr = []) {
  const groupItems = (arr || [])
    .map(
      (v, i) => `
      <div class="input-row">
        <input type="text" class="${cls}" value="${v}" placeholder="${label} ${i + 1}" />
        <button type="button" class="remove-btn" onclick="this.parentElement.remove()">❌</button>
      </div>`
    )
    .join("");

  return `
    <div class="form-row dynamic-group">
      <label>${label}:</label>
      <div id="${cls}-container">
        ${groupItems}
        <button type="button" class="add-btn" data-group="${cls}" data-label="${label}">+ Add ${label}</button>
      </div>
    </div>
  `;
}

// One global click catcher for add-rows
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("add-btn")) {
    const cls = e.target.dataset.group;
    const label = e.target.dataset.label;
    const container = document.getElementById(`${cls}-container`);
    if (!container) {
      alert("Please select a Setup Fee type first before adding items.");
      return;
    }
    const count = container.querySelectorAll("input").length + 1;
    const div = document.createElement("div");
    div.className = "input-row";
    div.innerHTML = `
      <input type="text" class="${cls}" placeholder="${label} ${count}">
      <button type="button" class="remove-btn" onclick="this.parentElement.remove()">❌</button>
    `;
    container.insertBefore(div, e.target);
  }
});
