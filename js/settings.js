/* settings.js — frigoriferi (anche combinati), logo, esportazione/importazione */

const TYPE_LABELS = { '+4': 'Frigorifero +4°C', '-20': 'Congelatore -20°C', combo: 'Combinato (frigo + freezer)' };

function rangeInputs(i, kMin, kMax, vMin, vMax) {
  return `<div class="range-inputs">
    <input type="number" step="0.1" value="${escHtml(vMin)}" aria-label="Minimo" onchange="changeFridgeLimit(${i},'${kMin}',this)"> –
    <input type="number" step="0.1" value="${escHtml(vMax)}" aria-label="Massimo" onchange="changeFridgeLimit(${i},'${kMax}',this)"> °C</div>`;
}

function renderSettings() {
  const el = document.getElementById('fridge-settings-list');
  if (!el) return;
  if (!state.fridges.length) {
    el.innerHTML = '<div class="empty-msg">Nessun frigorifero configurato.<br>Aggiungi il primo con il pulsante qui sopra.</div>';
    return;
  }
  el.innerHTML = state.fridges.map((f, i) => {
    const isCombo = f.type === 'combo';
    const u = getUnits(f); // limiti effettivi (con i default se mancanti)
    const rangeHtml = isCombo
      ? `<div class="range-row">
          <div class="compartment-box frigo-box"><span class="comp-label"><i data-lucide="thermometer"></i>Frigo</span>${rangeInputs(i, 'minT_frigo', 'maxT_frigo', u[0].minT, u[0].maxT)}</div>
          <div class="compartment-box freezer-box"><span class="comp-label"><i data-lucide="snowflake"></i>Freezer</span>${rangeInputs(i, 'minT_freezer', 'maxT_freezer', u[1].minT, u[1].maxT)}</div>
        </div>`
      : `<div class="range-row"><div class="compartment-box"><span class="comp-label">Limiti</span>${rangeInputs(i, 'minT', 'maxT', u[0].minT, u[0].maxT)}</div></div>`;

    return `<div class="setting-card" style="--fc:${safeColor(f.color)}">
      <div class="setting-row">
        <div class="form-group" style="flex:2"><label>Nome</label>
          <input type="text" value="${escHtml(f.name)}" onchange="changeFridgeName(${i},this)">
        </div>
        <div class="form-group" style="flex:1.2"><label>Tipo</label>
          <select onchange="changeFridgeFullType(${i}, this.value, this)">
            <option value="+4" ${f.type === '+4' ? 'selected' : ''}>Frigorifero +4°C</option>
            <option value="-20" ${f.type === '-20' ? 'selected' : ''}>Congelatore -20°C</option>
            <option value="combo" ${f.type === 'combo' ? 'selected' : ''}>Combinato</option>
          </select>
        </div>
        <div class="form-group" style="flex:0 0 64px"><label>Colore</label>
          <input type="color" value="${safeColor(f.color)}" onchange="changeFridgeProp(${i},'color',this.value)">
        </div>
        ${isCombo ? `<div class="form-group" style="flex:0 0 64px"><label>Col. 2</label>
          <input type="color" value="${safeColor(f.color2 || f.color)}" onchange="changeFridgeProp(${i},'color2',this.value)">
        </div>` : ''}
        <div class="setting-actions">
          <button class="btn btn-sm btn-outline btn-icon" onclick="moveFridge(${i},-1)" title="Sposta su" aria-label="Sposta su" ${i === 0 ? 'disabled' : ''}><i data-lucide="chevron-up"></i></button>
          <button class="btn btn-sm btn-outline btn-icon" onclick="moveFridge(${i},1)" title="Sposta giù" aria-label="Sposta giù" ${i === state.fridges.length - 1 ? 'disabled' : ''}><i data-lucide="chevron-down"></i></button>
          <button class="btn-danger-outline" onclick="deleteFridge(${i})" title="Elimina" aria-label="Elimina"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      ${rangeHtml}
      <div class="setting-meta">ID: ${escHtml(f.id)} — ${TYPE_LABELS[f.type] || escHtml(f.type)}</div>
    </div>`;
  }).join('');
}

