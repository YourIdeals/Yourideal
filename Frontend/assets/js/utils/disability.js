// assets/js/utils/disability.js

/**
 * Render Disability Section
 * @param {Array} selected - Array of selected disabilities
 * @returns {string} HTML string
 */
export function renderDisabilitySection(selected = []) {
  const has = (val) => selected.includes(val);
  const blockIf = (val) => (selected.some(d => d.toLowerCase().includes(val.toLowerCase())) ? 'display:block' : 'display:none');

  return `
    <div class="disability-wrapper">
      <label>Disability:</label>
      <div class="disability-section">
        <label><input type="checkbox" value="None" ${has("None") ? "checked" : ""}> None</label>

        <label><input type="checkbox" value="Physical" ${selected.some(d => d.toLowerCase().includes("physical")) ? "checked" : ""}> Physical</label>
        <div class="disability-sub" data-parent="Physical" style="${blockIf("physical")}">
          <label><input type="checkbox" value="Wheelchair User" ${has("Wheelchair User") ? "checked" : ""}>Wheelchair User</label>
          <label><input type="checkbox" value="Arthritic" ${has("Arthritic") ? "checked" : ""}>Arthritic</label>
          <label><input type="checkbox" value="Cerebral Palsy" ${has("Cerebral Palsy") ? "checked" : ""}>Cerebral Palsy</label>
          <label><input type="checkbox" value="MS" ${has("MS") ? "checked" : ""}>MS</label>
        </div>

        <label><input type="checkbox" value="Intellectual Disability" ${selected.some(d => d.toLowerCase().includes("intellectual disability")) ? "checked" : ""}> Intellectual Disability</label>
        <div class="disability-sub" data-parent="Intellectual Disability" style="${blockIf("intellectual disability")}">
          <label><input type="checkbox" value="Learning Disability" ${has("Learning Disability") ? "checked" : ""}>Learning Disability</label>
          <label><input type="checkbox" value="Asperger's Spectrum" ${has("Asperger's Spectrum") ? "checked" : ""}>Asperger's Spectrum</label>
          <label><input type="checkbox" value="Autism Spectrum" ${has("Autism Spectrum") ? "checked" : ""}>Autism Spectrum</label>
        </div>

        <label><input type="checkbox" value="Mental Health Conditions" ${selected.some(d => d.toLowerCase().includes("mental health conditions")) ? "checked" : ""}> Mental Health Conditions</label>
        <div class="disability-sub" data-parent="Mental Health Conditions" style="${blockIf("mental health conditions")}">
          <label><input type="checkbox" value="Depression" ${has("Depression") ? "checked" : ""}>Depression</label>
          <label><input type="checkbox" value="Dementia" ${has("Dementia") ? "checked" : ""}>Dementia</label>
          <label><input type="checkbox" value="PTSD" ${has("PTSD") ? "checked" : ""}>PTSD</label>
          <label><input type="checkbox" value="Schizophrenia" ${has("Schizophrenia") ? "checked" : ""}>Schizophrenia</label>
          <label><input type="checkbox" value="Bi Polar" ${has("Bi Polar") ? "checked" : ""}>Bi Polar</label>
        </div>

        <label><input type="checkbox" value="Sensory Impairment" ${selected.some(d => d.toLowerCase().includes("sensory impairment")) ? "checked" : ""}> Sensory Impairment</label>
        <div class="disability-sub" data-parent="Sensory Impairment" style="${blockIf("sensory impairment")}">
          <label><input type="checkbox" value="Hearing" ${has("Hearing") ? "checked" : ""}>Hearing</label>
          <label><input type="checkbox" value="Visual" ${has("Visual") ? "checked" : ""}>Visual</label>
        </div>

        <label><input type="checkbox" value="Progressive Condition" ${selected.some(d => d.toLowerCase().includes("progressive condition")) ? "checked" : ""}> Progressive Condition</label>
        <div class="disability-sub" data-parent="Progressive Condition" style="${blockIf("progressive condition")}">
          <label><input type="checkbox" value="Incurable" ${has("Incurable") ? "checked" : ""}>Incurable</label>
          <label><input type="checkbox" value="End of Life" ${has("End of Life") ? "checked" : ""}>End of Life</label>
        </div>

        <label><input type="checkbox" value="Other" ${has("Other") ? "checked" : ""}> Other</label>
        <input type="text" id="disOtherText" placeholder="Specify other" value="${has("Other") ? selected.find(d => !["None","Other"].includes(d)) || "" : ""}">
      </div>
    </div>
  `;
}

/**
 * Bind events for disability checkboxes
 */
export function bindDisabilityEvents() {
  const otherCheckbox = document.querySelector('.disability-section input[value="Other"]');
  const otherInput = document.getElementById("disOtherText");

  // Handle "None" or other top-level checkboxes
  document.querySelectorAll(".disability-section > label > input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", function () {
      const noneBox = document.querySelector('.disability-section input[value="None"]');

      if (this.value === "None" && this.checked) {
        document.querySelectorAll(".disability-section input[type=checkbox]").forEach(c => {
          if (c !== this) c.checked = false;
        });
        document.querySelectorAll(".disability-sub").forEach(sub => (sub.style.display = "none"));
        if (otherInput) {
          otherInput.style.display = "none";
          otherInput.value = "";
        }
      } else if (this.value !== "None" && this.checked) {
        if (noneBox) noneBox.checked = false;
      }

      const group = document.querySelector(`.disability-sub[data-parent="${this.value}"]`);
      if (group) {
        group.style.display = this.checked ? "block" : "none";
      }
    });
  });

  // Handle "Other" input field
  if (otherCheckbox && otherInput) {
    otherCheckbox.addEventListener("change", function () {
      otherInput.style.display = this.checked ? "block" : "none";
      if (!this.checked) otherInput.value = "";
    });
  }
}

/**
 * ✅ Improved collectDisabilityData()
 * Produces clean structured output.
 * Example: ["Sensory Impairment", "Visual", "OCD"]
 */
export function collectDisabilityData() {
  const selected = new Set(); // Prevent duplicates
  const checkboxes = document.querySelectorAll('.disability-section input[type="checkbox"]');

  checkboxes.forEach(cb => {
    if (cb.checked) {
      const group = document.querySelector(`.disability-sub[data-parent="${cb.value}"]`);

      if (group) {
        // Sub-group items (like Visual under Sensory Impairment)
        const children = group.querySelectorAll('input[type="checkbox"]:checked');
        if (children.length > 0) {
          selected.add(cb.value.trim()); // e.g. "Sensory Impairment"
          children.forEach(child => selected.add(child.value.trim()));
        } else {
          selected.add(cb.value.trim());
        }
      } else if (cb.value === "Other") {
        selected.add("Other"); // Always include "Other"
        const otherInput = document.getElementById("disOtherText");
        if (otherInput && otherInput.value.trim() !== "") {
          selected.add(otherInput.value.trim()); // e.g. "OCD"
        }
      } else {
        selected.add(cb.value.trim());
      }
    }
  });

  return selected.size > 0 ? Array.from(selected) : ["None"];
}