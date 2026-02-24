/* Helpers */
const $ = (id) => document.getElementById(id);
const q = (sel) => document.querySelector(sel);
const qa = (sel) => Array.from(document.querySelectorAll(sel));

function setText(id, txt){ const el=$(id); if(el) el.textContent = txt; }
function enable(id, on){ const el=$(id); if(el) el.disabled = !on; }

function toast(msg){
  const t = $("toast"); if(!t) return;
  t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(window.__toastT);
  window.__toastT = setTimeout(()=>t.classList.add("hidden"), 1600);
}

function showModal(title, html){
  setText("modalTitle", title);
  const body = $("modalBody"); if(body) body.innerHTML = html || "";
  $("modalBackdrop")?.classList?.remove("hidden");
}
function hideModal(){ $("modalBackdrop")?.classList?.add("hidden"); }
$("modalClose")?.addEventListener("click", hideModal);
$("modalOk")?.addEventListener("click", hideModal);

/* State */
let sessionId = null;
let lastOpportunityRows = [];
let selectedOpp = "";
let completedSteps = new Set(); // Track completed steps
let currentOpportunitySelection = null; // Store current opportunity selections

/* Header */
const titles = {
  upload:["Upload Audience","Validation and Ingestion Agent uploads subscriber base."],
  lifecycle:["Lifecycle Stage Calculation","Lifecycle Intelligence Agent assigns lifecycle stage (no reasons)."],
  opportunity:["Opportunity Identification","Select LOBs and opportunity types. Next Best Action Agent outputs opportunities with premium reasoning."],
  offers:["Offer Strategy","Next Best Offer Agent generates offers per selected LOB based on opportunities from Step 3."],
  forecast:["Impact Forecast","Impact Forecast Agent estimates uplift and churn reduction."],
  reviewlaunch:["Review & Launch","Governance Agent prepares approval pack and publishes output."]
};

function setHeader(step){
  const t = titles[step] || ["Product Expert",""];
  setText("pageTitle", t[0]);
  setText("pageSub", t[1]);
}

/* Step tracker with progress animation */
function updateTracker(step){
  const map={ upload:1, lifecycle:2, opportunity:3, offers:4, forecast:5, reviewlaunch:6 };
  const n = map[step] || 1;
  
  // Calculate progress percentage (0-100%)
  const totalSteps = 6;
  const progressPercent = ((n - 1) / (totalSteps - 1)) * 100;
  
  // Update CSS variable for progress line
  const tracker = q(".tracker");
  if(tracker) {
    tracker.style.setProperty('--progress', `${progressPercent}%`);
  }
  
  // Update step states
  qa(".trackStep").forEach(s => {
    const k = Number(s.getAttribute("data-track"));
    s.classList.remove("active");
    
    // Mark as completed if in completedSteps set
    if(completedSteps.has(k)) {
      s.classList.add("completed");
    } else {
      s.classList.remove("completed");
    }
    
    // Mark current step as active
    if(k === n) {
      s.classList.add("active");
    }
  });
}

/* Mark step as completed */
function markStepCompleted(step){
  const map={ upload:1, lifecycle:2, opportunity:3, offers:4, forecast:5, reviewlaunch:6 };
  const stepNum = map[step];
  if(stepNum) {
    completedSteps.add(stepNum);
    // Also mark all previous steps as completed
    for(let i = 1; i < stepNum; i++) {
      completedSteps.add(i);
    }
    updateTracker(step);
  }
}

/* Nav + panes */
function enableNav(step){
  const b = q(`.navItem[data-step="${step}"]`);
  if(b) b.disabled = false;
}
function showPane(step){
  qa(".stepPane").forEach(p=>p.classList.add("hidden"));
  $(`pane-${step}`)?.classList?.remove("hidden");

  qa(".navItem").forEach(b=>b.classList.remove("active"));
  q(`.navItem[data-step="${step}"]`)?.classList?.add("active");

  setHeader(step);
  updateTracker(step);
}

/* Overlay agent copy */
function showOverlay(title, sub, icon){
  setText("agentTitle", title);
  setText("agentSub", sub);
  setText("agentIcon", icon || "🤖");
  $("overlay")?.classList?.remove("hidden");
}
function hideOverlay(){ $("overlay")?.classList?.add("hidden"); }

/* API */
async function apiUpload(file){
  const fd=new FormData(); fd.append("file", file);
  const res=await fetch("/api/upload",{method:"POST",body:fd});
  if(!res.ok) throw new Error(await res.text());
  return await res.json();
}
async function apiRunStep(step, payload={}){
  const res=await fetch("/api/run_step",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ session_id: sessionId, step, ...payload })
  });
  if(!res.ok){
    const j=await res.json().catch(()=>({detail:"Step failed"}));
    throw new Error(j.detail || "Step failed");
  }
  return await res.json();
}
async function apiPreview(step){
  const res=await fetch(`/api/preview/${sessionId}?step=${encodeURIComponent(step)}&n=12`);
  if(!res.ok){
    const j=await res.json().catch(()=>({detail:"Preview failed"}));
    throw new Error(j.detail || "Preview failed");
  }
  return await res.json();
}
async function apiForecast(lobs){
  const qs=new URLSearchParams({ session_id: sessionId, lobs: (lobs||[]).join(",") });
  const res=await fetch(`/api/impact_forecast?${qs.toString()}`);
  if(!res.ok) throw new Error(await res.text());
  return await res.json();
}
async function apiPublish(target, endpoint_url){
  const res=await fetch("/api/publish",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ session_id: sessionId, target, mode:"api", endpoint_url })
  });
  if(!res.ok) throw new Error(await res.text());
  return await res.json();
}

