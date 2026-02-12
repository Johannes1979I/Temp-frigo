/* pdf-generator.js — Monthly Temperature Report PDF */

function renderPdfPreview() {
  const el = document.getElementById('pdf-preview-info');
  if (!el) return;
  const workDays = getWorkingDays(state.year, state.month);
  let total = 0, filled = 0, alarms = 0;
  state.fridges.forEach(f => {
    workDays.forEach(d => {
      total++;
      const r = getReading(f.id, d.date);
      if (r) { filled++; if (evalTemp(f, r.temp) === 'alarm') alarms++; }
    });
  });
  el.innerHTML = `<strong>${MONTH_NAMES[state.month]} ${state.year}</strong> — 
    ${filled}/${total} rilevazioni (${Math.round(filled/total*100)}%) — 
    ${alarms > 0 ? `<span style="color:var(--danger)">${alarms} allarmi</span>` : '<span style="color:var(--success)">Nessun allarme</span>'}`;
}

async function generatePDF() {
  if (!window.jspdf?.jsPDF) { alert('jsPDF non disponibile'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pw = 297, ph = 210, mx = 8, my = 8;
  const cw = pw - 2 * mx;
  let y = my;

  const workDays = getWorkingDays(state.year, state.month);
  const labName = document.getElementById('lab-name')?.value || 'Laboratorio Analisi — P.O. Giovanni Paolo I';

  // ─── Header ───
  // Logo
  const logoImg = document.getElementById('header-preview');
  if (logoImg && logoImg.src && !logoImg.classList.contains('hidden')) {
    try { doc.addImage(logoImg.src, 'PNG', mx, y, 30, 12); } catch(e) {}
  }

  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(33, 97, 140);
  doc.text('REGISTRO TEMPERATURE FRIGORIFERI', pw / 2, y + 5, { align: 'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
  doc.text(labName, pw / 2, y + 10, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(33, 97, 140);
  doc.text(MONTH_NAMES[state.month] + ' ' + state.year, pw / 2, y + 15, { align: 'center' });
  y += 20;

  doc.setDrawColor(33, 97, 140); doc.setLineWidth(0.5); doc.line(mx, y, pw - mx, y); y += 3;

  // ─── For each fridge: one table row ───
  state.fridges.forEach((f, fi) => {
    if (y > ph - 50) { doc.addPage('landscape'); y = my; }

    // Fridge header
    const rgb = hexToRgb(f.color);
    doc.setFillColor(rgb.r, rgb.g, rgb.b); doc.roundedRect(mx, y, cw, 5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
    doc.text(`${f.name}  |  Tipo: ${f.type === '+4' ? '+4°C' : '-20°C'}  |  Range: ${f.minT}°C ~ ${f.maxT}°C`, mx + 3, y + 3.5);
    y += 7;

    // Table header
    doc.setFillColor(240, 245, 250); doc.rect(mx, y, cw, 4, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5); doc.setTextColor(60, 60, 60);
    const dayW = (cw - 4) / workDays.length;
    workDays.forEach((d, i) => {
      const dayNames = ['Do','Lu','Ma','Me','Gi','Ve','Sa'];
      doc.text(dayNames[d.dow], mx + 2 + i * dayW + dayW / 2, y + 1.8, { align: 'center' });
      doc.text(String(d.dayNum), mx + 2 + i * dayW + dayW / 2, y + 3.5, { align: 'center' });
    });
    y += 4;

    // Temperature row
    doc.setFontSize(5.5); doc.setFont('helvetica', 'normal');
    workDays.forEach((d, i) => {
      const r = getReading(f.id, d.date);
      const x = mx + 2 + i * dayW;
      if (r) {
        const ev = evalTemp(f, r.temp);
        if (ev === 'alarm') { doc.setFillColor(231, 76, 60); doc.rect(x, y, dayW, 4, 'F'); doc.setTextColor(255, 255, 255); }
        else if (ev === 'warning') { doc.setFillColor(243, 156, 18); doc.rect(x, y, dayW, 4, 'F'); doc.setTextColor(255, 255, 255); }
        else { doc.setTextColor(30, 30, 30); }
        doc.text(r.temp.toFixed(1), x + dayW / 2, y + 2.8, { align: 'center' });
        doc.setTextColor(30, 30, 30);
      } else {
        doc.setFillColor(245, 245, 245); doc.rect(x, y, dayW, 4, 'F');
        doc.setTextColor(180, 180, 180);
        doc.text('—', x + dayW / 2, y + 2.8, { align: 'center' });
        doc.setTextColor(30, 30, 30);
      }
      // Cell border
      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.1); doc.rect(x, y, dayW, 4);
    });
    y += 5;

    // Stats row
    let minT = Infinity, maxT = -Infinity, sumT = 0, cnt = 0, alarms = 0;
    workDays.forEach(d => {
      const r = getReading(f.id, d.date);
      if (r) { cnt++; sumT += r.temp; if (r.temp < minT) minT = r.temp; if (r.temp > maxT) maxT = r.temp; if (evalTemp(f, r.temp) === 'alarm') alarms++; }
    });
    const avgT = cnt ? (sumT / cnt).toFixed(1) : '—';
    doc.setFontSize(5); doc.setTextColor(100, 100, 100);
    doc.text(`Min: ${cnt ? minT.toFixed(1) + '°C' : '—'}  |  Max: ${cnt ? maxT.toFixed(1) + '°C' : '—'}  |  Media: ${avgT}°C  |  Rilevazioni: ${cnt}/${workDays.length}  |  Allarmi: ${alarms}`, mx + 3, y + 1);
    y += 5;
  });

  // ─── Footer ───
  y = Math.max(y, ph - 30);
  if (y > ph - 25) { doc.addPage('landscape'); y = my; }
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2); doc.line(mx, y, pw - mx, y); y += 4;

  // Signatures
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
  doc.text('Operatore: ____________________________', mx + 10, y + 3);
  doc.text('Responsabile Qualità: ____________________________', pw / 2 + 10, y + 3);
  doc.text('Data stampa: ' + new Date().toLocaleDateString('it-IT'), mx + 10, y + 8);

  // Notes
  const pdfNotes = document.getElementById('pdf-notes-frigo')?.value?.trim();
  if (pdfNotes) {
    y += 12;
    doc.setFontSize(6); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 100, 100);
    const lines = doc.splitTextToSize('Note: ' + pdfNotes, cw - 10);
    lines.slice(0, 3).forEach(l => { doc.text(l, mx + 5, y); y += 2.5; });
  }

  // Disclaimer
  doc.setFontSize(4.5); doc.setTextColor(160, 160, 160);
  doc.text('Documento generato automaticamente — Registro conforme a requisiti ISO 15189:2022 per il monitoraggio temperature di conservazione.', mx, ph - 5);
  doc.text('Stampato il ' + new Date().toLocaleString('it-IT'), pw - mx, ph - 5, { align: 'right' });

  // Save
  const filename = 'Temperature_' + labName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) + '_' + MONTH_NAMES[state.month] + '_' + state.year + '.pdf';
  doc.save(filename);

  // Archive
  try {
    const pdfData = doc.output('datauristring');
    saveToArchive(pdfData);
  } catch(e) {}
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

/* ── Archive ── */
function saveToArchive(pdfData) {
  try {
    const archive = JSON.parse(localStorage.getItem('tempfrigo_archive') || '[]');
    archive.unshift({
      id: Date.now().toString(36),
      month: state.month,
      year: state.year,
      label: MONTH_NAMES[state.month] + ' ' + state.year,
      timestamp: new Date().toISOString(),
      pdfData,
    });
    // Keep last 24 months
    if (archive.length > 24) archive.length = 24;
    localStorage.setItem('tempfrigo_archive', JSON.stringify(archive));
  } catch(e) {}
}

function renderArchive() {
  const el = document.getElementById('archive-list');
  if (!el) return;
  try {
    const archive = JSON.parse(localStorage.getItem('tempfrigo_archive') || '[]');
    if (!archive.length) { el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Nessun report archiviato</div>'; return; }
    el.innerHTML = archive.map(a => `<div class="archive-item">
      <span>${a.label}</span>
      <span style="color:var(--text-muted);font-size:12px">${new Date(a.timestamp).toLocaleDateString('it-IT')}</span>
      <button class="btn btn-sm btn-outline" onclick="downloadArchivePdf('${a.id}')">📄 Scarica</button>
    </div>`).join('');
  } catch(e) { el.innerHTML = ''; }
}

function downloadArchivePdf(id) {
  try {
    const archive = JSON.parse(localStorage.getItem('tempfrigo_archive') || '[]');
    const rec = archive.find(a => a.id === id);
    if (!rec?.pdfData) { alert('PDF non disponibile'); return; }
    const a = document.createElement('a');
    a.href = rec.pdfData; a.download = 'Temperature_' + rec.label.replace(/\s/g, '_') + '.pdf';
    document.body.appendChild(a); a.click(); setTimeout(() => document.body.removeChild(a), 100);
  } catch(e) {}
}
