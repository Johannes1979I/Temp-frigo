/* charts.js — andamento delle temperature per ogni unità (anche combinati) + riepilogo del mese */

const chartInstances = {};

function renderAllCharts() {
  const container = document.getElementById('charts-container');
  if (!container) return;
  if (typeof Chart === 'undefined') { container.innerHTML = '<div class="empty-msg">Libreria dei grafici non caricata.</div>'; return; }
  Object.keys(chartInstances).forEach(k => { try { chartInstances[k].destroy(); } catch(e) {} delete chartInstances[k]; });
  const units = getAllUnits();
  if (!units.length) { container.innerHTML = '<div class="empty-msg">Nessun frigorifero configurato.</div>'; return; }
  const workDays = getWorkingDays(state.year, state.month);

  let html = `<div class="chart-legend">
    <span><span class="dot" style="background:#17a06b"></span>conforme</span>
    <span><span class="dot" style="background:#e69516"></span>attenzione (entro 1 °C dai limiti)</span>
    <span><span class="dot" style="background:#d94545"></span>allarme (fuori limiti)</span>
    <span>linee tratteggiate: limiti min e max</span></div>`;
  html += '<div class="chart-card" style="margin-bottom:14px"><div class="chart-title">Riepilogo conformità — ' + MONTH_NAMES[state.month] + ' ' + state.year + '</div><div class="chart-box"><canvas id="chart-overview"></canvas></div></div>';
  html += '<div class="chart-grid">';
  units.forEach((u, i) => {
    html += `<div class="chart-card"><div class="chart-title" style="color:${safeColor(u.color)}">${escHtml(u.label)} <small>(${typeLabelOf(u.type)} — limiti ${escHtml(u.minT)} / ${escHtml(u.maxT)} °C)</small></div><div class="chart-box tall"><canvas id="chart-u${i}"></canvas></div></div>`;
  });
  html += '</div>';
  container.innerHTML = html;

  units.forEach((u, i) => {
    const canvas = document.getElementById('chart-u' + i);
    if (!canvas) return;
    const col = safeColor(u.color);
    const labels = [], data = [], pc = [];
    workDays.forEach(d => {
      labels.push(d.dayNum + '/' + (state.month + 1));
      const r = getReading(u.uid, d.date);
      if (r && r.temp != null && !isNaN(r.temp)) { data.push(r.temp); const ev = evalTemp(u, r.temp); pc.push(ev === 'alarm' ? '#d94545' : ev === 'warning' ? '#e69516' : '#17a06b'); }
      else { data.push(null); pc.push('#c5cfdd'); }
    });
    chartInstances[u.uid] = new Chart(canvas, {
      type: 'line', data: {
        labels, datasets: [
          { label: 'Temperatura (°C)', data, borderColor: col, backgroundColor: col + '18',
            pointBackgroundColor: pc, pointBorderColor: pc, pointRadius: 4, pointHoverRadius: 6, tension: 0.3, fill: true, spanGaps: false, borderWidth: 1.5 },
          { label: 'Min', data: workDays.map(() => u.minT), borderColor: '#d94545', borderDash: [5, 4], borderWidth: 1, pointRadius: 0, fill: false },
          { label: 'Max', data: workDays.map(() => u.maxT), borderColor: '#d94545', borderDash: [5, 4], borderWidth: 1, pointRadius: 0, fill: false },
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false },
        tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + (ctx.parsed.y != null ? ctx.parsed.y.toFixed(1) + ' °C' : 'N/D') } } },
        scales: { y: { title: { display: true, text: '°C' }, suggestedMin: u.minT - 2, suggestedMax: u.maxT + 2 }, x: { ticks: { maxRotation: 0, autoSkip: true } } } }
    });
  });

  let ok = 0, warn = 0, alm = 0, miss = 0;
  units.forEach(u => { workDays.forEach(d => { const r = getReading(u.uid, d.date); const e = r ? evalTemp(u, r.temp) : 'missing'; if (e === 'ok') ok++; else if (e === 'warning') warn++; else if (e === 'alarm') alm++; else miss++; }); });
  const oc = document.getElementById('chart-overview');
  if (oc) chartInstances['overview'] = new Chart(oc, {
    type: 'doughnut', data: { labels: ['Conforme', 'Attenzione', 'Allarme', 'Mancante'],
      datasets: [{ data: [ok, warn, alm, miss], backgroundColor: ['#17a06b', '#e69516', '#d94545', '#c5cfdd'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { position: window.innerWidth < 640 ? 'bottom' : 'right' },
      tooltip: { callbacks: { label: ctx => ctx.label + ': ' + ctx.parsed + ' rilevazioni' } } } }
  });
}
