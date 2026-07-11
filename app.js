const breastImages = {
  right: {
    src: 'right-breast.jpg',
    alt: 'Права грудна залоза',
    label: 'права грудна залоза',
    defaultPosition: { x: 80.7, y: 49.0 },
  },
  left: {
    src: 'left-breast.jpg',
    alt: 'Ліва грудна залоза',
    label: 'ліва грудна залоза',
    defaultPosition: { x: 79.1, y: 50.8 },
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
let activeDrag = null;

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

function createMarker(mass) {
  const marker = document.createElement('button');
  marker.className = 'lesion-marker';
  marker.type = 'button';
  marker.dataset.massId = mass.id;
  marker.style.left = `${mass.x}%`;
  marker.style.top = `${mass.y}%`;
  marker.style.width = `${mass.width}px`;
  marker.style.height = `${mass.height}px`;
  marker.style.borderRadius = `${mass.radius}%`;
  marker.style.background = mass.color;
  marker.style.transform = `translate(-50%, -50%) rotate(${mass.rotation}deg)`;
  marker.textContent = mass.id;
  marker.setAttribute('aria-label', `Утвір ${mass.id}. Перетягніть, щоб змінити розташування на зображенні.`);
  marker.addEventListener('pointerdown', startMarkerDrag);
  return marker;
}

function renderLesionMarkers() {
  lesionOverlay.replaceChildren(...masses.map(createMarker));
}

function updateMass(id, patch) {
  masses = masses.map((mass) => (mass.id === id ? { ...mass, ...patch } : mass));
  renderLesionMarkers();
}

function getMassFromInput(input) {
  return Number(input.closest('.table-body-row').dataset.massId);
}

function addMassRow() {
  const id = nextMassId;
  nextMassId += 1;

  const basePosition = breastImages[activeSide].defaultPosition;
  const mass = {
    id,
    name: '',
    color: lesionColors[(id - 1) % lesionColors.length],
    x: basePosition.x,
    y: basePosition.y,
    width: 42,
    height: 42,
    radius: 50,
    rotation: 0,
  };
  masses.push(mass);

  const row = document.createElement('div');
  row.className = 'table-row table-body-row';
  row.setAttribute('role', 'row');
  row.dataset.massId = id;

  row.innerHTML = `
    <span role="cell">${id}</span>
    <label role="cell">
      <span class="sr-only">Назва утвору ${id}</span>
      <input type="text" name="mass-name-${id}" />
    </label>
    <label role="cell" class="compact-control">
      <span>Колір</span>
      <input type="color" name="mass-color-${id}" value="${mass.color}" />
    </label>
    <label role="cell" class="compact-control">
      <span>Ширина</span>
      <input type="number" name="mass-width-${id}" min="12" max="220" value="${mass.width}" />
    </label>
    <label role="cell" class="compact-control">
      <span>Висота</span>
      <input type="number" name="mass-height-${id}" min="12" max="220" value="${mass.height}" />
    </label>
    <label role="cell" class="compact-control">
      <span>Форма</span>
      <input type="range" name="mass-radius-${id}" min="0" max="50" value="${mass.radius}" />
    </label>
    <label role="cell" class="compact-control">
      <span>Кут</span>
      <input type="number" name="mass-rotation-${id}" min="-180" max="180" value="${mass.rotation}" />
    </label>
  `;

  row.querySelector(`[name="mass-name-${id}"]`).addEventListener('input', (event) => {
    updateMass(getMassFromInput(event.target), { name: event.target.value });
  });
  row.querySelector(`[name="mass-color-${id}"]`).addEventListener('input', (event) => {
    updateMass(getMassFromInput(event.target), { color: event.target.value });
  });
  row.querySelector(`[name="mass-width-${id}"]`).addEventListener('input', (event) => {
    updateMass(getMassFromInput(event.target), { width: Number(event.target.value) });
  });
  row.querySelector(`[name="mass-height-${id}"]`).addEventListener('input', (event) => {
    updateMass(getMassFromInput(event.target), { height: Number(event.target.value) });
  });
  row.querySelector(`[name="mass-radius-${id}"]`).addEventListener('input', (event) => {
    updateMass(getMassFromInput(event.target), { radius: Number(event.target.value) });
  });
  row.querySelector(`[name="mass-rotation-${id}"]`).addEventListener('input', (event) => {
    updateMass(getMassFromInput(event.target), { rotation: Number(event.target.value) });
  });

  massesTable.append(row);
  renderLesionMarkers();
}

function startMarkerDrag(event) {
  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  activeDrag = {
    id: Number(event.currentTarget.dataset.massId),
    pointerId: event.pointerId,
  };
}

function moveMarker(event) {
  if (!activeDrag) return;

  const rect = lesionOverlay.getBoundingClientRect();
  const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
  const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
  updateMass(activeDrag.id, { x, y });
}

function stopMarkerDrag(event) {
  if (activeDrag?.pointerId === event.pointerId) {
    activeDrag = null;
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
document.addEventListener('pointerup', stopMarkerDrag);
document.addEventListener('pointercancel', stopMarkerDrag);
savePrimary.addEventListener('click', () => saveImage(activeSide, `${breastImages[activeSide].label}.jpg`));
