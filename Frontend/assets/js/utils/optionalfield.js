// ============================================
// assets/js/utils/optionalfield.js
// ============================================

/**
 * Render optional fields section
 * @param {Array<{name:string,value:string}>} fields
 * @param {Boolean} editable
 * @returns {string}
 */
export function renderOptionalFields(fields = [], editable = true) {
  const safe = (v) => (v ?? "") + "";

  if (!editable) {
    // 🔒 VIEW-ONLY: no inputs, no remove buttons, “Label: Value” per line
    const rows = (fields || [])
      .map(
        (f) => `
        <div class="optional-field static">
          <label>${safe(f.name) || "-"}</label>
          <span>${safe(f.value) || "-"}</span>
        </div>`
      )
      .join("");

    return `<div class="optional-field-container view-only">${rows || "<div class='optional-field static'><label>-</label><span>-</span></div>"}</div>`;
  }

  // ✏️ EDITABLE: inputs + remove + add button
  const rows = (fields || [])
    .map(
      (f) => `
      <div class="optional-field">
        <input type="text" class="opt-key" value="${safe(f.name)}" placeholder="Field name">
        <input type="text" class="opt-value" value="${safe(f.value)}" placeholder="Value">
        <button type="button" class="remove-optional-btn">×</button>
      </div>`
    )
    .join("");

  return `
    <div class="optional-field-container">
      ${rows}
      <button type="button" class="add-optional-field-btn">+ Add Optional Field</button>
    </div>
  `;
}

/**
 * Bind Add/Remove events for optional fields (scoped per container)
 * Only binds in EDITABLE containers (i.e., when the add button exists).
 * @param {HTMLElement} root
 */
export function bindOptionalFieldEvents(root = document) {
  const container = root.querySelector(".optional-field-container") || root;
  if (!container) return;

  // If there is no “add” button, we are in view-only mode — do not bind anything.
  const addButton = container.querySelector(".add-optional-field-btn");
  if (!addButton) return;

  addButton.addEventListener("click", () => {
    const newField = document.createElement("div");
    newField.className = "optional-field";
    newField.innerHTML = `
      <input type="text" class="opt-key" placeholder="Field name">
      <input type="text" class="opt-value" placeholder="Value">
      <button type="button" class="remove-optional-btn">×</button>
    `;
    container.insertBefore(newField, addButton);

    newField
      .querySelector(".remove-optional-btn")
      .addEventListener("click", () => newField.remove());
  });

  // Bind existing remove buttons
  container.querySelectorAll(".remove-optional-btn").forEach((btn) => {
    btn.addEventListener("click", () => btn.closest(".optional-field").remove());
  });
}

/**
 * Collect all optional fields into array of { name, value }
 * (Only meaningful in edit mode)
 * @param {HTMLElement} root
 * @returns {Array}
 */
export function collectOptionalFields(root = document) {
  const container = root.querySelector(".optional-field-container") || root;
  const fields = [];
  if (!container) return fields;

  // If there's no add button, it's view-only → nothing to collect.
  if (!container.querySelector(".add-optional-field-btn")) return fields;

  container.querySelectorAll(".optional-field").forEach((row) => {
    const name = row.querySelector(".opt-key")?.value?.trim();
    const value = row.querySelector(".opt-value")?.value?.trim();
    if (name && value) fields.push({ name, value });
  });

  return fields;
}
