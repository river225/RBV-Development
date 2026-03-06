// CONFIG — Test site: use test spreadsheet. For live site, use: 1vAm9x7c5JPxpHxDHVcDgQifXsAvW9iW2wPVuQLENiYs
const SPREADSHEET_ID = "1rhptMcfWB2I-x3i9TNMwePcDD9SWWwGsaLwELqxCKzo";
const SECTION_NAMES = [
  "Home",
  "Uncommon",
  "Rare", 
  "Epic",
  "Legendary",
  "Omega",
  "Misc",
  "Vehicles",
  
  // EXTRAS
  "Trade List",
  "💰 Richest Players",
  "Crew Logos"
];

// Tax calculator: 40k drop → 29,091 received (confirmed). Above 40k (e.g. 41,250) still gives 29,091. MAX 40K PER DROP.
const TAX_RECEIVE_RATIO = 29091 / 40000;
const TAX_MAX_DROP = 40000;
const TAX_RECEIVE_PER_40K = 29091;

// RICHEST PLAYERS SECTION START

function formatNetWorth(value) {
  // Remove dollar signs, commas, and any other non-numeric characters except decimal point
  const cleanValue = String(value).replace(/[$,]/g, '');
  const num = parseFloat(cleanValue);
  
  if (isNaN(num)) return '$0';
  
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(2)}K`;
  }
  return `$${num.toLocaleString()}`;
}

function getRankColor(rank) {
  if (rank === 1) return '#FFD700';        // 🥇 Gold
  if (rank === 2) return '#C0C0C0';        // 🥈 Silver
  if (rank === 3) return '#CD7F32';        // 🥉 Bronze
  if (rank >= 4 && rank <= 25) return '#8B5CF6';   // 🟣 Purple (4-25)
  if (rank >= 26 && rank <= 100) return '#EC4899'; // 💖 Pink (26-100)
  if (rank >= 101 && rank <= 500) return '#48BB78'; // 🟢 Green (101-500)
  return '#A0A0A0'; // ⚪ Gray (501-1000)
}

function getRankSize(rank) {
  if (rank === 1) return 'rank-1';
  if (rank === 2) return 'rank-2';
  if (rank === 3) return 'rank-3';
  if (rank >= 4 && rank <= 25) return 'rank-top25';
  return 'rank-default';
}

function createRichestPlayersSection(data) {
  if (!data || data.length === 0) {
    return '<p style="text-align: center; color: #888;">No leaderboard data available.</p>';
  }

  const intro = `
    <div class="richest-players-header">
      <h2>Top 1,000 Richest Players in BlockSpin</h2>
      <p class="richest-intro">This list is the Official BlockSpin leaderboard showing the wealthiest players in the game, Ranked by the total value of their in-game assets. Rankings go to #1000. This leaderboard updates hourly. Note this section is in BETA, issues may occur.</p>
      
      <input 
        type="text" 
        class="richest-search" 
        id="richest-search-input"
        placeholder="🔍 Search players by username..."
      />
    </div>
  `;

  const cards = data.map((player, index) => {
    const rank = index + 1;
    const rankColor = getRankColor(rank);
    const formattedWorth = formatNetWorth(player['Networth'] || player['Net Worth'] || 0);
    const playerName = player['Roblox Username'] || player['Player Name'] || player.Name || 'Unknown';
    const level = player['Level'] || 'N/A';
    const rankClass = ("" + rank).length >= 3 ? "rank-long" : "";
    
    // Create Roblox search URL
    const robloxSearchUrl = `https://www.roblox.com/search/users?keyword=${encodeURIComponent(playerName)}`;

    return `
      <div class="richest-card ${getRankSize(rank)}" style="border-color: ${rankColor};" data-player-name="${playerName}">
        <div class="rank-badge ${rankClass}" style="background: ${rankColor};">
          #${rank}
        </div>
        <div class="player-info">
          <div class="player-name">${playerName}</div>
          <div class="player-level"><span style="color: #fff; font-size: 0.9em;">Level: </span><span style="color: #33cce6; font-weight: bold;">${level}</span></div>
          <div class="player-worth"><span style="color: #fff; font-size: 0.9em;">Net Worth: </span>${formattedWorth}</div>
          <a href="${robloxSearchUrl}" target="_blank" rel="noopener" class="profile-link">View Profile 🔗</a>
        </div>
      </div>
    `;
  }).join('');

  return intro + '<div class="richest-container">' + cards + '</div>';
}

function filterRichestPlayers(query) {
  const searchTerm = query.toLowerCase().trim();
  const cards = document.querySelectorAll('.richest-card');
  
  cards.forEach(card => {
    const playerName = (card.dataset.playerName || '').toLowerCase();
    if (playerName.includes(searchTerm)) {
      card.style.setProperty('display', 'flex', 'important');
    } else {
      card.style.setProperty('display', 'none', 'important');
    }
  });
}
// RICHEST PLAYERS SECTION END 

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

    // For most sheets we filter out blank rows using the Name/Header-style columns.
    // For "Website Configs" (value changes) we want ALL rows and will filter separately.
    if (sheetName === "Website Configs") {
      return items;
    }

    return items.filter(x =>
      String(
        x["Name"] ||
        x["Header"] ||
        x["Roblox Name"] ||
        x["Player Name"] ||
        ""
      ).trim().length > 0
    );
  } catch (err) {
    console.error(`Failed to fetch sheet: ${sheetName}`, err);
    return [];
  }
}

// Special fetch for Richest Players from different spreadsheet
async function fetchRichestPlayers() {
  try {
    const RICHEST_SPREADSHEET_ID = "1nfWrJcFkVCZ-Yr0mWmCCjQoQgUD3_-W2Qsy4XD4NT3k";
    const base = `https://docs.google.com/spreadsheets/d/${RICHEST_SPREADSHEET_ID}/gviz/tq`;
    const url = `${base}?tqx=out:json&headers=1`;
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

    // Filter out empty rows and return rows 2-1000 (index 1-999)
    const validItems = items.filter(x => String(x["Roblox Username"] || "").trim().length > 0);
    return validItems;
  } catch (err) {
    console.error('Failed to fetch Richest Players', err);
    return [];
  }
}

