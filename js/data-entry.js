/* data-entry.js — Temperature Data Entry Grid */

let selectedFridge = null;

function renderDataGrid() {
  const container = document.getElementById('data-grid-container');
  if (!container) return;

  const workDays = getWorkingDays(state.year, state.month);

  // Fridge selector tabs
  let html = '<div class="fridge-tabs">';
  state.fridges.forEach((f, i) => {
    const sel = (selectedFridge === f.id || (!selectedFridge && i === 0)) ? 'active' : '';
    if (!selectedFridge && i === 0) selectedFridge = f.id;
    html += `<button class="fridge-tab ${sel}" style="--fc:${f.color}" onclick="selectFridgeTab('${f.id}')">${f.name.split(' — ')[0] || f.name}</button>`;
  });
  html += '</div>';

  const fridge = state.fridges.find(f => f.id === selectedFridge) || state.fridges[0];
  if (!fridge) { container.innerHTML = '<p>Nessun frigorifero configurato</p>'; return; }

  // Acquisition method selector
  html += `<div class="acq-bar">
    <span class="acq-label">Acquisizione:</span>
    <button class="btn btn-sm btn-outline acq-btn active" id="acq-manual" onclick="setAcqMethod('Manuale')">✏️ Manuale</button>
    <button class="btn btn-sm btn-outline acq-btn" id="acq-wifi" onclick="setAcqMethod('WiFi')">📶 WiFi</button>
    <button class="btn btn-sm btn-outline acq-btn" id="acq-bt" onclick="setAcqMethod('Bluetooth')">🔵 Bluetooth</button>
    <div style="flex:1"></div>
    <button class="btn btn-sm btn-primary" onclick="fillRandomTemps('${fridge.id}')">🎲 Genera T casuali</button>
    <button class="btn btn-sm btn-outline" onclick="clearFridgeMonth('${fridge.id}')">🗑 Cancella mese</button>
  </div>`;

  // Operator field
  html += `<div class="operator-row">
    <label>Operatore:</label>
    <input type="text" id="operator-name" placeholder="Nome operatore" value="${getOperator()}" onchange="setOperator(this.value)">
  </div>`;

  // Data table
  html += '<div class="data-table-wrap"><table class="temp-table"><thead><tr>';
  html += '<th>Giorno</th><th>Data</th><th>Temperatura (°C)</th><th>Ora</th><th>Metodo</th><th>Stato</th><th>Note</th><th></th>';
  html += '</tr></thead><tbody>';

  workDays.forEach(d => {
    const r = getReading(fridge.id, d.date);
    const temp = r ? r.temp : '';
    const ev = r ? evalTemp(fridge, r.temp) : 'missing';
    const statusMap = {
      ok: '<span class="status-badge st-ok">OK</span>',
      warning: '<span class="status-badge st-warn">⚠️</span>',
      alarm: '<span class="status-badge st-alarm">ALLARME</span>',
      missing: '<span class="status-badge st-miss">—</span>',
    };
    const dayNames = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
    const dayName = dayNames[d.dow];
    const isToday = d.date === fmtDate(new Date());

    html += `<tr class="temp-row ${ev} ${isToday ? 'today-row' : ''}">
      <td class="day-name">${dayName}</td>
      <td class="day-date">${d.dayNum}/${state.month + 1}</td>
      <td><input type="number" step="0.1" class="temp-input" id="temp-${fridge.id}-${d.date}" 
          value="${temp !== '' ? temp : ''}" placeholder="${fridge.type === '+4' ? '4.0' : '-20.0'}"
          onchange="onTempInput('${fridge.id}','${d.date}',this.value)"
          onfocus="this.select()"></td>
      <td class="time-cell">${r ? r.time : ''}</td>
      <td class="method-cell">${r ? r.method : ''}</td>
      <td>${statusMap[ev]}</td>
      <td><input type="text" class="note-input" value="${r?.notes || ''}" placeholder="..." 
          onchange="onNoteInput('${fridge.id}','${d.date}',this.value)"></td>
      <td>${r ? `<button class="btn-remove" onclick="onDeleteReading('${fridge.id}','${d.date}')">×</button>` : ''}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';

  // Summary bar
  let totalOk = 0, totalWarn = 0, totalAlarm = 0, totalMissing = 0;
  workDays.forEach(d => {
    const r = getReading(fridge.id, d.date);
    if (!r) totalMissing++;
    else {
      const ev = evalTemp(fridge, r.temp);
      if (ev === 'ok') totalOk++;
      else if (ev === 'warning') totalWarn++;
      else totalAlarm++;
    }
  });
  html += `<div class="summary-bar">
    <span class="sum-ok">${totalOk} OK</span>
    <span class="sum-warn">${totalWarn} Attenzione</span>
    <span class="sum-alarm">${totalAlarm} Allarmi</span>
    <span class="sum-miss">${totalMissing} Mancanti</span>
  </div>`;

  container.innerHTML = html;
}

let currentAcqMethod = 'Manuale';
function setAcqMethod(method) {
  currentAcqMethod = method;
  document.querySelectorAll('.acq-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('acq-' + (method === 'Manuale' ? 'manual' : method === 'WiFi' ? 'wifi' : 'bt'))?.classList.add('active');

  if (method === 'WiFi' || method === 'Bluetooth') {
    // Simulate acquisition delay
    const fridge = state.fridges.find(f => f.id === selectedFridge);
    if (fridge && confirm(`Simulare acquisizione ${method} per ${fridge.name}?\n(Verrà generata una temperatura realistica per oggi)`)) {
      const today = fmtDate(new Date());
      const temp = generateRandomTemp(fridge);
      setReading(fridge.id, today, temp, method, getOperator(), 'Auto-' + method);
      renderDataGrid();
    }
  }
}

function getOperator() {
  try { return localStorage.getItem('tempfrigo_operator') || ''; } catch(e) { return ''; }
}
function setOperator(v) {
  try { localStorage.setItem('tempfrigo_operator', v); } catch(e) {}
}

function onTempInput(fridgeId, dateStr, val) {
  if (val === '' || isNaN(parseFloat(val))) return;
  setReading(fridgeId, dateStr, val, currentAcqMethod, getOperator(), '');
  renderDataGrid();
}

function onNoteInput(fridgeId, dateStr, val) {
  const r = getReading(fridgeId, dateStr);
  if (r) { r.notes = val; saveData(); }
}

function onDeleteReading(fridgeId, dateStr) {
  deleteReading(fridgeId, dateStr);
  renderDataGrid();
}

function selectFridgeTab(id) {
  selectedFridge = id;
  renderDataGrid();
}

function fillRandomTemps(fridgeId) {
  const fridge = state.fridges.find(f => f.id === fridgeId);
  if (!fridge) return;
  if (!confirm(`Generare temperature casuali per "${fridge.name}" — ${MONTH_NAMES[state.month]} ${state.year}?\n(Sovrascrive i dati esistenti)`)) return;

  const workDays = getWorkingDays(state.year, state.month);
  workDays.forEach(d => {
    const temp = generateRandomTemp(fridge);
    setReading(fridge.id, d.date, temp, 'Generato', getOperator(), '');
  });
  renderDataGrid();
}

function clearFridgeMonth(fridgeId) {
  if (!confirm('Cancellare tutti i dati di questo mese per questo frigorifero?')) return;
  const workDays = getWorkingDays(state.year, state.month);
  workDays.forEach(d => deleteReading(fridgeId, d.date));
  renderDataGrid();
}
