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
  "BlockSpin Map",
  "Crew Logos",
  "Scammer List"
];

const SECTION_BANNERS = {
  "Uncommon": { url: "https://i.imgur.com/ttWiION.png", width: "160px", top: "226px", left: "53%" },
  "Rare":     { url: "https://i.imgur.com/ZShOTJY.png", width: "260px", top: "210px", left: "50%" },
  "Epic":     { url: "https://i.imgur.com/qMjGPBl.png", width: "310px", top: "200px", left: "50%" },
  "Legendary":{ url: "https://i.imgur.com/mdjOAS1.png", width: "217px", top: "227px", left: "53%" },
  "Omega":    { url: "https://i.imgur.com/LT1i1kR.png", width: "140px", top: "234px", left: "56%" },
  "Misc":     { url: "https://i.imgur.com/0WvIuZo.png", width: "200px", top: "235px", left: "53%" },
  "Vehicles": { url: "https://i.imgur.com/UGdzYtH.png", width: "218px", top: "228px", left: "54%" },
  "BlockSpin Map": { url: "", width: "200px", top: "228px", left: "54%" },
  "Crew Logos": { url: "https://i.imgur.com/SoIuFWy.png", width: "162px", top: "228px", left: "54%" },
  "Scammer List": { url: "https://i.imgur.com/bQeLrpx.png", width: "140px", top: "243px", left: "56%" }
};

// ==================== GREEN LINE - BLOCKSPIN MAP SECTION START ====================

// BlockSpin Map Configuration
const BASE_MAP_IMAGE = "https://i.imgur.com/A7nujNf.png"; // Replace with your map image URL

const MAP_SECTIONS = {
  "Spawn Areas": {
    text: {
      content: "Main Spawn Locations",
      top: "5%",
      left: "20%", 
      width: "300px"
    },
    images: [
      {
        image: "https://i.imgur.com/spawn1.png",
        width: "40px",
        top: "25%",
        left: "30%",
        detailImage: "https://i.imgur.com/spawn-detail1.png"
      }
    ]
  },
  "Item Locations": {
    text: {
      content: "Rare Item Spawns",
      top: "8%",
      left: "50%",
      width: "250px"
    },
    images: [
      {
        image: "https://i.imgur.com/item1.png",
        width: "45px", 
        top: "40%",
        left: "70%",
        detailImage: "https://i.imgur.com/item-detail1.png"
      }
    ]
  }
};