// Trade List: combine all item sheets for search
async function fetchAllItemsForTradeList() {
  const sheets = ["Uncommon", "Rare", "Epic", "Legendary", "Omega", "Misc", "Vehicles"];
  const all = [];
  for (const sheet of sheets) {
    const items = await fetchSheet(sheet);
    all.push(...items);
  }
  return all;
}

function createCard(item) {
  const name = safe(item["Name"]);
  const img = safe(item["Image URL"]);
  const demand = safe(item["Demand"]);
  const avg = safe(item["Average Value"]);
  const ranged = safe(item["Ranged Value"]);
  const durability = safe(item["Durability"]);
  const internalValue = safe(item["Internal Value"]);


  // Simple image tag (no broken overlay handling)
  let imgTag = "";
  if (img) {
    imgTag = `<img src="${img}" alt="${name}" onerror="this.style.display='none'">`;
  }

  let durabilityHTML = '';
  
  // Check if "Durability Invisible" is set to "Yes"
  const durabilityInvisible = safe(item["Durability Invisible"]);
  const invisibleStyle = (durabilityInvisible && durabilityInvisible.toLowerCase() === 'yes') ? 'style="opacity: 0;"' : '';
  
  if (durability && durability.includes('/')) {
    const maxDurability = durability.split('/')[1] || "100";
    const currentDurability = durability.split('/')[0] || maxDurability;
    
    durabilityHTML = `
      <div class="durability-control" ${invisibleStyle}>
        <label>Durability:</label>
        <div class="durability-input-row">
          <input type="number" class="durability-input" 
                 value="${currentDurability}" 
                 max="${maxDurability}" 
                 min="0" 
                 oninput="enforceMaxDurability(this)"
                 onchange="updateCardValues(this)">
          <span class="durability-max">/${maxDurability}</span>
          <div class="durability-arrows">
            <button onmousedown="adjustDurability(this, 1)">▲</button>
            <button onmousedown="adjustDurability(this, -1)">▼</button>
          </div>
        </div>
      </div>
    `;
    
  }

  // Calculate exact repair price (numeric; format later in template)
let repairPrice = 0;
if (durability && durability.includes('/') && internalValue) {
  const [currentDurability, maxDurability] = durability.split('/').map(v => parseInt(v) || 0);
  const missingDurability = maxDurability - currentDurability;

  // Convert internal value (handles "$" and "k")
  const internalVal = parseFloat(internalValue.replace(/[$,k]/gi, '')) *
                      (internalValue.toLowerCase().includes('k') ? 1000 : 1);

  // Use tested divisor (1.43) for accuracy
  const rawRepair = missingDurability * (internalVal / maxDurability / 1.43);
  repairPrice = Math.round(rawRepair);
}

  // Calculate exact pawn amount (money formatted)
let pawnAmount = 0;
if (durability && durability.includes('/') && internalValue) {
  const [currentDurability, maxDurability] = durability.split('/').map(v => parseInt(v) || 0);

  // Convert internal value (handles "$" and "k")
  const internalVal = parseFloat(internalValue.replace(/[$,k]/gi, '')) *
                      (internalValue.toLowerCase().includes('k') ? 1000 : 1);

  // Pawn formula: (internalValue * 0.3) - ((maxDurability - currentDurability) * ((internalValue * 0.3) / maxDurability / 1.43))
  const baseValue = internalVal * 0.3;
  const missingDurability = maxDurability - currentDurability;
  const deduction = missingDurability * ((internalVal * 0.3) / maxDurability / 1.43);
  
  const rawPawn = baseValue - deduction;
  pawnAmount = Math.round(rawPawn);

  // Format as money
  pawnAmount = `$${pawnAmount.toLocaleString()}`;
}
  
  return `
    <div class="card" data-name="${escapeAttr(name)}" 
         data-avg="${escapeAttr(avg)}" 
         data-ranged="${escapeAttr(ranged)}" 
         data-max-durability="${durability ? durability.split('/')[1] : '100'}"
         data-internal-value="${escapeAttr(internalValue)}">
      <div class="card-left">
        ${imgTag}
        ${durabilityHTML}
      </div>
      <div class="card-info">
        <h3>${name}</h3>
        ${demand ? `<span class="badge">Demand: ${demand}</span>` : ""}
        <div class="card-avg">Average Value: <span class="avg-value">${avg}</span></div>
        <div class="card-ranged">Ranged Value: <span class="ranged-value">${ranged}</span></div>
        ${durability && internalValue ? `<div class="card-pawn">Pawn Amount: <span class="pawn-value">${pawnAmount}</span></div>` : ''}
        ${durability && internalValue ? `
          <div class="card-repair">
            Repair Price: <span class="repair-value">$${repairPrice.toLocaleString()}</span>
          </div>
        ` : ''}
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
    const reasonWithLinks = reason.replace(/https?:\/\/\S+/g, match => `<a href="${match}" target="_blank" rel="noopener" class="scammer-link">User Profile</a>`);
  const evidence = safe(item["Evidence"]);
  const submittedDate = item["Date"] || item["Submitted Date"] || "";

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
                <div class="scammer-field"><strong>Reason:</strong> ${reasonWithLinks}</div>
        ${evidenceHtml ? `<div class="scammer-field"><strong>Evidence:</strong> ${evidenceHtml}</div>` : ""}
        <div>Reported: ${submittedDate}</div>
      </div>
    </div>
  `;
}

