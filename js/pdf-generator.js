/* pdf-generator.js — report mensile delle temperature (anche combinati) + archivio nel browser */

const DEFAULT_LAB_NAME = 'Laboratorio Analisi — P.O. Giovanni Paolo I';
function getLabName() { return (document.getElementById('lab-name')?.value || '').trim() || DEFAULT_LAB_NAME; }
/* il nome del laboratorio prima si perdeva a ogni apertura della pagina */
function saveLabName(v) { try { localStorage.setItem('tempfrigo_labname', String(v || '').trim()); } catch(e) {} }
function loadLabName() { try { const v = localStorage.getItem('tempfrigo_labname'); if (v) { const el = document.getElementById('lab-name'); if (el) el.value = v; } } catch(e) {} }

/* jsPDF con i caratteri standard conosce solo l'alfabeto latino: un solo «—» rendeva illeggibile tutta la riga */
function pdfText(s) {
  return String(s == null ? '' : s)
    .replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”«»]/g, '"').replace(/…/g, '...')
    .replace(/[^\x00-\xff]/g, '');
}

function renderPdfPreview() {
  const el = document.getElementById('pdf-preview-info');
  if (!el) return;
  const units = getAllUnits();
  const workDays = getWorkingDays(state.year, state.month);
  let total = 0, filled = 0, alarms = 0, warns = 0;
  units.forEach(u => { workDays.forEach(d => { total++; const r = getReading(u.uid, d.date); if (r) { filled++; const e = evalTemp(u, r.temp); if (e === 'alarm') alarms++; else if (e === 'warning') warns++; } }); });
  el.innerHTML = '<strong>' + MONTH_NAMES[state.month] + ' ' + state.year + '</strong> — ' +
    filled + '/' + total + ' rilevazioni (' + (total ? Math.round(filled / total * 100) : 0) + '%) — ' +
    (alarms > 0 ? '<span style="color:var(--danger);font-weight:600">' + alarms + ' allarmi</span>' : '<span style="color:var(--success);font-weight:600">nessun allarme</span>') +
    (warns ? ' — ' + warns + ' in attenzione' : '');
}

/* logo: formato dal contenuto (un JPEG dichiarato PNG spariva) e proporzioni rispettate */
function addLogo(doc, x, y, maxW, maxH) {
  const img = document.getElementById('header-preview');
  if (!img?.src || img.classList.contains('hidden') || !img.src.startsWith('data:image')) return;
  try {
    const fmt = /^data:image\/jpe?g/i.test(img.src) ? 'JPEG' : 'PNG';
    const r = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : maxW / maxH;
    let w = maxW, h = w / r; if (h > maxH) { h = maxH; w = h * r; }
    doc.addImage(img.src, fmt, x, y, w, h);
  } catch(e) { console.warn('Logo non inserito nel PDF:', e); }
}