/* ── CRUD ── */
function addNewFridge() {
  document.getElementById('new-fridge-name').value = '';
  document.getElementById('new-fridge-type').value = '+4';
  updateNewFridgeRangeUI();
  document.getElementById('add-fridge-modal').classList.remove('hidden');
  document.getElementById('new-fridge-name').focus();
}

function updateNewFridgeRangeUI() {
  const type = document.getElementById('new-fridge-type').value;
  const rangeEl = document.getElementById('new-fridge-range-fields');
  const box = (label, idMin, idMax, a, b, cls) => `<div class="compartment-box ${cls}"><span class="comp-label">${label}</span>
    <div class="range-inputs"><input type="number" step="0.1" id="${idMin}" value="${a}" aria-label="Minimo"> – <input type="number" step="0.1" id="${idMax}" value="${b}" aria-label="Massimo"> °C</div></div>`;
  if (type === 'combo') {
    rangeEl.innerHTML = '<div class="range-row">' + box('Frigo', 'nf-min-frigo', 'nf-max-frigo', 2, 8, 'frigo-box') + box('Freezer', 'nf-min-freezer', 'nf-max-freezer', -25, -15, 'freezer-box') + '</div>';
  } else {
    const d = TYPE_DEFAULTS[type];
    rangeEl.innerHTML = '<div class="range-row">' + box('Limiti', 'nf-min', 'nf-max', d.min, d.max, '') + '</div>';
  }
}

/* legge una coppia min/max: null se non valida (0 e' un limite valido) */
function readRange(idMin, idMax, label) {
  const a = numOr(document.getElementById(idMin)?.value, null), b = numOr(document.getElementById(idMax)?.value, null);
  if (a == null || b == null) { alert('Inserisci minimo e massimo' + (label ? ' (' + label + ')' : '') + '.'); return null; }
  if (a >= b) { alert('Il minimo deve essere più basso del massimo' + (label ? ' (' + label + ')' : '') + '.'); return null; }
  return [a, b];
}

function confirmAddFridge() {
  const name = document.getElementById('new-fridge-name').value.trim();
  if (!name) { alert('Inserisci un nome.'); return; }
  const type = document.getElementById('new-fridge-type').value;
  const colors = ['#2980b9','#27ae60','#8e44ad','#c0392b','#d35400','#16a085','#2c3e50','#e67e22','#1abc9c','#9b59b6'];
  const fridge = { id: newFridgeId(), name, type, color: colors[state.fridges.length % colors.length] };
  if (type === 'combo') {
    const r1 = readRange('nf-min-frigo', 'nf-max-frigo', 'frigo'); if (!r1) return;
    const r2 = readRange('nf-min-freezer', 'nf-max-freezer', 'freezer'); if (!r2) return;
    [fridge.minT_frigo, fridge.maxT_frigo] = r1; [fridge.minT_freezer, fridge.maxT_freezer] = r2;
    fridge.color2 = colors[(state.fridges.length + 1) % colors.length];
  } else {
    const r = readRange('nf-min', 'nf-max'); if (!r) return;
    [fridge.minT, fridge.maxT] = r;
  }
  state.fridges.push(fridge);
  saveData();
  document.getElementById('add-fridge-modal').classList.add('hidden');
  renderSettings();
}

async function deleteFridge(idx) {
  const f = state.fridges[idx];
  if (!await uiConfirm('Eliminare «' + f.name + '»?\nTutte le temperature registrate per questo frigorifero verranno perse.', { title: 'Elimina frigorifero' })) return;
  // anche le rilevazioni di un eventuale tipo precedente (frigo/freezer di un ex combinato)
  const prefixes = [f.id + '|', f.id + ':frigo|', f.id + ':freezer|'];
  Object.keys(state.readings).forEach(k => { if (prefixes.some(p => k.startsWith(p))) delete state.readings[k]; });
  state.fridges.splice(idx, 1);
  saveData();
  renderSettings();
}

function moveFridge(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= state.fridges.length) return;
  [state.fridges[idx], state.fridges[newIdx]] = [state.fridges[newIdx], state.fridges[idx]];
  saveData();
  renderSettings();
}

