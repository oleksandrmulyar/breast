const breastImages = {
  right: {
    src: 'right-breast.jpg',
    alt: 'Права грудна залоза',
    label: 'права грудна залоза',
    markers: {
      circle: { x: 25.2, y: 49.9 },
      breast: { x: 80.7, y: 49.0 },
    },
  },
  left: {
    src: 'left-breast.jpg',
    alt: 'Ліва грудна залоза',
    label: 'ліва грудна залоза',
    markers: {
      circle: { x: 27.4, y: 50.4 },
      breast: { x: 79.1, y: 50.8 },
    },
  },
};

const sideSelection = document.querySelector('#sideSelection');
const detailView = document.querySelector('#detailView');
const primaryImage = document.querySelector('#primaryImage');
const savePrimary = document.querySelector('#savePrimary');
const massesTable = document.querySelector('#massesTable');
const addMass = document.querySelector('#addMass');
const lesionOverlay = document.querySelector('#lesionOverlay');
let activeSide = 'right';
let massCount = 0;

function setImage(image, side) {
  image.src = breastImages[side].src;
  image.alt = breastImages[side].alt;
  renderLesionMarkers();
}

function openDetail(side) {
  activeSide = side;
  massCount = 0;
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

function createMarker(id, position, label) {
  const marker = document.createElement('span');
  marker.className = 'lesion-marker';
  marker.style.left = `${position.x}%`;
  marker.style.top = `${position.y}%`;
  marker.textContent = id;
  marker.setAttribute('aria-label', label);
  return marker;
}

function renderLesionMarkers() {
  lesionOverlay.replaceChildren();

  const markers = breastImages[activeSide].markers;

  for (let id = 1; id <= massCount; id += 1) {
    lesionOverlay.append(
      createMarker(id, markers.circle, `Утвір ${id} на коловій схемі`),
      createMarker(id, markers.breast, `Утвір ${id} на зображенні грудної залози`),
    );
  }
}

function addMassRow() {
  massCount += 1;

  const row = document.createElement('div');
  row.className = 'table-row table-body-row';
  row.setAttribute('role', 'row');

  row.innerHTML = `
    <span role="cell">${massCount}</span>
    <label role="cell">
      <span class="sr-only">Назва утвору ${massCount}</span>
      <input type="text" name="mass-name-${massCount}" />
    </label>
  `;

  massesTable.append(row);
  renderLesionMarkers();
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
savePrimary.addEventListener('click', () => saveImage(activeSide, `${breastImages[activeSide].label}.jpg`));