/* Table render */
function renderTable(tblId, rows){
  const tbl=$(tblId); if(!tbl) return;
  tbl.innerHTML="";
  if(!rows || !rows.length){ tbl.innerHTML="<tr><td class='muted'>No data</td></tr>"; return; }
  const cols=Object.keys(rows[0]);

  const thead=document.createElement("thead");
  const trh=document.createElement("tr");
  cols.forEach(c=>{ const th=document.createElement("th"); th.textContent=c; trh.appendChild(th); });
  thead.appendChild(trh);

  const tbody=document.createElement("tbody");
  rows.forEach(r=>{
    const tr=document.createElement("tr");
    cols.forEach(c=>{ const td=document.createElement("td"); td.textContent = (r[c]==null)?"":String(r[c]); tr.appendChild(td); });
    tbody.appendChild(tr);
  });

  tbl.appendChild(thead); tbl.appendChild(tbody);
}

/* Multi-select */
function getMulti(selId){
  const el=$(selId); if(!el) return [];
  return Array.from(el.selectedOptions).map(o=>o.value);
}
function normalizeLobs(lobs){
  const up = lobs.map(x => String(x || "").toUpperCase());
  // TOTAL_NETWORK is now a separate LOB, don't expand it
  // Only return default if nothing selected
  return up.length ? up : ["DATA", "VOICE", "VAS", "TOTAL_NETWORK"];
}

/* Normalize opportunity type for comparison */
function normalizeOppType(oppType){
  if(!oppType) return '';
  return String(oppType).toLowerCase()
    .replace(/[^a-z0-9]/g, '')  // Remove special chars
    .replace(/noaction/g, 'noaction')
    .replace(/crosssell/g, 'crosssell');
}

/* LOB Validation */
function validateLobSelection(){
  const selectedLobs = getMulti("lobSelect");
  if(!selectedLobs || selectedLobs.length === 0){
    showModal("LOB Selection Required", 
      "<div class='muted'>Please select at least one LOB (Line of Business) before proceeding.</div>" +
      "<div style='margin-top:10px;'><strong>Available LOBs:</strong></div>" +
      "<ul style='margin-top:5px;'>" +
      "<li>Total Network (Voice + Data + VAS)</li>" +
      "<li>Data</li>" +
      "<li>Voice</li>" +
      "<li>VAS</li>" +
      "</ul>" +
      "<div class='muted' style='margin-top:10px;'>Tip: Use Ctrl+Click to select multiple LOBs.</div>"
    );
    return false;
  }
  return true;
}

/* Get Current Opportunity Selections */
function getCurrentOpportunitySelections(){
  return {
    lobs: getMulti("lobSelect"),
    oppTypes: getMulti("oppTypeSelect"),
    normalizedLobs: normalizeLobs(getMulti("lobSelect"))
  };
}

/* LCS to valid Opportunity mapping */
const LCS_OPPORTUNITY_MAP = {
  'grower': ['noaction', 'no action'],
  'newuser': ['noaction', 'no action'],
  'new user': ['noaction', 'no action'],
  'dropper': ['retain'],
  'stopper': ['revive'],
  'stable': ['upsell', 'noaction', 'no action'],
  'nonuser': ['crosssell', 'cross-sell'],
  'non-user': ['crosssell', 'cross-sell']
};

/* Get valid opportunities for a lifecycle stage */
function getValidOpportunitiesForLCS(lcs) {
  const normalizedLCS = String(lcs || '').toLowerCase().replace(/[^a-z]/g, '');
  for (const [key, values] of Object.entries(LCS_OPPORTUNITY_MAP)) {
    const normalizedKey = key.replace(/[^a-z]/g, '');
    if (normalizedLCS === normalizedKey || normalizedLCS.includes(normalizedKey) || normalizedKey.includes(normalizedLCS)) {
      return values;
    }
  }
  return []; // No specific mapping, allow all
}

