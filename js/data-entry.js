/* data-entry.js — griglia delle rilevazioni + generazione batch */

let selectedUnitIdx = 0;
let currentAcqMethod = 'Manuale';

function renderDataGrid() {
  const container = document.getElementById('data-grid-container');
  if (!container) return;
  const units = getAllUnits();
  if (!units.length) { container.innerHTML = '<div class="empty-msg">Nessun frigorifero configurato. Aggiungilo in Impostazioni.</div>'; return; }

  const workDays = getWorkingDays(state.year, state.month);
  if (selectedUnitIdx >= units.length) selectedUnitIdx = 0;
  const unit = units[selectedUnitIdx];
  const uid = escJs(unit.uid);

  let html = '<div class="pill-tabs">' + units.map((u, i) => {
    const shortName = u.name.split(' — ')[0] + (u.compartment ? ' · ' + (u.compartment === 'frigo' ? 'Frigo' : 'Freezer') : '');
    return `<button class="pill-tab ${i === selectedUnitIdx ? 'active' : ''}" style="--fc:${safeColor(u.color)}" onclick="selectUnitTab(${i})"><span class="dot" style="background:${safeColor(u.color)}"></span>${escHtml(shortName)}</button>`;
  }).join('') + '</div>';

  html += `<div class="acq-bar">
    <span class="acq-label">Acquisizione:</span>
    <button class="btn btn-sm btn-outline acq-btn${currentAcqMethod === 'Manuale' ? ' active' : ''}" onclick="setAcqMethod('Manuale')"><i data-lucide="pencil"></i>Manuale</button>
    <button class="btn btn-sm btn-outline acq-btn${currentAcqMethod === 'WiFi' ? ' active' : ''}" onclick="setAcqMethod('WiFi')"><i data-lucide="wifi"></i>WiFi</button>
    <button class="btn btn-sm btn-outline acq-btn${currentAcqMethod === 'Bluetooth' ? ' active' : ''}" onclick="setAcqMethod('Bluetooth')"><i data-lucide="bluetooth"></i>Bluetooth</button>
    <div class="acq-spacer"></div>
    <button class="btn btn-sm btn-outline" onclick="fillRandomTempsUnit()"><i data-lucide="dices"></i>Genera T casuali</button>
    <button class="btn-danger-outline" onclick="clearUnitMonth()"><i data-lucide="trash-2"></i>Cancella mese</button>
  </div>`;

  html += `<div class="operator-row"><label for="operator-name">Operatore:</label><input type="text" id="operator-name" placeholder="Nome operatore" value="${escHtml(getOperator())}" onchange="setOperator(this.value)"></div>`;
  html += `<div class="grid-info"><strong style="color:${safeColor(unit.color)}">${escHtml(unit.label)}</strong> — ${typeLabelOf(unit.type)} — limiti ${escHtml(unit.minT)} / ${escHtml(unit.maxT)} °C <span style="color:var(--text-muted)">(attenzione entro 1 °C dai limiti)</span></div>`;

  html += '<div class="data-table-wrap"><table class="temp-table"><thead><tr>';
  html += '<th>Giorno</th><th>Data</th><th>Temperatura (°C)</th><th>Ora</th><th>Metodo</th><th>Stato</th><th>Note</th><th></th>';
  html += '</tr></thead><tbody>';

  const dayNames = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const todayStr = fmtDate(new Date());
  const statusMap = { ok:'<span class="status-badge st-ok">OK</span>', warning:'<span class="status-badge st-warn">⚠ ATTENZIONE</span>', alarm:'<span class="status-badge st-alarm">✖ ALLARME</span>', missing:'<span class="status-badge st-miss">—</span>' };
  const placeholder = unit.type === '+4' ? '4.0' : '-20.0';

  workDays.forEach(d => {
    const r = getReading(unit.uid, d.date);
    const has = r && r.temp != null && !isNaN(r.temp);
    const ev = has ? evalTemp(unit, r.temp) : 'missing';
    const isToday = d.date === todayStr;
    html += `<tr class="temp-row ${ev}${isToday ? ' today-row' : ''}">`;
    html += `<td class="day-name">${dayNames[d.dow]}</td>`;
    html += `<td class="day-date">${d.dayNum}/${state.month + 1}</td>`;
    html += `<td class="${ev === 'alarm' ? 'cell-reject' : ev === 'warning' ? 'cell-warn' : ev === 'ok' ? 'cell-pass' : ''}"><input type="number" step="0.1" class="temp-input" value="${has ? r.temp : ''}" placeholder="${placeholder}" onchange="onTempInput('${uid}','${d.date}',this.value)" onfocus="this.select()" aria-label="Temperatura ${d.dayNum}/${state.month + 1}"></td>`;
    html += `<td class="method-cell">${escHtml(r ? r.time : '')}</td>`;
    html += `<td class="method-cell">${escHtml(r ? r.method : '')}</td>`;
    html += `<td>${statusMap[ev]}</td>`;
    html += `<td><input type="text" class="note-input" value="${escHtml(r?.notes || '')}" placeholder="…" onchange="onNoteInput('${uid}','${d.date}',this.value)"></td>`;
    html += `<td>${r ? `<button class="btn-remove" title="Cancella la rilevazione" aria-label="Cancella" onclick="onDeleteReading('${uid}','${d.date}')">×</button>` : ''}</td>`;
    html += '</tr>';
  });
  html += '</tbody></table></div>';

  let ok = 0, warn = 0, alm = 0, miss = 0;
  workDays.forEach(d => { const r = getReading(unit.uid, d.date); const e = r ? evalTemp(unit, r.temp) : 'missing'; if (e === 'ok') ok++; else if (e === 'warning') warn++; else if (e === 'alarm') alm++; else miss++; });
  html += `<div class="summary-bar"><span class="sum-ok">${ok} OK</span><span class="sum-warn">${warn} attenzione</span><span class="sum-alarm">${alm} allarmi</span><span class="sum-miss">${miss} mancanti</span></div>`;

  container.innerHTML = html;
}

