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
const secondaryImage = document.querySelector('#secondaryImage');
const savePrimary = document.querySelector('#savePrimary');
const saveSecondary = document.querySelector('#saveSecondary');
let activeSide = 'right';

function oppositeSide(side) {
  return side === 'right' ? 'left' : 'right';
}

function setImage(image, side) {
  image.src = breastImages[side].src;
  image.alt = breastImages[side].alt;
}

function openDetail(side) {
  activeSide = side;
  setImage(primaryImage, activeSide);
  setImage(secondaryImage, oppositeSide(activeSide));
  savePrimary.textContent = `Зберегти зображення 1`;
  saveSecondary.textContent = `Зберегти зображення 2`;
  sideSelection.classList.add('hidden');
  detailView.classList.remove('hidden');
}

function backToSelection() {
  detailView.classList.add('hidden');
  sideSelection.classList.remove('hidden');
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
savePrimary.addEventListener('click', () => saveImage(activeSide, `${breastImages[activeSide].label}.jpg`));
saveSecondary.addEventListener('click', () => {
  const side = oppositeSide(activeSide);
  saveImage(side, `${breastImages[side].label}.jpg`);
});
