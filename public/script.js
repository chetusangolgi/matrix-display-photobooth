const TOTAL_BLOCKS = 18;
const MAX_ACTIVE_IMAGES = 6;
const FLIP_INTERVAL = 3000;
const imageFolder = 'images/';
const defaultFront = 'default_front.jpg';
const defaultBack = 'default_back.jpg';

const grid = document.getElementById('image-grid');
const blocks = [];
let currentFlipState = false;
const activeBlockMap = new Map(); // { blockIndex: imageName }

// Create grid
for (let i = 0; i < TOTAL_BLOCKS; i++) {
  const block = document.createElement('div');
  block.className = 'block';

  const front = document.createElement('img');
  front.src = `${imageFolder}${defaultFront}`;
  front.className = 'face front';

  const back = document.createElement('img');
  back.src = `${imageFolder}${defaultBack}`;
  back.className = 'face back';

  block.appendChild(front);
  block.appendChild(back);
  grid.appendChild(block);

  blocks.push({ element: block, front, back });
}

// Flip between default images
setInterval(() => {
  currentFlipState = !currentFlipState;
  blocks.forEach((block, index) => {
    if (!activeBlockMap.has(index)) {
      block.element.classList.toggle('flipped', currentFlipState);
    }
  });
}, FLIP_INTERVAL);

// WebSocket connection
const socket = new WebSocket(`ws://${window.location.host}`);

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new-images') {
    injectNewImages(data.images);
  }
};

function injectNewImages(images) {
  images.forEach((imgName) => {
    if (activeBlockMap.size < MAX_ACTIVE_IMAGES) {
      assignImageToFreeBlock(imgName);
    } else {
      replaceRandomActiveImage(imgName);
    }
  });
}

function assignImageToFreeBlock(imgName) {
  const freeIndexes = blocks.map((_, i) => i).filter(i => !activeBlockMap.has(i));
  if (freeIndexes.length === 0) return;

  const target = freeIndexes[Math.floor(Math.random() * freeIndexes.length)];
  showImageInBlock(target, imgName);
}

function replaceRandomActiveImage(imgName) {
  const activeIndexes = Array.from(activeBlockMap.keys());
  const target = activeIndexes[Math.floor(Math.random() * activeIndexes.length)];
  showImageInBlock(target, imgName);
}

function showImageInBlock(index, imgName) {
  const block = blocks[index];
  const face = currentFlipState ? block.front : block.back;
  const unique = `${Date.now()}-${Math.random()}`;
  face.src = `${imageFolder}${imgName}?t=${unique}`;

  // Fallback if image load fails
  face.onerror = () => {
    console.warn('❌ Image failed to load:', imgName, 'Retrying...');
    setTimeout(() => {
      face.src = `${imageFolder}${imgName}?t=${Date.now()}-${Math.random()}`;
    }, 800);
  };

  block.element.classList.remove('flipped');
  activeBlockMap.set(index, imgName);
}