async function generatePDF() {
  if (!window.jspdf?.jsPDF) { alert('❌ Libreria PDF non caricata: ricarica la pagina.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pw = 297, ph = 210, mx = 8, my = 8, cw = pw - 2 * mx;
  let y = my;
  const units = getAllUnits();
  const workDays = getWorkingDays(state.year, state.month);

  addLogo(doc, mx, y, 30, 12);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(33, 97, 140);
  doc.text('REGISTRO TEMPERATURE FRIGORIFERI', pw / 2, y + 5, { align: 'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
  doc.text(pdfText(getLabName()), pw / 2, y + 10, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(33, 97, 140);
  doc.text(MONTH_NAMES[state.month] + ' ' + state.year, pw / 2, y + 15, { align: 'center' });
  y += 20;
  doc.setDrawColor(33, 97, 140); doc.setLineWidth(0.5); doc.line(mx, y, pw - mx, y); y += 3;

  const dayW = (cw - 4) / Math.max(1, workDays.length);
  const dn = ['Do', 'Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa'];
  units.forEach(u => {
    if (y > ph - 50) { doc.addPage('a4', 'landscape'); y = my; }
    const rgb = hexToRgb(u.color);
    doc.setFillColor(rgb.r, rgb.g, rgb.b); doc.roundedRect(mx, y, cw, 5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
    doc.text(pdfText(u.label + '  |  ' + typeLabelOf(u.type) + '  |  Limiti: ' + u.minT + '°C ~ ' + u.maxT + '°C'), mx + 3, y + 3.5);
    y += 7;

    doc.setFillColor(240, 245, 250); doc.rect(mx, y, cw, 4, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5); doc.setTextColor(60, 60, 60);
    workDays.forEach((d, i) => {
      doc.text(dn[d.dow], mx + 2 + i * dayW + dayW / 2, y + 1.8, { align: 'center' });
      doc.text(String(d.dayNum), mx + 2 + i * dayW + dayW / 2, y + 3.5, { align: 'center' });
    });
    y += 4;

    doc.setFontSize(5.5); doc.setFont('helvetica', 'normal');
    let minT = Infinity, maxT = -Infinity, sumT = 0, cnt = 0, alarms = 0, warns = 0;
    workDays.forEach((d, i) => {
      const r = getReading(u.uid, d.date);
      const x = mx + 2 + i * dayW;
      if (r && r.temp != null && !isNaN(r.temp)) {
        cnt++; sumT += r.temp; if (r.temp < minT) minT = r.temp; if (r.temp > maxT) maxT = r.temp;
        const ev = evalTemp(u, r.temp);
        if (ev === 'alarm') { alarms++; doc.setFillColor(231, 76, 60); doc.rect(x, y, dayW, 4, 'F'); doc.setTextColor(255, 255, 255); }
        else if (ev === 'warning') { warns++; doc.setFillColor(243, 156, 18); doc.rect(x, y, dayW, 4, 'F'); doc.setTextColor(255, 255, 255); }
        else { doc.setTextColor(30, 30, 30); }
        doc.text(r.temp.toFixed(1), x + dayW / 2, y + 2.8, { align: 'center' });
        doc.setTextColor(30, 30, 30);
      } else {
        doc.setFillColor(245, 245, 245); doc.rect(x, y, dayW, 4, 'F');
        doc.setTextColor(180, 180, 180); doc.text('-', x + dayW / 2, y + 2.8, { align: 'center' }); doc.setTextColor(30, 30, 30);
      }
      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.1); doc.rect(x, y, dayW, 4);
    });
    y += 5;

    doc.setFontSize(5); doc.setTextColor(100, 100, 100);
    doc.text('Min: ' + (cnt ? minT.toFixed(1) + '°C' : '-') + '  |  Max: ' + (cnt ? maxT.toFixed(1) + '°C' : '-') + '  |  Media: ' + (cnt ? (sumT / cnt).toFixed(1) + '°C' : '-') +
      '  |  Rilev.: ' + cnt + '/' + workDays.length + '  |  Attenzione: ' + warns + '  |  Allarmi: ' + alarms, mx + 3, y + 1);
    y += 5;
  });

  // firme
  y = Math.max(y, ph - 30);
  if (y > ph - 25) { doc.addPage('a4', 'landscape'); y = my; }
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2); doc.line(mx, y, pw - mx, y); y += 4;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
  doc.text('Operatore: ____________________________', mx + 10, y + 3);
  doc.text('Responsabile Qualità: ____________________________', pw / 2 + 10, y + 3);
  doc.text('Data stampa: ' + new Date().toLocaleDateString('it-IT'), mx + 10, y + 8);

  const pdfNotes = document.getElementById('pdf-notes-frigo')?.value?.trim();
  if (pdfNotes) { y += 12; doc.setFontSize(6); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 100, 100);
    doc.splitTextToSize(pdfText('Note: ' + pdfNotes), cw - 10).slice(0, 3).forEach(l => { doc.text(l, mx + 5, y); y += 2.5; }); }

  // piede su tutte le pagine (prima solo sull'ultima)
  const n = doc.getNumberOfPages(), quando = 'Stampato il ' + new Date().toLocaleString('it-IT');
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(4.5); doc.setTextColor(160, 160, 160);
    doc.text('Documento generato automaticamente - Registro conforme a requisiti ISO 15189:2022 per il monitoraggio temperature di conservazione. Attenzione = entro 1°C dai limiti; allarme = fuori limiti.', mx, ph - 5);
    doc.text(quando + '  -  pagina ' + i + ' di ' + n, pw - mx, ph - 5, { align: 'right' });
  }

  doc.save('Temperature_' + MONTH_NAMES[state.month] + '_' + state.year + '.pdf');
  // DOGMA: il PDF e' gia' scaricato; l'archivio e' un di piu'
  try { saveToArchive(doc.output('datauristring')); } catch(e) { console.warn('Archivio:', e); }
}

function hexToRgb(hex) { const h = safeColor(hex, '#2980b9'); return { r: parseInt(h.slice(1, 3), 16) || 0, g: parseInt(h.slice(3, 5), 16) || 0, b: parseInt(h.slice(5, 7), 16) || 0 }; }

/* ── Archivio (localStorage, ultimi 24) ── */
function saveToArchive(pdfData) {
  let archive = [];
  try { archive = JSON.parse(localStorage.getItem('tempfrigo_archive') || '[]'); if (!Array.isArray(archive)) archive = []; } catch(e) { archive = []; }
  archive.unshift({ id: Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36), month: state.month, year: state.year,
    label: MONTH_NAMES[state.month] + ' ' + state.year, timestamp: new Date().toISOString(), pdfData });
  if (archive.length > 24) archive.length = 24;
  // memoria piena: si tolgono i piu' vecchi; prima l'errore era ignorato e il report spariva senza avviso
  let tolti = 0;
  while (archive.length) {
    try { localStorage.setItem('tempfrigo_archive', JSON.stringify(archive)); break; }
    catch(e) { if (archive.length === 1) { archive = []; break; } archive.pop(); tolti++; }
  }
  if (!archive.length) uiToast('PDF scaricato, ma non archiviato: la memoria del browser è piena.', 'warn', 8000);
  else if (tolti) uiToast('PDF archiviato; tolti ' + tolti + ' report vecchi per fare spazio.', 'info');
  renderArchive(); // prima la lista non si aggiornava dopo aver generato il PDF
}

function renderArchive() {
  const el = document.getElementById('archive-list');
  if (!el) return;
  let archive = [];
  try { archive = JSON.parse(localStorage.getItem('tempfrigo_archive') || '[]'); } catch(e) { archive = []; }
  if (!Array.isArray(archive) || !archive.length) { el.innerHTML = '<div class="empty-msg">Nessun report archiviato</div>'; return; }
  el.innerHTML = '<div class="archive-list">' + archive.map(a => {
    const quando = a.timestamp ? new Date(a.timestamp).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    return `<div class="archive-item"><span class="badge" style="background:var(--primary-pale);color:var(--primary-dark)"><i data-lucide="file-text"></i>PDF</span><span class="ai-label">${escHtml(a.label)}</span><span class="ai-date">${escHtml(quando)}</span>
      <button class="btn btn-sm btn-outline" onclick="downloadArchivePdf('${escJs(a.id)}')"><i data-lucide="download"></i>Scarica</button>
      <button class="btn-remove" title="Elimina dall'archivio" aria-label="Elimina" onclick="deleteArchivePdf('${escJs(a.id)}')"><i data-lucide="trash-2"></i></button></div>`;
  }).join('') + '</div>';
}

function downloadArchivePdf(id) {
  try {
    const archive = JSON.parse(localStorage.getItem('tempfrigo_archive') || '[]');
    const rec = archive.find(a => a.id === id);
    if (!rec?.pdfData) { alert('PDF non disponibile'); return; }
    const a = document.createElement('a'); a.href = rec.pdfData; a.download = 'Temperature_' + String(rec.label).replace(/\s/g, '_') + '.pdf';
    document.body.appendChild(a); a.click(); setTimeout(() => document.body.removeChild(a), 100);
  } catch(e) { alert('❌ Errore nel recupero del PDF: ' + e.message); }
}
async function deleteArchivePdf(id) {
  if (!await uiConfirm('Eliminare questo report dall\'archivio del browser?')) return;
  try {
    const archive = JSON.parse(localStorage.getItem('tempfrigo_archive') || '[]').filter(a => a.id !== id);
    localStorage.setItem('tempfrigo_archive', JSON.stringify(archive));
  } catch(e) { alert('❌ Errore: ' + e.message); }
  renderArchive();
}
