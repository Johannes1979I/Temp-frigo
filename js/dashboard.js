/* dashboard.js — schede di stato dei frigoriferi (anche combinati) + selettore del mese */

function unitMonthStats(u, workDays) {
  let filled = 0, alarms = 0, warnings = 0, last = null;
  workDays.forEach(d => {
    const r = getReading(u.uid, d.date);
    if (r && r.temp != null && !isNaN(r.temp)) {
      filled++; last = { temp: r.temp, date: d.date };
      const ev = evalTemp(u, r.temp); if (ev === 'alarm') alarms++; else if (ev === 'warning') warnings++;
    }
  });
  return { filled, alarms, warnings, last };
}

function renderDashboard() {
  const grid = document.getElementById('fridge-cards');
  if (!grid) return;
  if (!state.fridges.length) { grid.innerHTML = '<div class="empty-msg">Nessun frigorifero configurato: aggiungilo in Impostazioni.</div>'; return; }
  const workDays = getWorkingDays(state.year, state.month);

  grid.innerHTML = state.fridges.map((f, fi) => {
    const units = getUnits(f);
    let totAlarms = 0, totWarn = 0, anyFilled = false;

    const unitsHtml = units.map(u => {
      const s = unitMonthStats(u, workDays);
      totAlarms += s.alarms; totWarn += s.warnings; if (s.filled) anyFilled = true;
      const pct = workDays.length ? Math.round(s.filled / workDays.length * 100) : 0;
      const col = safeColor(u.color);
      const lastEv = s.last ? evalTemp(u, s.last.temp) : 'missing';
      const chip = units.length > 1 ? (u.compartment === 'frigo' ? 'Frigo' : 'Freezer') : typeLabelOf(u.type);
      return `<div class="unit-block">
        <div class="unit-head"><span class="unit-chip" style="background:${col}"><i data-lucide="${u.type === '+4' ? 'thermometer' : 'snowflake'}"></i>${escHtml(chip)}</span>
          <span class="unit-range">limiti ${escHtml(u.minT)} / ${escHtml(u.maxT)} °C</span></div>
        <div class="fridge-stats">
          <div class="fridge-stat"><div class="fridge-stat-val ${lastEv === 'alarm' ? 'alarm-text' : lastEv === 'warning' ? 'warn-text' : ''}">${s.last ? s.last.temp.toFixed(1) + '°' : '—'}</div><div class="fridge-stat-label">Ultima T${s.last ? ' (' + s.last.date.slice(8) + '/' + s.last.date.slice(5, 7) + ')' : ''}</div></div>
          <div class="fridge-stat"><div class="fridge-stat-val">${s.filled}/${workDays.length}</div><div class="fridge-stat-label">Rilevazioni</div></div>
          <div class="fridge-stat"><div class="fridge-stat-val ${s.alarms ? 'alarm-text' : ''}">${s.alarms}</div><div class="fridge-stat-label">Allarmi</div></div>
        </div>
        <div class="progress"><div class="progress-bar" style="width:${pct}%;background:${col}"></div></div>
        <div class="progress-pct">${pct}% del mese${s.warnings ? ' — ' + s.warnings + ' in attenzione' : ''}</div>
      </div>`;
    }).join('');

    // stato della scheda: prima gli avvisi «attenzione» non comparivano sul pallino
    const cardStatus = totAlarms > 0 ? 'status-alarm' : totWarn > 0 ? 'status-warn' : anyFilled ? 'status-ok' : 'status-empty';
    const isCombo = f.type === 'combo';
    return `<div class="fridge-card ${cardStatus}" style="--fridge-color:${safeColor(f.color)}" onclick="openFridgeData(${fi})" title="Apri le rilevazioni di ${escHtml(f.name)}">
      <div class="fridge-card-header">
        <span class="fridge-icon"><i data-lucide="${isCombo ? 'refrigerator' : f.type === '-20' ? 'snowflake' : 'thermometer'}"></i></span>
        <div class="fridge-title"><div class="fridge-name">${escHtml(f.name)}</div><div class="fridge-sub">${isCombo ? 'Combinato (frigo + freezer)' : f.type === '-20' ? 'Congelatore' : 'Frigorifero'}</div></div>
        <div class="fridge-status-dot" title="${totAlarms ? 'Ci sono allarmi' : totWarn ? 'Valori vicini ai limiti' : anyFilled ? 'Tutto conforme' : 'Nessun dato'}"></div>
      </div>
      ${unitsHtml}
    </div>`;
  }).join('');
}
function openFridgeData(fi) {
  // prima unita' del frigorifero scelto
  const uid = getUnits(state.fridges[fi])[0].uid;
  const i = getAllUnits().findIndex(u => u.uid === uid);
  selectedUnitIdx = i < 0 ? 0 : i;
  showSection('data');
}

function renderMonthSelector() {
  document.getElementById('month-display').textContent = MONTH_NAMES[state.month] + ' ' + state.year;
}
function prevMonth() { state.month--; if (state.month < 0) { state.month = 11; state.year--; } renderMonthSelector(); refreshCurrentSection(); }
function nextMonth() { state.month++; if (state.month > 11) { state.month = 0; state.year++; } renderMonthSelector(); refreshCurrentSection(); }
