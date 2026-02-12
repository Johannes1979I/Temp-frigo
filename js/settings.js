/* settings.js — Fridge CRUD, Combo Support, Logo, Export/Import */

function renderSettings() {
  const el = document.getElementById('fridge-settings-list');
  if (!el) return;

  if (!state.fridges.length) {
    el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted)">Nessun frigorifero configurato.<br>Aggiungi il primo con il pulsante qui sopra.</div>';
    return;
  }

  el.innerHTML = state.fridges.map((f, i) => {
    const isCombo = f.type === 'combo';
    const typeLabels = {'+4':'Frigorifero +4\u00b0C', '-20':'Congelatore -20\u00b0C', combo:'Combinato (Frigo+Freezer)'};

    let rangeHtml = '';
    if (isCombo) {
      rangeHtml = `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          <div class="compartment-box frigo-box">
            <span class="comp-label">\u2744 Frigo</span>
            <div style="display:flex;gap:6px;align-items:center">
              <input type="number" step="1" value="${f.minT_frigo??2}" style="width:60px" onchange="changeFridgeProp(${i},'minT_frigo',this.value)">
              <span>\u2013</span>
              <input type="number" step="1" value="${f.maxT_frigo??8}" style="width:60px" onchange="changeFridgeProp(${i},'maxT_frigo',this.value)">
              <span style="font-size:11px;color:var(--text-muted)">\u00b0C</span>
            </div>
          </div>
          <div class="compartment-box freezer-box">
            <span class="comp-label">\u2744 Freezer</span>
            <div style="display:flex;gap:6px;align-items:center">
              <input type="number" step="1" value="${f.minT_freezer??-25}" style="width:60px" onchange="changeFridgeProp(${i},'minT_freezer',this.value)">
              <span>\u2013</span>
              <input type="number" step="1" value="${f.maxT_freezer??-15}" style="width:60px" onchange="changeFridgeProp(${i},'maxT_freezer',this.value)">
              <span style="font-size:11px;color:var(--text-muted)">\u00b0C</span>
            </div>
          </div>
        </div>`;
    } else {
      rangeHtml = `
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
          <span style="font-size:12px;color:var(--text-muted)">Range:</span>
          <input type="number" step="1" value="${f.minT}" style="width:60px" onchange="changeFridgeProp(${i},'minT',this.value)">
          <span>\u2013</span>
          <input type="number" step="1" value="${f.maxT}" style="width:60px" onchange="changeFridgeProp(${i},'maxT',this.value)">
          <span style="font-size:11px;color:var(--text-muted)">\u00b0C</span>
        </div>`;
    }

    return `<div class="setting-card" style="border-left:4px solid ${f.color}">
      <div class="setting-row">
        <div class="form-group" style="flex:2"><label>Nome</label>
          <input type="text" value="${f.name}" onchange="changeFridgeProp(${i},'name',this.value)">
        </div>
        <div class="form-group" style="flex:1"><label>Tipo</label>
          <select onchange="changeFridgeFullType(${i}, this.value)">
            <option value="+4" ${f.type==='+4'?'selected':''}>Frigorifero +4\u00b0C</option>
            <option value="-20" ${f.type==='-20'?'selected':''}>Congelatore -20\u00b0C</option>
            <option value="combo" ${f.type==='combo'?'selected':''}>Combinato</option>
          </select>
        </div>
        <div class="form-group" style="flex:0.3"><label>Colore</label>
          <input type="color" value="${f.color}" onchange="changeFridgeProp(${i},'color',this.value)" style="height:36px;padding:2px">
        </div>
        ${isCombo ? `<div class="form-group" style="flex:0.3"><label>Col. 2</label>
          <input type="color" value="${f.color2||f.color}" onchange="changeFridgeProp(${i},'color2',this.value)" style="height:36px;padding:2px">
        </div>` : ''}
        <div style="display:flex;align-items:end;gap:4px">
          <button class="btn btn-sm btn-outline" onclick="moveFridge(${i},-1)" title="Sposta su" ${i===0?'disabled':''}>▲</button>
          <button class="btn btn-sm btn-outline" onclick="moveFridge(${i},1)" title="Sposta gi\u00f9" ${i===state.fridges.length-1?'disabled':''}>▼</button>
          <button class="btn btn-sm btn-danger-outline" onclick="deleteFridge(${i})" title="Elimina">\ud83d\uddd1</button>
        </div>
      </div>
      ${rangeHtml}
      <div style="margin-top:6px;font-size:11px;color:var(--text-muted)">ID: ${f.id} \u2014 ${typeLabels[f.type]}</div>
    </div>`;
  }).join('');
}

/* ── CRUD ── */
function addNewFridge() {
  const modal = document.getElementById('add-fridge-modal');
  document.getElementById('new-fridge-name').value = '';
  document.getElementById('new-fridge-type').value = '+4';
  updateNewFridgeRangeUI();
  modal.classList.remove('hidden');
}

