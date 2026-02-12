/* dashboard.js — Dashboard with Fridge Status Cards (supports combo) */

function renderDashboard() {
  const grid = document.getElementById('fridge-cards');
  if (!grid) return;
  const workDays = getWorkingDays(state.year, state.month);

  grid.innerHTML = state.fridges.map(f => {
    const units = getUnits(f);

    // Build unit stats HTML
    const unitsHtml = units.map(u => {
      let filled=0, alarms=0, warnings=0, lastTemp=null;
      workDays.forEach(d => {
        const r = getReading(u.uid, d.date);
        if(r) { filled++; lastTemp=r.temp; const ev=evalTemp(u,r.temp); if(ev==='alarm')alarms++; else if(ev==='warning')warnings++; }
      });
      const pct = workDays.length ? Math.round(filled/workDays.length*100) : 0;
      const statusClass = alarms>0 ? 'status-alarm' : warnings>0 ? 'status-warn' : filled>0 ? 'status-ok' : 'status-empty';
      const typeLabel = u.type==='+4' ? '+4\u00b0C' : '-20\u00b0C';

      return `<div class="unit-block ${statusClass}">
        ${units.length>1 ? '<div class="unit-comp-label" style="background:'+u.color+'">'+u.compartment.charAt(0).toUpperCase()+u.compartment.slice(1)+' ('+typeLabel+')</div>' : '<div class="fridge-type-badge" style="background:'+u.color+'">'+typeLabel+'</div>'}
        <div class="fridge-stats">
          <div class="fridge-stat"><div class="fridge-stat-val">${lastTemp!=null?lastTemp.toFixed(1)+'\u00b0C':'\u2014'}</div><div class="fridge-stat-label">Ultima T</div></div>
          <div class="fridge-stat"><div class="fridge-stat-val">${filled}/${workDays.length}</div><div class="fridge-stat-label">Rilev.</div></div>
          <div class="fridge-stat"><div class="fridge-stat-val ${alarms?'alarm-text':''}">${alarms}</div><div class="fridge-stat-label">Allarmi</div></div>
        </div>
        <div class="fridge-progress"><div class="fridge-progress-bar" style="width:${pct}%;background:${u.color}"></div></div>
        <div class="fridge-pct">${pct}%</div>
      </div>`;
    }).join('');

    // Overall status for card border
    let totalAlarms = 0;
    units.forEach(u => { workDays.forEach(d => { const r=getReading(u.uid,d.date); if(r && evalTemp(u,r.temp)==='alarm') totalAlarms++; }); });
    const anyFilled = units.some(u => workDays.some(d => getReading(u.uid,d.date)));
    const cardStatus = totalAlarms>0 ? 'status-alarm' : anyFilled ? 'status-ok' : 'status-empty';
    const isCombo = f.type === 'combo';

    return `<div class="fridge-card ${cardStatus} ${isCombo?'combo-card':''}" style="--fridge-color:${f.color}">
      <div class="fridge-card-header">
        ${isCombo ? '<div class="combo-badge">\ud83d\udd04 Combinato</div>' : ''}
        <div class="fridge-status-dot"></div>
      </div>
      <div class="fridge-name">${f.name}</div>
      ${unitsHtml}
    </div>`;
  }).join('');
}

function renderMonthSelector() {
  document.getElementById('month-display').textContent = MONTH_NAMES[state.month]+' '+state.year;
}

function prevMonth() {
  state.month--; if(state.month<0){state.month=11;state.year--;}
  renderMonthSelector();
  const sec=document.querySelector('[id^="section-"]:not(.hidden)');
  if(sec) showSection(sec.id.replace('section-',''));
}
function nextMonth() {
  state.month++; if(state.month>11){state.month=0;state.year++;}
  renderMonthSelector();
  const sec=document.querySelector('[id^="section-"]:not(.hidden)');
  if(sec) showSection(sec.id.replace('section-',''));
}
