const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const chokidar = require('chokidar');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const IMAGE_DIR = path.join(__dirname, 'public/images');
const DEFAULT_IMAGES = ['default_front.jpg', 'default_back.jpg'];
let knownImages = new Set(DEFAULT_IMAGES);

// Static hosting with cache control
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.jpg') || filePath.endsWith('.png')) {
      res.setHeader('Cache-Control', 'no-store');
    }
  }
}));

function notifyClients(newImage) {
  const payload = JSON.stringify({ type: 'new-images', images: [newImage] });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Watch for new images
chokidar.watch(IMAGE_DIR, { ignoreInitial: true }).on('add', filePath => {
  const fileName = path.basename(filePath);
  const isImage = /\.(jpg|jpeg|png|gif)$/i.test(fileName);

  if (!isImage || knownImages.has(fileName) || DEFAULT_IMAGES.includes(fileName)) return;

  console.log('📥 File detected:', fileName);

  setTimeout(() => {
    fs.stat(filePath, (err, stats) => {
      if (err || stats.size < 1024) {
        console.warn('⛔ Skipping incomplete or small file:', fileName);
        return;
      }

      knownImages.add(fileName);
      console.log('✅ Sending to client:', fileName);
      notifyClients(fileName);
    });
  }, 1500); // wait longer to ensure full write
});

server.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