function changeFridgeName(idx, inp) {
  const v = inp.value.trim();
  if (!v) { alert('Il nome non può essere vuoto.'); inp.value = state.fridges[idx].name; return; }
  state.fridges[idx].name = v; saveData();
}

/* limiti: prima un campo svuotato salvava NaN/null → nessun allarme (o allarme su tutto, null vale 0) */
function changeFridgeLimit(idx, prop, inp) {
  const f = state.fridges[idx];
  const v = numOr(inp.value, null);
  const pair = { minT: 'maxT', maxT: 'minT', minT_frigo: 'maxT_frigo', maxT_frigo: 'minT_frigo', minT_freezer: 'maxT_freezer', maxT_freezer: 'minT_freezer' }[prop];
  const isMin = prop.startsWith('min');
  const u = getUnits(f), cur = prop.includes('freezer') ? u[1] : u[0];
  const other = isMin ? cur.maxT : cur.minT;
  if (v == null) { alert('Inserisci un numero (0 va bene).'); renderSettings(); return; }
  if (isMin ? v >= other : v <= other) { alert('Il minimo deve essere più basso del massimo.'); renderSettings(); return; }
  f[prop] = v;
  if (f[pair] == null || !isFinite(f[pair])) f[pair] = other; // completa la coppia se mancava
  saveData();
}

function changeFridgeProp(idx, prop, val) {
  state.fridges[idx][prop] = val;
  saveData();
}

async function changeFridgeFullType(idx, newType, sel) {
  const f = state.fridges[idx];
  const oldType = f.type;
  if (newType === oldType) return;
  // le rilevazioni sono legate al tipo (frigo/freezer di un combinato hanno chiavi proprie): avvisare
  const keys = oldType === 'combo' ? [f.id + ':frigo|', f.id + ':freezer|'] : [f.id + '|'];
  const n = Object.keys(state.readings).filter(k => keys.some(p => k.startsWith(p))).length;
  if (n && (oldType === 'combo' || newType === 'combo')) {
    const ok = await uiConfirm('«' + f.name + '» ha ' + n + ' rilevazioni registrate.\nCambiando tipo fra combinato e singolo non saranno più visibili (restano salvate e ricompaiono tornando al tipo di prima). Continuare?', { title: 'Cambio tipo', danger: true });
    if (!ok) { if (sel) sel.value = oldType; return; }
  }
  f.type = newType;
  if (newType === 'combo') {
    f.minT_frigo = numOr(f.minT, 2); f.maxT_frigo = numOr(f.maxT, 8);
    if (oldType === '-20') { f.minT_frigo = 2; f.maxT_frigo = 8; f.minT_freezer = numOr(f.minT, -25); f.maxT_freezer = numOr(f.maxT, -15); }
    else { f.minT_freezer = numOr(f.minT_freezer, -25); f.maxT_freezer = numOr(f.maxT_freezer, -15); }
    f.color2 = f.color2 || f.color;
    delete f.minT; delete f.maxT;
  } else if (oldType === 'combo') {
    f.minT = newType === '+4' ? numOr(f.minT_frigo, 2) : numOr(f.minT_freezer, -25);
    f.maxT = newType === '+4' ? numOr(f.maxT_frigo, 8) : numOr(f.maxT_freezer, -15);
    delete f.minT_frigo; delete f.maxT_frigo; delete f.minT_freezer; delete f.maxT_freezer; delete f.color2;
  } else {
    f.minT = TYPE_DEFAULTS[newType].min;
    f.maxT = TYPE_DEFAULTS[newType].max;
  }
  saveData();
  renderSettings();
}

async function resetFridges() {
  if (!await uiConfirm('Ripristinare i ' + DEFAULT_FRIDGES.length + ' frigoriferi predefiniti?\nLe impostazioni attuali (nomi, tipi, limiti) saranno perse. Le temperature registrate restano salvate.', { title: 'Ripristina predefiniti' })) return;
  state.fridges = JSON.parse(JSON.stringify(DEFAULT_FRIDGES));
  saveData();
  renderSettings();
}

