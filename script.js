const inputBetrag = document.getElementById('betrag');
const inputKommentar = document.getElementById('kommentar');
const btnHinzufuegen = document.getElementById('hinzufügen');
const entriesList = document.getElementById('entries');
const totalDisplay = document.getElementById('BetragInsgesamt');
const errorMsg = document.getElementById('errorMsg');

const STORAGE_KEY = 'financeEntries_v1';

// ensure container classes match CSS (keine HTML-Änderung nötig)
const rootContainer = document.querySelector('body > div');
if (rootContainer) rootContainer.classList.add('app-card');
if (inputBetrag && inputBetrag.parentElement) inputBetrag.parentElement.classList.add('form-row');

// Insert chart canvas between the form and the entries list (single column)
let chartCanvas = document.getElementById('chartCanvas');
if (!chartCanvas) {
  chartCanvas = document.createElement('canvas');
  chartCanvas.id = 'chartCanvas';
  chartCanvas.style.width = '100%';
  chartCanvas.style.height = '220px';
  chartCanvas.style.margin = '14px 0';
  entriesList.parentElement.insertBefore(chartCanvas, entriesList);
}

// Helpers
function formatCurrency(value) {
  const abs = Math.abs(value).toFixed(2);
  return `${abs} €`;
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.style.color = 'crimson';
  setTimeout(() => { if (errorMsg.textContent === message) errorMsg.textContent = ''; }, 3000);
}

function saveEntries(entries) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch (e) { console.warn(e); }
}

function loadEntries() {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch (e) { console.warn(e); return []; }
}

function calculateTotal(entries) { return entries.reduce((acc, e) => acc + Number(e.amount), 0); }
function updateTotalDisplay(total) {
  const abs = Math.abs(total).toFixed(2);
  if (total > 0) { totalDisplay.textContent = `${abs} €`; totalDisplay.style.color = 'green'; }
  else if (total < 0) { totalDisplay.textContent = `-${abs} €`; totalDisplay.style.color = 'red'; }
  else { totalDisplay.textContent = `0.00 €`; totalDisplay.style.color = ''; }
}

// Charting (Canvas)
let lastChartPoints = [];
function resizeCanvasForHiDPI(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * ratio) || canvas.height !== Math.floor(h * ratio)) {
    canvas.width = Math.floor(w * ratio);
    canvas.height = Math.floor(h * ratio);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
}

