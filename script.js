// === CONFIG ===
const SPREADSHEET_ID = "1vAm9x7c5JPxpHxDHVcDgQifXsAvW9iW2wPVuQLENiYs";
const SECTION_NAMES = ["Uncommon","Rare","Epic","Legendary","Omega","Misc","Cars"];

// === FETCH SHEET DATA ===
async function fetchSheet(sheetName) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&headers=1`;
    const res = await fetch(url);
    const text = await res.text();
    const json = JSON.parse(text.substring(47, text.length-2));
    const cols = json.table.cols.map(c => c.label?.trim() || "");
    const rows = json.table.rows || [];
    const items = rows.map(r => {
      const obj = {};
      cols.forEach((label,i)=>{ const cell=r.c?.[i]; obj[label]=cell ? (cell.f ?? cell.v ?? "") : ""; });
      return obj;
    });
    return items.filter(x => String(x["Name"]||"").trim());
  } catch(e){ console.error("Failed to fetch sheet:", sheetName, e); return []; }
}

// === RENDER CARDS ===
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

  const imgTag = img ? `<img src="${img}" alt="${name}" onerror="this.style.display='none'">` : "";

  return `
    <div class="card" data-name="${escapeAttr(name)}">
      ${imgTag}
      <div class="card-info">
        <h3>${name}</h3>
        ${demand?`<span class="badge">Demand: ${demand}</span>`:""}
        ${avg?`<div>Average Value: ${avg}</div>`:""}
        ${ranged?`<div>Ranged Value: ${ranged}</div>`:""}
        ${afterTax?`<div>After Tax Value: ${afterTax}</div>`:""}
        ${flipToggle ? `<button class="flip-btn">!</button><div class="flip-content hidden"><img src="${flipImg}" style="width:100%;height:auto;margin-top:8px;"><div>${flipText}</div></div>` : ""}
      </div>
    </div>
  `;
}

function renderSection(title, items) {
  if (!items || !items.length) return;
  const html = `<section class="section" id="${slugify(title)}"><h2>${title}</h2><div class="cards">${items.map(createCard).join("")}</div></section>`;
  document.getElementById("sections").insertAdjacentHTML("beforeend", html);
}

// === NAVIGATION ===
function initSectionsNav() {
  const nav = document.getElementById("sections-nav");
  SECTION_NAMES.forEach(name=>{
    const btn=document.createElement("button");
    btn.textContent=name;
    btn.addEventListener("click",()=>showSection(name));
    nav.appendChild(btn);
  });
}

function showSection(name) {
  SECTION_NAMES.forEach(sec=>{
    const el=document.getElementById(slugify(sec));
    if(el) el.style.display = sec===name ? "block":"none";
  });
  document.querySelectorAll("#sections-nav button").forEach(b=>b.classList.toggle("active",b.textContent===name));
}

// === SEARCH ===
function initSearch() {
  const input=document.getElementById("search");
  if(!input) return;
  input.addEventListener("input",()=>{
    const val=input.value.toLowerCase();
    document.querySelectorAll(".card").forEach(card=>{
      const name=card.dataset.name.toLowerCase();
      card.classList.toggle("hidden",!name.includes(val));
    });
  });
}

// === TAX CALCULATOR ===
function initTaxCalculator() {
  const taxInput=document.getElementById("taxInput");
  const taxResult=document.getElementById("taxResult");
  if(!taxInput||!taxResult) return;
  taxInput.addEventListener("input",()=>{
    const val=parseFloat(taxInput.value)||0;
    const withdraw=Math.round(val/0.72);
    taxResult.innerHTML=`Amount to withdraw: <span class="calc-amount">${withdraw}</span>`;
  });
}

// === FLIP BUTTON HANDLER ===
function initFlipButtons() {
  document.addEventListener("click",e=>{
    if(e.target.classList.contains("flip-btn")){
      const card = e.target.closest(".card");
      card.classList.add("clicked");
      const content = card.querySelector(".flip-content");
      if(content) content.classList.toggle("hidden");
    }
  });
}

// === HELPERS ===
function safe(str){return str??"";}
function escapeAttr(str){return (str+"").replace(/"/g,"&quot;");}
function slugify(str){return str.toLowerCase().replace(/\s+/g,"-");}

// === INIT ===
document.addEventListener("DOMContentLoaded", async()=>{
  initSectionsNav();
  initSearch();
  initTaxCalculator();
  initFlipButtons();
  for(const sec of SECTION_NAMES){
    const items = await fetchSheet(sec);
    renderSection(sec, items);
  }
  if(SECTION_NAMES.length>0) showSection(SECTION_NAMES[0]);
});
