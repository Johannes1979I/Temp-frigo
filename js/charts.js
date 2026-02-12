/* charts.js — Temperature Charts per Fridge */

const chartInstances = {};

function renderAllCharts() {
  const container = document.getElementById('charts-container');
  if (!container) return;
  const workDays = getWorkingDays(state.year, state.month);

  let html = '';
  state.fridges.forEach(f => {
    html += `<div class="chart-card">
      <div class="chart-title" style="color:${f.color}">${f.name} (${f.type === '+4' ? '+4°C' : '-20°C'})</div>
      <canvas id="chart-${f.id}" height="200"></canvas>
    </div>`;
  });
  // Overview doughnut
  html += `<div class="chart-card">
    <div class="chart-title">Riepilogo Conformità — ${MONTH_NAMES[state.month]} ${state.year}</div>
    <canvas id="chart-overview" height="200"></canvas>
  </div>`;

  container.innerHTML = html;

  // Destroy old chart instances
  Object.values(chartInstances).forEach(c => c.destroy());

  // Render line charts
  state.fridges.forEach(f => {
    const canvas = document.getElementById('chart-' + f.id);
    if (!canvas) return;
    const labels = [], data = [], bgColors = [];

    workDays.forEach(d => {
      labels.push(d.dayNum + '/' + (state.month + 1));
      const r = getReading(f.id, d.date);
      if (r) {
        data.push(r.temp);
        const ev = evalTemp(f, r.temp);
        bgColors.push(ev === 'alarm' ? '#e74c3c' : ev === 'warning' ? '#f39c12' : f.color);
      } else {
        data.push(null);
        bgColors.push('#ccc');
      }
    });

    chartInstances[f.id] = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Temperatura (°C)',
            data,
            borderColor: f.color,
            backgroundColor: f.color + '20',
            pointBackgroundColor: bgColors,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
            fill: true,
            spanGaps: false,
          },
          {
            label: 'Min',
            data: workDays.map(() => f.minT),
            borderColor: '#e74c3c44',
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
          },
          {
            label: 'Max',
            data: workDays.map(() => f.maxT),
            borderColor: '#e74c3c44',
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ctx.dataset.label + ': ' + (ctx.parsed.y != null ? ctx.parsed.y.toFixed(1) + '°C' : 'N/D')
            }
          },
        },
        scales: {
          y: {
            title: { display: true, text: '°C' },
            suggestedMin: f.type === '+4' ? -1 : -30,
            suggestedMax: f.type === '+4' ? 12 : -10,
          }
        }
      }
    });
  });

  // Overview doughnut
  let totalOk = 0, totalWarn = 0, totalAlarm = 0, totalMiss = 0;
  state.fridges.forEach(f => {
    workDays.forEach(d => {
      const r = getReading(f.id, d.date);
      if (!r) totalMiss++;
      else {
        const ev = evalTemp(f, r.temp);
        if (ev === 'ok') totalOk++;
        else if (ev === 'warning') totalWarn++;
        else totalAlarm++;
      }
    });
  });

  const ovCanvas = document.getElementById('chart-overview');
  if (ovCanvas) {
    chartInstances['overview'] = new Chart(ovCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Conforme', 'Attenzione', 'Allarme', 'Mancante'],
        datasets: [{
          data: [totalOk, totalWarn, totalAlarm, totalMiss],
          backgroundColor: ['#27ae60', '#f39c12', '#e74c3c', '#bdc3c7'],
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: { label: ctx => ctx.label + ': ' + ctx.parsed + ' rilevazioni' }
          }
        }
      }
    });
  }
}