/* Filter Preview Data - Show only selected LOBs and Opportunity Types */
function filterOpportunityPreview(rows, selectedLobs, selectedOppTypes){
  if(!rows || rows.length === 0) return rows;
  
  // Normalize selected values (keep TOTAL_NETWORK as-is)
  const normalizedLobs = normalizeLobs(selectedLobs);
  const normalizedOppTypes = selectedOppTypes.map(t => normalizeOppType(t));
  
  // If "Auto" is selected, don't filter by opportunity type
  const hasAuto = selectedOppTypes.some(t => t.toLowerCase() === 'auto');
  
  console.log("Filtering with LOBs:", normalizedLobs, "OppTypes:", normalizedOppTypes, "hasAuto:", hasAuto);
  
  return rows.filter(row => {
    // Get row LOB and normalize for comparison
    const rowLob = String(row.lob || '').toUpperCase();
    
    // Filter by LOB (case-insensitive, handle TOTAL_NETWORK)
    const lobMatch = normalizedLobs.some(lob => {
      const normalizedLob = lob.toUpperCase();
      // Exact match
      if (normalizedLob === rowLob) return true;
      // Handle TOTAL_NETWORK variations
      if (normalizedLob === 'TOTAL_NETWORK' && (rowLob === 'TOTAL_NETWORK' || rowLob === 'TOTALNETWORK' || rowLob === 'TOTAL')) return true;
      if (rowLob === 'TOTAL_NETWORK' && normalizedLob === 'TOTAL_NETWORK') return true;
      // Partial match for flexibility
      return rowLob.includes(normalizedLob) || normalizedLob.includes(rowLob);
    });
    
    if(!lobMatch) {
      console.log("Row filtered out - LOB mismatch:", row.lob, "not in", normalizedLobs);
      return false;
    }
    
    // If Auto selected, include all opportunities
    if(hasAuto) return true;
    
    // Filter by Opportunity Type
    if(row.opportunity) {
      const rowOppType = normalizeOppType(row.opportunity.split('_')[0]);
      
      // Check if selected opportunity type matches row opportunity
      const oppMatch = normalizedOppTypes.some(t => {
        if (t === rowOppType) return true;
        if (rowOppType.includes(t) || t.includes(rowOppType)) return true;
        // Handle "no action" vs "noaction"
        if ((t === 'noaction' || t === 'no action') && (rowOppType === 'noaction' || rowOppType === 'no action')) return true;
        return false;
      });
      
      if(!oppMatch) {
        console.log("Row filtered out - Opp mismatch:", row.opportunity, "not matching", normalizedOppTypes);
        return false;
      }
    }
    
    // Also check LCS-Opportunity validity if lifecycle_stage exists
    if(row.lifecycle_stage && row.opportunity && !hasAuto) {
      const lcs = String(row.lifecycle_stage || '').toLowerCase();
      const rowOppType = normalizeOppType(row.opportunity.split('_')[0]);
      const validOpps = getValidOpportunitiesForLCS(lcs);
      
      // If we have a mapping and the opportunity isn't valid for this LCS, log it
      if(validOpps.length > 0 && !validOpps.some(v => normalizeOppType(v) === rowOppType)) {
        console.log("Note: LCS", lcs, "typically has opportunities:", validOpps, "but row has:", rowOppType);
      }
    }
    
    return true;
  });
}

/* Filter Offers Preview - Show only for selected LOBs AND Opportunity Types from Opportunity step */
function filterOffersPreview(rows, selectedLobs, selectedOppTypes){
  if(!rows || rows.length === 0) {
    console.log("filterOffersPreview: No rows to filter");
    return rows;
  }
  
  // If no selections or Auto is selected, return all rows
  if(!selectedLobs || selectedLobs.length === 0) {
    console.log("filterOffersPreview: No LOBs selected, returning all rows");
    return rows;
  }
  
  // Check if "Auto" is selected (show all opportunity types)
  const hasAuto = (selectedOppTypes || []).some(t => t.toLowerCase() === 'auto');
  
  // If Auto is selected, don't filter by opportunity type - just return all rows
  if(hasAuto) {
    console.log("filterOffersPreview: Auto selected, returning all rows");
    return rows;
  }
  
  // Keep TOTAL_NETWORK as separate LOB
  const normalizedLobs = normalizeLobs(selectedLobs);
  
  // Normalize opportunity types for comparison
  const normalizedOppTypes = (selectedOppTypes || []).map(t => normalizeOppType(t));
  
  console.log("filterOffersPreview: LOBs:", normalizedLobs, "OppTypes:", normalizedOppTypes);
  console.log("filterOffersPreview: Sample row:", rows[0] ? JSON.stringify(rows[0]) : "no rows");
  
  // If no specific opportunity types selected, return all rows
  if(normalizedOppTypes.length === 0) {
    console.log("filterOffersPreview: No opportunity types selected, returning all rows");
    return rows;
  }
  
  return rows.filter(row => {
    const rowKeys = Object.keys(row);
    
    // Find opportunity columns in this row
    const oppColumns = rowKeys.filter(k => k.startsWith('opportunity_'));
    
    if(oppColumns.length === 0) {
      // No opportunity column, include the row
      return true;
    }
    
    // Check if any opportunity column matches the selected opportunity types
    for(const oppCol of oppColumns) {
      const rowOppValue = String(row[oppCol] || '').toLowerCase();
      
      // Extract opportunity type from value like "upsell_data" or "noaction_data"
      const rowOppType = rowOppValue.split('_')[0];
      const normalizedRowOppType = normalizeOppType(rowOppType);
      
      // Check if this matches any selected opportunity type
      const isMatch = normalizedOppTypes.some(selectedOpp => {
        if(selectedOpp === normalizedRowOppType) return true;
        if(selectedOpp === 'noaction' && (normalizedRowOppType === 'noaction' || normalizedRowOppType === 'no')) return true;
        if(normalizedRowOppType.includes(selectedOpp) || selectedOpp.includes(normalizedRowOppType)) return true;
        return false;
      });
      
      if(isMatch) {
        return true;
      }
    }
    
    // No matching opportunity found
    return false;
  });
}