function updateNewFridgeRangeUI() {
  const type = document.getElementById('new-fridge-type').value;
  const rangeEl = document.getElementById('new-fridge-range-fields');
  if (type === 'combo') {
    rangeEl.innerHTML = `
      <div class="grid-2" style="gap:8px">
        <div class="compartment-box frigo-box">
          <span class="comp-label">Frigo</span>
          <div style="display:flex;gap:6px"><input type="number" id="nf-min-frigo" value="2" style="width:60px"> \u2013 <input type="number" id="nf-max-frigo" value="8" style="width:60px"> \u00b0C</div>
        </div>
        <div class="compartment-box freezer-box">
          <span class="comp-label">Freezer</span>
          <div style="display:flex;gap:6px"><input type="number" id="nf-min-freezer" value="-25" style="width:60px"> \u2013 <input type="number" id="nf-max-freezer" value="-15" style="width:60px"> \u00b0C</div>
        </div>
      </div>`;
  } else {
    const min = type==='+4' ? 2 : -25, max = type==='+4' ? 8 : -15;
    rangeEl.innerHTML = `<div style="display:flex;gap:6px;align-items:center">Range: <input type="number" id="nf-min" value="${min}" style="width:60px"> \u2013 <input type="number" id="nf-max" value="${max}" style="width:60px"> \u00b0C</div>`;
  }
}

function confirmAddFridge() {
  const name = document.getElementById('new-fridge-name').value.trim();
  if (!name) { alert('Inserire un nome.'); return; }
  const type = document.getElementById('new-fridge-type').value;
  const id = newFridgeId();
  const colors = ['#2980b9','#27ae60','#8e44ad','#c0392b','#d35400','#16a085','#2c3e50','#e67e22','#1abc9c','#9b59b6'];
  const color = colors[state.fridges.length % colors.length];

  const fridge = { id, name, type, color };
  if (type === 'combo') {
    fridge.minT_frigo = parseFloat(document.getElementById('nf-min-frigo')?.value) || 2;
    fridge.maxT_frigo = parseFloat(document.getElementById('nf-max-frigo')?.value) || 8;
    fridge.minT_freezer = parseFloat(document.getElementById('nf-min-freezer')?.value) || -25;
    fridge.maxT_freezer = parseFloat(document.getElementById('nf-max-freezer')?.value) || -15;
    fridge.color2 = colors[(state.fridges.length+1) % colors.length];
  } else {
    fridge.minT = parseFloat(document.getElementById('nf-min')?.value) || (type==='+4' ? 2 : -25);
    fridge.maxT = parseFloat(document.getElementById('nf-max')?.value) || (type==='+4' ? 8 : -15);
  }

  state.fridges.push(fridge);
  saveData();
  document.getElementById('add-fridge-modal').classList.add('hidden');
  renderSettings();
}

function deleteFridge(idx) {
  const f = state.fridges[idx];
  if (!confirm('Eliminare "'+f.name+'"?\nTutti i dati di temperatura associati verranno persi.')) return;
  // Remove all readings for this fridge
  const units = getUnits(f);
  const keysToDelete = [];
  units.forEach(u => {
    Object.keys(state.readings).forEach(k => { if(k.startsWith(u.uid+'|')) keysToDelete.push(k); });
  });
  keysToDelete.forEach(k => delete state.readings[k]);
  state.fridges.splice(idx, 1);
  saveData();
  renderSettings();
}

function moveFridge(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= state.fridges.length) return;
  const tmp = state.fridges[idx];
  state.fridges[idx] = state.fridges[newIdx];
  state.fridges[newIdx] = tmp;
  saveData();
  renderSettings();
}

function changeFridgeProp(idx, prop, val) {
  if (['minT','maxT','minT_frigo','maxT_frigo','minT_freezer','maxT_freezer'].includes(prop)) {
    state.fridges[idx][prop] = parseFloat(val);
  } else {
    state.fridges[idx][prop] = val;
  }
  saveData();
}

function changeFridgeFullType(idx, newType) {
  const f = state.fridges[idx];
  const oldType = f.type;
  f.type = newType;
  if (newType === 'combo') {
    f.minT_frigo = f.minT ?? 2; f.maxT_frigo = f.maxT ?? 8;
    f.minT_freezer = -25; f.maxT_freezer = -15;
    f.color2 = f.color2 || f.color;
    delete f.minT; delete f.maxT;
  } else if (oldType === 'combo') {
    f.minT = newType==='+4' ? (f.minT_frigo??2) : (f.minT_freezer??-25);
    f.maxT = newType==='+4' ? (f.maxT_frigo??8) : (f.maxT_freezer??-15);
    delete f.minT_frigo; delete f.maxT_frigo; delete f.minT_freezer; delete f.maxT_freezer; delete f.color2;
  } else {
    f.minT = newType==='+4' ? 2 : -25;
    f.maxT = newType==='+4' ? 8 : -15;
  }
  saveData();
  renderSettings();
}

function resetFridges() {
  if (!confirm('Ripristinare i 6 frigoriferi predefiniti?\nLe impostazioni attuali saranno perse.')) return;
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

/* ── Export / Import ── */
function exportData() {
  const data = {fridges:state.fridges, readings:state.readings, exportDate:new Date().toISOString()};
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url;
  a.download = 'temperature_export_'+new Date().toISOString().split('T')[0]+'.json';
  document.body.appendChild(a); a.click(); setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},100);
}
function importData(event) {
  const file = event.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const d = JSON.parse(e.target.result);
      if(d.fridges) state.fridges = d.fridges;
      if(d.readings) Object.assign(state.readings, d.readings);
      saveData(); renderSettings();
      alert('Dati importati con successo.');
    } catch(err) { alert('Errore: '+err.message); }
  };
  reader.readAsText(file); event.target.value='';
}
function clearAllData() {
  if(!confirm('Eliminare TUTTI i dati di temperatura? Azione irreversibile.')) return;
  if(!confirm('Conferma definitiva?')) return;
  state.readings = {};
  saveData(); showSection('dashboard');
}
