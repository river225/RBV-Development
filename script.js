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
const BASE_MAP_IMAGE = "https://i.imgur.com/1ylg8p1.png"; // Replace with your map image URL

const MAP_SECTIONS = {
  "Test Section": {
    images: [
      {
        image: "https://via.placeholder.com/40x40/ff0000/ffffff?text=T",
        width: "40px",
        top: "25%",
        left: "30%"
      }
    ]
  },
  "Spawn Areas": {
    images: [
      {
        image: "https://via.placeholder.com/40x40/00ff00/ffffff?text=S",
        width: "40px",
        top: "25%",
        left: "30%",
        detailImage: "https://via.placeholder.com/400x300/00ff00/ffffff?text=Spawn+Detail"
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
      <p style="text-align: center; color: #33cce6; font-weight: bold; margin: 10px 0 20px 0; text-shadow: 1.5px 1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px -1.5px 0 #000;">|| ✨ Interactive Map, Some mini images can be clicked!</p>
      <div class="map-container">
        <div class="map-image-container">
          <img id="base-map" src="${BASE_MAP_IMAGE}" alt="BlockSpin Map" />
          <div id="map-overlays"></div>
        </div>
      </div>
    </section>
  `;
  document.getElementById("sections").insertAdjacentHTML("beforeend", html);
}

function createMapControlsPanel() {
  // Remove existing map controls if any
  const existingMapControls = document.querySelector('.map-controls-panel');
  if (existingMapControls) {
    existingMapControls.remove();
  }
  
  // Create new map controls panel
  const controlsPanel = document.createElement('div');
  controlsPanel.className = 'map-controls-panel';
  controlsPanel.innerHTML = `
    <h2>Map Layers</h2>
    ${Object.keys(MAP_SECTIONS).map(section => 
      `<button class="map-control-btn" data-section="${section}">${section}</button>`
    ).join('')}
  `;
  
  // Insert after the main container
  const mainContainer = document.querySelector('.main-container');
  mainContainer.appendChild(controlsPanel);
  
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
  
  if (!sectionData || !sectionData.images) return;
  
  // Add images only (no text)
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

function resetMapSection() {
  // Clear all map overlays
  const overlaysContainer = document.getElementById('map-overlays');
  if (overlaysContainer) {
    overlaysContainer.innerHTML = '';
  }
  
  // Deactivate all map control buttons
  document.querySelectorAll('.map-control-btn').forEach(btn => {
    btn.classList.remove('active');
  });
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
  // Check if we're leaving the BlockSpin Map section
  const currentMapSection = document.getElementById(slugify("BlockSpin Map"));
  const wasMapActive = currentMapSection && currentMapSection.style.display !== "none";
  const isLeavingMap = wasMapActive && name !== "BlockSpin Map";
  
  // Reset map if leaving map section
  if (isLeavingMap) {
    resetMapSection();
  }

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

  // Handle layout for map vs non-map sections
  const mainContainer = document.querySelector('.main-container');
  const taxCalculator = document.querySelector('.tax-calculator');
  
  if (name === "BlockSpin Map") {
    // Map section: full width, hide calculator
    mainContainer.style.flexDirection = 'column';
    if (taxCalculator) taxCalculator.style.display = 'none';
    
    // Create map controls if they don't exist
    if (!document.querySelector('.map-controls-panel')) {
      createMapControlsPanel();
    }
    
    updateBanner("BlockSpin Map");
  } else {
    // Regular sections: normal layout, show calculator
    mainContainer.style.flexDirection = 'row';
    if (taxCalculator) taxCalculator.style.display = 'block';
    
    // Remove map controls
    const mapControls = document.querySelector('.map-controls-panel');
    if (mapControls) mapControls.remove();
    
    updateBanner(name);
  }

  // ==================== GREEN LINE - MAP LAYOUT HANDLING END ====================
}

// === UTILITIES ===
function safe(str) { return String(str || "").trim(); }
function escapeAttr(str) { return safe(str).replace(/"/g, "&quot;"); }
function slugify(str) { return safe(str).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

// === TAX CALCULATOR ===
function initTaxCalculator() {
  const input = document.getElementById("taxInput");
  const result = document.getElementById("taxResult");
  const amountSpan = result.querySelector(".calc-amount");

  input.addEventListener("input", () => {
    const val = parseFloat(input.value) || 0;
    const taxed = Math.ceil(val / 0.9);
    amountSpan.textContent = taxed.toLocaleString();
  });
}

// === SEARCH ===
function initSearch() {
  const searchInput = document.getElementById("search");
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    document.querySelectorAll(".card").forEach(card => {
      const name = (card.dataset.name || "").toLowerCase();
      const match = name.includes(query);
      card.classList.toggle("hidden", !match);
    });
  });
}

// === COPY FUNCTION ===
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Optional: Show a temporary "Copied!" message
    console.log('Copied to clipboard:', text);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

// === BANNER ===
function updateBanner(sectionName) {
  const bannerContainer = document.getElementById("section-banner");
  const bannerImg = document.getElementById("banner-img");
  const bannerLink = document.getElementById("banner-link");
  
  if (!bannerContainer || !bannerImg) return;
  
  const bannerData = SECTION_BANNERS[sectionName];
  if (bannerData && bannerData.url) {
    bannerImg.src = bannerData.url;
    bannerImg.style.display = "block";
    bannerImg.style.width = bannerData.width;
    bannerImg.style.position = "absolute";
    bannerImg.style.top = bannerData.top;
    bannerImg.style.left = bannerData.left;
    bannerImg.style.transform = "translate(-50%, -50%)";
    bannerImg.style.zIndex = "10";
    
    // Set banner link (you can customize this URL)
    bannerLink.href = "#"; // Replace with actual link if needed
  } else {
    bannerImg.style.display = "none";
  }
}

// === MAIN INIT ===
async function init() {
  initSectionsNav();
  initTaxCalculator();
  initSearch();

  // Fetch and render all sections
  for (const name of SECTION_NAMES) {
    if (name === "BlockSpin Map") {
      renderBlockSpinMapSection();
    } else {
      const items = await fetchSheet(name);
      renderSection(name, items);
    }
  }

  // Show first section by default
  showSection(SECTION_NAMES[0]);
}

// Start when page loads
document.addEventListener("DOMContentLoaded", init);