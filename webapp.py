#!/usr/bin/env python3
"""
Huisartsenpraktijken Lead Scraper – Web App
Start: python webapp.py
Open:  http://localhost:8000
"""

import csv
import io
import json
import threading
from typing import List

from fastapi import FastAPI, Query
from fastapi.responses import HTMLResponse, StreamingResponse

from scraper import CSV_VELDEN, scrape_generator

app = FastAPI(title="Huisartsen Lead Scraper")

# In-memory store for the last completed scrape (single-user tool)
_lock = threading.Lock()
_last_results: List[dict] = []


# ── SSE stream ────────────────────────────────────────────────────────────────

def _event_stream(steden: List[str], max_paginas: int):
    global _last_results
    local: List[dict] = []

    for event in scrape_generator(steden=steden, max_paginas=max_paginas):
        if event["type"] == "lead":
            local.append(event["lead"])
        yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    with _lock:
        _last_results = local


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
def index():
    return HTML


@app.get("/scrape")
def scrape(
    steden: str = Query(default=""),
    paginas: int = Query(default=3, ge=1, le=25),
):
    steden_lijst = [s.strip() for s in steden.split(",") if s.strip()]
    return StreamingResponse(
        _event_stream(steden_lijst, paginas),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/download/csv")
def download_csv():
    with _lock:
        results = list(_last_results)
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=CSV_VELDEN, extrasaction="ignore")
    writer.writeheader()
    for row in results:
        writer.writerow(row)
    return StreamingResponse(
        iter([buf.getvalue().encode("utf-8-sig")]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=huisartsen_leads.csv"},
    )


@app.get("/download/json")
def download_json():
    with _lock:
        results = list(_last_results)
    data = json.dumps(results, ensure_ascii=False, indent=2).encode("utf-8")
    return StreamingResponse(
        iter([data]),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=huisartsen_leads.json"},
    )


# ── HTML ──────────────────────────────────────────────────────────────────────

HTML = """<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Huisartsen Lead Scraper</title>
<style>
:root{
  --blue:#1e3a5f;--blue2:#2d5f8f;--orange:#e67e22;--green:#27ae60;
  --bg:#f0f4f8;--card:#fff;--text:#2c3e50;--muted:#7f8c8d;
  --border:#dee2e6;--sh:0 2px 14px rgba(0,0,0,.08);
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
     background:var(--bg);color:var(--text);min-height:100vh}

/* header */
header{background:linear-gradient(135deg,var(--blue),var(--blue2));
       color:#fff;padding:1.75rem 2rem;box-shadow:0 4px 20px rgba(0,0,0,.2)}
header h1{font-size:1.75rem;font-weight:700;display:flex;align-items:center;gap:.5rem}
header p{margin-top:.35rem;opacity:.82;font-size:.92rem}

.wrap{max-width:1200px;margin:0 auto;padding:2rem}

/* card */
.card{background:var(--card);border-radius:12px;box-shadow:var(--sh);
      padding:1.5rem;margin-bottom:1.5rem}
.card-title{font-size:.8rem;font-weight:700;text-transform:uppercase;
            letter-spacing:.06em;color:var(--blue);border-bottom:2px solid var(--bg);
            padding-bottom:.75rem;margin-bottom:1.25rem}

/* form */
.form-row{display:flex;gap:1.5rem;flex-wrap:wrap;align-items:flex-start;margin-bottom:1.25rem}
.fg{flex:1;min-width:200px}
.fg label{display:block;font-size:.8rem;font-weight:700;text-transform:uppercase;
          letter-spacing:.05em;color:var(--muted);margin-bottom:.5rem}

/* radio pills */
.radio-row{display:flex;gap:.6rem;flex-wrap:wrap}
.rpill input{display:none}
.rpill span{display:inline-block;padding:.45rem 1.1rem;border-radius:99px;
            border:2px solid var(--border);cursor:pointer;font-size:.9rem;
            transition:all .2s;user-select:none}
.rpill input:checked+span{background:var(--blue);border-color:var(--blue);color:#fff}

/* city select */
#city-select{width:100%;border:2px solid var(--border);border-radius:8px;
             padding:.3rem;font-size:.9rem;transition:border-color .2s;height:160px}
#city-select:focus{outline:none;border-color:var(--blue)}
#city-select option{padding:.3rem .6rem;border-radius:4px}
#city-select option:checked{background:var(--blue);color:#fff}

/* range */
.range-row{display:flex;align-items:center;gap:1rem}
input[type=range]{flex:1;accent-color:var(--blue)}
.range-val{min-width:2.5rem;text-align:center;font-weight:800;font-size:1.1rem;color:var(--blue)}
.hint{font-size:.78rem;color:var(--muted);margin-top:.35rem}

/* buttons */
.btn{display:inline-flex;align-items:center;gap:.45rem;padding:.75rem 1.6rem;
     border-radius:8px;font-size:.95rem;font-weight:700;cursor:pointer;
     border:none;transition:all .18s}
.btn-primary{background:var(--orange);color:#fff}
.btn-primary:hover{background:#d35400;transform:translateY(-1px);
                   box-shadow:0 4px 14px rgba(230,126,34,.4)}
.btn-primary:disabled{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none}
.btn-ghost{background:#fff;color:var(--blue);border:2px solid var(--blue)}
.btn-ghost:hover{background:var(--blue);color:#fff}
.btn-sm{padding:.5rem 1.1rem;font-size:.85rem}

/* progress */
#progress-section{display:none}
.pbar-wrap{background:var(--bg);border-radius:99px;height:10px;overflow:hidden;margin:.7rem 0}
.pbar{height:100%;background:linear-gradient(90deg,var(--blue),var(--blue2));
      border-radius:99px;transition:width .35s ease;width:0%}
.pstatus{font-size:.85rem;color:var(--muted)}
.logbox{background:#0d1117;color:#7ee787;font-family:'Courier New',monospace;
        font-size:.78rem;padding:1rem;border-radius:8px;height:130px;
        overflow-y:auto;margin-top:.9rem;line-height:1.65}

/* metrics */
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem}
.mc{background:var(--card);border-radius:10px;box-shadow:var(--sh);
    padding:1.2rem;text-align:center;border-top:3px solid var(--blue)}
.mc-val{font-size:2rem;font-weight:800;color:var(--blue)}
.mc-lbl{font-size:.75rem;color:var(--muted);text-transform:uppercase;
        letter-spacing:.06em;margin-top:.2rem}

/* results */
#results-section{display:none}
.filters{display:flex;gap:1rem;align-items:center;flex-wrap:wrap;
         padding:1rem;background:var(--bg);border-radius:8px;margin-bottom:.9rem}
.search{flex:1;min-width:200px;padding:.5rem 1rem;border:2px solid var(--border);
        border-radius:8px;font-size:.9rem;transition:border-color .2s}
.search:focus{outline:none;border-color:var(--blue)}
.fcheck{display:flex;align-items:center;gap:.4rem;font-size:.88rem;
        cursor:pointer;white-space:nowrap}
.fcheck input{accent-color:var(--blue);width:15px;height:15px}
.rcount{font-size:.82rem;color:var(--muted);margin-bottom:.6rem}

/* table */
.tbl-wrap{overflow-x:auto;border-radius:8px;border:1px solid var(--border)}
table{width:100%;border-collapse:collapse;font-size:.88rem}
thead{background:var(--blue);color:#fff;position:sticky;top:0;z-index:1}
th{padding:.7rem 1rem;text-align:left;font-size:.78rem;text-transform:uppercase;
   letter-spacing:.05em;white-space:nowrap;cursor:pointer;user-select:none}
th:hover{background:var(--blue2)}
th .arr{margin-left:.25rem;opacity:.4;font-size:.7rem}
th.sorted .arr{opacity:1}
tbody tr{border-bottom:1px solid var(--border);transition:background .12s}
tbody tr:hover{background:#f0f7ff}
tbody tr:last-child{border-bottom:none}
td{padding:.65rem 1rem;vertical-align:middle}
.nil{color:var(--muted);font-style:italic}
a.lnk{color:var(--blue);text-decoration:none}
a.lnk:hover{text-decoration:underline}

/* download bar */
.dl-bar{display:flex;gap:.75rem;justify-content:flex-end;margin-top:1rem;flex-wrap:wrap}

/* empty */
.empty-state{text-align:center;padding:3rem;color:var(--muted)}
.empty-state .ico{font-size:3rem;margin-bottom:.75rem}

@media(max-width:700px){
  .metrics{grid-template-columns:repeat(2,1fr)}
  .form-row{flex-direction:column}
}
</style>
</head>
<body>
<header>
  <div class="wrap" style="padding-top:0;padding-bottom:0">
    <h1>🏥 Huisartsenpraktijken Lead Scraper</h1>
    <p>Scrapt doktersnaam · telefoonnummer · e-mailadres &nbsp;|&nbsp; Bron: zorgkaartnederland.nl</p>
  </div>
</header>

<div class="wrap">

  <!-- Config -->
  <div class="card">
    <div class="card-title">⚙️ Instellingen</div>
    <div class="form-row">

      <!-- Scope -->
      <div class="fg" style="flex:0 0 auto">
        <label>Zoekgebied</label>
        <div class="radio-row">
          <label class="rpill">
            <input type="radio" name="scope" value="nl" checked>
            <span>🇳🇱 Heel Nederland</span>
          </label>
          <label class="rpill">
            <input type="radio" name="scope" value="steden">
            <span>🏙️ Specifieke steden</span>
          </label>
        </div>
      </div>

      <!-- City picker -->
      <div class="fg" id="city-group" style="display:none">
        <label>Steden &nbsp;<small style="color:var(--muted);text-transform:none;font-weight:400">(Ctrl+klik = meerdere)</small></label>
        <select id="city-select" multiple></select>
      </div>

      <!-- Pages slider -->
      <div class="fg" style="flex:0 0 280px">
        <label>Pagina's per stad</label>
        <div class="range-row">
          <input type="range" id="paginas" min="1" max="25" value="3"
                 oninput="document.getElementById('pval').textContent=this.value">
          <span class="range-val" id="pval">3</span>
        </div>
        <div class="hint">~20 praktijken per pagina · ~1,5 s vertraging per praktijk</div>
      </div>

    </div>

    <button class="btn btn-primary" id="start-btn" onclick="startScrapen()">🚀 Start scrapen</button>
    <button class="btn btn-ghost" id="stop-btn" onclick="stopScrapen()"
            style="display:none;margin-left:.75rem">⏹ Stop</button>
  </div>

  <!-- Progress -->
  <div class="card" id="progress-section">
    <div class="card-title">⏳ Voortgang</div>
    <div class="pbar-wrap"><div class="pbar" id="pbar"></div></div>
    <div class="pstatus" id="pstatus">Bezig...</div>
    <div class="logbox" id="logbox"></div>
  </div>

  <!-- Metrics -->
  <div class="metrics" id="metrics-section" style="display:none">
    <div class="mc"><div class="mc-val" id="m-tot">0</div><div class="mc-lbl">Totaal praktijken</div></div>
    <div class="mc"><div class="mc-val" id="m-email">0</div><div class="mc-lbl">Met e-mail</div></div>
    <div class="mc"><div class="mc-val" id="m-tel">0</div><div class="mc-lbl">Met telefoon</div></div>
    <div class="mc"><div class="mc-val" id="m-dok">0</div><div class="mc-lbl">Met doktersnaam</div></div>
  </div>

  <!-- Results -->
  <div class="card" id="results-section">
    <div class="card-title">📋 Resultaten</div>

    <div class="filters">
      <input class="search" id="zoek" type="text"
             placeholder="🔍 Zoeken op naam, stad, e-mail, dokter..."
             oninput="renderTable()">
      <label class="fcheck"><input type="checkbox" id="f-email" onchange="renderTable()"> Heeft e-mail</label>
      <label class="fcheck"><input type="checkbox" id="f-tel"   onchange="renderTable()"> Heeft telefoon</label>
      <label class="fcheck"><input type="checkbox" id="f-dok"   onchange="renderTable()"> Heeft doktersnaam</label>
    </div>

    <div class="rcount" id="rcount"></div>

    <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th onclick="sortBy('praktijk_naam')">Praktijk <span class="arr">↕</span></th>
            <th onclick="sortBy('dokter_naam')">Dokter <span class="arr">↕</span></th>
            <th onclick="sortBy('telefoon')">Telefoon <span class="arr">↕</span></th>
            <th onclick="sortBy('email')">E-mail <span class="arr">↕</span></th>
            <th onclick="sortBy('stad')">Stad <span class="arr">↕</span></th>
            <th>Website</th>
            <th>Bron</th>
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>

    <div class="dl-bar">
      <a href="/download/csv"  class="btn btn-ghost btn-sm" download>⬇️ Download CSV</a>
      <a href="/download/json" class="btn btn-ghost btn-sm" download>⬇️ Download JSON</a>
    </div>
  </div>

  <div class="empty-state" id="empty-state">
    <div class="ico">🏥</div>
    <p>Klik op <strong>Start scrapen</strong> om leads te verzamelen.</p>
    <p style="margin-top:.5rem;font-size:.85rem">Resultaten verschijnen live terwijl de scraper bezig is.</p>
  </div>

</div><!-- /wrap -->

<script>
// ── Steden ──────────────────────────────────────────────────────────────────
const STEDEN = [
  "almelo","almere","alphen-aan-den-rijn","amersfoort","amsterdam",
  "apeldoorn","arnhem","assen","breda","delft","den-haag","deventer",
  "dordrecht","eindhoven","emmen","enschede","goes","groningen","haarlem",
  "heerlen","helmond","hengelo","hilversum","hoofddorp","hoorn",
  "leeuwarden","leiden","lelystad","maastricht","middelburg","nijmegen",
  "purmerend","rotterdam","s-hertogenbosch","tilburg","utrecht","venlo",
  "zaandam","zoetermeer","zwolle"
];

const citySelect = document.getElementById('city-select');
STEDEN.forEach(s => {
  const o = document.createElement('option');
  o.value = s;
  o.textContent = s.replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase());
  citySelect.appendChild(o);
});

document.querySelectorAll('input[name="scope"]').forEach(r =>
  r.addEventListener('change', () => {
    document.getElementById('city-group').style.display =
      document.querySelector('input[name="scope"]:checked').value === 'steden' ? 'block' : 'none';
  })
);

// ── State ────────────────────────────────────────────────────────────────────
let allLeads = [], sortKey = '', sortAsc = true, evtSource = null;

// ── Scrape ───────────────────────────────────────────────────────────────────
function startScrapen() {
  const scope = document.querySelector('input[name="scope"]:checked').value;
  let stedenParam = '';
  if (scope === 'steden') {
    const sel = [...citySelect.selectedOptions].map(o => o.value);
    if (!sel.length) { alert('Selecteer minimaal één stad.'); return; }
    stedenParam = sel.join(',');
  }
  const paginas = document.getElementById('paginas').value;

  // reset
  allLeads = [];
  document.getElementById('logbox').textContent = '';
  document.getElementById('pbar').style.width = '0%';
  document.getElementById('pstatus').textContent = 'Verbinden...';
  document.getElementById('tbody').innerHTML =
    '<tr><td colspan="7" class="nil" style="text-align:center;padding:2rem">Scrapen is bezig...</td></tr>';

  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('progress-section').style.display = 'block';
  document.getElementById('metrics-section').style.display = 'grid';
  document.getElementById('results-section').style.display = 'block';
  document.getElementById('start-btn').disabled = true;
  document.getElementById('stop-btn').style.display = 'inline-flex';

  updateMetrics();

  evtSource = new EventSource(`/scrape?steden=${encodeURIComponent(stedenParam)}&paginas=${paginas}`);
  evtSource.onmessage = e => handle(JSON.parse(e.data));
  evtSource.onerror   = () => { log('⚠️ Verbinding verbroken.'); done(); };
}

function stopScrapen() {
  evtSource && evtSource.close();
  log('⏹ Gestopt door gebruiker.');
  document.getElementById('pstatus').textContent = 'Gestopt.';
  done();
}

function handle(ev) {
  switch (ev.type) {
    case 'log':
      log(ev.message); break;
    case 'progress':
      document.getElementById('pbar').style.width = Math.round(ev.value * 100) + '%';
      document.getElementById('pstatus').textContent = ev.message; break;
    case 'lead':
      allLeads.push(ev.lead);
      updateMetrics();
      renderTable(); break;
    case 'done':
      log(`✅ Klaar! ${ev.totaal} praktijken gescraped.`);
      document.getElementById('pbar').style.width = '100%';
      document.getElementById('pstatus').textContent = `Klaar — ${ev.totaal} praktijken`;
      evtSource && evtSource.close();
      done(); break;
  }
}

function done() {
  document.getElementById('start-btn').disabled = false;
  document.getElementById('stop-btn').style.display = 'none';
  evtSource = null;
}

// ── Log ──────────────────────────────────────────────────────────────────────
function log(msg) {
  const b = document.getElementById('logbox');
  b.textContent += msg + '\\n';
  b.scrollTop = b.scrollHeight;
}

// ── Metrics ──────────────────────────────────────────────────────────────────
function updateMetrics() {
  document.getElementById('m-tot').textContent   = allLeads.length;
  document.getElementById('m-email').textContent = allLeads.filter(l => l.email).length;
  document.getElementById('m-tel').textContent   = allLeads.filter(l => l.telefoon).length;
  document.getElementById('m-dok').textContent   = allLeads.filter(l => l.dokter_naam).length;
}

// ── Table ─────────────────────────────────────────────────────────────────────
function getFiltered() {
  const q   = document.getElementById('zoek').value.toLowerCase();
  const fe  = document.getElementById('f-email').checked;
  const ft  = document.getElementById('f-tel').checked;
  const fd  = document.getElementById('f-dok').checked;
  return allLeads.filter(l => {
    if (fe && !l.email)       return false;
    if (ft && !l.telefoon)    return false;
    if (fd && !l.dokter_naam) return false;
    if (q) {
      const hay = [l.praktijk_naam,l.dokter_naam,l.email,l.telefoon,l.stad,l.postcode].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function sortBy(key) {
  sortAsc = sortKey === key ? !sortAsc : true;
  sortKey = key;
  document.querySelectorAll('th').forEach(th => th.classList.remove('sorted'));
  event.currentTarget.classList.add('sorted');
  renderTable();
}

function renderTable() {
  let rows = getFiltered();
  if (sortKey) {
    rows = [...rows].sort((a,b) => {
      const av = (a[sortKey]||'').toLowerCase(), bv = (b[sortKey]||'').toLowerCase();
      return sortAsc ? av.localeCompare(bv,'nl') : bv.localeCompare(av,'nl');
    });
  }
  document.getElementById('rcount').textContent = `${rows.length} van ${allLeads.length} praktijken`;
  const tbody = document.getElementById('tbody');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="nil" style="text-align:center;padding:2rem">Geen resultaten</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(l => `
    <tr>
      <td>${e(l.praktijk_naam)||'<span class=nil>—</span>'}</td>
      <td>${e(l.dokter_naam)||'<span class=nil>—</span>'}</td>
      <td>${l.telefoon?`<a class=lnk href="tel:${e(l.telefoon)}">${e(l.telefoon)}</a>`:'<span class=nil>—</span>'}</td>
      <td>${l.email?`<a class=lnk href="mailto:${e(l.email)}">${e(l.email)}</a>`:'<span class=nil>—</span>'}</td>
      <td>${e(l.stad)||e(l.postcode)||'<span class=nil>—</span>'}</td>
      <td>${l.website?`<a class=lnk href="${e(l.website)}" target=_blank rel=noopener>🌐 open</a>`:'<span class=nil>—</span>'}</td>
      <td><a class=lnk href="${e(l.bron_url)}" target=_blank rel=noopener>🔗 bron</a></td>
    </tr>`).join('');
}

function e(s){
  if(!s)return'';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
</script>
</body>
</html>"""


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    print("\n🏥 Huisartsen Lead Scraper")
    print("=" * 32)
    print("Open: http://localhost:8000\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