function drawLineChart(canvas, values, labels) {
  const ctx = canvas.getContext('2d');
  resizeCanvasForHiDPI(canvas);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);

  const pad = { top: 20, right: 45, bottom: 30, left: 45 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  lastChartPoints = [];

  if (!values || values.length === 0) {
    drawGridAndZero(ctx, pad, plotW, plotH);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.font = '13px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Keine Daten', pad.left + plotW / 2, pad.top + plotH / 2);
    return;
  }

  let min = Math.min(0, ...values);
  let max = Math.max(0, ...values);
  if (min === max) { min -= 1; max += 1; }
  const yRange = max - min;
  const xForIndex = (i) => pad.left + (i / Math.max(1, values.length - 1)) * plotW;
  const yForValue = (v) => pad.top + (1 - (v - min) / yRange) * plotH;

  // grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (i / 4) * plotH;
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
  }
  ctx.stroke();

  // y ticks
  ctx.fillStyle = 'rgba(255, 255, 255, 0.36)';
  ctx.font = '12px Inter, Arial';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const ticks = 5;
  for (let i = 0; i < ticks; i++) {
    const t = i / (ticks - 1);
    const value = max - t * (max - min);
    const y = pad.top + t * plotH;
    ctx.fillText(`${value.toFixed(2)} €`, pad.left - 8, y);
  }

  // zero line
  if (min <= 0 && max >= 0) {
    const y0 = yForValue(0);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y0);
    ctx.lineTo(pad.left + plotW, y0);
    ctx.stroke();
  }

  // path & stroke
  ctx.beginPath();
  for (let i = 0; i < values.length; i++) {
    const x = xForIndex(i);
    const y = yForValue(values[i]);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  const grad = ctx.createLinearGradient(pad.left, 0, pad.left + plotW, 0);
  grad.addColorStop(0, '#ffd36b');
  grad.addColorStop(1, '#ffb84d');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2.8;
  ctx.stroke();

  // fill area under curve
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.closePath();
  const fillGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
  fillGrad.addColorStop(0, 'rgba(255, 184, 77, 0.12)');
  fillGrad.addColorStop(1, 'rgba(255, 184, 77, 0.02)');
  ctx.fillStyle = fillGrad;
  ctx.fill();

  // redraw line crisp
  ctx.beginPath();
  for (let i = 0; i < values.length; i++) {
    const x = xForIndex(i);
    const y = yForValue(values[i]);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#ffd36b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // points (record for hit-testing)
  for (let i = 0; i < values.length; i++) {
    const x = xForIndex(i);
    const y = yForValue(values[i]);
    ctx.beginPath();
    ctx.fillStyle = 'rgba(17, 17, 17, 0.95)';
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#ffd36b';
    ctx.stroke();
    lastChartPoints.push({ x, y, index: i });

    // last label
    if (i === values.length - 1) {
      ctx.font = '13px Inter, Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.textAlign = 'left';
      const yLabel = Math.max(pad.top + 8, y - 8);
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${values[i].toFixed(2)} €`, x + 8, yLabel);
    }
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.font = '12px Inter, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const labelIndices = [0];
  if (values.length > 2) labelIndices.push(Math.floor((values.length - 1) / 2));
  if (values.length > 1) labelIndices.push(values.length - 1);
  const drawn = new Set();
  labelIndices.forEach((i) => {
    if (drawn.has(i)) return;
    drawn.add(i);
    const x = xForIndex(i);
    const rawLabel = String(labels[i] || '').trim();
    if (rawLabel.length === 0) return;
    if (/^\d$/.test(rawLabel)) return;
    ctx.fillText(rawLabel, x, pad.top + plotH + 8);
  });
}

function drawGridAndZero(ctx, pad, plotW, plotH) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (i / 4) * plotH;
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
  }
  ctx.stroke();
}

function buildChartDataFromEntries(entries) {
  if (!entries || entries.length === 0) return { values: [], labels: [], sorted: [] };
  const sorted = entries.slice().sort((a,b)=> {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });
  const values = []; const labels = [];
  let cum = 0;
  for (let i=0;i<sorted.length;i++){
    const e = sorted[i];
    cum += Number(e.amount);
    values.push(Number(cum));
    const d = new Date(e.createdAt || Date.now());
    const now = new Date();
    const isToday = d.getDate()===now.getDate() && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth()+1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const label = isToday ? `${hours}:${mins}` : `${day}.${month}`;
    labels.push(label);
  }
  return { values, labels, sorted };
}

let resizeTimer = null;
function scheduleRedrawChart(entries){
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(()=> {
    const built = buildChartDataFromEntries(entries);
    drawLineChart(chartCanvas, built.values, built.labels);
  }, 80);
}

// Hit testing & info display
function getMousePosOnCanvas(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}
function findNearestPoint(x,y,maxDist=14){
  let nearest=null; let minDist=Infinity;
  for(const p of lastChartPoints){
    const dx=p.x-x; const dy=p.y-y; const d=Math.sqrt(dx*dx+dy*dy);
    if(d<minDist){ minDist=d; nearest=p; }
  }
  return (minDist<=maxDist)?nearest:null;
}

function showChartInfoForIndex(index, entries){
  const built = buildChartDataFromEntries(entries);
  const sorted = built.sorted;
  if(!sorted || !sorted[index]) { chartInfo.innerHTML = '<div class="chart-info-empty">Keine Details gefunden</div>'; return; }
  const selected = sorted[index];
  const selDate = new Date(selected.createdAt || Date.now());
  const dayKey = `${selDate.getFullYear()}-${selDate.getMonth()}-${selDate.getDate()}`;
  const dayItems = sorted.filter(e => {
    const d = new Date(e.createdAt || Date.now());
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return k===dayKey;
  });

  const header = document.createElement('div'); header.className='chart-info-header';
  const headerTitle = document.createElement('div');
  headerTitle.textContent = `Details: ${String(selDate.getDate()).padStart(2, '0')}.${String(selDate.getMonth()+1).padStart(2, '0')}.${selDate.getFullYear()}`;
  const closeBtn = document.createElement('button'); closeBtn.textContent='Schließen'; closeBtn.type='button';
  closeBtn.addEventListener('click', ()=> { chartInfo.innerHTML = '<div class="chart-info-empty">Klicke auf einen Punkt, um Details zu sehen</div>'; });
  header.appendChild(headerTitle); header.appendChild(closeBtn);

  const container = document.createElement('div'); container.appendChild(header);
  dayItems.forEach(it => {
    const d = new Date(it.createdAt || Date.now());
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const item = document.createElement('div'); item.className='chart-info-item';
    const left = document.createElement('div'); left.innerHTML = `<div class="time">${time}</div>`;
    const comment = document.createElement('div'); comment.className='comment'; comment.textContent=it.comment;
    const right = document.createElement('div'); right.innerHTML = `<div class="amount ${Number(it.amount)>0 ? 'amount-positive' : Number(it.amount)<0 ? 'amount-negative':''}">${Number(it.amount)>0?'+':''}${Number(it.amount).toFixed(2)} €</div>`;
    item.appendChild(left); item.appendChild(comment); item.appendChild(right);
    container.appendChild(item);
  });
  chartInfo.innerHTML=''; chartInfo.appendChild(container);
}

// Entry list rendering
function createEntryElement(entry, originalIndex, entries) {
  const li = document.createElement('li'); li.dataset.index = originalIndex;
  const amountValue = Number(entry.amount);
  const prefix = amountValue > 0 ? '+' : amountValue < 0 ? '-' : '';
  const amountText = `${prefix}${formatCurrency(amountValue)}`;
  const left = document.createElement('div'); left.className='left';
  const commentSpan = document.createElement('span'); commentSpan.className='comment'; commentSpan.textContent = entry.comment;
  left.appendChild(commentSpan);
  const amountSpan = document.createElement('span'); amountSpan.className='amount'; amountSpan.textContent = amountText;
  if(amountValue>0) amountSpan.classList.add('amount-positive'); else if(amountValue<0) amountSpan.classList.add('amount-negative');
  const removeBtn = document.createElement('button'); removeBtn.type='button'; removeBtn.title='Eintrag löschen'; removeBtn.textContent='Löschen';
  removeBtn.addEventListener('click', () => { entries.splice(originalIndex, 1); saveEntries(entries); renderEntries(entries); });
  li.appendChild(left); li.appendChild(amountSpan); li.appendChild(removeBtn);
  return li;
}

function renderEntries(entries) {
  entriesList.innerHTML = '';
  const withIndex = entries.map((e,i)=>({entry:e, idx:i}));
  withIndex.sort((a,b)=> {
    const ta = a.entry.createdAt ? new Date(a.entry.createdAt).getTime() : 0;
    const tb = b.entry.createdAt ? new Date(b.entry.createdAt).getTime() : 0;
    return tb - ta;
  });
  withIndex.forEach(({entry, idx})=> { const li = createEntryElement(entry, idx, entries); entriesList.appendChild(li); });
  const total = calculateTotal(entries);
  updateTotalDisplay(total);
  const built = buildChartDataFromEntries(entries);
  drawLineChart(chartCanvas, built.values, built.labels);
  scheduleRedrawChart(entries);
}

// Add handler
function addEntryHandler() {
  const betragRaw = inputBetrag.value.trim(); const kommentar = inputKommentar.value.trim();
  if (betragRaw === '' || kommentar === '') { showError('Bitte Betrag und Kommentar eingeben.'); return; }
  const betrag = Number(betragRaw); if (Number.isNaN(betrag)) { showError('Ungültiger Betrag.'); return; }
  if (betrag === 0) { showError('Betrag darf nicht 0 sein.'); return; }
  const entries = loadEntries();
  const newEntry = { amount: betrag, comment: kommentar, createdAt: new Date().toISOString() };
  entries.push(newEntry); saveEntries(entries); renderEntries(entries);
  inputBetrag.value=''; inputKommentar.value=''; inputBetrag.focus();
}



// Events
btnHinzufuegen.addEventListener('click', addEntryHandler);
[inputBetrag, inputKommentar].forEach(el => el.addEventListener('keydown', (e)=> { if (e.key==='Enter'){ e.preventDefault(); addEntryHandler(); }}));
window.addEventListener('resize', () => { const entries = loadEntries(); scheduleRedrawChart(entries); });

// init
document.addEventListener('DOMContentLoaded', () => { const entries = loadEntries(); renderEntries(entries); });