function renderSection(title, items) {
  // Always render BlockSpin Map even if no items
  if (title === "BlockSpin Map") {
    renderBlockSpinMapSection();
    return;
  }

  // Always render Home section even if no items
  if (title === "Home") {
    const html = `
      <section class="section" id="${slugify(title)}">
        <h2>${title}</h2>
        <div class="home-content">
          <!-- Add your home page content here -->
        </div>
      </section>
    `;
    document.getElementById("sections").insertAdjacentHTML("beforeend", html);
    return;
  }

  if (title === "Trade List") {
    renderTradeListSection(items || []);
    return;
  }

  if (!items || items.length === 0) return;

  if (title === "💰 Richest Players") {
    renderRichestPlayersSection(items);
  } else if (title === "Crew Logos") {
    renderCrewLogosSection(items);
  } else if (title === "Legendary") {
    renderLegendarySectionWithBanner(items);
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

function renderLegendarySectionWithBanner(items) {
  const html = `
    <section class="section" id="${slugify("Legendary")}">
      <h2>Legendary</h2>
      <div class="cards">
        ${items.map(createCard).join("")}
      </div>
      <div class="legendary-banner">
        <p class="legendary-banner-text">We giveaway 1 legendary gun in our discord server every day!</p>
        <a href="https://discord.gg/scgqMpPAC6" target="_blank" rel="noopener" class="legendary-banner-btn">Join our Discord server</a>
        <p class="legendary-banner-members"><span id="discord-member-count">—</span> members</p>
      </div>
    </section>
  `;
  document.getElementById("sections").insertAdjacentHTML("beforeend", html);
  fetchDiscordMemberCount();
}

function fetchDiscordMemberCount() {
  var el = document.getElementById("discord-member-count");
  if (!el) return;
  fetch("https://discord.com/api/v10/invites/QbapryYUUx?with_counts=true")
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var n = data.approximate_member_count;
      if (typeof n === "number" && !isNaN(n)) {
        el.textContent = n.toLocaleString();
      }
    })
    .catch(function () {});
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


 function renderRichestPlayersSection(items) {
  const html = `
    <section class="section" id="${slugify("💰 Richest Players")}">
      ${createRichestPlayersSection(items)}
    </section>
  `;
  document.getElementById("sections").insertAdjacentHTML("beforeend", html);
  
  // Add event listener after HTML is inserted
  setTimeout(() => {
    const searchInput = document.getElementById('richest-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function(e) {
        filterRichestPlayers(e.target.value);
      });
    }
  }, 100);
}

// TRADE LIST SECTION
const TRADE_LIST_STORAGE_KEY = "blockspin_trade_list";

let TRADE_LIST_ALL_ITEMS = [];

function getNumericValueWithDurability(originalValue, durabilityPercent) {
  if (!originalValue || originalValue === "" || originalValue === "N/A" || originalValue === "-") return 0;
  const valueMultiplier = 0.20 + 0.80 * durabilityPercent;
  if (typeof originalValue === "string" && originalValue.includes(" to ")) {
    const parts = originalValue.split(" to ");
    const low = parseValue(parts[0]) * valueMultiplier;
    const high = parseValue(parts[1]) * valueMultiplier;
    return (low + high) / 2;
  }
  return parseValue(originalValue) * valueMultiplier;
}

function createTradeListCard(entry, side) {
  const item = entry.item;
  const name = safe(item["Name"]);
  const img = safe(item["Image URL"]);
  const demand = safe(item["Demand"]);
  const avg = safe(item["Average Value"]);
  const ranged = safe(item["Ranged Value"]);
  const internalValue = safe(item["Internal Value"]);
  const durability = entry.durability || item["Durability"] || "";
  const maxDurability = durability && durability.includes("/") ? durability.split("/")[1] : "100";
  const currentDurability = durability && durability.includes("/") ? durability.split("/")[0] : maxDurability;
  const durabilityInvisible = safe(item["Durability Invisible"]);
  const invisibleStyle = (durabilityInvisible && durabilityInvisible.toLowerCase() === "yes") ? 'style="opacity: 0;"' : "";

  let imgTag = img ? `<img src="${img}" alt="${name}" onerror="this.style.display='none'">` : "";
  let durabilityHTML = "";
  if (durability && durability.includes("/")) {
    durabilityHTML = `
      <div class="durability-control" ${invisibleStyle}>
        <label>Durability:</label>
        <div class="durability-input-row">
          <input type="number" class="durability-input"
                 value="${currentDurability}" max="${maxDurability}" min="0"
                 oninput="enforceMaxDurability(this)" onchange="updateCardValues(this); tradeListSaveAndUpdateTotals();">
          <span class="durability-max">/${maxDurability}</span>
          <div class="durability-arrows">
            <button type="button" onmousedown="adjustDurability(this, 1)">▲</button>
            <button type="button" onmousedown="adjustDurability(this, -1)">▼</button>
          </div>
        </div>
      </div>`;
  }

  let repairPrice = 0;
  if (durability && durability.includes("/") && internalValue) {
    const [cur, max] = durability.split("/").map(v => parseInt(v) || 0);
    const missing = max - cur;
    const internalVal = parseFloat(String(internalValue).replace(/[$,k]/gi, "")) * (String(internalValue).toLowerCase().includes("k") ? 1000 : 1);
    repairPrice = Math.round(missing * (internalVal / max / 1.43));
  }
  let pawnAmount = 0;
  if (durability && durability.includes("/") && internalValue) {
    const [cur, max] = durability.split("/").map(v => parseInt(v) || 0);
    const internalVal = parseFloat(String(internalValue).replace(/[$,k]/gi, "")) * (String(internalValue).toLowerCase().includes("k") ? 1000 : 1);
    const baseValue = internalVal * 0.3;
    const deduction = (max - cur) * ((internalVal * 0.3) / max / 1.43);
    pawnAmount = Math.round(baseValue - deduction);
  }

  const qty = entry.quantity || 1;
  const qtyBadge = qty > 1 ? `<span class="trade-list-qty">×${qty}</span>` : "";

  return `
    <div class="trade-list-card-wrapper" data-trade-entry-id="${entry.id}" data-side="${side}">
      <button type="button" class="trade-list-remove" onclick="tradeListRemoveEntry('${side}', '${entry.id}')" aria-label="Remove">×</button>
      ${qtyBadge}
      <div class="card trade-list-card" data-name="${escapeAttr(name)}"
           data-avg="${escapeAttr(avg)}" data-ranged="${escapeAttr(ranged)}"
           data-max-durability="${maxDurability}" data-internal-value="${escapeAttr(internalValue)}">
        <div class="card-left">
          ${imgTag}
          ${durabilityHTML}
        </div>
        <div class="card-info">
          <h3>${name}</h3>
          ${demand ? `<span class="badge">Demand: ${demand}</span>` : ""}
          <div class="card-avg">Average Value: <span class="avg-value">${avg}</span></div>
          <div class="card-ranged">Ranged Value: <span class="ranged-value">${ranged}</span></div>
          ${durability && internalValue ? `<div class="card-pawn">Pawn Amount: <span class="pawn-value">$${pawnAmount.toLocaleString()}</span></div>` : ""}
          ${durability && internalValue ? `<div class="card-repair">Repair Price: <span class="repair-value">$${repairPrice.toLocaleString()}</span></div>` : ""}
        </div>
      </div>
    </div>`;
}

