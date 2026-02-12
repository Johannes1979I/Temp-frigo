/* charts.js — Temperature Charts per Unit (supports combo) */

const chartInstances = {};

function renderAllCharts() {
  const container = document.getElementById('charts-container');
  if (!container) return;
  const units = getAllUnits();
  const workDays = getWorkingDays(state.year, state.month);

  let html = '';
  units.forEach(u => {
    html += '<div class="chart-card"><div class="chart-title" style="color:'+u.color+'">'+u.label+' ('+
      (u.type==='+4'?'+4\u00b0C':'-20\u00b0C')+')</div><canvas id="chart-'+u.uid.replace(':','_')+'" height="200"></canvas></div>';
  });
  html += '<div class="chart-card"><div class="chart-title">Riepilogo Conformit\u00e0 \u2014 '+MONTH_NAMES[state.month]+' '+state.year+'</div><canvas id="chart-overview" height="200"></canvas></div>';
  container.innerHTML = html;

  Object.values(chartInstances).forEach(c=>c.destroy());

  units.forEach(u => {
    const canvasId = 'chart-'+u.uid.replace(':','_');
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const labels=[], data=[], bgColors=[];
    workDays.forEach(d => {
      labels.push(d.dayNum+'/'+(state.month+1));
      const r = getReading(u.uid, d.date);
      if(r) { data.push(r.temp); const ev=evalTemp(u,r.temp); bgColors.push(ev==='alarm'?'#e74c3c':ev==='warning'?'#f39c12':u.color); }
      else { data.push(null); bgColors.push('#ccc'); }
    });
    chartInstances[u.uid] = new Chart(canvas, {
      type:'line', data: {
        labels, datasets: [
          { label:'Temperatura (\u00b0C)', data, borderColor:u.color, backgroundColor:u.color+'20',
            pointBackgroundColor:bgColors, pointRadius:4, pointHoverRadius:6, tension:0.3, fill:true, spanGaps:false },
          { label:'Min', data:workDays.map(()=>u.minT), borderColor:'#e74c3c44', borderDash:[4,4], pointRadius:0, fill:false },
          { label:'Max', data:workDays.map(()=>u.maxT), borderColor:'#e74c3c44', borderDash:[4,4], pointRadius:0, fill:false },
        ]
      },
      options: { responsive:true, plugins:{legend:{display:false},
        tooltip:{callbacks:{label:ctx=>ctx.dataset.label+': '+(ctx.parsed.y!=null?ctx.parsed.y.toFixed(1)+'\u00b0C':'N/D')}}},
        scales:{y:{title:{display:true,text:'\u00b0C'},
          suggestedMin:u.type==='+4'?-1:-30, suggestedMax:u.type==='+4'?12:-10}} }
    });
  });

  // Overview doughnut
  let ok=0,warn=0,alm=0,miss=0;
  units.forEach(u=>{workDays.forEach(d=>{const r=getReading(u.uid,d.date);if(!r)miss++;else{const e=evalTemp(u,r.temp);if(e==='ok')ok++;else if(e==='warning')warn++;else alm++;}});});
  const oc = document.getElementById('chart-overview');
  if(oc) chartInstances['overview'] = new Chart(oc, {
    type:'doughnut', data:{ labels:['Conforme','Attenzione','Allarme','Mancante'],
      datasets:[{data:[ok,warn,alm,miss], backgroundColor:['#27ae60','#f39c12','#e74c3c','#bdc3c7']}] },
    options:{ responsive:true, plugins:{legend:{position:'bottom'},
      tooltip:{callbacks:{label:ctx=>ctx.label+': '+ctx.parsed+' rilevazioni'}}} }
  });
}
