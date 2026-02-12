/* dashboard.js — Dashboard with Fridge Status Cards */

function renderDashboard() {
  const grid = document.getElementById('fridge-cards');
  if (!grid) return;
  const workDays = getWorkingDays(state.year, state.month);

  grid.innerHTML = state.fridges.map(f => {
    // Stats for current month
    let filled = 0, alarms = 0, warnings = 0, lastTemp = null;
    workDays.forEach(d => {
      const r = getReading(f.id, d.date);
      if (r) {
        filled++;
        lastTemp = r.temp;
        const ev = evalTemp(f, r.temp);
        if (ev === 'alarm') alarms++;
        else if (ev === 'warning') warnings++;
      }
    });
    const pct = workDays.length ? Math.round(filled / workDays.length * 100) : 0;
    const statusClass = alarms > 0 ? 'status-alarm' : warnings > 0 ? 'status-warn' : filled > 0 ? 'status-ok' : 'status-empty';
    const typeLabel = f.type === '+4' ? '+4°C' : '-20°C';
    const rangeLabel = f.minT + '°C / ' + f.maxT + '°C';

    return `<div class="fridge-card ${statusClass}" style="--fridge-color:${f.color}">
      <div class="fridge-card-header">
        <div class="fridge-type-badge" style="background:${f.color}">${typeLabel}</div>
        <div class="fridge-status-dot"></div>
      </div>
      <div class="fridge-name">${f.name}</div>
      <div class="fridge-range">Range: ${rangeLabel}</div>
      <div class="fridge-stats">
        <div class="fridge-stat">
          <div class="fridge-stat-val">${lastTemp != null ? lastTemp.toFixed(1) + '°C' : '—'}</div>
          <div class="fridge-stat-label">Ultima T</div>
        </div>
        <div class="fridge-stat">
          <div class="fridge-stat-val">${filled}/${workDays.length}</div>
          <div class="fridge-stat-label">Rilevazioni</div>
        </div>
        <div class="fridge-stat">
          <div class="fridge-stat-val ${alarms ? 'alarm-text' : ''}">${alarms}</div>
          <div class="fridge-stat-label">Allarmi</div>
        </div>
      </div>
      <div class="fridge-progress">
        <div class="fridge-progress-bar" style="width:${pct}%;background:${f.color}"></div>
      </div>
      <div class="fridge-pct">${pct}% completato</div>
    </div>`;
  }).join('');
}

function renderMonthSelector() {
  document.getElementById('month-display').textContent = MONTH_NAMES[state.month] + ' ' + state.year;
}

function prevMonth() {
  state.month--;
  if (state.month < 0) { state.month = 11; state.year--; }
  renderMonthSelector();
  const sec = document.querySelector('[id^="section-"]:not(.hidden)');
  if (sec) showSection(sec.id.replace('section-', ''));
}

function nextMonth() {
  state.month++;
  if (state.month > 11) { state.month = 0; state.year++; }
  renderMonthSelector();
  const sec = document.querySelector('[id^="section-"]:not(.hidden)');
  if (sec) showSection(sec.id.replace('section-', ''));
}