function tradeListGetState() {
  try {
    const raw = localStorage.getItem(TRADE_LIST_STORAGE_KEY);
    if (!raw) return { want: [], give: [] };
    const parsed = JSON.parse(raw);
    return { want: parsed.want || [], give: parsed.give || [] };
  } catch (e) {
    return { want: [], give: [] };
  }
}

function tradeListSaveState(state) {
  try {
    const toSave = {
      want: state.want.map(e => ({
        id: e.id,
        quantity: e.quantity,
        durability: e.durability,
        itemName: e.item["Name"],
        item: e.item
      })),
      give: state.give.map(e => ({
        id: e.id,
        quantity: e.quantity,
        durability: e.durability,
        itemName: e.item["Name"],
        item: e.item
      }))
    };
    localStorage.setItem(TRADE_LIST_STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {}
}

function tradeListComputeSideTotal(entries) {
  let total = 0;
  entries.forEach(entry => {
    const dur = entry.durability || entry.item["Durability"] || "";
    const [cur, max] = dur.includes("/") ? dur.split("/").map(Number) : [1, 1];
    const pct = max > 0 ? cur / max : 1;
    const numVal = getNumericValueWithDurability(entry.item["Average Value"], pct);
    total += numVal * (entry.quantity || 1);
  });
  return total;
}

function tradeListRenderBoxes() {
  const state = tradeListGetState();
  const wantEl = document.getElementById("trade-list-want-cards");
  const giveEl = document.getElementById("trade-list-give-cards");
  const wantTotalEl = document.getElementById("trade-list-want-total");
  const giveTotalEl = document.getElementById("trade-list-give-total");
  if (!wantEl || !giveEl) return;

  wantEl.innerHTML = state.want.length === 0
    ? '<div class="trade-list-empty">No items yet. Search above and add to this side.</div>'
    : state.want.map(e => createTradeListCard(e, "want")).join("");
  giveEl.innerHTML = state.give.length === 0
    ? '<div class="trade-list-empty">No items yet. Search above and add to this side.</div>'
    : state.give.map(e => createTradeListCard(e, "give")).join("");

  const wantTotal = tradeListComputeSideTotal(state.want);
  const giveTotal = tradeListComputeSideTotal(state.give);
  if (wantTotalEl) wantTotalEl.textContent = "$" + Math.round(wantTotal).toLocaleString();
  if (giveTotalEl) giveTotalEl.textContent = "$" + Math.round(giveTotal).toLocaleString();
}

function tradeListSyncStateFromDom() {
  const state = tradeListGetState();
  ["want", "give"].forEach(side => {
    state[side].forEach(entry => {
      const wrap = document.querySelector(`.trade-list-card-wrapper[data-side="${side}"][data-trade-entry-id="${entry.id}"]`);
      if (!wrap) return;
      const input = wrap.querySelector(".durability-input");
      if (input) {
        const max = input.getAttribute("max") || "100";
        entry.durability = input.value + "/" + max;
      }
    });
  });
  return state;
}

function tradeListSaveAndUpdateTotals() {
  const state = tradeListSyncStateFromDom();
  tradeListSaveState(state);
  tradeListRenderBoxes();
}

window.tradeListRemoveEntry = function(side, id) {
  const state = tradeListGetState();
  if (side === "want") state.want = state.want.filter(e => e.id !== id);
  else state.give = state.give.filter(e => e.id !== id);
  tradeListSaveState(state);
  tradeListRenderBoxes();
};

window.tradeListAddToSide = function(side, item, quantity, durability) {
  const state = tradeListGetState();
  let dur = durability || item["Durability"] || "";
  if (dur && dur.includes("/")) {
    const max = dur.split("/")[1] || "100";
    dur = max + "/" + max;
  }
  const qty = quantity || 1;
  const arr = side === "want" ? state.want : state.give;
  const existing = arr.find(e => e.item["Name"] === item["Name"] && (e.durability || "") === dur);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + qty;
  } else {
    arr.push({
      id: "tl_" + Date.now() + "_" + Math.random().toString(36).slice(2),
      item: item,
      quantity: qty,
      durability: dur
    });
  }
  tradeListSaveState(state);
  tradeListRenderBoxes();
  const modal = document.getElementById("trade-list-add-modal");
  if (modal) modal.remove();
};

function renderTradeListSection(allItems) {
  TRADE_LIST_ALL_ITEMS = allItems || [];
  const sectionId = slugify("Trade List");
  const existing = document.getElementById(sectionId);
  if (existing) return;

  const html = `
    <section class="section trade-list-section" id="${sectionId}">
      <h2>Trade List</h2>
      <p class="trade-list-intro">Build your trade post below. Search for items and add them to &quot;What I want&quot; or &quot;What I'll give&quot;. Screenshot the two boxes to share your trade.</p>
      <div class="trade-list-search-wrap">
        <input type="text" class="trade-list-search" id="trade-list-search" placeholder="Search items to add..." autocomplete="off" />
        <div class="trade-list-search-results" id="trade-list-search-results"></div>
      </div>
      <div class="trade-list-boxes">
        <div class="trade-list-box trade-list-box-want">
          <h3>What I want</h3>
          <div class="trade-list-total">Total: <span id="trade-list-want-total">$0</span></div>
          <div class="trade-list-cards" id="trade-list-want-cards"></div>
        </div>
        <div class="trade-list-box trade-list-box-give">
          <h3>What I'll give</h3>
          <div class="trade-list-total">Total: <span id="trade-list-give-total">$0</span></div>
          <div class="trade-list-cards" id="trade-list-give-cards"></div>
        </div>
      </div>
    </section>
  `;
  document.getElementById("sections").insertAdjacentHTML("beforeend", html);

  tradeListRenderBoxes();

  const searchInput = document.getElementById("trade-list-search");
  const resultsDiv = document.getElementById("trade-list-search-results");
  if (searchInput && resultsDiv) {
    searchInput.addEventListener("input", function() {
      const q = this.value.trim().toLowerCase();
      if (q.length < 2) {
        resultsDiv.innerHTML = "";
        resultsDiv.classList.remove("open");
        return;
      }
      const matches = TRADE_LIST_ALL_ITEMS.filter(it =>
        String(it["Name"] || "").toLowerCase().includes(q)
      ).slice(0, 10);
      if (matches.length === 0) {
        resultsDiv.innerHTML = "<div class=\"trade-list-no-results\">No items found</div>";
        resultsDiv.classList.add("open");
        return;
      }
      resultsDiv.innerHTML = matches.map(it => {
        const name = safe(it["Name"]);
        const img = safe(it["Image URL"]);
        return `<div class="trade-list-result" data-item-name="${escapeAttr(it["Name"] || "")}">
          ${img ? `<img src="${img}" alt="" onerror="this.style.display='none'">` : ""}
          <span>${name}</span>
        </div>`;
      }).join("");
      resultsDiv.classList.add("open");
      resultsDiv.querySelectorAll(".trade-list-result").forEach(el => {
        el.addEventListener("click", function() {
          const itemName = this.getAttribute("data-item-name");
          if (!itemName) return;
          const item = TRADE_LIST_ALL_ITEMS.find(it => it["Name"] === itemName);
          if (!item) return;
          searchInput.value = "";
          resultsDiv.innerHTML = "";
          resultsDiv.classList.remove("open");
          const modal = document.createElement("div");
          modal.id = "trade-list-add-modal";
          modal.className = "trade-list-add-modal";
          modal.innerHTML = `
            <div class="trade-list-add-modal-content">
              <p>Add &quot;${safe(item["Name"])}&quot; to which side?</p>
              <div class="trade-list-add-buttons">
                <button type="button" onclick="tradeListAddToSide('want', window.__tradeListPendingItem)">What I want</button>
                <button type="button" onclick="tradeListAddToSide('give', window.__tradeListPendingItem)">What I'll give</button>
                <button type="button" class="trade-list-modal-cancel" onclick="this.closest('.trade-list-add-modal').remove()">Cancel</button>
              </div>
            </div>
          `;
          modal.addEventListener("click", function(e) {
            if (e.target === modal) modal.remove();
          });
          window.__tradeListPendingItem = item;
          document.body.appendChild(modal);
        });
      });
    });
    document.addEventListener("click", function closeResults(e) {
      if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
        resultsDiv.classList.remove("open");
      }
    });
  }
}