// ==================== GREEN LINE - BLOCKSPIN MAP SECTION END ====================

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

    return items.filter(x => String(x["Name"] || x["Header"] || x["Roblox Name"] || "").trim().length > 0);
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
        <div class="crew-id-container">
          <div class="crew-id">ID: ${id}</div>
          <button class="copy-btn" onclick="copyToClipboard('${escapeAttr(id)}')" title="Copy ID">📋</button>
        </div>
      </div>
    </div>
  `;
}

function createScammerCard(item) {
  const robloxName = safe(item["Roblox Name"]);
  const discordUser = safe(item["Discord User"]);
  const reason = safe(item["Reason"]);
  const evidence = safe(item["Evidence"]);
  const submittedDate = safe(item["Submitted Date"]);

  // Handle Roblox name - check if it contains a URL and extract both parts
  let robloxNameHtml;
  if (robloxName.includes('http')) {
    // Extract the URL and the text before it
    const urlMatch = robloxName.match(/(.*?)(https?:\/\/\S+)/);
    if (urlMatch) {
      const textPart = urlMatch[1].trim();
      const urlPart = urlMatch[2];
      robloxNameHtml = `${textPart} <a href="${urlPart}" target="_blank" rel="noopener" class="scammer-link">User Profile</a>`;
    } else {
      robloxNameHtml = robloxName;
    }
  } else {
    robloxNameHtml = robloxName;
  }

  // Handle evidence links
  const evidenceLinks = evidence.split(",").map(link => link.trim()).filter(link => link.length > 0);
  let evidenceHtml = "";
  if (evidenceLinks.length > 0) {
    evidenceHtml = evidenceLinks.map((link, index) => 
      `<a href="${link}" target="_blank" rel="noopener" class="scammer-link">Evidence ${index + 1}</a>`
    ).join(" | ");
  }

  return `
    <div class="card scammer-card" data-name="${escapeAttr(robloxName)}">
      <div class="card-info">
        <div class="scammer-field"><strong>Roblox Name:</strong> ${robloxNameHtml}</div>
        <div class="scammer-field"><strong>Discord:</strong> ${discordUser}</div>
        <div class="scammer-field"><strong>Reason:</strong> ${reason}</div>
        ${evidenceHtml ? `<div class="scammer-field"><strong>Evidence:</strong> ${evidenceHtml}</div>` : ""}
        <div>Reported: ${submittedDate}</div>
      </div>
    </div>
  `;
}

function renderSection(title, items) {
  if (!items || items.length === 0) return;

  if (title === "Crew Logos") {
    renderCrewLogosSection(items);
  } else if (title === "Scammer List") {
    renderScammerSection(items);
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

  let html = `<section class="section" id="${slugify("Crew Logos")}"><h2>Crew Logos</h2>`;
  
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

function renderScammerSection(items) {
  let html = `
    <section class="section" id="${slugify("Scammer List")}">
      <h2>Scammer List</h2>
      <p class="scammer-warning">⚠️ WARNING: These clowns have been reported in our discord server for scamming. Please trade with extreme caution! Report scammers in our discord server to have them placed here!</p>
      <div class="cards">
        ${items.map(createScammerCard).join("")}
      </div>
    </section>
  `;
  document.getElementById("sections").insertAdjacentHTML("beforeend", html);
}

// ==================== GREEN LINE - BLOCKSPIN MAP FUNCTIONS START ====================

function renderBlockSpinMapSection() {
  const html = `
    <section class="section map-section" id="${slugify("BlockSpin Map")}">
      <h2>BlockSpin Map</h2>
      <div class="map-container">
        <div class="map-image-container">
          <img id="base-map" src="${BASE_MAP_IMAGE}" alt="BlockSpin Map" />
          <div id="map-overlays"></div>
        </div>
      </div>
    </section>
  `;
  document.getElementById("sections").insertAdjacentHTML("beforeend", html);
  initMapControls();
}

function initMapControls() {
  // Create map controls in the right panel when map section is active
  const controlsHtml = `
    <div class="map-controls">
      <h2>Map Layers</h2>
      ${Object.keys(MAP_SECTIONS).map(section => 
        `<button class="map-control-btn" data-section="${section}">${section}</button>`
      ).join('')}
    </div>
  `;
  
  // This will replace calculator when map is active
  document.querySelector('.tax-calculator').innerHTML = controlsHtml;
  
  // Add event listeners
  document.querySelectorAll('.map-control-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleMapSection(btn.dataset.section, btn));
  });
}

function toggleMapSection(sectionName, button) {
  const overlaysContainer = document.getElementById('map-overlays');
  const existingItems = overlaysContainer.querySelectorAll(`[data-section="${sectionName}"]`);
  
  if (existingItems.length > 0) {
    // Hide section
    existingItems.forEach(item => item.remove());
    button.classList.remove('active');
  } else {
    // Show section
    showMapSection(sectionName);
    button.classList.add('active');
  }
}

function showMapSection(sectionName) {
  const overlaysContainer = document.getElementById('map-overlays');
  const sectionData = MAP_SECTIONS[sectionName];
  
  if (!sectionData) return;
  
  // Add text if exists
  if (sectionData.text) {
    const textElement = document.createElement('div');
    textElement.className = 'map-text-overlay';
    textElement.dataset.section = sectionName;
    textElement.textContent = sectionData.text.content;
    textElement.style.position = 'absolute';
    textElement.style.top = sectionData.text.top;
    textElement.style.left = sectionData.text.left;
    textElement.style.width = sectionData.text.width;
    overlaysContainer.appendChild(textElement);
  }
  
  // Add images
  if (sectionData.images) {
    sectionData.images.forEach(imageData => {
      const imageElement = document.createElement('img');
      imageElement.src = imageData.image;
      imageElement.className = 'map-image-overlay';
      imageElement.dataset.section = sectionName;
      imageElement.style.position = 'absolute';
      imageElement.style.top = imageData.top;
      imageElement.style.left = imageData.left;
      imageElement.style.width = imageData.width;
      imageElement.style.transform = 'translate(-50%, -50%)';
      
      if (imageData.detailImage) {
        imageElement.style.cursor = 'pointer';
        imageElement.addEventListener('click', () => showDetailModal(imageData.detailImage));
      }
      
      overlaysContainer.appendChild(imageElement);
    });
  }
}

function showDetailModal(imageUrl) {
  const modal = document.createElement('div');
  modal.className = 'map-detail-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <img src="${imageUrl}" alt="Detail" />
      <button class="modal-back-btn" onclick="closeDetailModal()">← Back</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function closeDetailModal() {
  const modal = document.querySelector('.map-detail-modal');
  if (modal) modal.remove();
}

// ==================== GREEN LINE - BLOCKSPIN MAP FUNCTIONS END ====================

// === SECTION NAVIGATION ===
function initSectionsNav() {
  const nav = document.getElementById("sections-nav");
  
  SECTION_NAMES.forEach((name, index) => {
    // Add gap and "Extras" header before BlockSpin Map
    if (name === "BlockSpin Map") {
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

  // ==================== GREEN LINE - MAP LAYOUT HANDLING START ====================
  // Handle special layout for BlockSpin Map
  const taxCalculator = document.querySelector('.tax-calculator');
  
  if (name === "BlockSpin Map") {
    // Map is active - show map controls instead of calculator
    if (taxCalculator) {
      taxCalculator.style.display = 'block';
      // Controls will be added by initMapControls()
    }
  } else {
    // Regular section - restore calculator
    if (taxCalculator) {
      taxCalculator.innerHTML = `
        <h2>Tax Calculator</h2> 
        <input type="number" id="taxInput" placeholder="Amount..." /> 
        <div id="taxResult">
            Amount to withdraw: <span class="calc-amount">0</span>
        </div>
        <p class="tax-explanation">Enter the amount you want the other person to get. The calculator tells you how much to withdraw to cover taxes. Same rules apply for trades above 100k, you just respawn multiple times.</p>
      `;
      // Reinitialize calculator
      initTaxCalculator();
    }
  }
  // ==================== GREEN LINE - MAP LAYOUT HANDLING END ====================

  // Banner logic
  const bannerImg = document.getElementById("banner-img");
  const bannerContainer = bannerImg.parentElement;
  const banner = SECTION_BANNERS[name];

  if (banner && banner.url) {
    bannerImg.classList.remove("show");
    setTimeout(() => {
      bannerImg.src = banner.url;
      bannerImg.style.display = "block";
      bannerImg.style.maxWidth = banner.width || "190px";
      bannerContainer.style.top = banner.top || "228px";
      bannerContainer.style.left = banner.left || "50%";
      bannerContainer.style.transform = "translateX(-50%)";
      bannerContainer.style.position = "absolute";
      requestAnimationFrame(() => {
        bannerImg.classList.add("show");
      });
    }, 300);
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

// === COPY TO CLIPBOARD ===
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓';
    btn.style.backgroundColor = '#28a745';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.backgroundColor = '';
    }, 1500);
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓';
    btn.style.backgroundColor = '#28a745';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.backgroundColor = '';
    }, 1500);
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
    // ==================== GREEN LINE - MAP RENDERING START ====================
    if (sec === "BlockSpin Map") {
      renderBlockSpinMapSection();
    } else {
      const items = await fetchSheet(sec);
      renderSection(sec, items);
    }
    // ==================== GREEN LINE - MAP RENDERING END ====================
  }

  if (SECTION_NAMES.length > 0) showSection(SECTION_NAMES[0]);
});