/* ── Logo ── */
function handleLogoUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  if (!/^image\/(png|jpe?g)$/i.test(file.type)) { alert('Usa un\'immagine PNG o JPEG.'); e.target.value = ''; return; }
  if (file.size > 700 * 1024) { alert('⚠️ Il logo è troppo grande (' + Math.round(file.size / 1024) + ' kB): usa un\'immagine sotto i 700 kB, la memoria del browser è limitata.'); e.target.value = ''; return; }
  const reader = new FileReader();
  reader.onload = function(ev) {
    try { localStorage.setItem('tempfrigo_logo', ev.target.result); }
    catch(err) { alert('❌ Logo non salvato: la memoria del browser è piena.'); }
    showLogo(ev.target.result);
  };
  reader.readAsDataURL(file);
}
function showLogo(src) {
  const img = document.getElementById('header-preview');
  img.src = src; img.classList.remove('hidden');
  document.getElementById('upload-placeholder').style.display = 'none';
  document.getElementById('btn-remove-header').style.display = 'inline-flex';
}
function removeLogo() {
  document.getElementById('header-preview').removeAttribute('src');
  document.getElementById('header-preview').classList.add('hidden');
  document.getElementById('upload-placeholder').style.display = '';
  document.getElementById('btn-remove-header').style.display = 'none';
  document.getElementById('logo-file').value = '';
  try { localStorage.removeItem('tempfrigo_logo'); } catch(e) {}
}
function loadLogo() {
  try { const logo = localStorage.getItem('tempfrigo_logo'); if (logo) showLogo(logo); } catch(e) {}
}

/* ── Esportazione / importazione ── */
function exportData() {
  const data = { fridges: state.fridges, readings: state.readings, exportDate: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = 'temperature_export_' + localDateStr() + '.json';
  document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
function importData(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(e) {
    let d;
    try { d = JSON.parse(e.target.result); } catch(err) { alert('❌ File non valido: non è un JSON leggibile.'); return; }
    if (!d || typeof d !== 'object') { alert('❌ Questo file non è un backup del Registro Temperature.'); return; }
    // solo le chiavi nel formato del Registro Temperature (UNITA|AAAA-MM-GG): prima un file qualsiasi dava «importato con successo»
    const readings = {};
    if (d.readings && typeof d.readings === 'object') for (const k in d.readings) if (/^[^|]+\|\d{4}-\d{2}-\d{2}$/.test(k) && d.readings[k] && typeof d.readings[k] === 'object') readings[k] = d.readings[k];
    const okF = Array.isArray(d.fridges) && d.fridges.length && d.fridges.every(f => f && f.id && f.type);
    const nR = Object.keys(readings).length;
    if (!okF && !nR) { alert('❌ Questo file non è un backup del Registro Temperature.'); return; }
    if (!await uiConfirm('Importare il backup' + (d.exportDate ? ' del ' + new Date(d.exportDate).toLocaleString('it-IT') : '') + '?\n' +
      (okF ? '• ' + d.fridges.length + ' frigoriferi: SOSTITUISCONO la configurazione attuale\n' : '') +
      '• ' + nR + ' rilevazioni: si aggiungono a quelle presenti (a parità di giorno vince il file).', { title: 'Importa backup', danger: !!okF, ok: 'Importa' })) return;
    if (okF) state.fridges = d.fridges;
    Object.assign(state.readings, readings);
    if (saveData()) alert('✅ Dati importati con successo: ' + nR + ' rilevazioni.');
    refreshCurrentSection();
  };
  reader.readAsText(file); event.target.value = '';
}
async function clearAllData() {
  if (!await uiConfirm('Eliminare TUTTE le temperature registrate in questo browser?\nL\'operazione è irreversibile: esporta prima un backup.', { title: 'Cancella tutti i dati' })) return;
  if (!await uiConfirm('Conferma definitiva: cancellare tutte le temperature?', { ok: 'Sì, cancella tutto' })) return;
  state.readings = {};
  saveData(); showSection('dashboard');
}