// SECTION NAVIGATION 
function initSectionsNav() {
  const nav = document.getElementById("sections-nav");
  
  SECTION_NAMES.forEach((name, index) => {
    // Add gap and "Extras" header before first Extra
    if (name === "Trade List") {
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

//  BANNER LOGIC FROM MAIN SITE
function showSection(name) {
  console.log(`Showing section: ${name}`);
  
    // Reset durability when switching sections
  document.querySelectorAll('.durability-input').forEach(input => {
    const card = input.closest('.card');
    const maxDurability = card.dataset.maxDurability;
    input.value = maxDurability;
    updateCardValues(input);
  });
  
   // Hide/show tax calculator and home value changes based on section (same slot: one or the other)
  const taxCalc = document.querySelector('.tax-calculator');
  const homeValueChanges = document.getElementById('home-value-changes');
  const hiddenSections = ['Home', 'Crew Logos', 'Crate Game', '💰 Richest Players', 'Trade List'];
  const isHome = name === 'Home';
  if (taxCalc) {
    if (hiddenSections.includes(name)) {
      taxCalc.style.visibility = 'hidden';
      taxCalc.style.opacity = '0';
      taxCalc.style.display = isHome ? 'none' : 'block'; // free the slot on Home for value changes
    } else {
      taxCalc.style.visibility = 'visible';
      taxCalc.style.opacity = '1';
      taxCalc.style.display = 'block';
    }
  }
  if (homeValueChanges) {
    if (isHome) {
      homeValueChanges.style.visibility = 'visible';
      homeValueChanges.style.opacity = '1';
      homeValueChanges.style.display = 'block';
    } else {
      homeValueChanges.style.visibility = 'hidden';
      homeValueChanges.style.opacity = '0';
      homeValueChanges.style.display = 'none';
    }
  }

    
  // Hide/show search bar based on section
  const searchContainer = document.querySelector('.search-container');
  if (searchContainer) {
    const hiddenSearchSections = ['Home', 'Crew Logos', 'Crate Game', '💰 Richest Players', 'Trade List'];
    if (hiddenSearchSections.includes(name)) {
      searchContainer.style.cssText = 'visibility: hidden; height: 0; margin: 0;';
    } else {
      searchContainer.style.cssText = 'visibility: visible; height: auto; margin: 20px 0 !important; width: 100%; display: flex; justify-content: center; align-items: center;';
    }
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


}

// SEARCH 
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

function getTaxBreakdown(amountWant) {
  const want = Math.round(Number(amountWant) || 0);
  if (want <= 0) return { totalWithdraw: 0, lines: [], singleDrop: true };
  const totalWithdraw = Math.round(want / TAX_RECEIVE_RATIO);
  if (totalWithdraw <= TAX_MAX_DROP) {
    return { totalWithdraw, lines: ['Withdraw the amount above and drop once.'], singleDrop: true };
  }
  const full40kCount = Math.floor(totalWithdraw / TAX_MAX_DROP);
  const receivedFromFull = full40kCount * TAX_RECEIVE_PER_40K;
  const lastReceive = want - receivedFromFull;
  const lastWithdraw = Math.round(lastReceive / TAX_RECEIVE_RATIO);
  const moreCount = full40kCount - 1;
  const moreTimes = moreCount === 1 ? '1 more time' : moreCount.toLocaleString() + ' more times';
  const lines = [
    'Withdraw $40,000 and drop.',
    'Repeat ' + moreTimes + '.'
  ];
  if (lastWithdraw > 0) {
    lines.push('Then withdraw $' + lastWithdraw.toLocaleString() + ' and drop once.');
  }
  return { totalWithdraw, lines, singleDrop: false };
}

// TAX CALCULATOR (40k max per drop, multi-drop breakdown)
function initTaxCalculator() {
  const taxInput = document.getElementById("taxInput");
  const taxAmount = document.getElementById("tax-amount");
  const taxBreakdown = document.getElementById("tax-breakdown");

  if (!taxInput || !taxAmount) {
    console.log("Tax calculator elements not found");
    return;
  }

  function update() {
    const raw = taxInput.value.replace(/[^\d]/g, '');
    const want = parseInt(raw, 10) || 0;
    const b = getTaxBreakdown(want);
    taxAmount.textContent = b.totalWithdraw.toLocaleString();
    if (taxBreakdown) {
      if (b.totalWithdraw <= 0) {
        taxBreakdown.innerHTML = '';
        return;
      }
      taxBreakdown.innerHTML = '<span class="tax-how-label">How to drop this much:</span><br>' +
        b.lines.map(function(line) { return line + '<br>'; }).join('');
    }
  }

  taxInput.addEventListener("input", function(e) {
    const cursorPos = e.target.selectionStart;
    const oldValue = e.target.value;
    const newValue = oldValue.replace(/[^\d]/g, '');
    if (oldValue !== newValue) {
      e.target.value = newValue;
      e.target.setSelectionRange(Math.max(0, cursorPos - 1), Math.max(0, cursorPos - 1));
    }
    update();
  });

  taxInput.addEventListener('paste', function(e) {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text');
    const cleaned = (paste || '').replace(/[^\d]/g, '');
    document.execCommand('insertText', false, cleaned);
  });

  update();
}

// COPY TO CLIPBOARD
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

// DURABILITY FUNCTIONS 
let durabilityInterval = null;
let durabilityTimeout = null;

// Prevent typing numbers higher than max
function enforceMaxDurability(input) {
  const card = input.closest('.card');
  const maxDurability = parseInt(card.dataset.maxDurability);
  let value = parseInt(input.value);
  
  if (value > maxDurability) {
    input.value = maxDurability;
  } else if (value < 0) {
    input.value = 0;
  }
  
  updateCardValues(input);
}

function adjustDurability(btn, direction) {
  event.preventDefault(); // Prevent both touch and mouse events firing
  
  const card = btn.closest('.card');
  const input = card.querySelector('.durability-input');
  const maxDurability = parseInt(card.dataset.maxDurability);
  
  function adjust() {
    let newValue = (parseInt(input.value) || 0) + direction;
    newValue = Math.max(0, Math.min(newValue, maxDurability));
    input.value = newValue;
    updateCardValues(input);
  }
  
  adjust();
  
  durabilityTimeout = setTimeout(() => {
    durabilityInterval = setInterval(adjust, 50);
  }, 200);
}

function stopDurabilityAdjust() {
  if (durabilityInterval) {
    clearInterval(durabilityInterval);
    durabilityInterval = null;
  }
  if (durabilityTimeout) {
    clearTimeout(durabilityTimeout);
    durabilityTimeout = null;
  }
}

function updateCardValues(input) {
  const card = input.closest('.card');
  const currentDurability = parseInt(input.value) || 0; // Fixed: Default to 0 if empty
  const maxDurability = parseInt(card.dataset.maxDurability);
  
  const durabilityPercent = currentDurability / maxDurability;
  
  const originalAvg = card.dataset.avg;
  const originalRanged = card.dataset.ranged;
  
  card.querySelector('.avg-value').textContent = calculateDurabilityValue(originalAvg, durabilityPercent);
  card.querySelector('.ranged-value').textContent = calculateDurabilityValue(originalRanged, durabilityPercent);
  
  // Update repair price
  const internalValue = card.dataset.internalValue;
  const repairValueElement = card.querySelector('.repair-value');
  
  if (repairValueElement && internalValue) {
    const missingDurability = maxDurability - currentDurability;
    const internalVal = parseFloat(internalValue.replace(/[$,k]/gi, '')) * (internalValue.toLowerCase().includes('k') ? 1000 : 1);
    const repairPrice = Math.round(missingDurability * (internalVal / maxDurability / 1.43));
    repairValueElement.textContent = '$' + (isNaN(repairPrice) ? 0 : repairPrice).toLocaleString(); // Fixed: Shows $0 instead of NaN
  }
  
  // Update pawn amount
  const pawnValueElement = card.querySelector('.pawn-value');
  
  if (pawnValueElement && internalValue) {
    const missingDurability = maxDurability - currentDurability;
    const internalVal = parseFloat(internalValue.replace(/[$,k]/gi, '')) * (internalValue.toLowerCase().includes('k') ? 1000 : 1);
    
    // Pawn formula
    const baseValue = internalVal * 0.3;
    const deduction = missingDurability * ((internalVal * 0.3) / maxDurability / 1.43);
    const pawnPrice = Math.round(baseValue - deduction);
    
    pawnValueElement.textContent = '$' + (isNaN(pawnPrice) ? 0 : pawnPrice).toLocaleString(); // Fixed: Shows $0 instead of NaN
  }
}

function calculateDurabilityValue(originalValue, durabilityPercent) {
  if (!originalValue || originalValue === '' || originalValue === 'N/A' || originalValue === '-') {
    return originalValue || 'N/A';
  }
  
  // New formula: 20% floor + 80% scaled by durability
  const valueMultiplier = 0.20 + (0.80 * durabilityPercent);
  
  // Handle range format (works for "Ranged Value")
  if (originalValue.includes(' to ')) {
    const parts = originalValue.split(' to ');
    const low = parseValue(parts[0]) * valueMultiplier;
    const high = parseValue(parts[1]) * valueMultiplier;
    
    if (!isNaN(low) && !isNaN(high)) {
      const lowFormatted = formatLikeOriginal(low, parts[0]);
      const highFormatted = formatLikeOriginal(high, parts[1]);
      return lowFormatted + ' to ' + highFormatted;
    }
  }
  
  // Handle single value
  const value = parseValue(originalValue) * valueMultiplier;
  
  if (!isNaN(value) && value > 0) {
    return formatLikeOriginal(value, originalValue);
  }
  
  return originalValue;
}

function parseValue(str) {
  if (!str) return 0;
  
  str = str.toString().trim().toLowerCase();
  str = str.replace(/[$,]/g, ''); // Remove $ and commas
  
  if (str.includes('k')) {
    return parseFloat(str.replace('k', '')) * 1000;
  }
  
  if (str.includes('m')) {
    return parseFloat(str.replace('m', '')) * 1000000;
  }
  
  return parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
}



function formatLikeOriginal(num, original) {
  num = Math.round(num);
  
  // Check what format the original was in
  const wasK = original.toLowerCase().includes('k');
  const wasM = original.toLowerCase().includes('m');
  const hadCommas = original.includes(',');
  
  if (wasM) {
    // Original was in millions — round to whole number
    const m = Math.round(num / 1000000);
    return '$' + m + 'm';
  } else if (wasK) {
    // Original was in thousands — round to whole number
    const k = Math.round(num / 1000);
    return '$' + k + 'k';
  } else if (hadCommas || num >= 1000) {
    // Original had commas or number is big enough
    return '$' + num.toLocaleString();
  } else {
    // Simple number
    return '$' + num;
  }
}

document.addEventListener('mouseup', stopDurabilityAdjust);
document.addEventListener('touchend', stopDurabilityAdjust);

// HELPERS 
function safe(str) { return str ?? ""; }
function escapeAttr(str) { return (str+"").replace(/"/g, "&quot;"); }
function slugify(str) { return str.toLowerCase().replace(/\s+/g, "-"); }

// INIT - PARALLEL LOADING FOR SPEED 
document.addEventListener("DOMContentLoaded", async () => {
  console.log('DOM loaded, initializing...');

  // Safety timeout - force hide loading screen after 15 seconds
  setTimeout(() => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen && loadingScreen.style.display !== 'none') {
      console.warn('Loading timeout - forcing hide');
      loadingScreen.style.display = 'none';
    }
  }, 15000);
  
  const sectionsContainer = document.getElementById("sections");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");

  
  initSectionsNav();
  initSearch();
  initTaxCalculator();

  const totalSections = SECTION_NAMES.length;
  let loadedSections = 0;

  // Fetch all sections at once (parallel)
  const fetchPromises = SECTION_NAMES.map(async (sec) => {
   
    console.log(`Fetching data for: ${sec}`);
    
    let items;
    try {
      // Use NEW spreadsheet for Richest Players, OLD spreadsheet for everything else
      if (sec === "💰 Richest Players") {
        items = await fetchRichestPlayers(); // NEW spreadsheet
        console.log(`Got ${items.length} items for ${sec} from NEW spreadsheet`);
      } else if (sec === "Trade List") {
        items = await fetchAllItemsForTradeList();
        console.log(`Got ${items.length} items for Trade List`);
      } else {
        items = await fetchSheet(sec); // OLD spreadsheet
        console.log(`Got ${items.length} items for ${sec} from OLD spreadsheet`);
      }
    } catch (error) {
      console.error(`Failed to load ${sec}:`, error);
      items = [];
    }
    
    loadedSections++;
    const progress = Math.round((loadedSections / totalSections) * 100);
    progressBar.style.width = progress + '%';
    progressText.textContent = progress + '%';
    
    return { section: sec, items };
  });

  // Wait for all to finish
  const results = await Promise.all(fetchPromises);
  
  // Render in order
  results.forEach(({ section, items }) => {
    renderSection(section, items);
  });

  
  showSection("Home");
  loadTopDonators();
  loadValueChanges();

  sectionsContainer.classList.add("loaded");
  
  setTimeout(() => {
    document.getElementById('loading-screen').style.display = 'none';
  }, 300);

});

function openRiverLinks(e) {
  e.preventDefault();
  const modal = document.createElement('div');
  modal.className = 'river-links-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>River's Contact</h2>
      <div class="links-list">
        <a href="https://www.roblox.com/users/2361072897/profile" target="_blank">
          <span class="link-icon">🎮</span>
          <span class="link-text">Roblox Profile</span>
        </a>
        <div class="copy-link" onclick="copyToClipboard('_.riverr')">
          <svg class="link-icon discord-svg" viewBox="0 0 24 24" width="20" height="20" fill="#5865F2">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.29a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          <span class="link-text">Discord: _.riverr</span>
          <span class="copy-icon">📋</span>
        </div>
        <div class="copy-link" onclick="copyToClipboard('riverytacc11@gmail.com')">
          <span class="link-icon">📧</span>
          <span class="link-text">Email: riverytacc11@gmail.com</span>
          <span class="copy-icon">📋</span>
        </div>
      </div>
      <button class="close-modal-btn" onclick="this.parentElement.parentElement.remove()">Close</button>
    </div>
  `;
  document.body.appendChild(modal);
}

// Fetch and display top donators
async function loadTopDonators() {
  try {
    const donators = await fetchSheet("Top Donate");
    const donatorList = document.getElementById('donator-list');
    const mobileDonatorList = document.getElementById('mobile-donator-list');
    
    if (!donators || donators.length === 0) {
      const noDonatorsHTML = '<div class="donator-loading">No donators yet</div>';
      if (donatorList) donatorList.innerHTML = noDonatorsHTML;
      if (mobileDonatorList) mobileDonatorList.innerHTML = noDonatorsHTML;
      return;
    }
    
    const top10 = donators.slice(0, 10);
    
    const donatorsHTML = top10.map((donator, index) => {
      const rank = index + 1;
      const name = donator.Name || 'Anonymous';
      const donation = donator.Donation || '0';
      const profile = donator['User Profile'] || '#';
      
      const formattedDonation = donation;
      
      return `
        <div class="donator-item">
          <div class="donator-rank">${rank}</div>
          <div class="donator-info">
            <div class="donator-name">${name}</div>
            <div class="donator-amount">${formattedDonation}</div>
            ${profile !== '#' ? `<a href="${profile}" target="_blank" class="donator-profile">View Profile 🔗</a>` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    if (donatorList) donatorList.innerHTML = donatorsHTML;
    if (mobileDonatorList) mobileDonatorList.innerHTML = donatorsHTML;
    
  } catch (error) {
    console.error('Error loading donators:', error);
    const errorHTML = '<div class="donator-loading">Failed to load donators</div>';
    const donatorList = document.getElementById('donator-list');
    const mobileDonatorList = document.getElementById('mobile-donator-list');
    if (donatorList) donatorList.innerHTML = errorHTML;
    if (mobileDonatorList) mobileDonatorList.innerHTML = errorHTML;
  }
}

// Fetch and display recent value changes from spreadsheet (sheet: "Website Configs", columns: Title, Date, Text, Color)
async function loadValueChanges() {
  var listEl = document.getElementById('value-changes-list');
  if (!listEl) return;
  try {
    var rows = await fetchSheet("Website Configs");
    if (!rows || rows.length === 0) {
      listEl.innerHTML = '<div class="value-changes-loading">No value changes yet.</div>';
      return;
    }
    var filtered = rows.filter(function (r) {
      var t = (r.Title || r.Date || r.Text || '').toString().trim();
      return t.length > 0;
    });
    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="value-changes-loading">No value changes yet.</div>';
      return;
    }
    var colorMap = { green: 'green', orange: 'orange', red: 'red', blue: 'blue' };
    var html = filtered.map(function (r) {
      var title = (r.Title || '').toString().trim();
      var date = (r.Date || '').toString().trim();
      var text = (r.Text || '').toString().trim();
      var color = (r.Color || '').toString().trim().toLowerCase();
      var colorClass = colorMap[color] ? ' value-change-item--' + colorMap[color] : '';
      var titleEsc = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      var dateEsc = date.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      var textEsc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>');
      return '<div class="value-change-item' + colorClass + '">' +
        '<div class="value-change-icon' + colorClass + '"></div>' +
        (titleEsc ? '<p class="value-change-title">' + titleEsc + '</p>' : '') +
        (dateEsc ? '<p class="value-change-date">' + dateEsc + '</p>' : '') +
        (textEsc ? '<p class="value-change-text">' + textEsc + '</p>' : '') +
        '</div>';
    }).join('');
    listEl.innerHTML = html;
  } catch (err) {
    console.error('Error loading value changes:', err);
    listEl.innerHTML = '<div class="value-changes-loading">Failed to load value changes.</div>';
  }
}


/* MOBILE MENU FUNCTIONALITY */

if (window.innerWidth <= 430) {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const sectionsNav = document.getElementById('sections-nav');
  
  if (hamburgerBtn && mobileMenu && sectionsNav) {
    const navClone = sectionsNav.cloneNode(true);
    mobileMenu.appendChild(navClone);
    
    hamburgerBtn.addEventListener('click', function() {
      hamburgerBtn.classList.toggle('active');
      mobileMenu.classList.toggle('active');
    });
    
    mobileMenu.addEventListener('click', function(e) {
      if (e.target.tagName === 'BUTTON') {
        hamburgerBtn.classList.remove('active');
        mobileMenu.classList.remove('active');
      }
    });
  }
}


// MOBILE TAX CALCULATOR

if (window.innerWidth <= 430) {
  // Wait for DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    const arrow = document.getElementById('mobile-calc-arrow');
    const calc = document.getElementById('mobile-tax-calc');
    const closeBtn = document.getElementById('mobile-calc-close');
    const input = document.getElementById('mobile-tax-input');
    const amount = document.getElementById('mobile-tax-amount');
    
    // Debug: Check if elements exist
    console.log('Arrow:', arrow);
    console.log('Calc:', calc);
    console.log('Close:', closeBtn);
    
    if (!arrow || !calc || !closeBtn || !input || !amount) {
      console.error('Mobile tax calculator elements not found!');
      return;
    }
    
    // Sections where calculator should appear
    const calcSections = ['home', 'uncommon', 'rare', 'epic', 'legendary', 'omega', 'vehicle', 'misc'];
    
    // Open calculator
    arrow.addEventListener('click', () => {
      console.log('Arrow clicked!');
      calc.classList.add('active');
    });
    
    // Close calculator
    closeBtn.addEventListener('click', () => {
      console.log('Close clicked!');
      calc.classList.remove('active');
    });
    
    const breakdownEl = document.getElementById('mobile-tax-breakdown');

    function updateMobileTax() {
      const want = parseInt((input.value || '').replace(/[^\d]/g, ''), 10) || 0;
      const b = getTaxBreakdown(want);
      amount.textContent = b.totalWithdraw.toLocaleString();
      if (breakdownEl) {
        if (b.totalWithdraw <= 0) {
          breakdownEl.innerHTML = '';
          return;
        }
        breakdownEl.innerHTML = '<span class="tax-how-label">How to drop this much:</span><br>' +
          b.lines.map(function(line) { return line + '<br>'; }).join('');
      }
    }
    input.addEventListener('input', updateMobileTax);
    updateMobileTax();

    // Show/hide arrow based on active section
    function updateArrowVisibility() {
      const sections = document.querySelectorAll('.sections > section');
      let activeSection = null;
      
      sections.forEach(section => {
        const computedStyle = window.getComputedStyle(section);
        if (computedStyle.display === 'block') {
          activeSection = section.id;
        }
      });
      
      console.log('Active section:', activeSection);
      
      if (calcSections.includes(activeSection)) {
        arrow.style.display = 'flex';
        console.log('Showing arrow');
      } else {
        arrow.style.display = 'none';
        calc.classList.remove('active');
        console.log('Hiding arrow');
      }
    }
    
    // Check on page load
    updateArrowVisibility();
    
    // Check when sections change
    const observer = new MutationObserver(updateArrowVisibility);
    const sectionsContainer = document.querySelector('.sections');
    if (sectionsContainer) {
      observer.observe(sectionsContainer, { 
        childList: true, 
        subtree: true, 
        attributes: true, 
        attributeFilter: ['style'] 
      });
    }
  });
}

/* ========== PINK WEBSITE THEME - theme switcher (remove with theme section in style.css) ========== */
function applyPinkThemeDividers() {
  var theme = document.body.getAttribute('data-theme');
  var gradient = theme === 'pink'
    ? 'linear-gradient(90deg, transparent, #d0a8b8, transparent)'
    : null;
  document.querySelectorAll('.home-divider').forEach(function(el) {
    if (gradient) {
      el.style.setProperty('background', gradient, 'important');
    } else {
      el.style.removeProperty('background');
    }
  });
}
function initThemeSwitcher() {
  var saved = localStorage.getItem('bsv-theme') || 'default';
  // Apply saved theme: '' for default, or specific theme name (e.g. 'red', 'pink', 'purple')
  if (saved === 'pink' || saved === 'red' || saved === 'purple') {
    document.body.setAttribute('data-theme', saved);
  } else {
    document.body.removeAttribute('data-theme');
    saved = 'default';
  }
  applyPinkThemeDividers();
  var wrap = document.getElementById('theme-switcher');
  if (!wrap) return;
  var btns = wrap.querySelectorAll('.theme-switcher-btn');
  btns.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-theme') === saved);
    btn.addEventListener('click', function() {
      var theme = this.getAttribute('data-theme');
      if (theme === 'default') {
        document.body.removeAttribute('data-theme');
      } else {
        document.body.setAttribute('data-theme', theme);
      }
      localStorage.setItem('bsv-theme', theme);
      btns.forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-theme') === theme); });
      applyPinkThemeDividers();
    });
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    initThemeSwitcher();
    applyPinkThemeDividers();
  });
} else {
  initThemeSwitcher();
  applyPinkThemeDividers();
}