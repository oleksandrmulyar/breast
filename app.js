const imageMap = {
  right: { src: 'right-breast.jpg', alt: 'Права грудна залоза', viewBox: [0, 0, 1573, 812], title: 'права грудна залоза' },
  left: { src: 'left-breast.jpg', alt: 'Ліва грудна залоза', viewBox: [0, 0, 1672, 788], title: 'ліва грудна залоза' },
};

const STORAGE_KEY = 'breast-lesions-v2';
const SCALE_MM_TO_SVG = 4.8;
const state = loadState();

const stage = document.querySelector('#stage');
const overlay = document.querySelector('#overlay');
const breastImage = document.querySelector('#breastImage');
const sideSelect = document.querySelector('#breastSide');
const shapeSelect = document.querySelector('#lesionShape');
const widthInput = document.querySelector('#lesionWidth');
const heightInput = document.querySelector('#lesionHeight');
const noteInput = document.querySelector('#lesionNote');
const deleteButton = document.querySelector('#deleteLesion');
const lesionList = document.querySelector('#lesionList');
const lesionCount = document.querySelector('#lesionCount');
const reportText = document.querySelector('#reportText');
const statusBox = document.querySelector('#status');

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.lesions?.right && saved?.lesions?.left) return { side: 'right', selectedId: null, lesions: saved.lesions };
  } catch (error) {
    console.warn('Не вдалося прочитати збережені дані', error);
  }
  return { side: 'right', selectedId: null, lesions: { right: [], left: [] } };
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify({ lesions: state.lesions })); }
function currentViewBox() { return imageMap[state.side].viewBox; }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()); }
function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
function mmToSvg(mm) { return Number(mm) * SCALE_MM_TO_SVG; }
function svgToMm(value) { return Math.max(1, Math.round(Number(value) / SCALE_MM_TO_SVG)); }
function getSelected() { return state.lesions[state.side].find(item => item.id === state.selectedId); }
function pointFromEvent(event) {
  const rect = overlay.getBoundingClientRect();
  const [, , vbWidth, vbHeight] = currentViewBox();
  return { x: ((event.clientX - rect.left) / rect.width) * vbWidth, y: ((event.clientY - rect.top) / rect.height) * vbHeight };
}
function shapePath(lesion) {
  const rx = lesion.w / 2; const ry = lesion.h / 2;
  if (lesion.shape === 'circle') { const r = Math.min(rx, ry); return `M ${-r} 0 A ${r} ${r} 0 1 0 ${r} 0 A ${r} ${r} 0 1 0 ${-r} 0`; }
  if (lesion.shape === 'lobulated') return `M ${-rx*.95} ${-ry*.05} C ${-rx*.9} ${-ry*.7}, ${-rx*.35} ${-ry*1.05}, 0 ${-ry*.75} C ${rx*.45} ${-ry*1.12}, ${rx*.98} ${-ry*.45}, ${rx*.82} ${ry*.08} C ${rx*1.08} ${ry*.63}, ${rx*.32} ${ry*1.05}, ${-rx*.1} ${ry*.72} C ${-rx*.55} ${ry}, ${-rx*1.08} ${ry*.55}, ${-rx*.95} ${-ry*.05} Z`;
  if (lesion.shape === 'irregular') return `M ${-rx} ${-ry*.25} L ${-rx*.62} ${-ry*.86} L ${-rx*.12} ${-ry*.62} L ${rx*.3} ${-ry} L ${rx*.9} ${-ry*.42} L ${rx*.66} ${ry*.06} L ${rx} ${ry*.64} L ${rx*.18} ${ry*.88} L ${-rx*.28} ${ry*.58} L ${-rx*.86} ${ry*.86} L ${-rx*.7} ${ry*.18} Z`;
  return `M ${-rx} 0 A ${rx} ${ry} 0 1 0 ${rx} 0 A ${rx} ${ry} 0 1 0 ${-rx} 0`;
}
function describeLesion(lesion, index, side = state.side) {
  const [, , vbWidth, vbHeight] = imageMap[side].viewBox;
  const clock = Math.max(1, Math.min(12, Math.round(((Math.atan2(lesion.y - vbHeight / 2, lesion.x - vbWidth / 2) * 180 / Math.PI + 450) % 360) / 30) || 12));
  const shapeNames = { ellipse: 'овальної форми', circle: 'округлої форми', lobulated: 'лобульованої форми', irregular: 'нерівної форми' };
  const note = lesion.note ? `, ${lesion.note}` : '';
  return `${index + 1}. ${imageMap[side].title}: утвір ${shapeNames[lesion.shape]} ${svgToMm(lesion.w)}×${svgToMm(lesion.h)} мм, орієнтовно на ${clock} год${note}.`;
}
function allDescriptions() {
  return ['right', 'left'].flatMap(side => state.lesions[side].map((lesion, index) => describeLesion(lesion, index, side)));
}
function render() {
  overlay.innerHTML = '';
  state.lesions[state.side].forEach((lesion, index) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('lesion'); if (lesion.id === state.selectedId) g.classList.add('selected');
    g.dataset.id = lesion.id; g.setAttribute('transform', `translate(${lesion.x} ${lesion.y})`); g.setAttribute('tabindex', '0');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.classList.add('lesion-shape'); path.setAttribute('d', shapePath(lesion));
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text'); label.classList.add('lesion-label'); label.setAttribute('text-anchor', 'middle'); label.setAttribute('dy', '.35em'); label.textContent = index + 1;
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); handle.classList.add('handle'); handle.setAttribute('cx', lesion.w / 2); handle.setAttribute('cy', lesion.h / 2); handle.setAttribute('r', 9);
    g.append(path, label, handle); overlay.append(g);
  });
  renderReport(); syncControls(); saveState();
}
function renderReport() {
  lesionList.innerHTML = '';
  const current = state.lesions[state.side];
  lesionCount.textContent = state.lesions.right.length + state.lesions.left.length;
  if (!current.length) lesionList.innerHTML = '<p class="empty">На активному зображенні утворів немає.</p>';
  current.forEach((lesion, index) => {
    const item = document.createElement('li'); const button = document.createElement('button');
    button.type = 'button'; button.classList.toggle('active', lesion.id === state.selectedId); button.textContent = describeLesion(lesion, index);
    button.addEventListener('click', () => { state.selectedId = lesion.id; render(); }); item.append(button); lesionList.append(item);
  });
  reportText.value = allDescriptions().join('\n') || 'Утворів не додано.';
}
function syncControls() {
  const selected = getSelected(); deleteButton.disabled = !selected;
  if (!selected) return;
  shapeSelect.value = selected.shape; widthInput.value = svgToMm(selected.w); heightInput.value = svgToMm(selected.h); noteInput.value = selected.note || '';
}
function setStatus(message) { statusBox.textContent = message; }
function setSide(side) {
  state.side = side; state.selectedId = null;
  const [x, y, w, h] = imageMap[side].viewBox; overlay.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  breastImage.src = imageMap[side].src; breastImage.alt = imageMap[side].alt; sideSelect.value = side;
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.side === side));
  render(); setStatus(`Активне зображення: ${imageMap[side].alt}`);
}
function addLesion() {
  const [, , vbWidth, vbHeight] = currentViewBox();
  const lesion = { id: uid(), x: vbWidth / 2, y: vbHeight / 2, w: mmToSvg(widthInput.value), h: mmToSvg(heightInput.value), shape: shapeSelect.value, note: noteInput.value.trim() };
  state.lesions[state.side].push(lesion); state.selectedId = lesion.id; render(); setStatus('Утвір додано');
}

