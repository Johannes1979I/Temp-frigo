/* state.js — Global State, Fridge Definitions, Working Days Logic */

const STORAGE_KEY = 'tempfrigo_data';

const state = {
  month: new Date().getMonth(),
  year: new Date().getFullYear(),
  fridges: [],
  readings: {},  // { "FRIDGE_ID|YYYY-MM-DD": {temp,time,method,operator,notes} }
                 // combo: "FRIDGE_ID:frigo|date" and "FRIDGE_ID:freezer|date"
};

/* ── Default Fridge Setup (Giovanni Paolo I) ── */
const DEFAULT_FRIDGES = [
  { id: 'F1', name: 'Frigo 1 — Reagenti',        type: '+4',   minT: 2, maxT: 8,   color: '#2980b9' },
  { id: 'F2', name: 'Frigo 2 — Campioni',         type: '+4',   minT: 2, maxT: 8,   color: '#27ae60' },
  { id: 'F3', name: 'Frigo 3 — Kit Diagnostici',  type: '+4',   minT: 2, maxT: 8,   color: '#8e44ad' },
  { id: 'F4', name: 'Freezer 1 — Sieri',          type: '-20',  minT: -25, maxT: -15, color: '#c0392b' },
  { id: 'F5', name: 'Freezer 2 — Ceppi ATCC',     type: '-20',  minT: -25, maxT: -15, color: '#d35400' },
  { id: 'F6', name: 'Freezer 3 — Backup',         type: '-20',  minT: -25, maxT: -15, color: '#16a085' },
];

/* ── Italian Public Holidays ── */
function getItalianHolidays(year) {
  const fixed = [
    year+'-01-01', year+'-01-06', year+'-04-25',
    year+'-05-01', year+'-06-02', year+'-08-15',
    year+'-11-01', year+'-12-08', year+'-12-25', year+'-12-26',
  ];
  const a=year%19, b=Math.floor(year/100), c=year%100;
  const d=Math.floor(b/4), e=b%4, f=Math.floor((b+8)/25);
  const g=Math.floor((b-f+1)/3), h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4), k=c%4;
  const l=(32+2*e+2*i-h-k)%7;
  const m=Math.floor((a+11*h+22*l)/451);
  const mo=Math.floor((h+l-7*m+114)/31);
  const da=((h+l-7*m+114)%31)+1;
  const easter=new Date(year, mo-1, da);
  const easterMon=new Date(easter); easterMon.setDate(easterMon.getDate()+1);
  fixed.push(fmtDate(easter), fmtDate(easterMon));
  return new Set(fixed);
}

function fmtDate(d) {
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function getWorkingDays(year, month) {
  const holidays = getItalianHolidays(year);
  const days = [], dim = new Date(year, month+1, 0).getDate();
  for (let d=1; d<=dim; d++) {
    const date = new Date(year, month, d), dow = date.getDay(), iso = fmtDate(date);
    if (dow>=1 && dow<=5 && !holidays.has(iso)) days.push({date:iso, dayNum:d, dow});
  }
  return days;
}

const MONTH_NAMES = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

/* ── Helper: expand fridge into logical units ──
   A combo fridge expands to 2 units (frigo + freezer).
   Each unit is { uid, parentId, name, label, type, minT, maxT, color, compartment } */
function getUnits(fridge) {
  if (fridge.type === 'combo') {
    return [
      { uid: fridge.id+':frigo',   parentId: fridge.id, name: fridge.name, label: fridge.name+' [Frigo]',
        type: '+4', minT: fridge.minT_frigo ?? 2, maxT: fridge.maxT_frigo ?? 8, color: fridge.color, compartment: 'frigo' },
      { uid: fridge.id+':freezer', parentId: fridge.id, name: fridge.name, label: fridge.name+' [Freezer]',
        type: '-20', minT: fridge.minT_freezer ?? -25, maxT: fridge.maxT_freezer ?? -15, color: fridge.color2 || fridge.color, compartment: 'freezer' },
    ];
  }
  return [{ uid: fridge.id, parentId: fridge.id, name: fridge.name, label: fridge.name,
    type: fridge.type, minT: fridge.minT, maxT: fridge.maxT, color: fridge.color, compartment: null }];
}

function getAllUnits() {
  const units = [];
  state.fridges.forEach(f => units.push(...getUnits(f)));
  return units;
}

/* ── Read / Write Readings (use uid) ── */
function getReadingKey(uid, dateStr) { return uid+'|'+dateStr; }
function getReading(uid, dateStr) { return state.readings[getReadingKey(uid, dateStr)] || null; }

function setReading(uid, dateStr, temp, method, operator, notes) {
  state.readings[getReadingKey(uid, dateStr)] = {
    temp: parseFloat(temp),
    time: new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}),
    method: method||'Manuale', operator: operator||'', notes: notes||'',
    timestamp: new Date().toISOString(),
  };
  saveData();
}

function deleteReading(uid, dateStr) {
  delete state.readings[getReadingKey(uid, dateStr)];
  saveData();
}

/* ── Persistence ── */
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({fridges:state.fridges, readings:state.readings})); }
  catch(e) { console.warn('Save error:',e); }
}
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const d=JSON.parse(raw); if(d.fridges?.length) state.fridges=d.fridges; if(d.readings) state.readings=d.readings; }
  } catch(e) {}
  if (!state.fridges.length) state.fridges = JSON.parse(JSON.stringify(DEFAULT_FRIDGES));
}

/* ── Temperature evaluation ── */
function evalTemp(unit, temp) {
  if (temp==null || isNaN(temp)) return 'missing';
  if (temp < unit.minT || temp > unit.maxT) return 'alarm';
  if (temp <= unit.minT+1 || temp >= unit.maxT-1) return 'warning';
  return 'ok';
}

/* ── Random temperature generator (realistic) ── */
function generateRandomTemp(unit) {
  const center = unit.type==='+4' ? 4.5 : -20;
  const spread = unit.type==='+4' ? 1.8 : 2.5;
  const u1=Math.random(), u2=Math.random();
  const z = Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);
  return Math.round((center + z*spread*0.5)*10)/10;
}

/* ── Generate ID ── */
function newFridgeId() { return 'F'+Date.now().toString(36).toUpperCase(); }
