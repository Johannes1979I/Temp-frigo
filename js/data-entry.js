/* data-entry.js — Temperature Data Entry Grid + Batch Generator */

let selectedUnitIdx = 0;

function renderDataGrid() {
  const container = document.getElementById('data-grid-container');
  if (!container) return;
  const units = getAllUnits();
  if (!units.length) { container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">Nessun frigorifero configurato. Vai in Impostazioni per aggiungerne.</p>'; return; }

  const workDays = getWorkingDays(state.year, state.month);
  if (selectedUnitIdx >= units.length) selectedUnitIdx = 0;
  const unit = units[selectedUnitIdx];

  // Unit selector tabs
  let html = '<div class="fridge-tabs">';
  units.forEach((u, i) => {
    const sel = i===selectedUnitIdx ? 'active' : '';
    const shortName = u.compartment ? u.name.split(' \u2014 ')[0]+' ['+u.compartment.charAt(0).toUpperCase()+']' : u.name.split(' \u2014 ')[0];
    html += '<button class="fridge-tab '+sel+'" style="--fc:'+u.color+'" onclick="selectUnitTab('+i+')">'+shortName+'</button>';
  });
  html += '</div>';

  // Acq bar
  html += '<div class="acq-bar">';
  html += '<span class="acq-label">Acquisizione:</span>';
  html += '<button class="btn btn-sm btn-outline acq-btn'+(currentAcqMethod==='Manuale'?' active':'')+'" onclick="setAcqMethod(\'Manuale\')">\u270f\ufe0f Manuale</button>';
  html += '<button class="btn btn-sm btn-outline acq-btn'+(currentAcqMethod==='WiFi'?' active':'')+'" onclick="setAcqMethod(\'WiFi\')">\ud83d\udcf6 WiFi</button>';
  html += '<button class="btn btn-sm btn-outline acq-btn'+(currentAcqMethod==='Bluetooth'?' active':'')+'" onclick="setAcqMethod(\'Bluetooth\')">\ud83d\udd35 Bluetooth</button>';
  html += '<div style="flex:1"></div>';
  html += '<button class="btn btn-sm btn-primary" onclick="fillRandomTempsUnit()">\ud83c\udfb2 Genera T casuali</button>';
  html += '<button class="btn btn-sm btn-outline" onclick="clearUnitMonth()">\ud83d\uddd1 Cancella mese</button>';
  html += '</div>';

  // Operator
  html += '<div class="operator-row"><label>Operatore:</label><input type="text" id="operator-name" placeholder="Nome operatore" value="'+getOperator()+'" onchange="setOperator(this.value)"></div>';

  // Table
  const typeLabel = unit.type==='+4' ? '+4\u00b0C' : '-20\u00b0C';
  html += '<div style="margin-bottom:8px;font-size:13px;color:var(--text-secondary)"><strong style="color:'+unit.color+'">'+unit.label+'</strong> \u2014 '+typeLabel+' \u2014 Range: '+unit.minT+'\u00b0C ~ '+unit.maxT+'\u00b0C</div>';

  html += '<div class="data-table-wrap"><table class="temp-table"><thead><tr>';
  html += '<th>Giorno</th><th>Data</th><th>Temperatura (\u00b0C)</th><th>Ora</th><th>Metodo</th><th>Stato</th><th>Note</th><th></th>';
  html += '</tr></thead><tbody>';

  const dayNames = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const todayStr = fmtDate(new Date());

  workDays.forEach(d => {
    const r = getReading(unit.uid, d.date);
    const temp = r ? r.temp : '';
    const ev = r ? evalTemp(unit, r.temp) : 'missing';
    const statusMap = { ok:'<span class="status-badge st-ok">OK</span>', warning:'<span class="status-badge st-warn">\u26a0\ufe0f</span>', alarm:'<span class="status-badge st-alarm">ALLARME</span>', missing:'<span class="status-badge st-miss">\u2014</span>' };
    const isToday = d.date === todayStr;
    const placeholder = unit.type==='+4' ? '4.0' : '-20.0';

    html += '<tr class="temp-row '+ev+(isToday?' today-row':'')+'">';
    html += '<td class="day-name">'+dayNames[d.dow]+'</td>';
    html += '<td class="day-date">'+d.dayNum+'/'+(state.month+1)+'</td>';
    html += '<td><input type="number" step="0.1" class="temp-input" value="'+(temp!==''?temp:'')+'" placeholder="'+placeholder+'" onchange="onTempInput(\''+unit.uid+'\',\''+d.date+'\',this.value)" onfocus="this.select()"></td>';
    html += '<td class="time-cell">'+(r?r.time:'')+'</td>';
    html += '<td class="method-cell">'+(r?r.method:'')+'</td>';
    html += '<td>'+statusMap[ev]+'</td>';
    html += '<td><input type="text" class="note-input" value="'+(r?.notes||'')+'" placeholder="..." onchange="onNoteInput(\''+unit.uid+'\',\''+d.date+'\',this.value)"></td>';
    html += '<td>'+(r?'<button class="btn-remove" onclick="onDeleteReading(\''+unit.uid+'\',\''+d.date+'\')">\u00d7</button>':'')+'</td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';

  // Summary
  let ok=0, warn=0, alm=0, miss=0;
  workDays.forEach(d => { const r=getReading(unit.uid,d.date); if(!r)miss++; else { const e=evalTemp(unit,r.temp); if(e==='ok')ok++; else if(e==='warning')warn++; else alm++; } });
  html += '<div class="summary-bar"><span class="sum-ok">'+ok+' OK</span><span class="sum-warn">'+warn+' Attenzione</span><span class="sum-alarm">'+alm+' Allarmi</span><span class="sum-miss">'+miss+' Mancanti</span></div>';

  container.innerHTML = html;
}

let currentAcqMethod = 'Manuale';
function setAcqMethod(m) {
  currentAcqMethod = m;
  const units = getAllUnits();
  const unit = units[selectedUnitIdx];
  if ((m==='WiFi'||m==='Bluetooth') && unit) {
    if (confirm('Simulare acquisizione '+m+' per '+unit.label+'?\n(Temperatura realistica per oggi)')) {
      const today = fmtDate(new Date());
      setReading(unit.uid, today, generateRandomTemp(unit), m, getOperator(), 'Auto-'+m);
    }
  }
  renderDataGrid();
}

function getOperator() { try{return localStorage.getItem('tempfrigo_operator')||'';}catch(e){return '';} }
function setOperator(v) { try{localStorage.setItem('tempfrigo_operator',v);}catch(e){} }

function selectUnitTab(i) { selectedUnitIdx=i; renderDataGrid(); }

function onTempInput(uid, dateStr, val) {
  if(val===''||isNaN(parseFloat(val))) return;
  setReading(uid, dateStr, val, currentAcqMethod, getOperator(), '');
  renderDataGrid();
}
function onNoteInput(uid, dateStr, val) { const r=getReading(uid,dateStr); if(r){r.notes=val; saveData();} }
function onDeleteReading(uid, dateStr) { deleteReading(uid,dateStr); renderDataGrid(); }

function fillRandomTempsUnit() {
  const units = getAllUnits();
  const unit = units[selectedUnitIdx];
  if(!unit) return;
  if(!confirm('Generare temperature casuali per "'+unit.label+'" \u2014 '+MONTH_NAMES[state.month]+' '+state.year+'?\n(Sovrascrive i dati esistenti)')) return;
  getWorkingDays(state.year, state.month).forEach(d => setReading(unit.uid, d.date, generateRandomTemp(unit), 'Generato', getOperator(), ''));
  renderDataGrid();
}

function clearUnitMonth() {
  const units = getAllUnits();
  const unit = units[selectedUnitIdx];
  if(!unit) return;
  if(!confirm('Cancellare tutti i dati di '+MONTH_NAMES[state.month]+' per "'+unit.label+'"?')) return;
  getWorkingDays(state.year, state.month).forEach(d => deleteReading(unit.uid, d.date));
  renderDataGrid();
}

/* ══════════════════════════════════════════════
   BATCH TEMPERATURE GENERATOR
   ══════════════════════════════════════════════ */

function showBatchModal() {
  document.getElementById('batch-modal').classList.remove('hidden');
  renderBatchForm();
}
function hideBatchModal() { document.getElementById('batch-modal').classList.add('hidden'); }

function renderBatchForm() {
  const container = document.getElementById('batch-fridge-checks');
  const units = getAllUnits();
  container.innerHTML = '<label style="display:flex;gap:6px;align-items:center;margin-bottom:6px;font-weight:600"><input type="checkbox" id="batch-all-units" onchange="toggleBatchAll(this.checked)" checked> Seleziona tutti</label>' +
    units.map((u,i) => '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" class="batch-unit-chk" value="'+i+'" checked> <span style="color:'+u.color+'">\u25cf</span> '+u.label+'</label>').join('');

  // Year range
  const curYear = new Date().getFullYear();
  document.getElementById('batch-year-from').value = curYear;
  document.getElementById('batch-year-to').value = curYear;
  document.getElementById('batch-progress').innerHTML = '';
  document.getElementById('batch-go-btn').disabled = false;
}

function toggleBatchAll(checked) {
  document.querySelectorAll('.batch-unit-chk').forEach(c => c.checked = checked);
}

function runBatchGeneration() {
  const units = getAllUnits();
  const selected = [];
  document.querySelectorAll('.batch-unit-chk:checked').forEach(c => selected.push(parseInt(c.value)));
  if (!selected.length) { alert('Selezionare almeno un frigorifero.'); return; }

  const yearFrom = parseInt(document.getElementById('batch-year-from').value);
  const yearTo = parseInt(document.getElementById('batch-year-to').value);
  if (isNaN(yearFrom)||isNaN(yearTo)||yearFrom>yearTo) { alert('Intervallo anni non valido.'); return; }
  if (yearTo - yearFrom > 10) { alert('Massimo 10 anni per volta.'); return; }

  const monthFrom = parseInt(document.getElementById('batch-month-from').value);
  const monthTo = parseInt(document.getElementById('batch-month-to').value);
  const overwrite = document.getElementById('batch-overwrite').checked;
  const operator = getOperator() || 'Batch';

  const progressEl = document.getElementById('batch-progress');
  const btn = document.getElementById('batch-go-btn');
  btn.disabled = true;

  // Calculate total work
  let totalDays = 0, generated = 0, skipped = 0;
  const tasks = [];
  for (let y=yearFrom; y<=yearTo; y++) {
    const mStart = (y===yearFrom) ? monthFrom : 0;
    const mEnd = (y===yearTo) ? monthTo : 11;
    for (let m=mStart; m<=mEnd; m++) {
      const wd = getWorkingDays(y, m);
      selected.forEach(idx => {
        const u = units[idx];
        wd.forEach(d => tasks.push({uid:u.uid, date:d.date, unit:u}));
      });
    }
  }
  totalDays = tasks.length;

  progressEl.innerHTML = '<div class="batch-progress-bar-wrap"><div class="batch-progress-bar" id="batch-bar" style="width:0%"></div></div><div id="batch-status">Generazione in corso... 0/'+totalDays+'</div>';

  // Process in chunks to keep UI responsive
  let idx = 0;
  const chunkSize = 200;
  function processChunk() {
    const end = Math.min(idx+chunkSize, tasks.length);
    for (; idx<end; idx++) {
      const t = tasks[idx];
      const existing = getReading(t.uid, t.date);
      if (existing && !overwrite) { skipped++; continue; }
      const temp = generateRandomTemp(t.unit);
      // Direct write to avoid excessive saveData calls
      state.readings[getReadingKey(t.uid, t.date)] = {
        temp, time:'08:00', method:'Batch', operator, notes:'', timestamp:new Date().toISOString()
      };
      generated++;
    }
    const pct = Math.round(idx/totalDays*100);
    document.getElementById('batch-bar').style.width = pct+'%';
    document.getElementById('batch-status').textContent = 'Generazione in corso... '+idx+'/'+totalDays;

    if (idx < tasks.length) {
      requestAnimationFrame(processChunk);
    } else {
      saveData();
      btn.disabled = false;
      progressEl.innerHTML = '<div style="padding:12px;background:var(--success-pale);border-radius:8px;color:var(--success);font-weight:600">\u2705 Completato! '+generated+' temperature generate'+(skipped?' ('+skipped+' esistenti saltate)':'')+'</div>';
    }
  }
  requestAnimationFrame(processChunk);
}
