const breastImages = {
  right: {
    src: 'right-breast.jpg',
    alt: 'Права грудна залоза',
    label: 'права грудна залоза',
  },
  left: {
    src: 'left-breast.jpg',
    alt: 'Ліва грудна залоза',
    label: 'ліва грудна залоза',
  },
};

const sideSelection = document.querySelector('#sideSelection');
const detailView = document.querySelector('#detailView');
const primaryImage = document.querySelector('#primaryImage');
const savePrimary = document.querySelector('#savePrimary');
const massesTable = document.querySelector('#massesTable');
const addMass = document.querySelector('#addMass');
let activeSide = 'right';
let massCount = 0;

function setImage(image, side) {
  image.src = breastImages[side].src;
  image.alt = breastImages[side].alt;
}

function openDetail(side) {
  activeSide = side;
  setImage(primaryImage, activeSide);
  savePrimary.textContent = 'Зберегти зображення';
  sideSelection.classList.add('hidden');
  detailView.classList.remove('hidden');
}

function backToSelection() {
  detailView.classList.add('hidden');
  sideSelection.classList.remove('hidden');
}

function addMassRow() {
  massCount += 1;

  const row = document.createElement('div');
  row.className = 'table-row table-body-row';
  row.setAttribute('role', 'row');

  row.innerHTML = `
    <span role="cell">${massCount}</span>
    <label role="cell">
      <span class="sr-only">Локалізація утвору ${massCount}</span>
      <input type="text" name="mass-location-${massCount}" />
    </label>
    <label role="cell">
      <span class="sr-only">Розмір утвору ${massCount}</span>
      <input type="text" name="mass-size-${massCount}" />
    </label>
    <span role="cell">
      <button class="delete-row" type="button" aria-label="Видалити утвір ${massCount}">×</button>
    </span>
  `;

  row.querySelector('.delete-row').addEventListener('click', () => row.remove());
  massesTable.append(row);
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
