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
/* Tutti combinati (Frigo + Freezer).  typicalT = centro generazione casuale */
const DEFAULT_FRIDGES = [
  { id: 'F1', name: 'Frigo 1', type: 'combo',
    minT_frigo: -1, maxT_frigo: 5, typicalT_frigo: 2,
    minT_freezer: -20, maxT_freezer: -12, typicalT_freezer: -16,
    color: '#2980b9', color2: '#1a5276' },
  { id: 'F2', name: 'Frigo 2', type: 'combo',
    minT_frigo: 8, maxT_frigo: 14, typicalT_frigo: 11.2,
    minT_freezer: -18, maxT_freezer: -11, typicalT_freezer: -14.5,
    color: '#27ae60', color2: '#1e8449' },
  { id: 'F3', name: 'Frigo 3', type: 'combo',
    minT_frigo: 10, maxT_frigo: 16, typicalT_frigo: 13.2,
    minT_freezer: -14, maxT_freezer: -6, typicalT_freezer: -9.7,
    color: '#8e44ad', color2: '#6c3483' },
  { id: 'F4', name: 'Frigo 4', type: 'combo',
    minT_frigo: 8, maxT_frigo: 15, typicalT_frigo: 11.3,
    minT_freezer: -20, maxT_freezer: -12, typicalT_freezer: -15.8,
    color: '#c0392b', color2: '#922b21' },
  { id: 'F5', name: 'Frigo 5', type: 'combo',
    minT_frigo: 9, maxT_frigo: 16, typicalT_frigo: 12.6,
    minT_freezer: -22, maxT_freezer: -14, typicalT_freezer: -17.8,
    color: '#d35400', color2: '#a04000' },
  { id: 'F6', name: 'Frigo 6', type: 'combo',
    minT_frigo: 7, maxT_frigo: 14, typicalT_frigo: 10.6,
    minT_freezer: -33, maxT_freezer: -25, typicalT_freezer: -29,
    color: '#16a085', color2: '#0e6655' },
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
    const minF = fridge.minT_frigo ?? 2, maxF = fridge.maxT_frigo ?? 8;
    const minZ = fridge.minT_freezer ?? -25, maxZ = fridge.maxT_freezer ?? -15;
    return [
      { uid: fridge.id+':frigo',   parentId: fridge.id, name: fridge.name, label: fridge.name+' [Frigo]',
        type: '+4', minT: minF, maxT: maxF, color: fridge.color, compartment: 'frigo',
        typicalTemp: fridge.typicalT_frigo ?? ((minF+maxF)/2) },
      { uid: fridge.id+':freezer', parentId: fridge.id, name: fridge.name, label: fridge.name+' [Freezer]',
        type: '-20', minT: minZ, maxT: maxZ, color: fridge.color2 || fridge.color, compartment: 'freezer',
        typicalTemp: fridge.typicalT_freezer ?? ((minZ+maxZ)/2) },
    ];
  }
  const mn = fridge.minT, mx = fridge.maxT;
  return [{ uid: fridge.id, parentId: fridge.id, name: fridge.name, label: fridge.name,
    type: fridge.type, minT: mn, maxT: mx, color: fridge.color, compartment: null,
    typicalTemp: fridge.typicalTemp ?? ((mn+mx)/2) }];
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

/* ── Random temperature generator (realistic, per-unit center) ── */
function generateRandomTemp(unit, forceIrregular) {
  /* Centro = typicalTemp specifico dell'unità, fallback = media range */
  const center = unit.typicalTemp ?? (unit.type==='+4' ? 4.5 : -20);
  const sigma  = unit.type==='+4' ? 0.5 : 0.8;   /* deviazione standard piccola */

  /* Box-Muller normal distribution */
  const u1 = Math.random(), u2 = Math.random();
  const z  = Math.sqrt(-2*Math.log(u1)) * Math.cos(2*Math.PI*u2);

  if (forceIrregular) {
    /* Genera temperatura leggermente fuori range (1-3 °C oltre il limite) */
    const margin = 1.0 + Math.random() * 2.0;
    if (Math.random() < 0.5) {
      return Math.round((unit.minT - margin) * 10) / 10;   /* sotto il minimo */
    } else {
      return Math.round((unit.maxT + margin) * 10) / 10;   /* sopra il massimo */
    }
  }

  /* Generazione normale: clamp dentro il range per evitare allarmi accidentali */
  let temp = center + z * sigma;
  temp = Math.max(unit.minT + 0.3, Math.min(unit.maxT - 0.3, temp));
  return Math.round(temp * 10) / 10;
}

/* ── Generate ID ── */
function newFridgeId() { return 'F'+Date.now().toString(36).toUpperCase(); }
