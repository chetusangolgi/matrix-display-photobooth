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
const activeBlockQueue = []; // [blockIndex] - Oldest is at the start

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

// Flip all blocks continuously
// setInterval(() => {
//   currentFlipState = !currentFlipState;
//   blocks.forEach((block) => {
//     block.element.classList.toggle('flipped', currentFlipState);
//   });
// }, FLIP_INTERVAL);

// Call sequentialFlip to start the one-by-one animation
// sequentialFlip(); // Remove this line as it will be called by setInterval

// Reintroduce setInterval to call sequentialFlip every FLIP_INTERVAL (3 seconds)
setInterval(() => {
  sequentialFlip();
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
    if (activeBlockQueue.length >= MAX_ACTIVE_IMAGES) {
      const oldestBlockIndex = activeBlockQueue.shift(); // Dequeue oldest
      deactivateBlock(oldestBlockIndex);
    }
    assignImageToFreeBlock(imgName);
  });
}

function assignImageToFreeBlock(imgName) {
  const freeIndexes = blocks.map((_, i) => i).filter(i => !activeBlockMap.has(i));
  if (freeIndexes.length === 0) {
    console.warn("No free blocks available to assign new image.");
    return;
  }

  const targetIndex = freeIndexes[Math.floor(Math.random() * freeIndexes.length)];
  showImageInBlock(targetIndex, imgName);
}

function showImageInBlock(index, imgName) {
  const block = blocks[index];
  updateImage(block.back, imgName); // Set the new image on the back

  // Mark as active. The main interval will handle the flipping.
  activeBlockMap.set(index, imgName);
  activeBlockQueue.push(index);
}

function deactivateBlock(index) {
  if (!activeBlockMap.has(index)) return;

  activeBlockMap.delete(index);
  // Immediately reset the back face to the default image.
  // The main interval will handle flipping it out of view.
  blocks[index].back.src = `${imageFolder}${defaultBack}`;
}

function updateImage(imageElement, imgName) {
  const uniqueSrc = `${imageFolder}${imgName}?t=${Date.now()}-${Math.random()}`;
  imageElement.src = uniqueSrc;

  imageElement.onerror = () => {
    console.warn('❌ Image failed to load:', imgName, 'Retrying...');
    setTimeout(() => {
      imageElement.src = `${imageFolder}${imgName}?t=${Date.now()}-${Math.random()}`;
    }, 800);
  };
}

function sequentialFlip() {
  let i = 0;
  function flipNext() {
    // Change the condition to include all blocks (0 to 17)
    if (i >= TOTAL_BLOCKS) return;
    blocks[i].element.classList.toggle('flipped');
    i++;
    setTimeout(flipNext, 80); // Adjust speed as needed
  }
  flipNext();
}