/* Charts */
let barRev6=null, barMargin6=null, barChurn6=null;

function moneyM(v){
  const n = Number(v);
  if(Number.isNaN(n)) return "—";
  return "$" + n.toFixed(2) + "M";
}
function pctBadge(v){
  const n = Number(v);
  if(Number.isNaN(n)) return "+—%";
  return (n>=0?"+":"") + n.toFixed(1) + "%";
}
function negPctBadge(v){
  const n = Number(v);
  if(Number.isNaN(n)) return "-—%";
  return "-" + Math.abs(n).toFixed(1) + "%";
}

function renderBar(canvasId, labels, data){
  const ctx = $(canvasId);
  if(!ctx) return null;
  return new Chart(ctx,{
    type:"bar",
    data:{ labels, datasets:[{ data, borderWidth:0 }] },
    options:{
      responsive:true,
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ grid:{ display:false } },
        y:{ grid:{ display:true } }
      }
    }
  });
}

function renderForecast(payload){
  if(!window.Chart){
    showModal("Chart error","<div class='muted'>Chart.js not loaded.</div>");
    return;
  }

  // destroy existing
  [barRev6, barMargin6, barChurn6].forEach(c=>{ try{c?.destroy();}catch(e){} });

  const k = payload.kpis || {};
  const s = payload.series || {};
  const months = s.months6 || [];
  const rev = s.revenue6_m || [];
  const margin = s.margin6_m || [];
  const churn = s.churn6_pct || [];

  // KPI tiles
  setText("kpiRevTotal", moneyM(k.revenue_total_m));
  setText("kpiMarginTotal", moneyM(k.margin_total_m));
  setText("kpiChurnAvg", (Number(k.churn_avg_pct)||0).toFixed(2) + "%");

  setText("kpiRevBadge", pctBadge(k.rev_uplift_pct));
  setText("kpiMarginBadge", pctBadge(k.margin_uplift_pct));
  setText("kpiChurnBadge", negPctBadge(k.churn_reduction_pct));

  // 6-month bars
  barRev6 = renderBar("barRev6", months, rev);
  barMargin6 = renderBar("barMargin6", months, margin);
  barChurn6 = renderBar("barChurn6", months, churn);
}

/* GLOBAL: Forecast trigger (used by HTML onclick) */
window.runForecastNow = async function(){
  try{
    if(!sessionId){
      showModal("Forecast", "<div class='muted'>No active session. Please upload audience first.</div>");
      return;
    }

    // Use the LOBs from opportunity selection if available
    const lobs = currentOpportunitySelection ? 
                 currentOpportunitySelection.lobs : 
                 normalizeLobs(getMulti("lobSelect"));
    
    showOverlay("Impact Forecast Agent","Forecasting uplift and churn reduction","📈");

    const p = await apiForecast(lobs);

    hideOverlay();
    renderForecast(p);

    // Mark forecast step as completed
    markStepCompleted("forecast");

    enable("btnNextToReviewLaunch", true);
    enableNav("reviewlaunch");
    toast("Forecast ready ✅");
  }catch(e){
    hideOverlay();
    console.error("FORECAST_ERROR", e);
    showModal("Forecast error", `<div class='muted'>${e.message || "An error occurred"}</div>`);
  }
};

window.goReviewLaunch = function(){
  showPane("reviewlaunch");
};

/* STEPS */

/* 1. UPLOAD */
$("btnUpload")?.addEventListener("click", async()=>{
  const inp = $("fileInput");
  const file = inp?.files?.[0];
  if(!file){ showModal("Upload","<div class='muted'>Please select a CSV file.</div>"); return; }

  try{
    showOverlay("Validation and Ingestion Agent","Validating & ingesting audience","📤");
    const data = await apiUpload(file);
    sessionId = data.session_id;

    setText("sessionBox", JSON.stringify(data, null, 2));
    setText("pillSession", `Session: ${sessionId.substring(0,8)}...`);

    hideOverlay();
    toast("Upload success ✅");

    // Mark upload step as completed
    markStepCompleted("upload");

    enable("btnNextToLifecycle", true);
    enableNav("lifecycle");
  }catch(e){
    hideOverlay();
    console.error("UPLOAD_ERROR", e);
    showModal("Upload error", `<div class='muted'>${e.message || "Upload failed"}</div>`);
  }
});

$("btnNextToLifecycle")?.addEventListener("click", ()=>{ showPane("lifecycle"); });