overlay.addEventListener('pointerdown', (event) => {
  const lesionEl = event.target.closest('.lesion');
  if (!lesionEl) { state.selectedId = null; render(); return; }
  event.preventDefault(); overlay.setPointerCapture(event.pointerId); state.selectedId = lesionEl.dataset.id;
  const lesion = getSelected(); const start = pointFromEvent(event); const startLesion = { ...lesion }; const resizing = event.target.classList.contains('handle'); lesionEl.classList.add('dragging'); render();
  const move = (moveEvent) => {
    const point = pointFromEvent(moveEvent); const [, , vbWidth, vbHeight] = currentViewBox();
    if (resizing) { lesion.w = clamp(startLesion.w + (point.x - start.x) * 2, mmToSvg(1), vbWidth); lesion.h = clamp(startLesion.h + (point.y - start.y) * 2, mmToSvg(1), vbHeight); }
    else { lesion.x = clamp(startLesion.x + point.x - start.x, 0, vbWidth); lesion.y = clamp(startLesion.y + point.y - start.y, 0, vbHeight); }
    render();
  };
  const up = () => { overlay.removeEventListener('pointermove', move); overlay.removeEventListener('pointerup', up); overlay.removeEventListener('pointercancel', up); setStatus('Зміни збережено'); };
  overlay.addEventListener('pointermove', move); overlay.addEventListener('pointerup', up); overlay.addEventListener('pointercancel', up);
});

document.querySelector('#addLesion').addEventListener('click', addLesion);
document.querySelector('#clearAll').addEventListener('click', () => { state.lesions = { right: [], left: [] }; state.selectedId = null; render(); setStatus('Усі утвори очищено'); });
deleteButton.addEventListener('click', () => { state.lesions[state.side] = state.lesions[state.side].filter(item => item.id !== state.selectedId); state.selectedId = null; render(); setStatus('Вибраний утвір видалено'); });
sideSelect.addEventListener('change', event => setSide(event.target.value));
document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => setSide(tab.dataset.side)));
[shapeSelect, widthInput, heightInput, noteInput].forEach(input => input.addEventListener('input', () => { const selected = getSelected(); if (!selected) return; selected.shape = shapeSelect.value; selected.w = mmToSvg(widthInput.value); selected.h = mmToSvg(heightInput.value); selected.note = noteInput.value.trim(); render(); }));
document.querySelector('#exportReport').addEventListener('click', async () => {
  reportText.select();
  try {
    await navigator.clipboard.writeText(reportText.value);
    setStatus('Опис скопійовано в буфер обміну');
  } catch (error) {
    document.execCommand('copy');
    setStatus('Опис виділено та скопійовано резервним способом');
  }
});
setSide(state.side);
