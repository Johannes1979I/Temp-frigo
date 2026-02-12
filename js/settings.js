/* settings.js — Fridge Configuration, Rename, Logo Upload */

function renderSettings() {
  const el = document.getElementById('fridge-settings-list');
  if (!el) return;

  el.innerHTML = state.fridges.map((f, i) => `
    <div class="setting-card" style="border-left:4px solid ${f.color}">
      <div class="setting-row">
        <div class="form-group" style="flex:2"><label>Nome</label>
          <input type="text" value="${f.name}" onchange="renameFridge(${i}, this.value)">
        </div>
        <div class="form-group" style="flex:0.5"><label>Tipo</label>
          <select onchange="changeFridgeType(${i}, this.value)">
            <option value="+4" ${f.type === '+4' ? 'selected' : ''}>+4°C</option>
            <option value="-20" ${f.type === '-20' ? 'selected' : ''}>-20°C</option>
          </select>
        </div>
        <div class="form-group" style="flex:0.5"><label>Min (°C)</label>
          <input type="number" step="1" value="${f.minT}" onchange="changeFridgeRange(${i}, 'min', this.value)">
        </div>
        <div class="form-group" style="flex:0.5"><label>Max (°C)</label>
          <input type="number" step="1" value="${f.maxT}" onchange="changeFridgeRange(${i}, 'max', this.value)">
        </div>
        <div class="form-group" style="flex:0.4"><label>Colore</label>
          <input type="color" value="${f.color}" onchange="changeFridgeColor(${i}, this.value)" style="height:36px;padding:2px">
        </div>
      </div>
    </div>
  `).join('');
}

function renameFridge(idx, name) {
  state.fridges[idx].name = name;
  saveData();
}

function changeFridgeType(idx, type) {
  state.fridges[idx].type = type;
  if (type === '+4') { state.fridges[idx].minT = 2; state.fridges[idx].maxT = 8; }
  else { state.fridges[idx].minT = -25; state.fridges[idx].maxT = -15; }
  saveData();
  renderSettings();
}

function changeFridgeRange(idx, which, val) {
  const v = parseFloat(val);
  if (isNaN(v)) return;
  if (which === 'min') state.fridges[idx].minT = v;
  else state.fridges[idx].maxT = v;
  saveData();
}

function changeFridgeColor(idx, color) {
  state.fridges[idx].color = color;
  saveData();
}

function resetFridges() {
  if (!confirm('Ripristinare i frigoriferi predefiniti? Le impostazioni saranno perse.')) return;
  state.fridges = JSON.parse(JSON.stringify(DEFAULT_FRIDGES));
  saveData();
  renderSettings();
}

/* ── Logo ── */
function handleLogoUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const img = document.getElementById('header-preview');
    img.src = ev.target.result; img.classList.remove('hidden');
    document.getElementById('upload-placeholder').style.display = 'none';
    document.getElementById('btn-remove-header').style.display = 'inline-flex';
    try { localStorage.setItem('tempfrigo_logo', ev.target.result); } catch(e) {}
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  document.getElementById('header-preview').src = '';
  document.getElementById('header-preview').classList.add('hidden');
  document.getElementById('upload-placeholder').style.display = '';
  document.getElementById('btn-remove-header').style.display = 'none';
  document.getElementById('logo-file').value = '';
  try { localStorage.removeItem('tempfrigo_logo'); } catch(e) {}
}

function loadLogo() {
  try {
    const logo = localStorage.getItem('tempfrigo_logo');
    if (logo) {
      document.getElementById('header-preview').src = logo;
      document.getElementById('header-preview').classList.remove('hidden');
      document.getElementById('upload-placeholder').style.display = 'none';
      document.getElementById('btn-remove-header').style.display = 'inline-flex';
    }
  } catch(e) {}
}

/* ── Export / Import data ── */
function exportData() {
  const data = { fridges: state.fridges, readings: state.readings, exportDate: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = 'temperature_export_' + new Date().toISOString().split('T')[0] + '.json';
  document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

function importData(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const d = JSON.parse(e.target.result);
      if (d.fridges) state.fridges = d.fridges;
      if (d.readings) Object.assign(state.readings, d.readings);
      saveData();
      renderSettings();
      alert('Dati importati con successo.');
    } catch(err) { alert('Errore importazione: ' + err.message); }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function clearAllData() {
  if (!confirm('Eliminare TUTTI i dati di temperatura? Azione irreversibile.')) return;
  if (!confirm('Conferma definitiva?')) return;
  state.readings = {};
  saveData();
  showSection('dashboard');
}