/* 2. LIFECYCLE */
$("btnRunLifecycle")?.addEventListener("click", async()=>{
  if(!sessionId){ showModal("Lifecycle","<div class='muted'>No session. Please upload first.</div>"); return; }

  try{
    showOverlay("Lifecycle Intelligence Agent","Assigning lifecycle stage","🧬");
    await apiRunStep("lifecycle");
    hideOverlay();

    // Mark lifecycle step as completed
    markStepCompleted("lifecycle");

    enable("btnPreviewLifecycle", true);
    enable("btnNextToOpportunity", true);
    enableNav("opportunity");
    toast("Lifecycle ready ✅");
  }catch(e){
    hideOverlay();
    console.error("LIFECYCLE_ERROR", e);
    showModal("Lifecycle error", `<div class='muted'>${e.message || "Lifecycle step failed"}</div>`);
  }
});

$("btnPreviewLifecycle")?.addEventListener("click", async()=>{
  try{
    const p = await apiPreview("lifecycle");
    renderTable("tblLifecycle", p.rows);
  }catch(e){
    console.error("PREVIEW_LIFECYCLE_ERROR", e);
    showModal("Preview error", `<div class='muted'>${e.message || "Preview failed"}</div>`);
  }
});

$("btnNextToOpportunity")?.addEventListener("click", ()=>{ showPane("opportunity"); });

/* Validate Opportunity Type Selection */
function validateOppTypeSelection(){
  const selectedOppTypes = getMulti("oppTypeSelect");
  if(!selectedOppTypes || selectedOppTypes.length === 0){
    showModal("Opportunity Type Required", 
      "<div class='muted'>Please select at least one Opportunity Type before proceeding.</div>" +
      "<div style='margin-top:10px;'><strong>Available Types:</strong></div>" +
      "<ul style='margin-top:5px;'>" +
      "<li><strong>Auto</strong> - System determines best opportunity for each customer</li>" +
      "<li><strong>Upsell</strong> - Grow revenue from stable customers</li>" +
      "<li><strong>Retain</strong> - Prevent churn from declining customers</li>" +
      "<li><strong>Revive</strong> - Win back at-risk customers</li>" +
      "<li><strong>Cross-sell</strong> - Activate new service lines</li>" +
      "<li><strong>No action</strong> - Standard treatment</li>" +
      "</ul>" +
      "<div class='muted' style='margin-top:10px;'>Tip: Use Ctrl+Click to select multiple types.</div>"
    );
    return false;
  }
  return true;
}

/* 3. OPPORTUNITY */
$("btnRunOpportunity")?.addEventListener("click", async()=>{
  if(!sessionId){ 
    showModal("Opportunity","<div class='muted'>No session. Please run Lifecycle first.</div>"); 
    return; 
  }

  // Validate LOB selection
  if(!validateLobSelection()) {
    return;
  }
  
  // Validate Opportunity Type selection
  if(!validateOppTypeSelection()) {
    return;
  }

  try{
    // Get CURRENT selections (not previous)
    const selections = getCurrentOpportunitySelections();
    const lobs = selections.lobs;
    const oppTypes = selections.oppTypes;
    
    // Store current selections for later use (including in Offers step)
    currentOpportunitySelection = {
      lobs: lobs,
      oppTypes: oppTypes,
      normalizedLobs: selections.normalizedLobs,
      timestamp: new Date().toISOString()
    };

    // Show what's being processed
    const lobDisplay = lobs.join(", ");
    const oppDisplay = oppTypes.length > 0 ? oppTypes.join(", ") : "Auto";
    
    showOverlay("Next Best Action Agent",
      `Analyzing ${lobDisplay} for ${oppDisplay} opportunities...`,
      "🎯");
    
    // Run with CURRENT selections
    await apiRunStep("opportunity", { lobs, opportunity_types: oppTypes });
    
    hideOverlay();

    // Mark opportunity step as completed
    markStepCompleted("opportunity");

    // Enable buttons for next steps
    enable("btnPreviewOpportunity", true);
    enable("btnNextToOffers", true);
    enableNav("offers");
    
    // Clear any previous data to force refresh
    lastOpportunityRows = [];
    
    toast(`Opportunities ready for ${lobs.length} LOB(s) ✅`);
    
    // Show success info
    console.log("Opportunity run completed with selections:", currentOpportunitySelection);
    
  }catch(e){
    hideOverlay();
    console.error("OPPORTUNITY_ERROR", e);
    showModal("Opportunity error", `<div class='muted'>${e.message || "Opportunity step failed"}</div>`);
  }
});