async function setAcqMethod(m) {
  currentAcqMethod = m;
  const unit = getAllUnits()[selectedUnitIdx];
  if ((m === 'WiFi' || m === 'Bluetooth') && unit) {
    if (await uiConfirm('Simulare l\'acquisizione ' + m + ' per ' + unit.label + ' (oggi)?\nLa temperatura viene generata a caso: non è una misura reale.', { title: 'Simulazione', danger: false })) {
      const today = fmtDate(new Date());
      setReading(unit.uid, today, generateRandomTemp(unit), m, getOperator(), 'Auto-' + m);
    }
  }
  renderDataGrid();
}

function getOperator() { try { return localStorage.getItem('tempfrigo_operator') || ''; } catch(e) { return ''; } }
function setOperator(v) { try { localStorage.setItem('tempfrigo_operator', v); } catch(e) {} }

function selectUnitTab(i) { selectedUnitIdx = i; renderDataGrid(); }

function onTempInput(uid, dateStr, val) {
  const s = String(val == null ? '' : val).trim();
  if (s === '') {
    if (getReading(uid, dateStr)) { deleteReading(uid, dateStr); uiToast('Rilevazione cancellata', 'info'); }
    renderDataGrid(); return;
  }
  const n = parseFloat(s.replace(',', '.'));
  if (!isFinite(n)) { uiToast('Temperatura non valida: ' + s, 'err'); renderDataGrid(); return; }
  // correggendo la temperatura la nota resta (prima veniva cancellata)
  const old = getReading(uid, dateStr);
  setReading(uid, dateStr, n, currentAcqMethod, getOperator(), old?.notes || '');
  renderDataGrid();
}
function onNoteInput(uid, dateStr, val) {
  const r = getReading(uid, dateStr);
  if (r) { r.notes = val; saveData(); }
  else uiToast('Inserisci prima la temperatura: la nota si salva insieme alla rilevazione.', 'warn');
}
async function onDeleteReading(uid, dateStr) {
  const r = getReading(uid, dateStr); if (!r) return;
  if (!await uiConfirm('Cancellare la rilevazione del ' + dateStr.slice(8) + '/' + dateStr.slice(5, 7) + ' (' + r.temp + ' °C)?')) return;
  deleteReading(uid, dateStr); renderDataGrid();
}

async function fillRandomTempsUnit() {
  const unit = getAllUnits()[selectedUnitIdx];
  if (!unit) return;
  if (!await uiConfirm('Generare temperature casuali per «' + unit.label + '» — ' + MONTH_NAMES[state.month] + ' ' + state.year + '?\nI dati già inseriti nel mese verranno sovrascritti.', { title: 'Genera temperature' })) return;
  /* ~10% di probabilità di irregolarità per singola rilevazione */
  getWorkingDays(state.year, state.month).forEach(d => {
    const irregular = Math.random() < 0.10;
    state.readings[getReadingKey(unit.uid, d.date)] = { temp: generateRandomTemp(unit, irregular), time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      method: 'Generato', operator: getOperator(), notes: '', timestamp: new Date().toISOString() };
  });
  saveData();
  renderDataGrid();
}

async function clearUnitMonth() {
  const unit = getAllUnits()[selectedUnitIdx];
  if (!unit) return;
  if (!await uiConfirm('Cancellare tutti i dati di ' + MONTH_NAMES[state.month] + ' ' + state.year + ' per «' + unit.label + '»?')) return;
  getWorkingDays(state.year, state.month).forEach(d => { delete state.readings[getReadingKey(unit.uid, d.date)]; });
  saveData();
  renderDataGrid();
}

/* ══════ GENERAZIONE BATCH ══════ */
function fillMonthSelects() {
  document.querySelectorAll('select.month-select').forEach(s => {
    if (s.options.length) return;
    s.innerHTML = MONTH_NAMES.map((n, i) => `<option value="${i}">${n}</option>`).join('');
    s.value = s.dataset.default || '0';
  });
}
function showBatchModal() { fillMonthSelects(); document.getElementById('batch-modal').classList.remove('hidden'); renderBatchForm(); }
function hideBatchModal() { document.getElementById('batch-modal').classList.add('hidden'); }

