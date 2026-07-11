const imageMap = {
  right: { src: 'right-breast.jpg', alt: 'Права грудна залоза', viewBox: [0, 0, 1573, 812] },
  left: { src: 'left-breast.jpg', alt: 'Ліва грудна залоза', viewBox: [0, 0, 1672, 788] },
};

const state = { side: 'right', selectedId: null, lesions: { right: [], left: [] } };
const stage = document.querySelector('#stage');
const overlay = document.querySelector('#overlay');
const breastImage = document.querySelector('#breastImage');
const sideSelect = document.querySelector('#breastSide');
const shapeSelect = document.querySelector('#lesionShape');
const widthInput = document.querySelector('#lesionWidth');
const heightInput = document.querySelector('#lesionHeight');
const deleteButton = document.querySelector('#deleteLesion');

function currentViewBox() { return imageMap[state.side].viewBox; }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()); }
function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
function pointFromEvent(event) {
  const rect = overlay.getBoundingClientRect();
  const [, , vbWidth, vbHeight] = currentViewBox();
  return { x: ((event.clientX - rect.left) / rect.width) * vbWidth, y: ((event.clientY - rect.top) / rect.height) * vbHeight };
}
function shapePath(lesion) {
  const { w, h, shape } = lesion; const rx = w / 2; const ry = h / 2;
  if (shape === 'circle') { const r = Math.min(rx, ry); return `M ${-r} 0 A ${r} ${r} 0 1 0 ${r} 0 A ${r} ${r} 0 1 0 ${-r} 0`; }
  if (shape === 'lobulated') return `M ${-rx*.95} ${-ry*.05} C ${-rx*.9} ${-ry*.7}, ${-rx*.35} ${-ry*1.05}, ${0} ${-ry*.75} C ${rx*.45} ${-ry*1.12}, ${rx*.98} ${-ry*.45}, ${rx*.82} ${ry*.08} C ${rx*1.08} ${ry*.63}, ${rx*.32} ${ry*1.05}, ${-rx*.1} ${ry*.72} C ${-rx*.55} ${ry*1.0}, ${-rx*1.08} ${ry*.55}, ${-rx*.95} ${-ry*.05} Z`;
  if (shape === 'irregular') return `M ${-rx} ${-ry*.25} L ${-rx*.62} ${-ry*.86} L ${-rx*.12} ${-ry*.62} L ${rx*.3} ${-ry} L ${rx*.9} ${-ry*.42} L ${rx*.66} ${ry*.06} L ${rx} ${ry*.64} L ${rx*.18} ${ry*.88} L ${-rx*.28} ${ry*.58} L ${-rx*.86} ${ry*.86} L ${-rx*.7} ${ry*.18} Z`;
  return `M ${-rx} 0 A ${rx} ${ry} 0 1 0 ${rx} 0 A ${rx} ${ry} 0 1 0 ${-rx} 0`;
}
function render() {
  overlay.innerHTML = '';
  state.lesions[state.side].forEach((lesion) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('lesion'); if (lesion.id === state.selectedId) g.classList.add('selected');
    g.dataset.id = lesion.id; g.setAttribute('transform', `translate(${lesion.x} ${lesion.y})`); g.setAttribute('tabindex', '0');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.classList.add('lesion-shape'); path.setAttribute('d', shapePath(lesion));
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); handle.classList.add('handle'); handle.setAttribute('cx', lesion.w / 2); handle.setAttribute('cy', lesion.h / 2); handle.setAttribute('r', 9);
    g.append(path, handle); overlay.append(g);
  });
  syncControls();
}
function syncControls() {
  const selected = getSelected(); deleteButton.disabled = !selected;
  if (!selected) return;
  shapeSelect.value = selected.shape; widthInput.value = selected.w; heightInput.value = selected.h;
}
function getSelected() { return state.lesions[state.side].find(item => item.id === state.selectedId); }
function setSide(side) {
  state.side = side; state.selectedId = null;
  const [x, y, w, h] = imageMap[side].viewBox; overlay.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  breastImage.src = imageMap[side].src; breastImage.alt = imageMap[side].alt; sideSelect.value = side;
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.side === side));
  render();
}
function addLesion() {
  const [, , vbWidth, vbHeight] = currentViewBox();
  const lesion = { id: uid(), x: vbWidth / 2, y: vbHeight / 2, w: Number(widthInput.value), h: Number(heightInput.value), shape: shapeSelect.value };
  state.lesions[state.side].push(lesion); state.selectedId = lesion.id; render();
}

overlay.addEventListener('pointerdown', (event) => {
  const lesionEl = event.target.closest('.lesion');
  if (!lesionEl) { state.selectedId = null; render(); return; }
  event.preventDefault(); overlay.setPointerCapture(event.pointerId); state.selectedId = lesionEl.dataset.id;
  const lesion = getSelected(); const start = pointFromEvent(event); const startLesion = { ...lesion }; const resizing = event.target.classList.contains('handle'); lesionEl.classList.add('dragging'); render();
  const move = (moveEvent) => {
    const point = pointFromEvent(moveEvent); const [, , vbWidth, vbHeight] = currentViewBox();
    if (resizing) { lesion.w = clamp(startLesion.w + (point.x - start.x) * 2, 24, vbWidth); lesion.h = clamp(startLesion.h + (point.y - start.y) * 2, 18, vbHeight); }
    else { lesion.x = clamp(startLesion.x + point.x - start.x, 0, vbWidth); lesion.y = clamp(startLesion.y + point.y - start.y, 0, vbHeight); }
    render();
  };
  const up = () => { overlay.removeEventListener('pointermove', move); overlay.removeEventListener('pointerup', up); overlay.removeEventListener('pointercancel', up); };
  overlay.addEventListener('pointermove', move); overlay.addEventListener('pointerup', up); overlay.addEventListener('pointercancel', up);
});

document.querySelector('#addLesion').addEventListener('click', addLesion);
document.querySelector('#clearAll').addEventListener('click', () => { state.lesions[state.side] = []; state.selectedId = null; render(); });
deleteButton.addEventListener('click', () => { state.lesions[state.side] = state.lesions[state.side].filter(item => item.id !== state.selectedId); state.selectedId = null; render(); });
sideSelect.addEventListener('change', event => setSide(event.target.value));
document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => setSide(tab.dataset.side)));
[shapeSelect, widthInput, heightInput].forEach(input => input.addEventListener('input', () => { const selected = getSelected(); if (!selected) return; selected.shape = shapeSelect.value; selected.w = Number(widthInput.value); selected.h = Number(heightInput.value); render(); }));
setSide('right');
