// === CONFIG ===
const SPREADSHEET_ID = "1vAm9x7c5JPxpHxDHVcDgQifXsAvW9iW2wPVuQLENiYs";
const SECTION_NAMES = ["FlipCards"]; // new single tab

// === FETCH HELPER ===
async function fetchSheet(sheetName) {
  try {
    const base = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq`;
    const url = `${base}?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&headers=1`;
    const res = await fetch(url);
    const text = await res.text();
    const json = JSON.parse(text.substring(47, text.length - 2));
    const cols = json.table.cols.map(c => c.label?.trim() || "");
    const rows = json.table.rows || [];
    const items = rows.map(r => {
      const obj = {};
      cols.forEach((label, i) => {
        const cell = r.c?.[i];
        obj[label] = cell ? (cell.f ?? cell.v ?? "") : "";
      });
      return obj;
    });
    return items.filter(x => String(x["Name"] || "").trim().length > 0);
  } catch (err) {
    console.error(`Failed to fetch sheet: ${sheetName}`, err);
    return [];
  }
}

// === RENDERING ===
function createCard(item) {
  const name = safe(item["Name"]);
  const img = safe(item["Image URL"]);
  const demand = safe(item["Demand"]);
  const avg = safe(item["Average Value"]);
  const ranged = safe(item["Ranged Value"]);
  const afterTax = safe(item["After Tax Value"]);

  const flipToggle = safe(item["Flip Toggle"]).toLowerCase() === "yes";
  const flipImg = safe(item["Flip Image URL"]);
  const flipText = safe(item["Flip Text"]);

  const imgTag = img ? `<img src="${img}" alt="${name}" />` : "";

  return `
    <div class="card" data-name="${escapeAttr(name)}" ${flipToggle ? 'data-flip-img="'+flipImg+'" data-flip-text="'+flipText+'"' : ''}>
      ${imgTag}
      <div class="card-info">
        <h3>${name}</h3>
        ${demand ? `<span class="badge">Demand: ${demand}</span>` : ""}
        ${avg ? `<div>Average Value: ${avg}</div>` : ""}
        ${ranged ? `<div>Ranged Value: ${ranged}</div>` : ""}
        ${afterTax ? `<div>After Tax Value: ${afterTax}</div>` : ""}
      </div>
    </div>
  `;
}

function renderSection(title, items) {
  if (!items || items.length === 0) return;
  const html = `
    <section class="section" id="${slugify(title)}">
      <h2>${title}</h2>
      <div class="cards">
        ${items.map(createCard).join("")}
      </div>
    </section>
  `;
  document.getElementById("sections").insertAdjacentHTML("beforeend", html);
}

// === NAVIGATION ===
function initSectionsNav() {
  const nav = document.getElementById("sections-nav");
  SECTION_NAMES.forEach(name => {
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.addEventListener("click", () => showSection(name));
    nav.appendChild(btn);
  });
}

function showSection(name) {
  SECTION_NAMES.forEach(sec => {
    const el = document.getElementById(slugify(sec));
    if (el) el.style.display = sec === name ? "block" : "none";
  });
  document.querySelectorAll("#sections-nav button").forEach(b => {
    b.classList.toggle("active", b.textContent === name);
  });
}

// === SEARCH ===
function initSearch() {
  const input = document.getElementById("search");
  if (!input) return;
  input.addEventListener("input", () => {
    const val = input.value.toLowerCase();
    document.querySelectorAll(".card").forEach(card => {
      const name = card.dataset.name.toLowerCase();
      card.classList.toggle("hidden", !name.includes(val));
    });
  });
}

// === TAX CALCULATOR ===
function initTaxCalculator() {
  const taxInput = document.getElementById("taxInput");
  const taxResult = document.getElementById("taxResult");
  if (!taxInput || !taxResult) return;
  taxInput.addEventListener("input", () => {
    const val = parseFloat(taxInput.value) || 0;
    const withdraw = Math.round(val / 0.72);
    taxResult.innerHTML = `Amount to withdraw: <span class="calc-amount">${withdraw}</span>`;
  });
}

// === CARD CLICK TO FLIP ===
function initCardClick() {
  document.addEventListener("click", e => {
    const card = e.target.closest(".card");
    if (!card) return;
    const flipImg = card.dataset.flipImg;
    const flipText = card.dataset.flipText;
    if (flipImg || flipText) {
      card.classList.add("flipped");
      if (flipImg) card.querySelector("img").src = flipImg;
      if (flipText) card.querySelector("h3").textContent = flipText;
    }
  });
}

// === HELPERS ===
function safe(str) { return str ?? ""; }
function escapeAttr(str) { return (str+"").replace(/"/g, "&quot;"); }
function slugify(str) { return str.toLowerCase().replace(/\s+/g, "-"); }

// === INIT ===
document.addEventListener("DOMContentLoaded", async () => {
  initSectionsNav();
  initSearch();
  initTaxCalculator();

  for (const sec of SECTION_NAMES) {
    const items = await fetchSheet(sec);
    renderSection(sec, items);
  }

  if (SECTION_NAMES.length > 0) showSection(SECTION_NAMES[0]);
  initCardClick();
});