function renderBatchForm() {
  const container = document.getElementById('batch-fridge-checks');
  const units = getAllUnits();
  container.innerHTML = '<label style="font-weight:600"><input type="checkbox" id="batch-all-units" onchange="toggleBatchAll(this.checked)" checked> Seleziona tutti</label>' +
    units.map((u, i) => `<label><input type="checkbox" class="batch-unit-chk" value="${i}" checked> <span class="dot" style="background:${safeColor(u.color)}"></span> ${escHtml(u.label)}</label>`).join('');
  const curYear = new Date().getFullYear();
  document.getElementById('batch-year-from').value = curYear;
  document.getElementById('batch-year-to').value = curYear;
  document.getElementById('batch-progress').innerHTML = '';
  document.getElementById('batch-go-btn').disabled = false;
}
function toggleBatchAll(checked) { document.querySelectorAll('.batch-unit-chk').forEach(c => c.checked = checked); }

function runBatchGeneration() {
  const units = getAllUnits();
  const selected = [];
  document.querySelectorAll('.batch-unit-chk:checked').forEach(c => selected.push(parseInt(c.value)));
  if (!selected.length) { alert('Seleziona almeno un frigorifero.'); return; }

  const yearFrom = parseInt(document.getElementById('batch-year-from').value);
  const yearTo = parseInt(document.getElementById('batch-year-to').value);
  const monthFrom = parseInt(document.getElementById('batch-month-from').value);
  const monthTo = parseInt(document.getElementById('batch-month-to').value);
  if (isNaN(yearFrom) || isNaN(yearTo) || yearFrom > yearTo) { alert('Intervallo di anni non valido.'); return; }
  if (yearTo - yearFrom > 10) { alert('Massimo 10 anni per volta.'); return; }
  if (yearFrom === yearTo && monthFrom > monthTo) { alert('Il mese iniziale viene dopo il mese finale.'); return; }
  const overwrite = document.getElementById('batch-overwrite').checked;
  const operator = getOperator() || 'Batch';

  /* Per ogni giorno al massimo 3 irregolarità distribuite fra le unità scelte:
     ~70% → 0, ~15% → 1, ~10% → 2, ~5% → 3 */
  const tasks = [];
  for (let y = yearFrom; y <= yearTo; y++) {
    const mStart = (y === yearFrom) ? monthFrom : 0;
    const mEnd = (y === yearTo) ? monthTo : 11;
    for (let m = mStart; m <= mEnd; m++) {
      getWorkingDays(y, m).forEach(d => {
        const dayTasks = selected.filter(idx => units[idx]).map(idx => ({ uid: units[idx].uid, date: d.date, unit: units[idx], forceIrregular: false }));
        const rnd = Math.random();
        const numIrreg = rnd < 0.70 ? 0 : rnd < 0.85 ? 1 : rnd < 0.95 ? 2 : 3;
        if (numIrreg > 0 && dayTasks.length > 0) {
          const indices = dayTasks.map((_, i) => i);
          for (let i = indices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [indices[i], indices[j]] = [indices[j], indices[i]]; }
          for (let k = 0; k < Math.min(numIrreg, indices.length); k++) dayTasks[indices[k]].forceIrregular = true;
        }
        tasks.push(...dayTasks);
      });
    }
  }
  const total = tasks.length;
  if (!total) { alert('Niente da generare.'); return; }
  const progressEl = document.getElementById('batch-progress');
  const btn = document.getElementById('batch-go-btn');
  btn.disabled = true;
  progressEl.innerHTML = '<div class="batch-bar-wrap"><div class="batch-bar" id="batch-bar" style="width:0%"></div></div><div id="bstat">Generazione in corso… 0/' + total + '</div>';

  let idx = 0, generated = 0, skipped = 0;
  function processChunk() {
    const end = Math.min(idx + 200, total);
    for (; idx < end; idx++) {
      const t = tasks[idx];
      if (getReading(t.uid, t.date) && !overwrite) { skipped++; continue; }
      state.readings[getReadingKey(t.uid, t.date)] = { temp: generateRandomTemp(t.unit, t.forceIrregular), time: '08:00', method: 'Batch', operator, notes: '', timestamp: new Date().toISOString() };
      generated++;
    }
    document.getElementById('batch-bar').style.width = Math.round(idx / total * 100) + '%';
    document.getElementById('bstat').textContent = 'Generazione in corso… ' + idx + '/' + total;
    if (idx < total) requestAnimationFrame(processChunk);
    else {
      const ok = saveData();
      btn.disabled = false;
      progressEl.innerHTML = ok
        ? '<div class="info-box ok"><strong>Completato: ' + generated + ' temperature generate</strong>' + (skipped ? ' (' + skipped + ' già presenti, lasciate com\'erano)' : '') + '</div>'
        : '<div class="info-box warn">Le temperature sono state generate ma NON salvate: la memoria del browser è piena.</div>';
      refreshCurrentSection();
    }
  }
  requestAnimationFrame(processChunk);
}