$("btnPreviewOpportunity")?.addEventListener("click", async()=>{
  try{
    // Validate LOB selection before preview
    if(!validateLobSelection()) {
      return;
    }

    // Fetch fresh data from API
    const p = await apiPreview("opportunity");
    lastOpportunityRows = p.rows || [];
    
    // Get CURRENT selections from UI (not stored ones)
    const currentSelections = getCurrentOpportunitySelections();
    
    // Check if Auto is selected - if so, show all data without filtering by opportunity type
    const hasAuto = currentSelections.oppTypes.some(t => t.toLowerCase() === 'auto');
    
    // Filter based on CURRENT selections
    const filteredRows = filterOpportunityPreview(
      lastOpportunityRows, 
      currentSelections.lobs, 
      currentSelections.oppTypes
    );
    
    // If no rows after filtering but we have raw data, show info
    if(filteredRows.length === 0 && lastOpportunityRows.length > 0) {
      // Get unique opportunity types from raw data
      const availableOppTypes = new Set();
      lastOpportunityRows.forEach(row => {
        if(row.opportunity) {
          const oppType = row.opportunity.split('_')[0];
          availableOppTypes.add(oppType);
        }
      });
      
      const availableList = Array.from(availableOppTypes).join(', ');
      const selectedList = currentSelections.oppTypes.join(', ');
      
      showModal("No Matching Opportunities", 
        `<div class='muted'>No opportunities found matching your selection.</div>` +
        `<div style='margin-top:10px;'><strong>You selected:</strong> ${selectedList}</div>` +
        `<div style='margin-top:5px;'><strong>Available in data:</strong> ${availableList}</div>` +
        `<div class='muted' style='margin-top:10px;'>Tip: Select "Auto" to see all opportunity types, or select matching opportunity types.</div>`
      );
      
      // Still render empty table
      renderTable("tblOpportunity", []);
      return;
    }
    
    // Show filtered results
    renderTable("tblOpportunity", filteredRows);
    
    // Show info message
    const lobCount = currentSelections.normalizedLobs.length;
    const totalRows = filteredRows.length;
    const lobDisplay = currentSelections.lobs.join(", ");
    const oppDisplay = hasAuto ? "all types" : currentSelections.oppTypes.join(", ");
    
    toast(`Showing ${totalRows} opportunities for ${lobDisplay} (${oppDisplay})`);
    
  }catch(e){
    console.error("PREVIEW_OPP_ERROR", e);
    showModal("Preview error", `<div class='muted'>${e.message || "Preview failed"}</div>`);
  }
});

$("btnNextToOffers")?.addEventListener("click", ()=>{ 
  updateOfferSummary();
  buildOfferConfigUI();
  showPane("offers"); 
});

/* Build dynamic offer configuration UI based on selected opportunities */
function buildOfferConfigUI() {
  const configGrid = document.getElementById('offerConfigGrid');
  if (!configGrid) return;
  
  // Check if we have selections
  if (!currentOpportunitySelection || !currentOpportunitySelection.oppTypes || currentOpportunitySelection.oppTypes.length === 0) {
    configGrid.innerHTML = `
      <div class="offer-config-placeholder muted">
        Please complete Step 3 (Opportunity Identification) first to configure offers.
      </div>
    `;
    return;
  }
  
  const oppTypes = currentOpportunitySelection.oppTypes;
  
  // If "Auto" is selected, show all standard opportunity types
  const typesToShow = oppTypes.includes('Auto') 
    ? ['Upsell', 'Retain', 'Revive', 'Cross-sell', 'No action']
    : oppTypes;
  
  // Icons and colors for each opportunity type
  const oppConfig = {
    'Upsell': { icon: '📈', colorClass: 'opp-type-upsell', default: 2 },
    'Retain': { icon: '🛡️', colorClass: 'opp-type-retain', default: 2 },
    'Revive': { icon: '🔄', colorClass: 'opp-type-revive', default: 1 },
    'Cross-sell': { icon: '🔀', colorClass: 'opp-type-crosssell', default: 1 },
    'No action': { icon: '⏸️', colorClass: 'opp-type-noaction', default: 1 }
  };
  
  // Build the configuration cards
  let html = '';
  typesToShow.forEach(oppType => {
    const config = oppConfig[oppType] || { icon: '📋', colorClass: '', default: 1 };
    const normalizedId = oppType.toLowerCase().replace(/[^a-z]/g, '');
    
    html += `
      <div class="offer-config-card">
        <div class="opp-type-label ${config.colorClass}">
          <span class="opp-type-icon">${config.icon}</span>
          ${oppType}
        </div>
        <div class="offer-count-row">
          <span class="offer-count-label">Offers:</span>
          <select class="offer-count-select" id="offerCount_${normalizedId}" data-opp-type="${oppType}">
            <option value="1" ${config.default === 1 ? 'selected' : ''}>1</option>
            <option value="2" ${config.default === 2 ? 'selected' : ''}>2</option>
            <option value="3" ${config.default === 3 ? 'selected' : ''}>3</option>
          </select>
        </div>
      </div>
    `;
  });
  
  configGrid.innerHTML = html;
}

/* Get offer counts per opportunity type from UI */
function getOfferCountsPerOppType() {
  const counts = {};
  const selects = document.querySelectorAll('.offer-count-select');
  
  selects.forEach(select => {
    const oppType = select.getAttribute('data-opp-type');
    const count = parseInt(select.value) || 1;
    counts[oppType] = count;
  });
  
  return counts;
}

