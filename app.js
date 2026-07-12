const breastImages = {
  right: {
    src: 'right-breast.jpg',
    alt: 'Права грудна залоза',
    label: 'права грудна залоза',
    defaultMarkers: [
      { x: 30, y: 50 },
      { x: 79, y: 50 },
    ],
  },
  left: {
    src: 'left-breast.jpg',
    alt: 'Ліва грудна залоза',
    label: 'ліва грудна залоза',
    defaultMarkers: [
      { x: 30, y: 50 },
      { x: 79, y: 50 },
    ],
  },
};

const lesionColors = ['#f13d3d', '#1d9bf0', '#18a058', '#f59e0b', '#8b5cf6', '#ec4899'];

const sideSelection = document.querySelector('#sideSelection');
const detailView = document.querySelector('#detailView');
const primaryImage = document.querySelector('#primaryImage');
const savePrimary = document.querySelector('#savePrimary');
const massesTable = document.querySelector('#massesTable');
const addMass = document.querySelector('#addMass');
const lesionOverlay = document.querySelector('#lesionOverlay');
let activeSide = 'right';
let masses = [];
let nextMassId = 1;
let activeEdit = null;

function setImage(image, side) {
  image.src = breastImages[side].src;
  image.alt = breastImages[side].alt;
  renderLesionMarkers();
}

function openDetail(side) {
  activeSide = side;
  masses = [];
  nextMassId = 1;
  clearMassRows();
  setImage(primaryImage, activeSide);
  savePrimary.textContent = 'Зберегти зображення';
  sideSelection.classList.add('hidden');
  detailView.classList.remove('hidden');
}

function backToSelection() {
  detailView.classList.add('hidden');
  sideSelection.classList.remove('hidden');
}

function clearMassRows() {
  massesTable.querySelectorAll('.table-body-row').forEach((row) => row.remove());
}

function createMarker(mass, markerData) {
  const marker = document.createElement('div');
  marker.className = 'lesion-marker';
  marker.dataset.massId = mass.id;
  marker.dataset.markerIndex = markerData.index;
  marker.style.left = `${markerData.x}%`;
  marker.style.top = `${markerData.y}%`;
  marker.style.width = `${markerData.size}px`;
  marker.style.height = `${markerData.size}px`;
  marker.style.borderColor = mass.color;
  marker.style.background = `${mass.color}1f`;
  marker.style.color = mass.color;
  marker.style.transform = 'translate(-50%, -50%)';
  marker.setAttribute('role', 'button');
  marker.setAttribute('tabindex', '0');
  marker.setAttribute('aria-label', `Ураження ${mass.id}, коло ${markerData.index + 1}. Перетягніть коло або його кут, щоб редагувати на зображенні.`);

  const label = document.createElement('span');
  label.className = 'lesion-label';
  label.textContent = `${mass.id}.${markerData.index + 1}`;

  const resizeHandle = document.createElement('span');
  resizeHandle.className = 'lesion-resize-handle';
  resizeHandle.setAttribute('aria-hidden', 'true');

  marker.append(label, resizeHandle);
  marker.addEventListener('pointerdown', startMarkerMove);
  resizeHandle.addEventListener('pointerdown', startMarkerResize);
  return marker;
}

function renderLesionMarkers() {
  lesionOverlay.replaceChildren(...masses.flatMap((mass) => mass.markers.map((markerData, index) => createMarker(mass, { ...markerData, index }))));
}

function updateMass(id, updater) {
  masses = masses.map((mass) => (mass.id === id ? updater(mass) : mass));
  renderLesionMarkers();
}

function updateMarker(id, markerIndex, patch) {
  updateMass(id, (mass) => ({
    ...mass,
    markers: mass.markers.map((marker, index) => (index === markerIndex ? { ...marker, ...patch } : marker)),
  }));
}

function getMassFromInput(input) {
  return Number(input.closest('.table-body-row').dataset.massId);
}

function addMassRow() {
  const id = nextMassId;
  nextMassId += 1;

  const mass = {
    id,
    name: '',
    color: lesionColors[(id - 1) % lesionColors.length],
    markers: breastImages[activeSide].defaultMarkers.map((position) => ({ ...position, size: 42 })),
  };
  masses.push(mass);

  const row = document.createElement('div');
  row.className = 'table-row table-body-row';
  row.setAttribute('role', 'row');
  row.dataset.massId = id;

  row.innerHTML = `
    <span role="cell">${id}</span>
    <label role="cell">
      <span class="sr-only">Назва ураження ${id}</span>
      <input type="text" name="mass-name-${id}" placeholder="Назва ураження" />
    </label>
    <label role="cell" class="compact-control">
      <span>Колір</span>
      <input type="color" name="mass-color-${id}" value="${mass.color}" />
    </label>
  `;

  row.querySelector(`[name="mass-name-${id}"]`).addEventListener('input', (event) => {
    updateMass(getMassFromInput(event.target), (currentMass) => ({ ...currentMass, name: event.target.value }));
  });
  row.querySelector(`[name="mass-color-${id}"]`).addEventListener('input', (event) => {
    updateMass(getMassFromInput(event.target), (currentMass) => ({ ...currentMass, color: event.target.value }));
  });

  massesTable.append(row);
  renderLesionMarkers();
}

function getEditTarget(event) {
  const marker = event.currentTarget.closest('.lesion-marker');
  return {
    element: marker,
    id: Number(marker.dataset.massId),
    markerIndex: Number(marker.dataset.markerIndex),
  };
}

function startMarkerMove(event) {
  if (event.target.classList.contains('lesion-resize-handle')) return;
  event.preventDefault();
  const target = getEditTarget(event);
  target.element.setPointerCapture(event.pointerId);
  activeEdit = { ...target, pointerId: event.pointerId, mode: 'move' };
}

function startMarkerResize(event) {
  event.preventDefault();
  event.stopPropagation();
  const target = getEditTarget(event);
  const rect = target.element.getBoundingClientRect();
  target.element.setPointerCapture(event.pointerId);
  activeEdit = {
    ...target,
    pointerId: event.pointerId,
    mode: 'resize',
    startX: event.clientX,
    startY: event.clientY,
    startSize: rect.width,
  };
}

function moveMarker(event) {
  if (!activeEdit) return;

  const rect = lesionOverlay.getBoundingClientRect();

  if (activeEdit.mode === 'resize') {
    const delta = Math.max(event.clientX - activeEdit.startX, event.clientY - activeEdit.startY);
    const size = Math.min(220, Math.max(12, activeEdit.startSize + delta));
    updateMarker(activeEdit.id, activeEdit.markerIndex, { size });
    return;
  }

  const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
  const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
  updateMarker(activeEdit.id, activeEdit.markerIndex, { x, y });
}

function stopMarkerEdit(event) {
  if (activeEdit?.pointerId === event.pointerId) {
    activeEdit = null;
  }
}

async function saveImage(side, fileName) {
  const response = await fetch(breastImages[side].src);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

document.querySelectorAll('.choice-card').forEach((card) => {
  card.addEventListener('click', () => openDetail(card.dataset.side));
});

document.querySelector('#backToSelection').addEventListener('click', backToSelection);
addMass.addEventListener('click', addMassRow);
document.addEventListener('pointermove', moveMarker);
document.addEventListener('pointerup', stopMarkerEdit);
document.addEventListener('pointercancel', stopMarkerEdit);
savePrimary.addEventListener('click', () => saveImage(activeSide, `${breastImages[activeSide].label}.jpg`));
