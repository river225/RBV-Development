// === CONFIG ===
const SPREADSHEET_ID = "1rhptMcfWB2I-x3i9TNMwePcDD9SWWwGsaLwELqxCKzo";
const SECTION_NAMES = [
  "Uncommon",
  "Rare",
  "Epic",
  "Legendary",
  "Omega",
  "Misc",
  "Vehicles",
  "Crew Logo's"
];

const SECTION_BANNERS = {
  "Uncommon": { url: "https://i.imgur.com/ttWiION.png", width: "160px", top: "226px", left: "53%" },
  "Rare":     { url: "https://i.imgur.com/ZShOTJY.png", width: "260px", top: "210px", left: "50%" },
  "Epic":     { url: "https://i.imgur.com/qMjGPBl.png", width: "310px", top: "200px", left: "50%" },
  "Legendary":{ url: "https://i.imgur.com/mdjOAS1.png", width: "217px", top: "227px", left: "53%" },
  "Omega":    { url: "https://i.imgur.com/LT1i1kR.png", width: "140px", top: "234px", left: "56%" },
  "Misc":     { url: "https://i.imgur.com/0WvIuZo.png", width: "200px", top: "235px", left: "53%" },
  "Vehicles": { url: "https://i.imgur.com/UGdzYtH.png", width: "218px", top: "227px", left: "54%" },
   "Crew Logo's": { url: "https://i.imgur.com/UGdzYtH.png", width: "200px", top: "225px", left: "53%" }
};


// === FETCH HELPERS ===
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

    return items.filter(x => String(x["Name"] || x["Header"] || "").trim().length > 0);
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

  const imgTag = img
    ? `<img src="${img}" alt="${name}" onerror="this.style.display='none'">`
    : "";

  return `
    <div class="card" data-name="${escapeAttr(name)}">
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

function createCrewLogoCard(item) {
  const name = safe(item["Name"]);
  const img = safe(item["Image"]);
  const id = safe(item["ID"]);

  const imgTag = img
    ? `<img src="${img}" alt="${name}" onerror="this.style.display='none'">`
    : "";

  return `
    <div class="card crew-logo-card" data-name="${escapeAttr(name)}">
      <div class="crew-card-content">
        <h3>${name}</h3>
        ${imgTag}
        <div class="crew-id">ID: ${id}</div>
      </div>
    </div>
  `;
}

function renderSection(title, items) {
  if (!items || items.length === 0) return;

  if (title === "Crew Logo's") {
    renderCrewLogosSection(items);
  } else {
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
}

function renderCrewLogosSection(items) {
  // Group items by header
  const grouped = {};
  
  items.forEach(item => {
    const header = safe(item["Header"]) || "Uncategorized";
    if (!grouped[header]) {
      grouped[header] = [];
    }
    if (item["Name"]) {
      grouped[header].push(item);
    }
  });

  let html = `<section class="section" id="crew-logo-s"><h2>Crew Logo's</h2>`;
  
  Object.keys(grouped).forEach(header => {
    if (grouped[header].length > 0) {
      html += `
        <div class="crew-header">${header}</div>
        <div class="cards">
          ${grouped[header].map(createCrewLogoCard).join("")}
        </div>
      `;
    }
  });
  
  html += `</section>`;
  document.getElementById("sections").insertAdjacentHTML("beforeend", html);
}

// === SECTION NAVIGATION ===
function initSectionsNav() {
  const nav = document.getElementById("sections-nav");
  
  SECTION_NAMES.forEach((name, index) => {
    // Add gap and "Extras" header before Crew Logo's
    if (name === "Crew Logo's") {
      const gap = document.createElement("div");
      gap.className = "nav-gap";
      nav.appendChild(gap);
      
      const extrasHeader = document.createElement("div");
      extrasHeader.className = "nav-extras-header";
      extrasHeader.textContent = "Extras";
      nav.appendChild(extrasHeader);
    }
    
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.addEventListener("click", () => showSection(name));
    nav.appendChild(btn);
  });
}

function showSection(name) {
  // Show/hide sections
  SECTION_NAMES.forEach(sec => {
    const el = document.getElementById(slugify(sec));
    if (el) el.style.display = sec === name ? "block" : "none";
  });

  // Highlight active nav button
  document.querySelectorAll("#sections-nav button").forEach(b => {
    b.classList.toggle("active", b.textContent === name);
  });

  // Banner logic with fade (no banner for Crew Logo's)
  const bannerImg = document.getElementById("banner-img");
  const bannerContainer = bannerImg.parentElement; // #section-banner
  const banner = SECTION_BANNERS[name];

  if (banner && banner.url) {
    // Remove show class to start fade out
    bannerImg.classList.remove("show");

    // Wait for the CSS transition to finish before changing src
    setTimeout(() => {
      bannerImg.src = banner.url;
      bannerImg.style.display = "block";

      // Apply custom styles
      bannerImg.style.maxWidth = banner.width || "190px";
      bannerContainer.style.top = banner.top || "228px";
      bannerContainer.style.left = banner.left || "50%";
      bannerContainer.style.transform = "translateX(-50%)";
       bannerContainer.style.position = "absolute";
      // Trigger fade in
      requestAnimationFrame(() => {
        bannerImg.classList.add("show");
      });
    }, 300); // matches CSS transition duration
  } else {
    bannerImg.style.display = "none";
  }
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

    // Show first section by default
  if (SECTION_NAMES.length > 0) showSection(SECTION_NAMES[0]);

});