/* 4. OFFERS */
$("btnRunOffers")?.addEventListener("click", async()=>{
  if(!sessionId){ 
    showModal("Offers","<div class='muted'>No session. Please run Opportunity first.</div>"); 
    return; 
  }

  // Check if we have opportunity selections
  if(!currentOpportunitySelection){
    showModal("Offers Warning",
      "<div class='muted'>No opportunity selection found. Please run the Opportunity step first.</div>");
    return;
  }

  try{
    // Get offer counts per opportunity type from the dynamic UI
    const offerCountsPerOpp = getOfferCountsPerOppType();
    
    const lobDisplay = currentOpportunitySelection.lobs.join(", ");
    const oppDisplay = currentOpportunitySelection.oppTypes.join(", ");
    
    // Build display of offer counts
    const countsDisplay = Object.entries(offerCountsPerOpp)
      .map(([opp, count]) => `${opp}: ${count}`)
      .join(", ");
    
    showOverlay("Next Best Offer Agent",
      `Generating offers for ${lobDisplay}...\n${countsDisplay}`,
      "🧠");
    
    // Run offers step with offer counts per opportunity type
    await apiRunStep("offers", { 
      offer_counts_per_opp: offerCountsPerOpp,
      lobs: currentOpportunitySelection.lobs,
      opportunity_types: currentOpportunitySelection.oppTypes
    });
    
    hideOverlay();

    // Mark offers step as completed
    markStepCompleted("offers");

    enable("btnPreviewOffers", true);
    enable("btnNextToForecast", true);
    enableNav("forecast");
    
    toast(`Offers generated for ${Object.keys(offerCountsPerOpp).length} opportunity type(s) ✅`);
    
  }catch(e){
    hideOverlay();
    console.error("OFFERS_ERROR", e);
    showModal("Offers error", `<div class='muted'>${e.message || "Offers step failed"}</div>`);
  }
});

$("btnPreviewOffers")?.addEventListener("click", async()=>{
  try{
    // Check if offers step has been run
    if(!currentOpportunitySelection) {
      showModal("Preview Not Available", 
        "<div class='muted'>Please run the Opportunity step first, then Generate Offers before previewing.</div>");
      return;
    }
    
    const p = await apiPreview("offers");
    
    // Check if we got data
    if(!p || !p.rows) {
      showModal("No Data Available", 
        "<div class='muted'>No offer data available. Please click <strong>'Generate Offers'</strong> first.</div>");
      return;
    }
    
    let offersRows = p.rows || [];
    
    // If no rows, show helpful message
    if(offersRows.length === 0) {
      showModal("No Data", 
        "<div class='muted'>No offers have been generated yet. Please click <strong>'Generate Offers'</strong> first.</div>");
      renderTable("tblOffers", []);
      return;
    }
    
    // Filter offers based on BOTH LOBs AND Opportunity Types from Step 3
    if(currentOpportunitySelection && currentOpportunitySelection.lobs.length > 0){
      offersRows = filterOffersPreview(
        offersRows, 
        currentOpportunitySelection.lobs,
        currentOpportunitySelection.oppTypes
      );
      
      const lobDisplay = currentOpportunitySelection.lobs.join(", ");
      const oppDisplay = currentOpportunitySelection.oppTypes.join(", ");
      toast(`Showing ${offersRows.length} offers for ${lobDisplay} (${oppDisplay})`);
    }
    
    renderTable("tblOffers", offersRows);
    
  }catch(e){
    console.error("PREVIEW_OFFERS_ERROR", e);
    const errorMsg = e.message || "Preview failed";
    
    // Check for specific error messages
    if(errorMsg.includes("not available") || errorMsg.includes("Run it first")) {
      showModal("Generate Offers First", 
        "<div style='text-align:center;'>" +
        "<div style='font-size:48px; margin-bottom:16px;'>⚠️</div>" +
        "<div class='muted'>The offers have not been generated yet.</div>" +
        "<div style='margin-top:12px;'><strong>Please click 'Generate Offers' button first</strong></div>" +
        "<div class='muted' style='margin-top:8px;'>Then you can preview the results.</div>" +
        "</div>");
    } else if(errorMsg.includes("Session not found")) {
      showModal("Session Expired", 
        "<div class='muted'>Your session has expired. Please start over by uploading your file again.</div>");
    } else {
      showModal("Preview Error", `<div class='muted'>${errorMsg}</div>`);
    }
  }
});

$("btnNextToForecast")?.addEventListener("click", ()=>{ showPane("forecast"); });

// Sync selections from Step 3 to Step 4
function updateOfferSummary() {
  const lobSelect = document.getElementById('lobSelect');
  const oppTypeSelect = document.getElementById('oppTypeSelect');
  
  if(!lobSelect || !oppTypeSelect) return;
  
  // Get selected LOBs and Opportunities
  const selectedLobs = Array.from(lobSelect.selectedOptions).map(opt => opt.text);
  const selectedOpps = Array.from(oppTypeSelect.selectedOptions).map(opt => opt.text);
  
  // Update summary in Step 4 (if elements exist)
  const summaryLobsEl = document.getElementById('summaryLobs');
  const summaryOppsEl = document.getElementById('summaryOpportunities');
  
  if(summaryLobsEl) {
    summaryLobsEl.textContent = selectedLobs.length > 0 ? selectedLobs.join(', ') : '—';
  }
  if(summaryOppsEl) {
    summaryOppsEl.textContent = selectedOpps.length > 0 ? selectedOpps.join(', ') : '—';
  }
}

// Also update when selections change in Step 3
document.getElementById('lobSelect')?.addEventListener('change', updateOfferSummary);
document.getElementById('oppTypeSelect')?.addEventListener('change', updateOfferSummary);

/* 5. FORECAST - Already handled by global runForecastNow */

/* 6. REVIEW & LAUNCH */
$("btnLaunch")?.addEventListener("click", async()=>{
  if(!sessionId){ showModal("Launch","<div class='muted'>No session. Please complete previous steps.</div>"); return; }

  try{
    showOverlay("Governance Agent","Preparing approval pack","🚀");
    await apiRunStep("launch");
    hideOverlay();

    // Mark review/launch step as completed
    markStepCompleted("reviewlaunch");

    const summary = {
      session_id: sessionId,
      status: "Approved",
      output_ready: true,
      lobs_processed: currentOpportunitySelection?.lobs || [],
      opportunities_processed: currentOpportunitySelection?.oppTypes || [],
      timestamp: new Date().toISOString()
    };

    setText("reviewSummary", JSON.stringify(summary, null, 2));
    enable("btnDownload", true);
    enable("btnPublishApi", true);
    toast("Campaign launched ✅");
  }catch(e){
    hideOverlay();
    console.error("LAUNCH_ERROR", e);
    showModal("Launch error", `<div class='muted'>${e.message || "Launch failed"}</div>`);
  }
});

$("btnDownload")?.addEventListener("click", ()=>{
  if(!sessionId) return;
  window.open(`/api/download/${sessionId}`, "_blank");
});

$("btnPublishApi")?.addEventListener("click", async()=>{
  if(!sessionId){ showModal("Publish","<div class='muted'>No session.</div>"); return; }

  try{
    const target = $("publishTarget")?.value || "NEON_DX";
    const url = $("publishUrl")?.value || "";

    showOverlay("Publishing...","Sending to target system","📡");
    const data = await apiPublish(target, url);
    hideOverlay();

    setText("publishSummary", JSON.stringify(data, null, 2));
    toast("Published successfully ✅");
  }catch(e){
    hideOverlay();
    console.error("PUBLISH_ERROR", e);
    showModal("Publish error", `<div class='muted'>${e.message || "Publish failed"}</div>`);
  }
});

/* Nav clicks */
qa(".navItem").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const step = btn.getAttribute("data-step");
    if(step && !btn.disabled) showPane(step);
  });
});

/* Handle Auto/specific opportunity type mutual exclusion */
function setupOppTypeSelect() {
  const oppTypeSelect = document.getElementById('oppTypeSelect');
  if(!oppTypeSelect) return;
  
  oppTypeSelect.addEventListener('change', function(e) {
    const options = Array.from(this.options);
    const autoOption = options.find(opt => opt.value === 'Auto');
    const selectedValues = Array.from(this.selectedOptions).map(opt => opt.value);
    
    // If Auto was just selected (and other items are selected), deselect others
    if(selectedValues.includes('Auto') && selectedValues.length > 1) {
      // Check if Auto was the newly clicked item
      // Deselect all others, keep only Auto
      options.forEach(opt => {
        if(opt.value !== 'Auto') {
          opt.selected = false;
        }
      });
    }
    // If a specific type was selected and Auto is also selected, deselect Auto
    else if(selectedValues.includes('Auto') && selectedValues.length > 1) {
      if(autoOption) autoOption.selected = false;
    }
  });
  
  // Also handle mousedown to detect which option is being clicked
  oppTypeSelect.addEventListener('mousedown', function(e) {
    if(e.target.tagName === 'OPTION') {
      const clickedValue = e.target.value;
      const selectedValues = Array.from(this.selectedOptions).map(opt => opt.value);
      
      // If clicking on Auto while others are selected
      if(clickedValue === 'Auto' && selectedValues.length > 0 && !selectedValues.includes('Auto')) {
        // Will select Auto, so deselect others after a tick
        setTimeout(() => {
          Array.from(this.options).forEach(opt => {
            if(opt.value !== 'Auto') opt.selected = false;
          });
        }, 0);
      }
      // If clicking on a specific type while Auto is selected
      else if(clickedValue !== 'Auto' && selectedValues.includes('Auto')) {
        // Deselect Auto after a tick
        setTimeout(() => {
          const autoOpt = Array.from(this.options).find(opt => opt.value === 'Auto');
          if(autoOpt) autoOpt.selected = false;
        }, 0);
      }
    }
  });
}

/* Initialize */
showPane("upload");
setupOppTypeSelect();
